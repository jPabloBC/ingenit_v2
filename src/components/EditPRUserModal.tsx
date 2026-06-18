"use client";
import { Save, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PR_RESOURCE_LABELS } from "@/lib/prPermissions";
import { supabase } from "@/lib/supabaseClient";

interface PRCompany {
	id: string;
	name: string;
}

interface PRProject {
	id: string;
	name: string;
	company_id?: string | null;
}

interface PRUserEditable {
	id: string;
	auth_id?: string;
	first_name?: string;
	name?: string;
	last_name?: string;
	email: string;
	phone?: string;
	role: "admin" | "user" | "viewer" | "dev";
	status: "active" | "inactive" | "pending";
	company_id?: string;
	// Legacy fields kept temporarily for backwards compatibility during migration.
	nombres?: string;
	apellidos?: string;
	document?: string;
	is_active: boolean;
	created_at?: string;
	updated_at?: string;
	project_access?: Array<{ id: string; name: string; company_id?: string | null }>;
}

interface EditPRUserModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSaved?: () => void;
	user: PRUserEditable | null;
	companies: PRCompany[];
	defaultProjectId?: string;
}

export default function EditPRUserModal({
	isOpen,
	onClose,
	onSaved,
	user,
	companies,
	defaultProjectId,
}: EditPRUserModalProps) {
	const [mounted, setMounted] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [role, setRole] = useState<"admin" | "user" | "viewer" | "dev">("user");
	const [status, setStatus] = useState<"active" | "inactive" | "pending">(
		"active",
	);
	const [companyId, setCompanyId] = useState<string>("");
	const [projectId, setProjectId] = useState<string>("");
	const [projects, setProjects] = useState<PRProject[]>([]);
	const [documentValue, setDocumentValue] = useState("");
	const [isActive, setIsActive] = useState(true);
	const [newPassword, setNewPassword] = useState("");
	const [permissions, setPermissions] = useState<string[]>([]);
	const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
	const [permissionsLoading, setPermissionsLoading] = useState(false);
	const [permissionsError, setPermissionsError] = useState<string | null>(null);

	useEffect(() => setMounted(true), []);

	useEffect(() => {
		if (!isOpen || !user) return;
		setError(null);
		setPermissionsError(null);
		setFirstName(user.first_name || user.name || "");
		setLastName(user.last_name || user.apellidos || "");
		setEmail(user.email || "");
		setPhone(user.phone || "");
		setRole(user.role || "user");
		setStatus(user.status || "active");
		setCompanyId(user.company_id || "");
		setProjectId(defaultProjectId || user.project_access?.[0]?.id || "");
		setProjects([]);
		setDocumentValue(user.document || "");
		setIsActive(Boolean(user.is_active));
		setNewPassword("");
	}, [isOpen, user, defaultProjectId]);

	useEffect(() => {
		if (!isOpen || !user || role === "dev" || !companyId) {
			setProjects([]);
			setProjectId("");
			return;
		}
		let cancelled = false;
		(async () => {
			try {
				const session = await supabase.auth.getSession();
				const token = session.data.session?.access_token;
				if (!token) throw new Error("No hay sesión activa");
				const params = new URLSearchParams();
				params.set("company_id", companyId);
				const projectsRes = await fetch(
					`/api/admin/pr/projects?${params.toString()}`,
					{
						headers: { Authorization: `Bearer ${token}` },
					},
				);
				const projectsJson = (await projectsRes.json()) as {
					projects?: PRProject[];
					error?: string;
				};
				if (!projectsRes.ok) {
					throw new Error(projectsJson.error || "No se pudieron cargar proyectos");
				}
				if (cancelled) return;
				const projectList = (projectsJson.projects || []) as PRProject[];
				setProjects(projectList);
				const assignedProjectIdFromUser =
					user.project_access?.find((project) => project.company_id === companyId)
						?.id ||
					user.project_access?.[0]?.id ||
					"";
				const preferredProjectId =
					defaultProjectId && defaultProjectId !== "all"
						? defaultProjectId
						: assignedProjectIdFromUser;
				if (
					preferredProjectId &&
					projectList.some((project) => project.id === preferredProjectId)
				) {
					setProjectId(preferredProjectId);
				} else {
					setProjectId(projectList[0]?.id || "");
				}
			} catch {
				if (!cancelled) {
					setProjects([]);
					setProjectId("");
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [isOpen, user, role, companyId, defaultProjectId]);

	useEffect(() => {
		if (!isOpen || !user) return;
		if (role === "dev" || !companyId) {
			setPermissions([]);
			setAvailablePermissions([]);
			setPermissionsLoading(false);
			return;
		}

		let cancelled = false;
		(async () => {
			try {
				setPermissionsLoading(true);
				setPermissionsError(null);
				const session = await supabase.auth.getSession();
				const token = session.data.session?.access_token;
				if (!token) {
					setPermissionsError("No hay sesión activa");
					return;
				}
				const params = new URLSearchParams();
				params.set("company_id", companyId);
				if (projectId) params.set("project_id", projectId);
				const resp = await fetch(
					`/api/admin/pr/users/${encodeURIComponent(user.id)}/permissions?${params.toString()}`,
					{
						headers: {
							Authorization: `Bearer ${token}`,
						},
					},
				);
				const json = await resp.json();
				if (!resp.ok) {
					if (!cancelled) {
						setPermissionsError(
							json?.error || "No se pudieron cargar los permisos",
						);
					}
					return;
				}
				if (!cancelled) {
					setPermissions(Array.isArray(json?.permissions) ? json.permissions : []);
					setAvailablePermissions(
						Array.isArray(json?.available) ? json.available : [],
					);
				}
			} catch (err) {
				if (!cancelled) {
					setPermissionsError(
						err instanceof Error
							? err.message
							: "No se pudieron cargar los permisos",
					);
				}
			} finally {
				if (!cancelled) setPermissionsLoading(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [isOpen, user, role, companyId, projectId]);

	useEffect(() => {
		if (status === "active") setIsActive(true);
		if (status === "inactive") setIsActive(false);
	}, [status]);

	if (!isOpen || !mounted || !user) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		if (!firstName.trim()) {
			setError("El nombre es obligatorio");
			return;
		}
		if (!email.trim()) {
			setError("El correo es obligatorio");
			return;
		}
		if (role !== "dev" && !projectId) {
			setError("Selecciona un proyecto");
			return;
		}
		if (newPassword.trim().length > 0) {
			if (newPassword.trim().length < 8) {
				setError("La nueva contraseña debe tener al menos 8 caracteres");
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
			const resp = await fetch("/api/admin/pr/users", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
					body: JSON.stringify({
						id: user.id,
						auth_id: user.auth_id || undefined,
						first_name: firstName.trim(),
					last_name: lastName.trim() || null,
					email: email.trim(),
					phone: phone.trim() || null,
					role,
					status,
					company_id: role === "dev" ? null : companyId || null,
					project_id: role === "dev" ? null : projectId || null,
					document: documentValue.trim() || null,
					is_active: isActive,
					new_password: newPassword.trim() || undefined,
				}),
			});

			const json = await resp.json();
			if (!resp.ok) {
				setError(json?.error || "No se pudo actualizar el usuario");
				return;
			}

			if (role !== "dev" && companyId) {
				const permsResp = await fetch(
					`/api/admin/pr/users/${encodeURIComponent(user.id)}/permissions`,
					{
						method: "PATCH",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({
							company_id: companyId,
							project_id: projectId,
							permissions,
						}),
					},
				);
				const permsJson = await permsResp.json();
				if (!permsResp.ok) {
					setError(
						permsJson?.error || "No se pudieron guardar los permisos de acceso",
					);
					return;
				}
			}

			if (onSaved) onSaved();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error desconocido");
		} finally {
			setIsSaving(false);
		}
	};

	return createPortal(
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<button
				type="button"
				className="absolute inset-0 bg-black/40"
				onClick={() => !isSaving && onClose()}
				onKeyDown={(e) => {
					if ((e.key === "Enter" || e.key === " ") && !isSaving) onClose();
				}}
			/>
			<div className="relative bg-white rounded-md shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
				<div className="flex items-center justify-between px-14 sm:px-16 py-4 border-b">
					<h3 className="text-lg font-semibold p-2 sm:px-4 sm:py-2">
						Editar Usuario PR
					</h3>
					<button
						type="button"
						onClick={() => !isSaving && onClose()}
						className="p-2 text-gray-600 hover:text-gray-800"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						<div>
							<label
								htmlFor="pr-user-id"
								className="block text-sm text-gray-700 mb-1"
							>
								ID
							</label>
							<input
								id="pr-user-id"
								value={user.id}
								disabled
								className="w-full px-3 py-2 border rounded-md bg-gray-100"
							/>
						</div>
						<div>
							<label
								htmlFor="pr-user-auth-id"
								className="block text-sm text-gray-700 mb-1"
							>
								Auth ID
							</label>
							<input
								id="pr-user-auth-id"
								value={user.auth_id || ""}
								disabled
								className="w-full px-3 py-2 border rounded-md bg-gray-100"
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						<div>
							<label
								htmlFor="pr-user-first-name"
								className="block text-sm text-gray-700 mb-1"
							>
								Nombre
							</label>
							<input
								id="pr-user-first-name"
								value={firstName}
								onChange={(e) => setFirstName(e.target.value)}
								className="w-full px-3 py-2 border rounded-md"
							/>
						</div>
						<div>
							<label
								htmlFor="pr-user-email"
								className="block text-sm text-gray-700 mb-1"
							>
								Correo
							</label>
							<input
								id="pr-user-email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								type="email"
								className="w-full px-3 py-2 border rounded-md"
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						<div>
							<label
								htmlFor="pr-user-last-name"
								className="block text-sm text-gray-700 mb-1"
							>
								Apellido
							</label>
							<input
								id="pr-user-last-name"
								value={lastName}
								onChange={(e) => setLastName(e.target.value)}
								className="w-full px-3 py-2 border rounded-md"
							/>
						</div>
						<div>
							<label
								htmlFor="pr-user-document"
								className="block text-sm text-gray-700 mb-1"
							>
								Documento
							</label>
							<input
								id="pr-user-document"
								value={documentValue}
								onChange={(e) => setDocumentValue(e.target.value)}
								className="w-full px-3 py-2 border rounded-md"
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						<div>
							<label
								htmlFor="pr-user-phone"
								className="block text-sm text-gray-700 mb-1"
							>
								Teléfono
							</label>
							<input
								id="pr-user-phone"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								className="w-full px-3 py-2 border rounded-md"
							/>
						</div>
						<div>
							<label
								htmlFor="pr-user-company"
								className="block text-sm text-gray-700 mb-1"
							>
								Empresa
							</label>
							<select
								id="pr-user-company"
								value={companyId}
								onChange={(e) => setCompanyId(e.target.value)}
								className="w-full px-3 py-2 border rounded-md"
								disabled={role === "dev"}
							>
								<option value="">-- Sin empresa --</option>
								{companies.map((c) => (
									<option key={c.id} value={c.id}>
										{c.name}
									</option>
								))}
							</select>
						</div>
						<div>
							<label
								htmlFor="pr-user-project"
								className="block text-sm text-gray-700 mb-1"
							>
								Proyecto
							</label>
							<select
								id="pr-user-project"
								value={projectId}
								onChange={(e) => setProjectId(e.target.value)}
								className="w-full px-3 py-2 border rounded-md"
								disabled={role === "dev" || !companyId}
							>
								<option value="">
									{!companyId
										? "-- Sin empresa --"
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
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
						<div>
							<label
								htmlFor="pr-user-role"
								className="block text-sm text-gray-700 mb-1"
							>
								Rol
							</label>
							<select
								id="pr-user-role"
								value={role}
								onChange={(e) =>
									setRole(e.target.value as PRUserEditable["role"])
								}
								className="w-full px-3 py-2 border rounded-md"
							>
								<option value="user">Usuario</option>
								<option value="admin">Administrador</option>
								<option value="viewer">Visualizador</option>
								<option value="dev">Desarrollador (Dev)</option>
							</select>
						</div>
						<div>
							<label
								htmlFor="pr-user-status"
								className="block text-sm text-gray-700 mb-1"
							>
								Estado
							</label>
							<select
								id="pr-user-status"
								value={status}
								onChange={(e) =>
									setStatus(e.target.value as PRUserEditable["status"])
								}
								className="w-full px-3 py-2 border rounded-md"
							>
								<option value="active">Activo</option>
								<option value="inactive">Inactivo</option>
								<option value="pending">Pendiente</option>
							</select>
						</div>
						<div className="flex items-end pb-2">
							<label className="inline-flex items-center gap-2 text-sm text-gray-700">
								<input
									type="checkbox"
									checked={isActive}
									onChange={(e) => setIsActive(e.target.checked)}
									className="rounded border-gray-300"
								/>
								is_active
							</label>
						</div>
					</div>

					<div className="border rounded-md p-3 bg-amber-50">
						<div className="flex items-center justify-between mb-2">
							<h4 className="text-sm font-semibold text-gray-800">
								Restablecer contraseña
							</h4>
							<button
								type="button"
								className="text-xs px-2 py-1 rounded border border-amber-300 bg-white hover:bg-amber-100"
								onClick={() => {
									const generated = `Temp${Math.random().toString(36).slice(-8)}!`;
									setNewPassword(generated);
								}}
							>
								Generar temporal
							</button>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-1 gap-2">
							<div>
								<label
									htmlFor="pr-user-new-password"
									className="block text-sm text-gray-700 mb-1"
								>
									Nueva contraseña
								</label>
								<input
									id="pr-user-new-password"
									type="text"
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									placeholder="Dejar vacío para no cambiar"
									className="w-full px-3 py-2 border rounded-md"
								/>
							</div>
						</div>
						<p className="text-xs text-gray-600 mt-2">
							Si completas estos campos, se actualizará la contraseña en
							Authentication.
						</p>
					</div>

					<div className="border rounded-md p-3 bg-gray-50">
						<div className="flex items-center justify-between mb-2">
							<h4 className="text-sm font-semibold text-gray-800">
								Accesos PR (pr_user_permissions)
							</h4>
							{role === "dev" ? (
								<span className="text-xs text-gray-500">
									Dev tiene acceso total
								</span>
							) : !companyId ? (
								<span className="text-xs text-amber-600">
									Selecciona empresa para gestionar permisos
								</span>
							) : null}
						</div>
						{permissionsLoading ? (
							<p className="text-sm text-gray-500">Cargando permisos...</p>
						) : permissionsError ? (
							<p className="text-sm text-red-600">{permissionsError}</p>
						) : role === "dev" || !companyId ? (
							<p className="text-sm text-gray-500">
								No aplica edición de permisos para este usuario.
							</p>
						) : availablePermissions.length === 0 ? (
							<p className="text-sm text-gray-500">
								No hay recursos disponibles para asignar.
							</p>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								{availablePermissions.map((resourceKey) => {
									const checked = permissions.includes(resourceKey);
									return (
										<label
											key={resourceKey}
											className="inline-flex items-center gap-2 text-sm text-gray-700"
										>
											<input
												type="checkbox"
												checked={checked}
												onChange={(e) => {
													if (e.target.checked) {
														setPermissions((prev) =>
															Array.from(new Set([...prev, resourceKey])),
														);
													} else {
														setPermissions((prev) =>
															prev.filter((p) => p !== resourceKey),
														);
													}
												}}
												className="rounded border-gray-300"
											/>
											<span>
												{PR_RESOURCE_LABELS[resourceKey] || resourceKey}
											</span>
										</label>
									);
								})}
							</div>
						)}
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						<div>
							<label
								htmlFor="pr-user-created"
								className="block text-sm text-gray-700 mb-1"
							>
								Creado
							</label>
							<input
								id="pr-user-created"
								value={
									user.created_at
										? new Date(user.created_at).toLocaleString("es-CL")
										: ""
								}
								disabled
								className="w-full px-3 py-2 border rounded-md bg-gray-100"
							/>
						</div>
						<div>
							<label
								htmlFor="pr-user-updated"
								className="block text-sm text-gray-700 mb-1"
							>
								Actualizado
							</label>
							<input
								id="pr-user-updated"
								value={
									user.updated_at
										? new Date(user.updated_at).toLocaleString("es-CL")
										: ""
								}
								disabled
								className="w-full px-3 py-2 border rounded-md bg-gray-100"
							/>
						</div>
					</div>

					{error && <div className="text-sm text-red-600">{error}</div>}

					<div className="flex items-center justify-end gap-2">
						<button
							type="button"
							onClick={onClose}
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
								"Guardando..."
							) : (
								<>
									<Save className="w-4 h-4" />
									Guardar cambios
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
