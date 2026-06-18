"use client";
import { Save, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";

interface PRCompany {
	id: string;
	name: string;
}

type CollaboratorRaw = {
	[key: string]: unknown;
	id?: string;
	company_id?: string;
	empresa_id?: string;
	name?: string;
	full_name?: string;
	nombres?: string;
	first_name?: string;
	username?: string;
	email?: string;
	correo?: string;
	email_address?: string;
	phone?: string;
	telefono?: string;
	mobile?: string;
	created_at?: string;
	created?: string;
	last_name?: string;
	lastname?: string;
	apellidos?: string;
};

type Collaborator = {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	company_id: string | null;
	created_at: string | null;
	raw: CollaboratorRaw;
};

interface CreatePRUserModalProps {
	isOpen: boolean;
	onClose: () => void;
	onCreated?: () => void;
	companies: PRCompany[];
	defaultCompanyId?: string | null;
	defaultProjectId?: string | null;
}

export default function CreatePRUserModal({
	isOpen,
	onClose,
	onCreated,
	companies,
	defaultCompanyId,
	defaultProjectId,
}: CreatePRUserModalProps) {
	const [companyId, setCompanyId] = useState<string | null>(
		defaultCompanyId || null,
	);
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [role, setRole] = useState<string>("user");
	const [password, setPassword] = useState("");
	const [passwordConfirm, setPasswordConfirm] = useState("");
	const [projectId, setProjectId] = useState<string | null>(
		defaultProjectId || null,
	);
	const [projects, setProjects] = useState<
		Array<{ id: string; name: string; company_id?: string | null }>
	>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [mounted, setMounted] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
	const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<
		string | null
	>(null);

	const resetForm = useCallback(() => {
		setCompanyId(defaultCompanyId || null);
		setFirstName("");
		setLastName("");
		setEmail("");
		setPhone("");
		setRole("user");
		setPassword("");
		setPasswordConfirm("");
		setProjectId(defaultProjectId || null);
		setIsSaving(false);
		setError(null);
		setCollaborators([]);
		setSelectedCollaboratorId(null);
	}, [defaultCompanyId, defaultProjectId]);

	useEffect(() => setMounted(true), []);

	useEffect(() => {
		setCompanyId(defaultCompanyId || null);
		setProjectId(defaultProjectId || null);
	}, [defaultCompanyId, defaultProjectId]);

	useEffect(() => {
		// If role is dev, ensure no company is selected
		if (role === "dev") {
			setCompanyId(null);
			setProjectId(null);
		}
	}, [role]);

	const fetchProjectsForCompany = useCallback(
		async (cid: string | null) => {
			if (!cid) {
				setProjects([]);
				setProjectId(null);
				return;
			}
			try {
				let projectList: Array<{
					id: string;
					name: string;
					company_id?: string | null;
				}> = [];
				const session = await supabase.auth.getSession();
				const token = session.data.session?.access_token;

				if (token) {
					const params = new URLSearchParams({ company_id: cid });
					const response = await fetch(
						`/api/admin/pr/projects?${params.toString()}`,
						{ headers: { Authorization: `Bearer ${token}` } },
					);
					const json = (await response.json()) as {
						projects?: Array<{
							id: string;
							name: string;
							company_id?: string | null;
						}>;
						error?: string;
					};

					if (!response.ok) {
						throw new Error(json.error || "No se pudieron cargar proyectos");
					}

					projectList = json.projects || [];
				} else {
					const { data, error } = await supabase
						.from("pr_projects")
						.select("id,name,company_id")
						.eq("company_id", cid)
						.order("created_at", { ascending: false });
					if (error) throw error;
					projectList = data || [];
				}

				setProjects(projectList);
				setProjectId((prev) => {
					if (
						defaultProjectId &&
						projectList.some((project) => project.id === defaultProjectId)
					) {
						return defaultProjectId;
					}
					if (prev && projectList.some((project) => project.id === prev)) {
						return prev;
					}
					return projectList[0]?.id || null;
				});
			} catch (error) {
				console.error("[CreatePRUserModal] Error loading projects", error);
				setProjects([]);
				setProjectId(null);
			}
		},
		[defaultProjectId],
	);

	// Load collaborators when company changes
	const fetchCollaboratorsForCompany = useCallback(
		async (cid: string | null) => {
			if (!cid) {
				setCollaborators([]);
				setSelectedCollaboratorId(null);
				return;
			}

			console.debug(
				"[CreatePRUserModal] Loading collaborators for company:",
				cid,
			);
			try {
				const { data: firstData, error } = await supabase
					.from("pr_collaborators")
					.select("*")
					.eq("company_id", cid)
					.order("created_at", { ascending: false });
				let data = firstData;

				if (error) {
					console.warn(
						"[CreatePRUserModal] Error loading collaborators with eq filter",
						error,
					);
					data = null;
				}

				// If the eq filter returned no rows (possible type mismatch), try fetching all and filter client-side
				if (!data || (Array.isArray(data) && data.length === 0)) {
					console.debug(
						"[CreatePRUserModal] eq filter returned no rows — fetching all collaborators as fallback",
					);
					const allResp = await supabase
						.from("pr_collaborators")
						.select("*")
						.order("created_at", { ascending: false });

					if (allResp.error) {
						console.warn(
							"[CreatePRUserModal] Error fetching all collaborators",
							allResp.error,
						);
						setCollaborators([]);
						return;
					}

					const all = allResp.data || [];
					const filteredRaw = (all as CollaboratorRaw[]).filter(
						(c) => String(c.company_id) === String(cid),
					);
					const filtered = filteredRaw
						.filter((c): c is CollaboratorRaw & { id: string } => Boolean(c.id))
						.map((c) => ({
							id: c.id,
							name:
								c.name ||
								c.full_name ||
								c.nombres ||
								c.first_name ||
								c.username ||
								c.email ||
								"",
							email: c.email || c.correo || c.email_address || "",
							phone: c.phone || c.telefono || c.mobile || null,
							company_id: c.company_id || c.empresa_id || null,
							created_at: c.created_at || c.created || null,
							raw: c,
						}));
					console.debug(
						"[CreatePRUserModal] Fallback filtered collaborators count:",
						filtered.length,
						"sample:",
						filtered.slice(0, 3),
					);
					setCollaborators(filtered);
					return;
				}

				const normalized = ((data || []) as CollaboratorRaw[])
					.filter((c): c is CollaboratorRaw & { id: string } => Boolean(c.id))
					.map((c) => ({
						id: c.id,
						name:
							c.name ||
							c.full_name ||
							c.nombres ||
							c.first_name ||
							c.username ||
							c.email ||
							"",
						email: c.email || c.correo || c.email_address || "",
						phone: c.phone || c.telefono || c.mobile || null,
						company_id: c.company_id || c.empresa_id || null,
						created_at: c.created_at || c.created || null,
						raw: c,
					}));
				console.debug(
					"[CreatePRUserModal] Collaborators loaded:",
					normalized.length,
					"sample:",
					normalized.slice(0, 3),
				);
				setCollaborators(normalized);
			} catch (e) {
				console.error(
					"[CreatePRUserModal] Unexpected error loading collaborators",
					e,
				);
				setCollaborators([]);
			}
		},
		[],
	);

	useEffect(() => {
		// when default company changes initialize and fetch collaborators
		setCompanyId(defaultCompanyId || null);
		fetchCollaboratorsForCompany(defaultCompanyId || null);
		fetchProjectsForCompany(defaultCompanyId || null);
	}, [defaultCompanyId, fetchCollaboratorsForCompany, fetchProjectsForCompany]);

	// Reset form when modal is closed
	useEffect(() => {
		if (!isOpen) {
			resetForm();
		}
	}, [isOpen, resetForm]);

	useEffect(() => {
		// fetch when the selected company changes
		fetchCollaboratorsForCompany(companyId);
		fetchProjectsForCompany(companyId);
		// clear any previously selected collaborator when company changes
		setSelectedCollaboratorId(null);
	}, [companyId, fetchCollaboratorsForCompany, fetchProjectsForCompany]);

	if (!isOpen || !mounted) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		if (role !== "dev" && !companyId) {
			setError("Selecciona una empresa");
			return;
		}
		if (role !== "dev" && !projectId) {
			setError("Selecciona un proyecto");
			return;
		}
		if (!email || !firstName) {
			setError("Nombre y correo son obligatorios");
			return;
		}
		if (role !== "dev") {
			if (!password.trim()) {
				setError("La contraseña es obligatoria");
				return;
			}
			if (password.trim().length < 8) {
				setError("La contraseña debe tener al menos 8 caracteres");
				return;
			}
			if (password !== passwordConfirm) {
				setError("Las contraseñas no coinciden");
				return;
			}
		}

		try {
			setIsSaving(true);
			const session = await supabase.auth.getSession();
			const token = session.data.session?.access_token;
			if (!token) {
				setError("No hay sesión activa");
				return;
			}
			// Create auth user + pr_users record via admin API (server-side with service role key)
			const resp = await fetch("/api/admin/pr/users", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					company_id: companyId,
					project_id: role === "dev" ? null : projectId,
					first_name: firstName,
					last_name: lastName,
						email,
						phone,
						role,
						new_password_create: role === "dev" ? null : password.trim(),
					}),
				});
			const json = await resp.json();
			if (!resp.ok) {
				console.error("Error creating pr_user via admin API:", json);
				setError(json?.error || "Error creando usuario");
				return;
			}
			const data = json?.user;

			// If we imported from a collaborator, link the collaborator row to the newly created pr_user
			try {
				const newUserId =
					typeof (data as { id?: string } | undefined)?.id === "string"
						? (data as { id: string }).id
						: null;
				if (selectedCollaboratorId && newUserId) {
					const { error: updateErr } = await supabase
						.from("pr_collaborators")
						.update({ user_id: newUserId })
						.eq("id", selectedCollaboratorId);

					if (updateErr) {
						console.warn(
							"No se pudo vincular pr_collaborator -> pr_user:",
							updateErr,
						);
					} else {
						console.debug(
							"Vinculado pr_collaborator",
							selectedCollaboratorId,
							"-> pr_user",
							newUserId,
						);
					}
				}
			} catch (e) {
				console.error("Error vinculando collaborator:", e);
			}

			// reset local form state then notify parent
			resetForm();
			if (onCreated) onCreated();
			onClose();
		} finally {
			setIsSaving(false);
		}
	};

	return createPortal(
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<button
				type="button"
				className="absolute inset-0 bg-black/40"
				onClick={() => {
					if (!isSaving) {
						resetForm();
						onClose();
					}
				}}
			/>
			<div className="relative bg-white rounded-md shadow-lg w-full max-w-2xl mx-4">
				<div className="flex items-center justify-between px-14 sm:px-16 py-4 border-b">
					<h3 className="text-lg font-semibold p-2 sm:px-4 sm:py-2">
						Crear Nuevo Usuario PR
					</h3>
					<button
						type="button"
						onClick={() => {
							if (!isSaving) {
								resetForm();
								onClose();
							}
						}}
						className="p-2 text-gray-600 hover:text-gray-800"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
					<div>
						<label
							htmlFor="pr-new-user-company"
							className="block text-sm text-gray-700 mb-1"
						>
							Empresa
						</label>
						<select
							id="pr-new-user-company"
							value={companyId || ""}
							onChange={(e) => setCompanyId(e.target.value || null)}
							className="w-full px-3 py-2 border rounded-md"
						>
							<option value="">-- Seleccionar empresa --</option>
							{companies.map((c) => (
								<option key={c.id} value={c.id}>
									{c.name}
								</option>
							))}
						</select>
						{role === "dev" && (
							<p className="text-sm text-gray-500 mt-1">
								Los usuarios con rol <strong>Dev</strong> no requieren empresa.
							</p>
						)}
					</div>

					<div>
						<label
							htmlFor="pr-new-user-project"
							className="block text-sm text-gray-700 mb-1"
						>
							Proyecto
						</label>
						<select
							id="pr-new-user-project"
							value={projectId || ""}
							onChange={(e) => setProjectId(e.target.value || null)}
							className="w-full px-3 py-2 border rounded-md"
							disabled={role === "dev" || !companyId}
						>
							<option value="">
								{!companyId
									? "-- Selecciona empresa --"
									: projects.length === 0
										? "-- No hay proyectos --"
										: "-- Selecciona proyecto --"}
							</option>
							{projects.map((project) => (
								<option key={project.id} value={project.id}>
									{project.name}
								</option>
							))}
						</select>
					</div>

					{/* Import collaborator from existing pr_collaborators for the selected company */}
					{companyId && (
						<div>
							<label
								htmlFor="pr-new-user-collaborator"
								className="block text-sm text-gray-700 mb-1"
							>
								Importar desde colaboradores
							</label>
							<div className="flex items-center justify-between mb-2">
								<div className="text-sm text-gray-600">
									Colaboradores: {collaborators.length}
								</div>
								<button
									type="button"
									onClick={() => fetchCollaboratorsForCompany(companyId)}
									className="text-sm text-orange-600 hover:underline"
								>
									Refrescar
								</button>
							</div>

							<select
								id="pr-new-user-collaborator"
								value={selectedCollaboratorId || ""}
								onChange={(e) => {
									const id = e.target.value || null;
									setSelectedCollaboratorId(id);
									if (!id) return;
									const coll = collaborators.find((c) => c.id === id);
									if (coll) {
										if (coll.name) setFirstName(coll.name);
										const rawLastName =
											coll.raw?.last_name ||
											coll.raw?.lastname ||
											coll.raw?.apellidos ||
											"";
										if (rawLastName) setLastName(rawLastName);
										if (coll.email) setEmail(coll.email);
										if (coll.phone) setPhone(coll.phone);
									}
								}}
								className="w-full px-3 py-2 border rounded-md"
							>
								<option value="">-- No importar --</option>
								{collaborators.length === 0 ? (
									<option value="" disabled>
										No hay colaboradores
									</option>
								) : (
									collaborators.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name} — {c.email}
										</option>
									))
								)}
							</select>
						</div>
					)}

					<div>
						<label
							htmlFor="pr-new-user-name"
							className="block text-sm text-gray-700 mb-1"
						>
							Nombre
						</label>
						<input
							id="pr-new-user-name"
							value={firstName}
							onChange={(e) => setFirstName(e.target.value)}
							className="w-full px-3 py-2 border rounded-md"
						/>
					</div>

					<div>
						<label
							htmlFor="pr-new-user-last-name"
							className="block text-sm text-gray-700 mb-1"
						>
							Apellido
						</label>
						<input
							id="pr-new-user-last-name"
							value={lastName}
							onChange={(e) => setLastName(e.target.value)}
							className="w-full px-3 py-2 border rounded-md"
						/>
					</div>

					<div>
						<label
							htmlFor="pr-new-user-email"
							className="block text-sm text-gray-700 mb-1"
						>
							Correo
						</label>
						<input
							id="pr-new-user-email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							type="email"
							className="w-full px-3 py-2 border rounded-md"
						/>
					</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							<div>
							<label
								htmlFor="pr-new-user-phone"
								className="block text-sm text-gray-700 mb-1"
							>
								Teléfono
							</label>
							<input
								id="pr-new-user-phone"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								className="w-full px-3 py-2 border rounded-md"
							/>
						</div>
						<div>
							<label
								htmlFor="pr-new-user-role"
								className="block text-sm text-gray-700 mb-1"
							>
								Rol
							</label>
							<select
								id="pr-new-user-role"
								value={role}
								onChange={(e) => setRole(e.target.value)}
								className="w-full px-3 py-2 border rounded-md"
							>
								<option value="user">Usuario</option>
								<option value="admin">Administrador</option>
								<option value="viewer">Visualizador</option>
								<option value="dev">Desarrollador (Dev)</option>
								{/* Removed deprecated roles */}
							</select>
							</div>
						</div>

						{role !== "dev" && (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								<div>
									<label
										htmlFor="pr-new-user-password"
										className="block text-sm text-gray-700 mb-1"
									>
										Contraseña
									</label>
									<input
										id="pr-new-user-password"
										type="password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										placeholder="Mínimo 8 caracteres"
										className="w-full px-3 py-2 border rounded-md"
									/>
								</div>
								<div>
									<label
										htmlFor="pr-new-user-password-confirm"
										className="block text-sm text-gray-700 mb-1"
									>
										Confirmar contraseña
									</label>
									<input
										id="pr-new-user-password-confirm"
										type="password"
										value={passwordConfirm}
										onChange={(e) => setPasswordConfirm(e.target.value)}
										placeholder="Repite la contraseña"
										className="w-full px-3 py-2 border rounded-md"
									/>
								</div>
							</div>
						)}

						{error && <div className="text-sm text-red-600">{error}</div>}

					<div className="flex items-center justify-end gap-2">
						<button
							type="button"
							onClick={() => {
								resetForm();
								onClose();
							}}
							disabled={isSaving}
							className="px-4 py-2 bg-gray-100 rounded-md"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={isSaving}
							className="px-4 py-2 bg-orange-600 text-white rounded-md flex items-center gap-2"
						>
							{isSaving ? (
								"Creando..."
							) : (
								<>
									<Save className="w-4 h-4" />
									Crear
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>,
		document.body,
	);
}
