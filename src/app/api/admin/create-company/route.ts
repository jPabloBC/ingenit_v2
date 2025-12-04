import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create a server-side Supabase client using the service role key.
function createServerSupabase() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

async function getUserFromToken(token: string) {
  const server = createServerSupabase();
  if (!server) return null;
  try {
    const { data, error } = await server.auth.getUser(token as string as any).catch((e: any) => ({ data: null, error: e }));
    if (error) return null;
    return (data && (data as any).user) ? (data as any).user : null;
  } catch (e) {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'server missing SUPABASE_URL or SERVICE_ROLE_KEY' }, { status: 500 });
    }

    // Accept either: a valid session token (any authenticated user) OR a server-side secret header.
    // This keeps the SERVICE_ROLE_KEY on the server and avoids exposing it to the client.
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const createKey = req.headers.get('x-create-company-key') || '';
    const serverCreateKey = process.env.CREATE_COMPANY_KEY || '';

    let callerAny: any = null;
    if (token) {
      callerAny = await getUserFromToken(token);
    }

    const validKey = serverCreateKey && createKey && serverCreateKey === createKey;
    // Allow dev key for development
    const devKey = createKey === 'dev';
    if (!callerAny && !validKey && !devKey) {
      return NextResponse.json({ error: 'missing or invalid auth token or create key' }, { status: 401 });
    }

    const body = await req.json();
    const { companyName, adminEmail, adminPassword, payloadFields } = body;

    if (!companyName || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    }

    // 1) create supabase auth user via admin endpoint
    const createUserRes = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: adminEmail, password: adminPassword, email_confirm: true }),
    });
    const createdUser = await createUserRes.json();
    console.log('Auth user creation response:', createUserRes.status, createdUser);
    
    let userId = createdUser.id;
    
    // Handle existing user case
    if (!createUserRes.ok && createdUser.error_code === 'email_exists') {
      console.log('User already exists, getting existing user...');
      // Get existing user by email
      const getExistingUserRes = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/admin/users?email=${encodeURIComponent(adminEmail)}`, {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      const existingUsers = await getExistingUserRes.json();
      if (getExistingUserRes.ok && existingUsers.users && existingUsers.users.length > 0) {
        userId = existingUsers.users[0].id;
        console.log('Using existing user ID:', userId);
      } else {
        return NextResponse.json({ 
          error: 'user exists but could not retrieve', 
          detail: existingUsers,
          status: createUserRes.status 
        }, { status: 500 });
      }
    } else if (!createUserRes.ok) {
      return NextResponse.json({ 
        error: 'create auth user failed', 
        detail: createdUser,
        status: createUserRes.status 
      }, { status: 500 });
    }

    // 2) create company row
    const companyPayload: any = {
      name: companyName,
      created_by: userId,
      status: 'active',
      ...payloadFields,
    };
    const createCompanyRes = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/pr_companies`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify([companyPayload]),
    });
    const createdCompanies = await createCompanyRes.json();
    console.log('Company creation response:', createCompanyRes.status, createdCompanies);
    
    let company;
    
    // Handle duplicate document case
    if (!createCompanyRes.ok && createdCompanies.code === '23505' && createdCompanies.message.includes('pr_companies_document_key')) {
      console.log('Company with this document already exists, getting existing company...');
      // Get existing company by document
      const document = payloadFields?.document;
      if (document) {
        const getExistingCompanyRes = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/pr_companies?document=eq.${encodeURIComponent(document)}`, {
          headers: {
            apikey: SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          },
        });
        const existingCompanies = await getExistingCompanyRes.json();
        if (getExistingCompanyRes.ok && existingCompanies && existingCompanies.length > 0) {
          company = existingCompanies[0];
          console.log('Using existing company ID:', company.id);
        } else {
          return NextResponse.json({ 
            error: 'company with document exists but could not retrieve', 
            detail: existingCompanies,
            status: createCompanyRes.status 
          }, { status: 500 });
        }
      } else {
        return NextResponse.json({ 
          error: 'duplicate document but no document provided', 
          detail: createdCompanies,
          status: createCompanyRes.status 
        }, { status: 500 });
      }
    } else if (!createCompanyRes.ok) {
      return NextResponse.json({ 
        error: 'create company failed', 
        detail: createdCompanies,
        status: createCompanyRes.status 
      }, { status: 500 });
    } else {
      company = createdCompanies[0];
    }

    // 3) insert profile into app_pr.users (single source of truth)
    const adminFieldsFromBody = (payloadFields && (payloadFields.admin || payloadFields.admin_details)) || (body && (body.payloadAdmin || null)) || null;
    const fullName = adminFieldsFromBody ? `${(adminFieldsFromBody.nombres || '').trim()} ${(adminFieldsFromBody.apellidos || '').trim()}`.trim() : null;
    
    // Clean document (remove dots, dashes, spaces)
    const rawDocument = adminFieldsFromBody?.document;
    const cleanDocument = rawDocument ? 
      rawDocument.replace(/[^0-9kK]/g, '').toUpperCase() : null;
    
    const profilePayload = {
      auth_id: userId,
      email: adminEmail,
      company_id: company.id,
      role: 'admin',
      name: fullName,
      nombres: adminFieldsFromBody?.nombres || null,
      apellidos: adminFieldsFromBody?.apellidos || null,
      document: cleanDocument,
      phone: adminFieldsFromBody?.phone || null,
      status: 'active',
      is_active: true
    };
    
    console.log('Creating profile with payload:', profilePayload);
    console.log('Admin fields from body:', adminFieldsFromBody);
    console.log('Full body:', JSON.stringify(body, null, 2));
    // Insert into public.pr_users (view) which will insert into app_pr.users
    const createProfileRes = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/pr_users`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify([profilePayload]),
    });
    const createdProfiles = await createProfileRes.json();
    console.log('Profile creation response:', createProfileRes.status, createdProfiles);
    if (!createProfileRes.ok) return NextResponse.json({ 
      error: 'create profile failed', 
      detail: createdProfiles,
      status: createProfileRes.status 
    }, { status: 500 });

    return NextResponse.json({ company, admin: createdUser, profile: createdProfiles[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

export const runtime = 'nodejs';
