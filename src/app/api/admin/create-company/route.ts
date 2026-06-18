import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

type GenericRecord = Record<string, unknown>;
type AuthUser = { id: string };
type CompanyRecord = { id: string } & GenericRecord;
type InsertResult = {
	ok: boolean;
	status: number;
	body: unknown;
	removedColumns: string[];
	payloadUsed: GenericRecord;
};

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}

function isRecord(value: unknown): value is GenericRecord {
	return typeof value === "object" && value !== null;
}

function extractMissingColumnName(errorPayload: unknown): string | null {
	if (!isRecord(errorPayload) || typeof errorPayload.message !== "string") {
		return null;
	}
	// PostgREST example:
	// "Could not find the 'size_category' column of 'pr_companies' in the schema cache"
	const match = errorPayload.message.match(/'([a-zA-Z0-9_]+)'\s+column/i);
	if (match?.[1]) return match[1];
	return null;
}

function summarizeErrorPayload(errorPayload: unknown): string | null {
	if (!isRecord(errorPayload)) return null;
	const code = typeof errorPayload.code === "string" ? errorPayload.code : null;
	const message =
		typeof errorPayload.message === "string" ? errorPayload.message : null;
	const details =
		typeof errorPayload.details === "string" ? errorPayload.details : null;
	const hint = typeof errorPayload.hint === "string" ? errorPayload.hint : null;
	const pieces = [code, message, details, hint].filter(
		(v): v is string => Boolean(v && v.trim()),
	);
	return pieces.length > 0 ? pieces.join(" | ") : null;
}

function summarizeAuthPayload(payload: unknown): string | null {
	if (!isRecord(payload)) return null;
	const code = typeof payload.code === "string" ? payload.code : null;
	const errorCode =
		typeof payload.error_code === "string" ? payload.error_code : null;
	const message =
		typeof payload.message === "string" ? payload.message : null;
	const errorDescription =
		typeof payload.error_description === "string"
			? payload.error_description
			: null;
	const msg = typeof payload.msg === "string" ? payload.msg : null;
	const pieces = [code, errorCode, message, errorDescription, msg].filter(
		(v): v is string => Boolean(v && v.trim()),
	);
	return pieces.length > 0 ? pieces.join(" | ") : null;
}

function normalizePhoneForAuth(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const digits = value.replace(/\D/g, "");
	if (digits.length < 8) return null;
	return digits;
}

function getAuthUserIdFromPayload(payload: unknown): string | null {
	if (!isRecord(payload)) return null;
	if (typeof payload.id === "string") return payload.id;
	if (isRecord(payload.user) && typeof payload.user.id === "string") {
		return payload.user.id;
	}
	return null;
}

async function tryInsertWithFallback(
	endpoint: string,
	serviceRoleKey: string,
	payloadToInsert: GenericRecord,
): Promise<InsertResult> {
	const payload = { ...payloadToInsert };
	const removedColumns: string[] = [];

	for (let attempt = 0; attempt < 8; attempt++) {
		const response = await fetch(endpoint, {
			method: "POST",
			headers: {
				apikey: serviceRoleKey,
				Authorization: `Bearer ${serviceRoleKey}`,
				"Content-Type": "application/json",
				Prefer: "return=representation",
			},
			body: JSON.stringify([payload]),
		});
		const body: unknown = await response.json().catch(() => null);
		if (response.ok) {
			return {
				ok: true,
				status: response.status,
				body,
				removedColumns,
				payloadUsed: { ...payload },
			};
		}

		const missingColumn = extractMissingColumnName(body);
		if (!missingColumn || !(missingColumn in payload)) {
			return {
				ok: false,
				status: response.status,
				body,
				removedColumns,
				payloadUsed: { ...payload },
			};
		}

		delete payload[missingColumn];
		removedColumns.push(missingColumn);
	}

	return {
		ok: false,
		status: 500,
		body: { error: "max insert retries reached" },
		removedColumns,
		payloadUsed: { ...payload },
	};
}

async function tryUpdateWithFallback(
	endpoint: string,
	serviceRoleKey: string,
	payloadToUpdate: GenericRecord,
): Promise<InsertResult> {
	const payload = { ...payloadToUpdate };
	const removedColumns: string[] = [];

	for (let attempt = 0; attempt < 8; attempt++) {
		const response = await fetch(endpoint, {
			method: "PATCH",
			headers: {
				apikey: serviceRoleKey,
				Authorization: `Bearer ${serviceRoleKey}`,
				"Content-Type": "application/json",
				Prefer: "return=representation",
			},
			body: JSON.stringify(payload),
		});
		const body: unknown = await response.json().catch(() => null);
		if (response.ok) {
			return {
				ok: true,
				status: response.status,
				body,
				removedColumns,
				payloadUsed: { ...payload },
			};
		}

		const missingColumn = extractMissingColumnName(body);
		if (!missingColumn || !(missingColumn in payload)) {
			return {
				ok: false,
				status: response.status,
				body,
				removedColumns,
				payloadUsed: { ...payload },
			};
		}

		delete payload[missingColumn];
		removedColumns.push(missingColumn);
	}

	return {
		ok: false,
		status: 500,
		body: { error: "max update retries reached" },
		removedColumns,
		payloadUsed: { ...payload },
	};
}

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
		const { data, error } = await server.auth
			.getUser(token)
			.catch((e: unknown) => ({ data: null, error: e }));
		if (error) return null;
		const maybeUser = data?.user;
		if (maybeUser?.id) return maybeUser as AuthUser;
		return null;
	} catch {
		return null;
	}
}

async function hasAdminPrivileges(userId: string) {
	const server = createServerSupabase();
	if (!server) return false;

	const byId = await server
		.from("pr_users")
		.select("role")
		.eq("id", userId)
		.maybeSingle();
	if (!byId.error && byId.data?.role) {
		return byId.data.role === "admin" || byId.data.role === "dev";
	}

	const byAuthId = await server
		.from("pr_users")
		.select("role")
		.eq("auth_id", userId)
		.maybeSingle();
	if (!byAuthId.error && byAuthId.data?.role) {
		return byAuthId.data.role === "admin" || byAuthId.data.role === "dev";
	}

	return false;
}

export async function POST(req: Request) {
	try {
		if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
			return NextResponse.json(
				{ error: "server missing SUPABASE_URL or SERVICE_ROLE_KEY" },
				{ status: 500 },
			);
		}

		const body = await req.json();

		// Accept either: a valid session token (any authenticated user) OR a server-side secret header/body key.
		// This keeps the SERVICE_ROLE_KEY on the server and avoids exposing it to the client.
		const authHeader = req.headers.get("authorization") || "";
		const token = authHeader.replace(/^Bearer\s+/i, "");
		const createKeyFromHeader = req.headers.get("x-create-company-key") || "";
		const createKeyFromBody =
			isRecord(body) && typeof body.apikey === "string" ? body.apikey : "";
		const createKey = createKeyFromHeader || createKeyFromBody;
		const serverCreateKey = process.env.CREATE_COMPANY_KEY || "";

		let callerAny: AuthUser | null = null;
		if (token) {
			callerAny = await getUserFromToken(token);
		}

		const validKey =
			serverCreateKey && createKey && serverCreateKey === createKey;
		if (!callerAny && !validKey) {
			return NextResponse.json(
				{ error: "missing or invalid auth token or create key" },
				{ status: 401 },
			);
		}
		if (callerAny) {
			const allowed = await hasAdminPrivileges(callerAny.id);
			if (!allowed) {
				return NextResponse.json(
					{ error: "forbidden: admin/dev role required" },
					{ status: 403 },
				);
			}
		}

		const { companyName, adminEmail, adminPassword, payloadFields } = body;
		const normalizedAdminEmail =
			typeof adminEmail === "string" ? adminEmail.trim().toLowerCase() : "";
		const adminFieldsFromBody =
			(payloadFields && (payloadFields.admin || payloadFields.admin_details)) ||
			(body && (body.payloadAdmin || null)) ||
			null;
		const firstName = adminFieldsFromBody?.nombres?.trim() || null;
		const lastName = adminFieldsFromBody?.apellidos?.trim() || null;
		const fullName =
			[firstName, lastName].filter((v): v is string => Boolean(v)).join(" ") ||
			null;
		const adminPhoneForAuth = normalizePhoneForAuth(adminFieldsFromBody?.phone);
		const authUserMetadata: GenericRecord = {
			...(fullName ? { full_name: fullName, display_name: fullName } : {}),
			...(firstName ? { first_name: firstName, nombres: firstName } : {}),
			...(lastName ? { last_name: lastName, apellidos: lastName } : {}),
			...(adminFieldsFromBody?.phone
				? { phone: String(adminFieldsFromBody.phone) }
				: {}),
		};

		if (!companyName || !normalizedAdminEmail || !adminPassword) {
			return NextResponse.json({ error: "missing fields" }, { status: 400 });
		}

		// 1) create supabase auth user via admin endpoint
		const createUserRes = await fetch(
			`${SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/admin/users`,
			{
				method: "POST",
				headers: {
					apikey: SERVICE_ROLE_KEY,
					Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: normalizedAdminEmail,
					password: adminPassword,
					email_confirm: true,
					...(adminPhoneForAuth ? { phone: adminPhoneForAuth } : {}),
					user_metadata: authUserMetadata,
				}),
			},
		);
		const createdUser = await createUserRes.json();
		console.log(
			"Auth user creation response:",
			createUserRes.status,
			createdUser,
		);

		let userId = getAuthUserIdFromPayload(createdUser);

		// Handle existing user case
		if (!createUserRes.ok && createdUser.error_code === "email_exists") {
			console.log("User already exists, getting existing user...");
			// Get existing user by email
			const getExistingUserRes = await fetch(
				`${SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/admin/users?email=${encodeURIComponent(normalizedAdminEmail)}`,
				{
					headers: {
						apikey: SERVICE_ROLE_KEY,
						Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
					},
				},
			);
			const existingUsers = await getExistingUserRes.json();
			if (
				getExistingUserRes.ok &&
				existingUsers.users &&
				existingUsers.users.length > 0
			) {
				userId = getAuthUserIdFromPayload(existingUsers.users[0]);
				if (!userId) {
					return NextResponse.json(
						{
							error: "existing user payload missing id",
							detail: existingUsers.users[0],
						},
						{ status: 500 },
					);
				}
				// Important: if user already exists, enforce the provided temporary password.
				const updateUserRes = await fetch(
					`${SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
					{
						method: "PUT",
						headers: {
							apikey: SERVICE_ROLE_KEY,
							Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							password: adminPassword,
							email_confirm: true,
							...(adminPhoneForAuth ? { phone: adminPhoneForAuth } : {}),
							user_metadata: authUserMetadata,
						}),
					},
				);
				const updatedUser = await updateUserRes.json().catch(() => null);
				if (!updateUserRes.ok) {
					return NextResponse.json(
						{
							error: "existing auth user password update failed",
							detail: updatedUser,
							status: updateUserRes.status,
						},
						{ status: 500 },
					);
				}
				console.log("Using existing user ID:", userId);
			} else {
				return NextResponse.json(
					{
						error: "user exists but could not retrieve",
						detail: existingUsers,
						status: createUserRes.status,
					},
					{ status: 500 },
				);
			}
			} else if (!createUserRes.ok) {
				return NextResponse.json(
					{
						error: "create auth user failed",
						detail: createdUser,
						status: createUserRes.status,
						message:
							summarizeAuthPayload(createdUser) ||
							"Supabase Auth rejected user creation",
					},
					{ status: 500 },
				);
			}
		if (!userId) {
			return NextResponse.json(
				{
					error: "auth user id missing after create/reuse",
					detail: createdUser,
				},
				{ status: 500 },
			);
		}

		// 2) create company row
		const companyPayload: GenericRecord = {
			name: companyName,
			created_by: userId,
			status: "active",
			...payloadFields,
		};
		const companyInsert = await tryInsertWithFallback(
			`${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/pr_companies`,
			SERVICE_ROLE_KEY,
			companyPayload,
		);
		const createdCompanies: unknown = companyInsert.body;
		console.log(
			"Company creation response:",
			companyInsert.status,
			createdCompanies,
		);
		if (companyInsert.removedColumns.length > 0) {
			console.log(
				"Company creation removed unsupported columns:",
				companyInsert.removedColumns,
			);
		}

		let company: CompanyRecord | null = null;

		// Handle duplicate document case
		if (
			!companyInsert.ok &&
			isRecord(createdCompanies) &&
			createdCompanies.code === "23505" &&
			typeof createdCompanies.message === "string" &&
			createdCompanies.message.includes("pr_companies_document_key")
		) {
			console.log(
				"Company with this document already exists, getting existing company...",
			);
			// Get existing company by document
			const document = payloadFields?.document;
			if (document) {
				const getExistingCompanyRes = await fetch(
					`${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/pr_companies?document=eq.${encodeURIComponent(document)}`,
					{
						headers: {
							apikey: SERVICE_ROLE_KEY,
							Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
						},
					},
				);
				const existingCompanies: unknown = await getExistingCompanyRes.json();
				if (
					getExistingCompanyRes.ok &&
					Array.isArray(existingCompanies) &&
					existingCompanies.length > 0 &&
					isRecord(existingCompanies[0]) &&
					typeof existingCompanies[0].id === "string"
				) {
					company = existingCompanies[0] as CompanyRecord;
					console.log("Using existing company ID:", company.id);
				} else {
					return NextResponse.json(
						{
							error: "company with document exists but could not retrieve",
							detail: existingCompanies,
							status: companyInsert.status,
						},
						{ status: 500 },
					);
				}
			} else {
				return NextResponse.json(
						{
							error: "duplicate document but no document provided",
							detail: createdCompanies,
							status: companyInsert.status,
						},
						{ status: 500 },
					);
			}
		} else if (!companyInsert.ok) {
			return NextResponse.json(
				{
					error: "create company failed",
					detail: createdCompanies,
					status: companyInsert.status,
					message:
						summarizeErrorPayload(createdCompanies) || "Unknown company error",
					removedColumns: companyInsert.removedColumns,
				},
				{ status: 500 },
			);
		} else {
			if (
				Array.isArray(createdCompanies) &&
				createdCompanies.length > 0 &&
				isRecord(createdCompanies[0]) &&
				typeof createdCompanies[0].id === "string"
			) {
				company = createdCompanies[0] as CompanyRecord;
			} else {
				return NextResponse.json(
						{
							error: "create company returned invalid payload",
							detail: createdCompanies,
							status: companyInsert.status,
						},
						{ status: 500 },
					);
			}
		}

		// 3) insert profile into app_pr.users (single source of truth)
		// Clean document (remove dots, dashes, spaces)
		const rawDocument = adminFieldsFromBody?.document;
		const cleanDocument = rawDocument
			? rawDocument.replace(/[^0-9kK]/g, "").toUpperCase()
			: null;
		const profilePayload: GenericRecord = {
			id: userId,
			auth_id: userId,
			email: normalizedAdminEmail,
			company_id: company.id,
			role: "admin",
			first_name: firstName,
			last_name: lastName,
			name: fullName || firstName,
			nombres: firstName,
			apellidos: lastName,
			document: cleanDocument,
			phone: adminFieldsFromBody?.phone || null,
			status: "active",
			is_active: true,
		};

		console.log("Creating profile with payload:", profilePayload);
		console.log("Admin fields from body:", adminFieldsFromBody);
		console.log("Full body:", JSON.stringify(body, null, 2));
		// Insert into public.pr_users (view) which will insert into app_pr.users
		const profileInsert = await tryInsertWithFallback(
			`${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/pr_users`,
			SERVICE_ROLE_KEY,
			profilePayload,
		);
		const createdProfiles = profileInsert.body;
		console.log(
			"Profile creation response:",
			profileInsert.status,
			createdProfiles,
		);
		if (profileInsert.removedColumns.length > 0) {
			console.log(
				"Profile creation removed unsupported columns:",
				profileInsert.removedColumns,
			);
		}

		let profile: GenericRecord | null = null;
		if (
			!profileInsert.ok &&
			isRecord(createdProfiles) &&
			createdProfiles.code === "23505"
		) {
			// If the profile already exists, force-link it to the newly created company.
			// This prevents stale associations when reusing an existing auth user/email.
			const updatePayload: GenericRecord = {
				auth_id: userId,
				email: normalizedAdminEmail,
				company_id: company.id,
				role: "admin",
				first_name: firstName,
				last_name: lastName,
				name: fullName || firstName,
				nombres: firstName,
				apellidos: lastName,
				document: cleanDocument,
				phone: adminFieldsFromBody?.phone || null,
				status: "active",
				is_active: true,
			};
			const baseUrl = SUPABASE_URL.replace(/\/+$/, "");
			const updateByAuthId = await tryUpdateWithFallback(
				`${baseUrl}/rest/v1/pr_users?auth_id=eq.${encodeURIComponent(userId)}`,
				SERVICE_ROLE_KEY,
				updatePayload,
			);
			const updateByAuthRows = Array.isArray(updateByAuthId.body)
				? updateByAuthId.body
				: [];
			if (
				updateByAuthId.ok &&
				updateByAuthRows.length > 0 &&
				isRecord(updateByAuthRows[0])
			) {
				profile = updateByAuthRows[0];
			} else {
				const updateByEmail = await tryUpdateWithFallback(
					`${baseUrl}/rest/v1/pr_users?email=eq.${encodeURIComponent(normalizedAdminEmail)}`,
					SERVICE_ROLE_KEY,
					updatePayload,
				);
				const updateByEmailRows = Array.isArray(updateByEmail.body)
					? updateByEmail.body
					: [];
				if (
					updateByEmail.ok &&
					updateByEmailRows.length > 0 &&
					isRecord(updateByEmailRows[0])
				) {
					profile = updateByEmailRows[0];
				}
			}
		} else if (
			profileInsert.ok &&
			Array.isArray(createdProfiles) &&
			createdProfiles.length > 0 &&
			isRecord(createdProfiles[0])
		) {
			profile = createdProfiles[0];
		}

		if (!profile)
			return NextResponse.json(
				{
					error: "create profile failed",
					detail: createdProfiles,
					status: profileInsert.status,
					message:
						summarizeErrorPayload(createdProfiles) || "Unknown profile error",
					removedColumns: profileInsert.removedColumns,
				},
				{ status: 500 },
			);

		return NextResponse.json({
			company,
			admin: createdUser,
			profile,
		});
	} catch (err: unknown) {
		return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
	}
}

export const runtime = "nodejs";
