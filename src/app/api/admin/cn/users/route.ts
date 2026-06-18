import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_AVAILABLE = Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
if (!ADMIN_AVAILABLE) {
	console.error(
		"Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL for admin API",
	);
}

const supabaseAdmin = createClient(SUPABASE_URL || "", SERVICE_ROLE_KEY || "", {
	auth: { persistSession: false },
});

type AuthUserLite = {
	id: string;
	email: string | null;
	banned_until: string | null;
};

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}

async function loadAllAuthUsersLite(): Promise<AuthUserLite[]> {
	const perPage = 200;
	let page = 1;
	const results: AuthUserLite[] = [];

	while (page <= 50) {
		const { data, error } = await supabaseAdmin.auth.admin.listUsers({
			page,
			perPage,
		});
		if (error) {
			console.warn("Could not list auth users", error);
			break;
		}

		const batch = data?.users || [];
		for (const user of batch) {
			results.push({
				id: user.id,
				email: user.email ? user.email.trim().toLowerCase() : null,
				banned_until:
					(user as unknown as { banned_until?: string | null }).banned_until ||
					null,
			});
		}

		if (batch.length < perPage) break;
		page += 1;
	}

	return results;
}

function resolveAuthUserForCnUser(
	cnUser: Record<string, unknown>,
	authById: Map<string, AuthUserLite>,
	authByEmail: Map<string, AuthUserLite>,
): AuthUserLite | null {
	const idCandidates = [cnUser.id, cnUser.auth_user_id, cnUser.user_id]
		.map((value) => (typeof value === "string" ? value : null))
		.filter(Boolean) as string[];

	for (const candidate of idCandidates) {
		const found = authById.get(candidate);
		if (found) return found;
	}

	const email =
		typeof cnUser.email === "string" ? cnUser.email.trim().toLowerCase() : "";
	if (!email) return null;

	return authByEmail.get(email) || null;
}

function normalizePhoneForAuth(raw: unknown): string | null {
	if (raw === null || raw === undefined) return null;
	const value = String(raw).trim();
	if (!value) return null;
	// Store for Auth as country_code + number without '+' (e.g. 56944344583)
	const digitsOnly = value.replace(/\D/g, "");
	return digitsOnly || null;
}

function normalizePhoneForCnUsers(raw: unknown): string | null {
	const authPhone = normalizePhoneForAuth(raw);
	if (!authPhone) return null;
	// Store for cn_users as E.164-like with leading '+' (e.g. +56944344583)
	return `+${authPhone}`;
}

function nowInSantiagoLocalTimestamp(): string {
	// Useful when DB column is timestamp without time zone and should reflect Chile local time.
	const formatter = new Intl.DateTimeFormat("sv-SE", {
		timeZone: "America/Santiago",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
	const parts = formatter.formatToParts(new Date());
	const lookup = (type: string) =>
		parts.find((p) => p.type === type)?.value || "00";
	return `${lookup("year")}-${lookup("month")}-${lookup("day")} ${lookup("hour")}:${lookup("minute")}:${lookup("second")}`;
}

function adminConfigUnavailableResponse() {
	return NextResponse.json(
		{ error: "Admin API not configured" },
		{ status: 500 },
	);
}

function buildCnWelcomeEmailHtml(
	fullName: string | null | undefined,
	actionLink: string,
): string {
	const safeName =
		fullName && fullName.trim().length > 0 ? fullName.trim() : "Usuario";
	return `
  <div style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background:#0e7490;padding:20px 24px;color:#ffffff;font-size:20px;font-weight:700;">
                Ingenit CN
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px;">
                <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.2;color:#0f172a;">Bienvenido, ${safeName}</h1>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
                  Tu cuenta fue creada correctamente. Para definir tu contraseña y activar el acceso, haz clic en el botón:
                </p>
                <p style="margin:24px 0;">
                  <a href="${actionLink}"
                     style="display:inline-block;background:#0e7490;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">
                    Crear contraseña
                  </a>
                </p>
                <p style="margin:0 0 8px 0;font-size:13px;color:#64748b;">
                  Si el botón no funciona, copia y pega este enlace:
                </p>
                <p style="margin:0;font-size:12px;word-break:break-all;color:#0e7490;">
                  ${actionLink}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
                Este correo fue enviado automáticamente por Ingenit.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
  `;
}

async function sendCnWelcomeEmail(
	toEmail: string,
	fullName: string | null | undefined,
	actionLink: string,
) {
	const smtpHost = process.env.SMTP_HOST || "smtp.titan.email";
	const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
	const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
	const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
	const fromAddress =
		process.env.CN_EMAIL_FROM || smtpUser || process.env.EMAIL_USER;

	if (!smtpUser || !smtpPass || !fromAddress) {
		return { sent: false, reason: "SMTP config missing" };
	}

	const transporter = nodemailer.createTransport({
		host: smtpHost,
		port: smtpPort,
		secure: smtpPort === 465,
		auth: {
			user: smtpUser,
			pass: smtpPass,
		},
	});

	const html = buildCnWelcomeEmailHtml(fullName, actionLink);

	await transporter.sendMail({
		from: `"Ingenit CN" <${fromAddress}>`,
		to: toEmail,
		subject: "Bienvenido a Ingenit CN | Configura tu contraseña",
		html,
	});

	return { sent: true as const };
}
export async function GET(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	try {
		const { searchParams } = new URL(request.url);
		const limit = searchParams.get("limit")
			? parseInt(searchParams.get("limit") || "0", 10)
			: undefined;
		// fetch users
		let { data: users, error: usersError } = await supabaseAdmin
			.from("cn_users")
			.select("*")
			.maybeSingle();

		// If limit requested, use a paginated select
		if (limit && limit > 0) {
			const res = await supabaseAdmin.from("cn_users").select("*").limit(limit);
			users = (res.data ?? []) as Record<string, unknown>[];
			usersError = res.error;
		} else {
			// ensure users is array
			if (!Array.isArray(users)) {
				// if maybeSingle returned a single object, fetch array instead
				const res = await supabaseAdmin.from("cn_users").select("*");
				users = (res.data ?? []) as Record<string, unknown>[];
				usersError = res.error;
			}
		}

		if (usersError) {
			console.error("Admin GET cn_users error", usersError);
			return NextResponse.json(
				{ error: usersError.message || usersError },
				{ status: 500 },
			);
		}

		// If we have users, fetch latest session per user from cn_sessions
		const userIds = (users || [])
			.map((u: Record<string, unknown>) =>
				typeof u.id === "string" ? u.id : null,
			)
			.filter(Boolean) as string[];
		if (userIds.length > 0) {
			const { data: sessions, error: sessErr } = await supabaseAdmin
				.from("cn_sessions")
				.select("user_id,revoked,last_activity")
				.in("user_id", userIds)
				.order("last_activity", { ascending: false });

			if (sessErr) {
				console.warn("Could not fetch cn_sessions", sessErr);
			} else if (sessions && sessions.length > 0) {
				const sessionMap = new Map<
					string,
					{ revoked?: boolean | null; last_activity?: string | null }
				>();
				for (const s of sessions) {
					if (!sessionMap.has(s.user_id)) sessionMap.set(s.user_id, s);
				}
				// attach session info to users
				users = users.map((u: Record<string, unknown>) => {
					const userId = typeof u.id === "string" ? u.id : "";
					const s = sessionMap.get(userId);
					return {
						...u,
						last_session_revoked: s?.revoked ?? null,
						last_session_last_activity: s?.last_activity ?? null,
					};
				});
			}
		}

		// Attach Auth ban status from Supabase Auth (banned_until), resolving by id or email.
		const authUsers = await loadAllAuthUsersLite();
		const nowMs = Date.now();
		const expiredBans = authUsers.filter((user) => {
			if (!user.banned_until) return false;
			const endTs = new Date(user.banned_until).getTime();
			return !Number.isNaN(endTs) && endTs <= nowMs;
		});

		if (expiredBans.length > 0) {
			await Promise.allSettled(
				expiredBans.map(async (authUser) => {
					const { error } = await supabaseAdmin.auth.admin.updateUserById(
						authUser.id,
						{
							ban_duration: "none",
						},
					);
					if (error) {
						console.warn(
							"Could not auto-clear expired ban for auth user",
							authUser.id,
							error,
						);
						return;
					}
					authUser.banned_until = null;
				}),
			);
		}
		const authById = new Map<string, AuthUserLite>(
			authUsers.map((u) => [u.id, u]),
		);
		const authByEmail = new Map<string, AuthUserLite>(
			authUsers
				.filter((u) => Boolean(u.email))
				.map((u) => [u.email as string, u]),
		);

		users = users.map((u: Record<string, unknown>) => {
			const authInfo = resolveAuthUserForCnUser(
				u as Record<string, unknown>,
				authById,
				authByEmail,
			);
			const bannedUntil = authInfo?.banned_until ?? null;
			const isBanned = Boolean(
				bannedUntil && new Date(bannedUntil).getTime() > Date.now(),
			);
			return {
				...u,
				auth_banned_until: bannedUntil,
				auth_is_banned: isBanned,
			};
		});

		return NextResponse.json(
			{ users },
			{
				headers: {
					"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
				},
			},
		);
	} catch (err) {
		console.error("Unexpected admin GET error", err);
		return NextResponse.json({ error: String(err) }, { status: 500 });
	}
}
export async function POST(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();

	try {
		const body = await request.json();
		const clientId = body.client_id || crypto.randomUUID();

		// Validate and normalize email early
		if (!body.email || typeof body.email !== "string") {
			return NextResponse.json({ error: "Missing email" }, { status: 400 });
		}
		const email = body.email.trim().toLowerCase();
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return NextResponse.json({ error: "Email inválido" }, { status: 400 });
		}
		body.email = email;
		const normalizedPhoneForAuth = normalizePhoneForAuth(body.phone);
		const normalizedPhoneForCnUsers = normalizePhoneForCnUsers(body.phone);
		body.phone = normalizedPhoneForCnUsers;

		// Create auth user first if not provided so we can use the auth user id as cn_users.id
		const requestBody = body as Record<string, unknown>;
		let authUserId: string | null =
			(typeof requestBody.auth_user_id === "string"
				? requestBody.auth_user_id
				: null) ||
			(typeof requestBody.user_id === "string" ? requestBody.user_id : null);
		let createdAuthUser = false;
		if (!authUserId) {
			try {
				const randomPassword = crypto.randomUUID();
				const { data: authData, error: authErr } =
					await supabaseAdmin.auth.admin.createUser({
						email: body.email,
						phone: normalizedPhoneForAuth || undefined,
						password: randomPassword,
						email_confirm: true,
						phone_confirm: normalizedPhoneForAuth ? true : undefined,
						user_metadata: {
							full_name: body.full_name || null,
							display_name: body.full_name || null,
						},
					});
				if (authErr) {
					console.error("Error creating auth user:", authErr);
					const authErrCode = String(
						(authErr as { code?: unknown })?.code || "",
					).toLowerCase();
					const authErrMsg = String(
						(authErr as { message?: unknown })?.message || "",
					).toLowerCase();
					if (
						authErrCode === "phone_exists" ||
						authErrMsg.includes("phone") ||
						authErrMsg.includes("number already")
					) {
						return NextResponse.json(
							{ error: "El teléfono ya está registrado en Auth" },
							{ status: 409 },
						);
					}
					if (
						authErrCode === "email_exists" ||
						authErrMsg.includes("email") ||
						authErrMsg.includes("already")
					) {
						return NextResponse.json(
							{ error: "El correo ya está registrado en Auth" },
							{ status: 409 },
						);
					}
					return NextResponse.json(
						{ error: authErr.message || String(authErr) },
						{ status: 400 },
					);
				}
				if (!authData || !authData.user || !authData.user.id) {
					return NextResponse.json(
						{ error: "No se pudo crear usuario en Auth" },
						{ status: 500 },
					);
				}
				authUserId = authData.user.id;
				createdAuthUser = true;
			} catch (e) {
				console.error("Unexpected error creating auth user", e);
				return NextResponse.json({ error: String(e) }, { status: 500 });
			}
		}

		const isMissingColumnError = (err: unknown) => {
			const msg = getErrorMessage(err).toLowerCase();
			return (
				msg.includes("could not find the") ||
				msg.includes("in the schema cache") ||
				msg.includes("does not exist")
			);
		};

		// build payload for cn_users insert
		const payload: Record<string, unknown> = {
			...body,
			client_id: clientId,
			created_at: body.created_at || nowInSantiagoLocalTimestamp(),
			updated_at: body.updated_at || nowInSantiagoLocalTimestamp(),
			// set id to authUserId when available
			id: authUserId ?? undefined,
		};

		let { data, error } = await supabaseAdmin
			.from("cn_users")
			.insert(payload)
			.select()
			.single();

		if (error && isMissingColumnError(error)) {
			// retry without status field if column is not present in the DB
			console.warn("Status column missing, retrying insert without status");
			delete payload.status;
			({ data, error } = await supabaseAdmin
				.from("cn_users")
				.insert(payload)
				.select()
				.single());
		}

		if (error) {
			console.error("Admin POST cn_users error", error);
			// rollback auth user if we created one
			if (createdAuthUser && authUserId) {
				try {
					await supabaseAdmin.auth.admin.deleteUser(authUserId);
				} catch (delErr) {
					console.error(
						"Failed to rollback auth user after cn_users insert failure",
						delErr,
					);
				}
			}
			return NextResponse.json(
				{ error: error.message || error },
				{ status: 500 },
			);
		}

		// Ensure Auth.phone is set even when auth user already existed.
		if (authUserId) {
			try {
				const authPayload: {
					phone?: string;
					user_metadata?: Record<string, unknown>;
				} = {
					user_metadata: {
						full_name: body.full_name || null,
						display_name: body.full_name || null,
					},
				};
				if (normalizedPhoneForAuth) {
					authPayload.phone = normalizedPhoneForAuth;
				}
				const { error: authPhoneError } =
					await supabaseAdmin.auth.admin.updateUserById(
						authUserId,
						authPayload,
					);
				if (authPhoneError?.code === "phone_exists") {
					return NextResponse.json(
						{ error: "El teléfono ya está registrado en Auth" },
						{ status: 409 },
					);
				}
				if (authPhoneError) {
					console.warn(
						"Could not sync Auth phone after CN user creation",
						authPhoneError,
					);
				}
			} catch (authPhoneSyncError) {
				console.warn(
					"Unexpected error syncing Auth phone after CN user creation",
					authPhoneSyncError,
				);
			}
		}

		// Prefer custom branded email using Supabase recovery link + SMTP (Titan).
		try {
			const base = process.env.CN_BASE_URL || "https://cn.ingenit.cl";
			const redirectTo = `${base.replace(/\/$/, "")}/reset`;
			let customSent = false;

			try {
				const { data: linkData, error: linkErr } =
					await supabaseAdmin.auth.admin.generateLink({
						type: "recovery",
						email: body.email,
						options: {
							redirectTo,
						},
					});

				if (linkErr) {
					console.warn("Could not generate custom recovery link:", linkErr);
				} else {
					const actionLink =
						(
							linkData as {
								properties?: { action_link?: string };
								action_link?: string;
							}
						)?.properties?.action_link ||
						(
							linkData as {
								properties?: { action_link?: string };
								action_link?: string;
							}
						)?.action_link;
					if (actionLink) {
						const sendResult = await sendCnWelcomeEmail(
							body.email,
							body.full_name || null,
							actionLink,
						);
						customSent = Boolean(sendResult.sent);
						if (!customSent) {
							console.warn("Custom CN email not sent:", sendResult.reason);
						} else {
							console.info("Custom CN welcome email sent to:", body.email);
						}
					}
				}
			} catch (customMailError) {
				console.warn("Error sending custom CN welcome email:", customMailError);
			}

			// Fallback to Supabase template if custom email was not sent.
			if (!customSent) {
				const { error: resetErr } =
					await supabaseAdmin.auth.resetPasswordForEmail(body.email, {
						redirectTo,
					});
				if (resetErr) {
					console.warn(
						"Could not send Supabase password reset email:",
						resetErr,
					);
				} else {
					console.info("Supabase password reset email sent to:", body.email);
				}
			} else {
				console.info("CN user onboarding email sent with custom template");
			}
		} catch (e) {
			console.warn("Error triggering Supabase password reset:", e);
		}

		// Return user data
		const responseBody: { user: unknown } = { user: data };

		return NextResponse.json(responseBody, { status: 201 });
	} catch (err) {
		console.error("Unexpected admin POST error", err);
		return NextResponse.json({ error: String(err) }, { status: 500 });
	}
}

export async function PUT(request: Request) {
	if (!ADMIN_AVAILABLE) return adminConfigUnavailableResponse();
	try {
		const body = await request.json();
		const id = body.id;
		if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

		const updates: Record<string, unknown> = {};

		["email", "full_name", "phone", "status", "role"].forEach((k) => {
			if (body[k] !== undefined) updates[k] = body[k];
		});

		if (updates.phone !== undefined) {
			updates.phone = normalizePhoneForCnUsers(updates.phone);
		}

		// Normalize and validate email if present
		if (updates.email !== undefined) {
			if (!updates.email || typeof updates.email !== "string") {
				// If status was updated to a non-active value, revoke CN sessions for that user
				try {
					if (updates.status && updates.status !== "active") {
						// mark all cn_sessions for this user as revoked
						const { error: revokeErr } = await supabaseAdmin
							.from("cn_sessions")
							.update({ revoked: true })
							.eq("user_id", id);

						if (revokeErr)
							console.warn(
								"Could not revoke cn_sessions for user",
								id,
								revokeErr,
							);
					}
				} catch (e) {
					console.warn(
						"Error while revoking cn_sessions after status update",
						e,
					);
				}

				return NextResponse.json({ error: "Email inválido" }, { status: 400 });
			}
			const normalized = updates.email.trim().toLowerCase();
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(normalized))
				return NextResponse.json({ error: "Email inválido" }, { status: 400 });
			updates.email = normalized;
		}

		const isMissingColumnError = (err: unknown) => {
			const msg = getErrorMessage(err).toLowerCase();
			return (
				msg.includes("could not find the") ||
				msg.includes("in the schema cache") ||
				msg.includes("does not exist")
			);
		};

		// Resolve the real Auth user id from cn_users row (id/auth_user_id/user_id/email).
		let authTargetId: string | null = null;
		try {
			const { data: cnUserRow } = await supabaseAdmin
				.from("cn_users")
				.select("id,email,auth_user_id,user_id")
				.eq("id", id)
				.maybeSingle();

			const authUsers = await loadAllAuthUsersLite();
			const authById = new Map<string, AuthUserLite>(
				authUsers.map((u) => [u.id, u]),
			);
			const authByEmail = new Map<string, AuthUserLite>(
				authUsers
					.filter((u) => Boolean(u.email))
					.map((u) => [u.email as string, u]),
			);

			const resolved = resolveAuthUserForCnUser(
				(cnUserRow || { id, email: updates.email }) as Record<string, unknown>,
				authById,
				authByEmail,
			);
			authTargetId = resolved?.id || null;
		} catch (resolveErr) {
			console.warn("Could not resolve auth target user id", resolveErr);
		}

		// Optional: toggle ban/unban in Auth from admin panel
		if (body.auth_is_banned !== undefined) {
			const shouldBan = Boolean(body.auth_is_banned);
			const requestedBanDuration =
				typeof body.ban_duration === "string" ? body.ban_duration.trim() : "";
			const banDuration = requestedBanDuration || "24h";
			if (!authTargetId) {
				return NextResponse.json(
					{ error: "No se pudo resolver el usuario en Auth" },
					{ status: 404 },
				);
			}
			const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(
				authTargetId,
				{
					// Supabase Admin API expects ban_duration for banning/unbanning.
					ban_duration: shouldBan ? banDuration : "none",
				},
			);
			if (banErr) {
				console.error("Admin PUT auth ban error", banErr);
				return NextResponse.json(
					{ error: banErr.message || banErr },
					{ status: 500 },
				);
			}
		}

		let data: Record<string, unknown> | null = null;
		let error: { message?: string } | null = null;
		if (Object.keys(updates).length > 0) {
			({ data, error } = await supabaseAdmin
				.from("cn_users")
				.update(updates)
				.eq("id", id)
				.select()
				.single());
		} else {
			({ data, error } = await supabaseAdmin
				.from("cn_users")
				.select("*")
				.eq("id", id)
				.single());
		}

		if (error && isMissingColumnError(error)) {
			console.warn("Status column missing, retrying update without status");
			delete updates.status;
			({ data, error } = await supabaseAdmin
				.from("cn_users")
				.update(updates)
				.eq("id", id)
				.select()
				.single());
		}

		if (error) {
			console.error("Admin PUT cn_users error", error);
			return NextResponse.json(
				{ error: error.message || error },
				{ status: 500 },
			);
		}

		// Keep Auth.phone in sync for the same user id.
		if (updates.phone !== undefined || updates.full_name !== undefined) {
			try {
				if (!authTargetId) {
					console.warn("Skipping Auth sync: auth target not resolved for", id);
				} else {
					const authPayload: {
						phone?: string;
						user_metadata?: Record<string, unknown>;
					} = {};
					if (updates.phone !== undefined) {
						if (typeof updates.phone === "string" && updates.phone.length > 0) {
							const authPhone = normalizePhoneForAuth(updates.phone);
							authPayload.phone = authPhone || "";
						} else {
							// clear phone in auth if empty
							authPayload.phone = "";
						}
					}
					if (updates.full_name !== undefined) {
						authPayload.user_metadata = {
							full_name: updates.full_name || null,
							display_name: updates.full_name || null,
						};
					}
					const { error: authUpdateError } =
						await supabaseAdmin.auth.admin.updateUserById(
							authTargetId,
							authPayload,
						);
					if (authUpdateError) {
						console.warn(
							"Could not update Auth phone for user",
							authTargetId,
							authUpdateError,
						);
					}
				}
			} catch (authSyncError) {
				console.warn(
					"Unexpected error syncing Auth phone for user",
					id,
					authSyncError,
				);
			}
		}

		// Return cn user plus real Auth ban state so UI reflects server truth.
		let authBannedUntil: string | null = null;
		let authIsBanned = false;
		try {
			const lookupId = authTargetId || id;
			const { data: authUserData, error: authUserErr } =
				await supabaseAdmin.auth.admin.getUserById(lookupId);
			if (!authUserErr) {
				authBannedUntil = ((
					authUserData?.user as { banned_until?: string | null }
				)?.banned_until || null) as string | null;
				authIsBanned = Boolean(
					authBannedUntil && new Date(authBannedUntil).getTime() > Date.now(),
				);
			}
		} catch (authGetErr) {
			console.warn("Could not fetch auth user after update", authGetErr);
		}

		return NextResponse.json({
			user: {
				...data,
				auth_banned_until: authBannedUntil,
				auth_is_banned: authIsBanned,
			},
		});
	} catch (err) {
		console.error("Unexpected admin PUT error", err);
		return NextResponse.json({ error: String(err) }, { status: 500 });
	}
}

export async function DELETE(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get("id");
		if (!id)
			return NextResponse.json(
				{ error: "Missing id parameter" },
				{ status: 400 },
			);

		const { data, error } = await supabaseAdmin
			.from("cn_users")
			.delete()
			.eq("id", id)
			.select();

		if (error) {
			console.error("Admin DELETE cn_users error", error);
			return NextResponse.json(
				{ error: error.message || error },
				{ status: 500 },
			);
		}

		return NextResponse.json({ deleted: data });
	} catch (err) {
		console.error("Unexpected admin DELETE error", err);
		return NextResponse.json({ error: String(err) }, { status: 500 });
	}
}
