// Force-reload

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usa variables de entorno seguras
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
      // Validar que app_id sea un UUID válido
      function isValidUUID(uuid: string) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
      }

  try {

    const body = await req.json();
    console.log('Datos recibidos para crear usuario:', body);

    // Validar campos requeridos
    const requiredFields = ['email', 'password', 'role', 'app_id', 'first_name', 'last_name', 'phone'];
    const missingFields = requiredFields.filter(f => !body[f] || body[f].toString().trim() === '');
    if (missingFields.length > 0) {
      return NextResponse.json({ error: `Faltan los siguientes campos requeridos: ${missingFields.join(', ')}` }, { status: 400 });
    }

    const { 
      email, 
      password, 
      role, 
      app_id, 
      first_name, 
      last_name, 
      phone, 
      allowed_screens 
    } = body;

    if (!isValidUUID(app_id)) {
      return NextResponse.json({ error: 'El campo app_id no es un UUID válido.' }, { status: 400 });
    }

    const user_metadata = {
      role,
      app_id,
      first_name,
      last_name,
      phone,
      full_name: `${first_name} ${last_name}`.trim(),
      allowed_screens: allowed_screens || [],
    };

    const createUserParams = {
      email,
      password,
      email_confirm: true,
      user_metadata
    };

    console.log("Parámetros para createUser:", JSON.stringify(createUserParams, null, 2));

    // Crear usuario SIN user_metadata para evitar trigger automático
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error) {
      console.error('Error creando usuario en Auth:', JSON.stringify(error, null, 2));
      if (error.message.includes('already exists') || error.message.includes('already registered')) {
        return NextResponse.json({ error: 'El correo ya está registrado.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ error: 'No se pudo crear el usuario.' }, { status: 500 });
    }

    // Verificar si ya existe un perfil para este usuario
    const { data: existingProfile } = await supabase
      .from('rt_profiles')
      .select('id')
      .eq('id', data.user.id)
      .single();

    if (existingProfile) {
      // Si ya existe el perfil, actualizarlo en lugar de insertar
      const { error: profileError } = await supabase
        .from('rt_profiles')
        .update({
          email,
          role,
          app_id,
          first_name,
          last_name,
          phone,
          full_name: user_metadata.full_name,
          allowed_screens: user_metadata.allowed_screens,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.user.id);

      if (profileError) {
        console.error('Error actualizando perfil:', JSON.stringify(profileError, null, 2));
        return NextResponse.json({ 
          error: 'Error actualizando perfil de usuario: ' + profileError.message 
        }, { status: 500 });
      }
    } else {
      // Crear perfil manualmente en rt_profiles
      const { error: profileError } = await supabase
        .from('rt_profiles')
        .insert({
          id: data.user.id,
          email,
          role,
          app_id,
          first_name,
          last_name,
          phone,
          full_name: user_metadata.full_name,
          allowed_screens: user_metadata.allowed_screens,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Error creando perfil:', JSON.stringify(profileError, null, 2));
        // Eliminar usuario de Auth si falla la creación del perfil
        await supabase.auth.admin.deleteUser(data.user.id);
        return NextResponse.json({ 
          error: 'Error creando perfil de usuario: ' + profileError.message 
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ user: data.user }, { status: 200 });

  } catch (e: any) {
    console.error('Excepción capturada:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
