import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_AVAILABLE = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
if (!ADMIN_AVAILABLE) {
	console.error(
		"Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL for admin PR API",
	);
}

const supabaseAdmin = createClient(SUPABASE_URL || "", SERVICE_ROLE_KEY || "", {
	auth: { persistSession: false },
});

type JsonRecord = Record<string, unknown>;
type UserWithId = JsonRecord & { id: string };

function adminConfigUnavailableResponse() {
	return NextResponse.json(
		{ error: "Admin API not configured" },
		{ status: 500 },
	);
}

function getErrorMessage(error: unknown): string {
	if (error && typeof error === "object") {
		const record = error as Record<string, unknown>;
		const candidate = record.message || record.error_description || record.msg;
		if (typeof candidate === "string" && candidate.trim().length > 0) {
			return candidate;
		}
	}
	return String(error || "");
}

async function findAuthUserIdByEmail(email: string): Promise<string | null> {
	const normalizedEmail = email.trim().toLowerCase();
	if (!normalizedEmail) return null;

	let page = 1;
	const perPage = 200;
	const maxPages = 25;

	while (page <= maxPages) {
		const { data, error } = await supabaseAdmin.auth.admin.listUsers({
			page,
			perPage,
		});
		if (error) {
			console.error("Error listing auth users by email:", error);
			return null;
		}

		const users = data?.users || [];
		const found = users.find(
			(user) =>
				typeof user.email === "string" &&
				user.email.toLowerCase() === normalizedEmail,
		);
		if (found?.id) return String(found.id);
		if (users.length < perPage) break;
		page += 1;
	}

	return null;
}

async function validateRequestToken(req: Request) {
	const authHeader = req.headers.get("authorization") || "";
	const token = authHeader.replace(/^Bearer\s+/i, "");
	if (!token) return { ok: false as const };
	const { data: userData, error: userError } =
		await supabaseAdmin.auth.getUser(token);
	if (userError || !userData?.user?.id) return { ok: false as const };
	return { ok: true as const, userId: userData.user.id };
}

async function hasAdminPrivileges(userId: string) {
	const byId = await supabaseAdmin
		.from("pr_users")
		.select("role")
		.eq("id", userId)
		.maybeSingle();
	if (!byId.error && byId.data?.role) {
		return byId.data.role === "admin" || byId.data.role === "dev";
	}

	const byAuthId = await supabaseAdmin
		.from("pr_users")
		.select("role")
		.eq("auth_id", userId)
		.maybeSingle();
	if (!byAuthId.error && byAuthId.data?.role) {
		return byAuthId.data.role === "admin" || byAuthId.data.role === "dev";
	}

	return false;
}

async function validateAdminAccess(req: Request) {
	const tokenValidation = await validateRequestToken(req);
	if (!tokenValidation.ok) {
		return { ok: false as const, status: 401, error: "invalid auth token" };
	}
	const allowed = await hasAdminPrivileges(tokenValidation.userId);
	if (!allowed) {
		return {
			ok: false as const,
			status: 403,
			error: "forbidden: admin/dev role required",
		};
	}
	return { ok: true as const };
}

async function enrichUsersWithProjectAccess(
	users: UserWithId[],
	options?: {
		companyId?: string | null;
		projectId?: string | null;
	},
) {
	if (!users.length) return users;

	const userIds = Array.from(
		new Set(
			users
				.map((user) => user.id)
				.filter((value): value is string => typeof value === "string" && value.length > 0),
		),
	);
	if (!userIds.length) return users;

	// Legacy compatibility:
	// some assignments may use pr_users.auth_id instead of pr_users.id.
	const lookupByAssignmentUserId = new Map<string, string>();
	for (const user of users) {
		if (typeof user.id === "string" && user.id.trim().length > 0) {
			lookupByAssignmentUserId.set(user.id, user.id);
		}
		const authId =
			typeof user.auth_id === "string" && user.auth_id.trim().length > 0
				? user.auth_id.trim()
				: null;
		if (authId) {
			lookupByAssignmentUserId.set(authId, user.id);
		}
	}
	const assignmentUserIds = Array.from(lookupByAssignmentUserId.keys());
	if (!assignmentUserIds.length) return users;

	let assignmentQuery = supabaseAdmin
		.from("pr_project_users")
		.select("user_id,project_id,company_id")
		.in("user_id", assignmentUserIds);

	if (options?.companyId) {
		assignmentQuery = assignmentQuery.or(
			`company_id.eq.${options.companyId},company_id.is.null`,
		);
	}
	if (options?.projectId) {
		assignmentQuery = assignmentQuery.eq("project_id", options.projectId);
	}

	let permissionProjectQuery = supabaseAdmin
		.from("pr_project_user_permissions")
		.select("user_id,project_id,company_id")
		.in("user_id", assignmentUserIds);

	if (options?.companyId) {
		permissionProjectQuery = permissionProjectQuery.or(
			`company_id.eq.${options.companyId},company_id.is.null`,
		);
	}
	if (options?.projectId) {
		permissionProjectQuery = permissionProjectQuery.eq(
			"project_id",
			options.projectId,
		);
	}

	const [assignmentRes, permissionProjectRes] = await Promise.all([
		assignmentQuery,
		permissionProjectQuery,
	]);
	const assignmentRows = assignmentRes.data || [];
	const permissionProjectRows = permissionProjectRes.data || [];
	const assignmentError = assignmentRes.error;
	const permissionProjectError = permissionProjectRes.error;
	if (assignmentError) throw assignmentError;
	if (permissionProjectError) throw permissionProjectError;

	const assignmentLikeRows = [...assignmentRows, ...permissionProjectRows];

	const assignments = assignmentLikeRows.flatMap((row) => {
		if (typeof row.user_id !== "string" || typeof row.project_id !== "string") {
			return [];
		}
		const mappedUserId = lookupByAssignmentUserId.get(row.user_id);
		if (!mappedUserId) return [];
		return [
			{
				user_id: mappedUserId,
				project_id: row.project_id,
				company_id: typeof row.company_id === "string" ? row.company_id : null,
			},
		];
	});

	const projectIds = Array.from(
		new Set(assignments.map((row) => row.project_id).filter(Boolean)),
	);
	const projectNameById = new Map<string, string>();

	if (projectIds.length > 0) {
		let projectQuery = supabaseAdmin
			.from("pr_projects")
			.select("id,name")
			.in("id", projectIds);
		if (options?.companyId) {
			projectQuery = projectQuery.eq("company_id", options.companyId);
		}
		const { data: projectRows, error: projectError } = await projectQuery;
		if (projectError) throw projectError;

		(projectRows || []).forEach((project) => {
			if (project?.id) {
				projectNameById.set(project.id, project.name || project.id);
			}
		});
	}

	const projectAccessByUser = new Map<
		string,
		Array<{ id: string; name: string; company_id: string | null }>
	>();
	assignments.forEach((assignment) => {
		const list = projectAccessByUser.get(assignment.user_id) || [];
		const exists = list.some((project) => project.id === assignment.project_id);
		if (!exists) {
			list.push({
				id: assignment.project_id,
				name: projectNameById.get(assignment.project_id) || assignment.project_id,
				company_id: assignment.company_id || null,
			});
		}
		projectAccessByUser.set(assignment.user_id, list);
	});

	return users.map((user) => ({
		...user,
		project_access: projectAccessByUser.get(user.id) || [],
	}));
}

export async function GET(req: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	try {
		const access = await validateAdminAccess(req);
		if (!access.ok) {
			return NextResponse.json({ error: access.error }, { status: access.status });
		}

		const { searchParams } = new URL(req.url);
		const companyId = searchParams.get("company_id");
		const projectId = searchParams.get("project_id");
		const includeDev = searchParams.get("include_dev") === "true";
		const includeUnassigned = searchParams.get("include_unassigned") === "true";

		// If a project is selected, return only users assigned to that project.
		if (projectId) {
			const assignmentQuery = supabaseAdmin
				.from("pr_project_users")
				.select("user_id")
				.eq("project_id", projectId);

				const assignmentRes = companyId
					? await assignmentQuery.or(`company_id.eq.${companyId},company_id.is.null`)
					: await assignmentQuery;
			if (assignmentRes.error) {
				return NextResponse.json(
					{ error: assignmentRes.error.message || assignmentRes.error },
					{ status: 500 },
				);
			}
			const userIds = Array.from(
				new Set((assignmentRes.data || []).map((row) => row.user_id).filter(Boolean)),
			) as string[];

			const [projectUsersRes, companyUsersRes, devUsersRes] = await Promise.all([
				userIds.length > 0
					? supabaseAdmin
							.from("pr_users")
							.select("*")
							.in("id", userIds)
							.order("created_at", { ascending: false })
					: Promise.resolve({ data: [], error: null }),
				includeUnassigned && companyId
					? supabaseAdmin
							.from("pr_users")
							.select("*")
							.eq("company_id", companyId)
							.order("created_at", { ascending: false })
					: Promise.resolve({ data: [], error: null }),
				includeDev
					? supabaseAdmin
							.from("pr_users")
							.select("*")
							.eq("role", "dev")
							.order("created_at", { ascending: false })
					: Promise.resolve({ data: [], error: null }),
			]);

			if (projectUsersRes.error) {
				console.error("Error fetching project users (admin GET):", projectUsersRes.error);
				return NextResponse.json(
					{ error: projectUsersRes.error.message || projectUsersRes.error },
					{ status: 500 },
				);
			}
			if (companyUsersRes.error) {
				console.error("Error fetching company users (admin GET):", companyUsersRes.error);
				return NextResponse.json(
					{ error: companyUsersRes.error.message || companyUsersRes.error },
					{ status: 500 },
				);
			}
			if (devUsersRes.error) {
				console.error("Error fetching dev users (admin GET):", devUsersRes.error);
				return NextResponse.json(
					{ error: devUsersRes.error.message || devUsersRes.error },
					{ status: 500 },
				);
			}

			const merged = [
				...(projectUsersRes.data || []),
				...(companyUsersRes.data || []),
				...(devUsersRes.data || []),
			];
			const uniqueById = new Map<string, (typeof merged)[number]>();
			for (const row of merged) uniqueById.set(row.id, row);
				const scopedUsers = Array.from(uniqueById.values()) as UserWithId[];
				const enrichedUsers = await enrichUsersWithProjectAccess(scopedUsers, {
					companyId,
					// When include_unassigned is enabled, keep full project access per user
					// so the UI can show real assignments and avoid false "Sin acceso".
					projectId: includeUnassigned ? null : projectId,
				});
			return NextResponse.json({ users: enrichedUsers }, { status: 200 });
		}

		let query = supabaseAdmin.from("pr_users").select("*").order("created_at", {
			ascending: false,
		});

		if (companyId) {
			query = includeDev
				? query.or(`company_id.eq.${companyId},role.eq.dev`)
				: query.eq("company_id", companyId);
		}

		const { data, error } = await query;
		if (error) {
			console.error("Error fetching pr_users (admin GET):", error);
			return NextResponse.json(
				{ error: error.message || error },
				{ status: 500 },
			);
		}

		const users = (data || []) as UserWithId[];
		const enrichedUsers = await enrichUsersWithProjectAccess(users, {
			companyId,
			projectId: null,
		});
		return NextResponse.json({ users: enrichedUsers }, { status: 200 });
	} catch (err) {
		console.error("Unexpected admin PR GET error", err);
		return NextResponse.json({ error: String(err) }, { status: 500 });
	}
}

export async function POST(req: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	try {
		const access = await validateAdminAccess(req);
		if (!access.ok) {
			return NextResponse.json({ error: access.error }, { status: access.status });
		}

		const body = await req.json();
		const {
			email,
			first_name,
			name,
			last_name,
			phone,
			role,
			company_id,
			project_id,
			new_password_create,
		} =
			body || {};
		const normalizedFirstName = (
			typeof first_name === "string" ? first_name : name
		)?.trim();
		const normalizedRole = typeof role === "string" ? role.trim().toLowerCase() : "user";
		const allowedRoles = ["admin", "user", "viewer", "dev"];
		if (!allowedRoles.includes(normalizedRole)) {
			return NextResponse.json({ error: "Invalid role" }, { status: 400 });
		}
		if (!email || !normalizedFirstName)
			return NextResponse.json({ error: "Missing fields" }, { status: 400 });
		// Allow creation without company_id for developer/superuser role
		if (normalizedRole !== "dev" && !company_id)
			return NextResponse.json(
				{ error: "Missing company_id for non-dev user" },
				{ status: 400 },
			);
		if (normalizedRole !== "dev" && !project_id)
			return NextResponse.json(
				{ error: "Missing project_id for non-dev user" },
				{ status: 400 },
			);
		const passwordForCreate =
			typeof new_password_create === "string"
				? new_password_create.trim()
				: "";
		if (passwordForCreate && passwordForCreate.length < 8) {
			return NextResponse.json(
				{ error: "La contraseña debe tener al menos 8 caracteres" },
				{ status: 400 },
			);
		}

		const normalizedEmail = String(email).trim().toLowerCase();

		// create auth user (or reuse existing if email already registered)
		let authUserId: string | null = null;
		let createdAuthUser = false;
		try {
			const randomPassword = crypto.randomUUID();
			const effectivePassword = passwordForCreate || randomPassword;
			let authData: { user?: { id?: string } } | null = null;
			let authErr: unknown = null;
			try {
				const resp = await supabaseAdmin.auth.admin.createUser({
					email: normalizedEmail,
					password: effectivePassword,
					email_confirm: true,
				});
				authData = resp.data as { user?: { id?: string } };
				authErr = resp.error as unknown;
			} catch (innerErr) {
				// Supabase may throw for certain auth errors (e.g. email exists)
				authErr = innerErr;
			}

			if (authErr) {
				console.error("Error creating auth user (pr):", authErr);
				const msg = getErrorMessage(authErr).toLowerCase();
				// If user already exists in Auth, fetch existing user by exact email and reuse.
				if (
					msg.includes("already") ||
					msg.includes("email_exists") ||
					msg.includes("already registered") ||
					msg.includes("already exists")
				) {
					const existingAuthUserId = await findAuthUserIdByEmail(normalizedEmail);
					if (!existingAuthUserId) {
						return NextResponse.json(
							{
								error:
									"El correo ya está registrado en Auth, pero no se pudo recuperar el usuario existente",
							},
							{ status: 409 },
						);
					}
					authUserId = existingAuthUserId;
					createdAuthUser = false;
					if (passwordForCreate) {
						const updateResp = await supabaseAdmin.auth.admin.updateUserById(
							authUserId,
							{
								password: passwordForCreate,
							},
						);
						if (updateResp.error) {
							return NextResponse.json(
								{
									error:
										updateResp.error.message ||
										"No se pudo actualizar la contraseña del usuario existente",
								},
								{ status: 500 },
							);
						}
					}
				} else {
					return NextResponse.json(
						{ error: getErrorMessage(authErr) || String(authErr) },
						{ status: 400 },
					);
				}
			} else {
				if (!authData?.user?.id)
					return NextResponse.json(
						{ error: "No se pudo crear usuario en Auth" },
						{ status: 500 },
					);
				authUserId = authData.user.id;
				createdAuthUser = true;
			}
		} catch (e) {
			console.error("Unexpected error creating auth user (pr):", e);
			return NextResponse.json({ error: String(e) }, { status: 500 });
		}

		// insert into pr_users using admin client
		const payload: JsonRecord = {
			id: authUserId,
			auth_id: authUserId,
			company_id: company_id || null,
			first_name: normalizedFirstName,
			last_name:
				typeof last_name === "string" && last_name.trim()
					? last_name.trim()
					: null,
			email: normalizedEmail,
			phone: phone || null,
			role: normalizedRole,
			status: "active",
			is_active: true,
		};

		// Ensure pr_users has a row for this auth user: use upsert to create or update
		try {
			const { data: upserted, error: upsertErr } = await supabaseAdmin
				.from("pr_users")
				.upsert([payload], { onConflict: "id" })
				.select()
				.single();

			if (upsertErr) {
				console.error("Error upserting pr_users (admin):", upsertErr);
				// rollback auth user only if we created it in this request
				try {
					if (createdAuthUser && authUserId)
						await supabaseAdmin.auth.admin.deleteUser(authUserId);
				} catch (delErr) {
					console.error(
						"Failed to rollback auth user after pr_users upsert failure",
						delErr,
					);
				}
				return NextResponse.json(
					{ error: upsertErr.message || upsertErr },
					{ status: 500 },
				);
			}

			if (normalizedRole !== "dev") {
				const { data: projectRow, error: projectErr } = await supabaseAdmin
					.from("pr_projects")
					.select("id, company_id")
					.eq("id", project_id)
					.eq("company_id", company_id)
					.maybeSingle();
				if (projectErr || !projectRow) {
					return NextResponse.json(
						{ error: "Project does not belong to the selected company" },
						{ status: 400 },
					);
				}

				const assignmentPayload = {
					company_id,
					project_id,
					user_id: upserted.id,
					status: "active",
				};
				const { error: assignErr } = await supabaseAdmin
					.from("pr_project_users")
					.upsert([assignmentPayload], { onConflict: "project_id,user_id" });
				if (assignErr) {
					return NextResponse.json(
						{ error: assignErr.message || assignErr },
						{ status: 500 },
					);
				}
			}

			return NextResponse.json(
				{
					user: upserted,
					auth_created: createdAuthUser,
					project_id: normalizedRole === "dev" ? null : project_id,
				},
				{ status: 200 },
			);
		} catch (e) {
			console.error("Unexpected error upserting pr_users (admin):", e);
			try {
				if (createdAuthUser && authUserId)
					await supabaseAdmin.auth.admin.deleteUser(authUserId);
			} catch (delErr) {
				console.error(
					"Failed to rollback auth user after unexpected upsert failure",
					delErr,
				);
			}
			return NextResponse.json({ error: String(e) }, { status: 500 });
		}
	} catch (err) {
		console.error("Unexpected admin PR POST error", err);
		return NextResponse.json({ error: String(err) }, { status: 500 });
	}
}

export async function PATCH(req: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	try {
		const access = await validateAdminAccess(req);
		if (!access.ok) {
			return NextResponse.json({ error: access.error }, { status: access.status });
		}

		const body = await req.json();
		const {
			id,
			auth_id,
			first_name,
			name,
			last_name,
			email,
			phone,
			role,
			status,
			company_id,
			project_id,
			is_active,
			document,
			new_password,
		} = body || {};
		if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

		const updates: JsonRecord = {};
		if (typeof first_name === "string") updates.first_name = first_name.trim();
		else if (typeof name === "string") updates.first_name = name.trim();
		if (typeof email === "string") updates.email = email.trim().toLowerCase();
		if (typeof phone === "string" || phone === null)
			updates.phone = phone || null;
		if (typeof company_id === "string" || company_id === null)
			updates.company_id = company_id || null;
		if (typeof is_active === "boolean") updates.is_active = is_active;
		if (typeof last_name === "string" || last_name === null)
			updates.last_name = last_name || null;
		if (typeof document === "string" || document === null)
			updates.document = document || null;

		if (typeof role === "string") {
			const allowedRoles = ["admin", "user", "viewer", "dev"];
			if (!allowedRoles.includes(role)) {
				return NextResponse.json({ error: "Invalid role" }, { status: 400 });
			}
			updates.role = role;
		}

		if (typeof status === "string") {
			const allowedStatus = ["active", "inactive", "pending"];
			if (!allowedStatus.includes(status)) {
				return NextResponse.json({ error: "Invalid status" }, { status: 400 });
			}
			updates.status = status;
			updates.is_active = status === "active";
		}

		const passwordToSet =
			typeof new_password === "string" ? new_password.trim() : "";
		if (passwordToSet && passwordToSet.length < 8) {
			return NextResponse.json(
				{ error: "La nueva contraseña debe tener al menos 8 caracteres" },
				{ status: 400 },
			);
		}

		const hasProfileUpdates = Object.keys(updates).length > 0;
		const hasPasswordUpdate = passwordToSet.length > 0;

		if (!hasProfileUpdates && !hasPasswordUpdate) {
			return NextResponse.json(
				{ error: "No updates provided" },
				{ status: 400 },
			);
		}

		let userData: JsonRecord | null = null;

		if (hasProfileUpdates) {
			const { data, error } = await supabaseAdmin
				.from("pr_users")
				.update(updates)
				.eq("id", id)
				.select()
				.single();

			if (error) {
				console.error("Error updating pr_users (admin):", error);
				return NextResponse.json(
					{ error: error.message || error },
					{ status: 500 },
				);
			}
			userData = (data as JsonRecord) || null;
		}

		if (hasPasswordUpdate) {
			const authUserIdCandidate =
				typeof auth_id === "string" && auth_id.trim() ? auth_id.trim() : id;
			let authUpdateError: { message?: string } | null = null;
			let passwordUpdated = false;
			let authUserUpdatedAt: string | null = null;
				const emailForAuthLookup =
					(typeof updates.email === "string" && updates.email.trim()) ||
					(typeof email === "string" && email.trim().toLowerCase()) ||
					"";

				const resolvedAuthIdByEmail = emailForAuthLookup
					? await findAuthUserIdByEmail(emailForAuthLookup)
					: null;

			const authIdsToTry = Array.from(
				new Set(
					[
						resolvedAuthIdByEmail,
						authUserIdCandidate,
					].filter(
						(value): value is string =>
							typeof value === "string" && value.trim().length > 0,
					),
				),
			);

			let successfulAuthTarget: string | null = null;
			for (const authIdToTry of authIdsToTry) {
				const attempt = await supabaseAdmin.auth.admin.updateUserById(authIdToTry, {
					password: passwordToSet,
				});
				if (!attempt.error) {
					passwordUpdated = true;
					authUpdateError = null;
					successfulAuthTarget = authIdToTry;
					try {
						const verifyRes = await supabaseAdmin
							.from("auth.users")
							.select("updated_at")
							.eq("id", authIdToTry)
							.maybeSingle();
						if (!verifyRes.error && verifyRes.data?.updated_at) {
							authUserUpdatedAt = String(verifyRes.data.updated_at);
						}
					} catch (verifyErr) {
						console.warn("Warning verifying auth.users.updated_at:", verifyErr);
					}
					break;
				}
				authUpdateError = attempt.error;
			}

			if (!passwordUpdated) {
				console.error("Error updating auth password (admin PR):", authUpdateError);
				return NextResponse.json(
					{
						error:
							authUpdateError?.message ||
							"No se pudo actualizar la contraseña del usuario en Authentication",
					},
					{ status: 500 },
				);
			}

			if (
				successfulAuthTarget &&
				(typeof auth_id !== "string" || auth_id !== successfulAuthTarget)
			) {
				const { error: syncAuthIdError } = await supabaseAdmin
					.from("pr_users")
					.update({ auth_id: successfulAuthTarget })
					.eq("id", id);
				if (syncAuthIdError) {
					console.warn(
						"Password updated but failed to sync pr_users.auth_id:",
						syncAuthIdError,
					);
				}
			}

			if (userData) {
				userData.auth_user_id_updated = successfulAuthTarget;
				userData.auth_user_updated_at = authUserUpdatedAt;
			}
		}

		if (role !== "dev" && typeof company_id === "string" && typeof project_id === "string") {
			const { data: projectRow, error: projectErr } = await supabaseAdmin
				.from("pr_projects")
				.select("id, company_id")
				.eq("id", project_id)
				.eq("company_id", company_id)
				.maybeSingle();
			if (projectErr || !projectRow) {
				return NextResponse.json(
					{ error: "Project does not belong to the selected company" },
					{ status: 400 },
				);
			}

			const { error: assignmentErr } = await supabaseAdmin
				.from("pr_project_users")
				.upsert(
					[
						{
							company_id,
							project_id,
							user_id: id,
							status: "active",
						},
					],
					{ onConflict: "project_id,user_id" },
				);
			if (assignmentErr) {
				return NextResponse.json(
					{ error: assignmentErr.message || assignmentErr },
					{ status: 500 },
				);
			}
		}

		return NextResponse.json(
			{
				user: userData,
				password_updated: hasPasswordUpdate,
				auth_user_id_updated:
					userData && typeof userData.auth_user_id_updated === "string"
						? userData.auth_user_id_updated
						: null,
				auth_user_updated_at:
					userData && typeof userData.auth_user_updated_at === "string"
						? userData.auth_user_updated_at
						: null,
			},
			{ status: 200 },
		);
	} catch (err) {
		console.error("Unexpected admin PR PATCH error", err);
		return NextResponse.json({ error: String(err) }, { status: 500 });
	}
}

export async function DELETE(req: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	try {
		const access = await validateAdminAccess(req);
		if (!access.ok) {
			return NextResponse.json({ error: access.error }, { status: access.status });
		}

		const body = await req.json();
		const { id, auth_id } = body || {};
		if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

		const { error: deleteProfileError } = await supabaseAdmin
			.from("pr_users")
			.delete()
			.eq("id", id);

		if (deleteProfileError) {
			console.error("Error deleting pr_users (admin):", deleteProfileError);
			return NextResponse.json(
				{ error: deleteProfileError.message || deleteProfileError },
				{ status: 500 },
			);
		}

		// Best-effort: also delete auth user when possible.
		const authUserId = auth_id || id;
		try {
			const { error: deleteAuthError } =
				await supabaseAdmin.auth.admin.deleteUser(authUserId);
			if (deleteAuthError) {
				console.warn("Warning deleting auth user (admin):", deleteAuthError);
			}
		} catch (e) {
			console.warn("Unexpected error deleting auth user (admin):", e);
		}

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err) {
		console.error("Unexpected admin PR DELETE error", err);
		return NextResponse.json({ error: String(err) }, { status: 500 });
	}
}
