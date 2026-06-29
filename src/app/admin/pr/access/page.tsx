"use client";

import { ChevronLeft, KeyRound, Search, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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

interface PRUser {
	id: string;
	first_name?: string;
	name?: string;
	last_name?: string;
	email: string;
	role: "admin" | "user" | "viewer" | "dev";
	company_id?: string | null;
}

interface PermissionsResponse {
	permissions?: string[];
	available?: string[];
	company_id?: string | null;
	project_id?: string | null;
	error?: string;
}

async function getAccessToken() {
	const session = await supabase.auth.getSession();
	return session.data.session?.access_token || null;
}

export default function PRAccessPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const companyIdFromUrl = searchParams?.get("company_id") || "";
	const projectIdFromUrl = searchParams?.get("project_id") || "";
	const [companies, setCompanies] = useState<PRCompany[]>([]);
	const [projects, setProjects] = useState<PRProject[]>([]);
	const [users, setUsers] = useState<PRUser[]>([]);
	const [selectedCompanyId, setSelectedCompanyId] = useState("");
	const [selectedProjectId, setSelectedProjectId] = useState("");
	const [selectedUserId, setSelectedUserId] = useState("");
	const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
	const [permissions, setPermissions] = useState<string[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [loadingCompanies, setLoadingCompanies] = useState(true);
	const [loadingUsers, setLoadingUsers] = useState(false);
	const [loadingPermissions, setLoadingPermissions] = useState(false);
	const [savingPermissions, setSavingPermissions] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const selectedUser = useMemo(
		() => users.find((user) => user.id === selectedUserId) || null,
		[users, selectedUserId],
	);

	const filteredUsers = useMemo(() => {
		const term = searchTerm.trim().toLowerCase();
		if (!term) return users;
		return users.filter((user) => {
			const fullName = [user.first_name || user.name, user.last_name]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();
			return (
				fullName.includes(term) || (user.email || "").toLowerCase().includes(term)
			);
		});
	}, [users, searchTerm]);

	const loadCompanies = useCallback(async () => {
		try {
			setLoadingCompanies(true);
			setError(null);
			const token = await getAccessToken();
			if (!token) throw new Error("No hay sesión activa");
			const response = await fetch("/api/admin/pr/companies", {
				headers: { Authorization: `Bearer ${token}` },
			});
			const json = (await response.json()) as { companies?: PRCompany[]; error?: string };
			if (!response.ok) throw new Error(json?.error || "No se pudieron cargar empresas");

			const companyList = json.companies || [];
			setCompanies(companyList);
			setSelectedCompanyId((prev) => {
				if (prev) return prev;
				if (companyIdFromUrl) return companyIdFromUrl;
				return companyList[0]?.id || "";
			});
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Error cargando empresas PR",
			);
		} finally {
			setLoadingCompanies(false);
		}
	}, [companyIdFromUrl]);

	const loadProjectsByCompany = useCallback(async (companyId: string) => {
		if (!companyId) {
			setProjects([]);
			setSelectedProjectId("");
			return;
		}
		try {
			const token = await getAccessToken();
			if (!token) throw new Error("No hay sesión activa");
			const params = new URLSearchParams();
			params.set("company_id", companyId);
			const response = await fetch(`/api/admin/pr/projects?${params.toString()}`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			const json = (await response.json()) as {
				projects?: PRProject[];
				error?: string;
			};
			if (!response.ok) {
				throw new Error(json.error || "No se pudieron cargar proyectos");
			}
			const projectList = json.projects || [];
			setProjects(projectList);
			setSelectedProjectId((prev) => {
				if (
					projectIdFromUrl &&
					projectList.some((project) => project.id === projectIdFromUrl)
				) {
					return projectIdFromUrl;
				}
				if (!prev) return projectList[0]?.id || "";
				return projectList.some((p) => p.id === prev) ? prev : (projectList[0]?.id || "");
			});
		} catch (err) {
			setProjects([]);
			setSelectedProjectId("");
			setError(err instanceof Error ? err.message : "Error cargando proyectos");
		}
	}, [projectIdFromUrl]);

	const loadUsersByCompanyProject = useCallback(async (companyId: string, projectId: string) => {
		if (!companyId || !projectId) {
			setUsers([]);
			setSelectedUserId("");
			return;
		}
		try {
			setLoadingUsers(true);
			setError(null);
			const token = await getAccessToken();
			if (!token) throw new Error("No hay sesión activa");
			const response = await fetch(
				`/api/admin/pr/users?company_id=${encodeURIComponent(companyId)}&project_id=${encodeURIComponent(projectId)}&include_unassigned=true`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);
			const json = (await response.json()) as { users?: PRUser[]; error?: string };
			if (!response.ok) throw new Error(json?.error || "No se pudieron cargar usuarios");
			const userList = json.users || [];
			setUsers(userList);
			setSelectedUserId((prev) => {
				if (!prev) return userList[0]?.id || "";
				return userList.some((u) => u.id === prev) ? prev : (userList[0]?.id || "");
			});
		} catch (err) {
			setUsers([]);
			setSelectedUserId("");
			setError(err instanceof Error ? err.message : "Error cargando usuarios");
		} finally {
			setLoadingUsers(false);
		}
	}, []);

	const loadPermissions = useCallback(async (userId: string, companyId: string, projectId: string) => {
		if (!userId || !companyId || !projectId) {
			setPermissions([]);
			setAvailablePermissions([]);
			return;
		}
		try {
			setLoadingPermissions(true);
			setError(null);
			const token = await getAccessToken();
			if (!token) throw new Error("No hay sesión activa");
			const response = await fetch(
				`/api/admin/pr/users/${encodeURIComponent(userId)}/permissions?company_id=${encodeURIComponent(companyId)}&project_id=${encodeURIComponent(projectId)}`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);
			const json = (await response.json()) as PermissionsResponse;
			if (!response.ok) {
				throw new Error(json?.error || "No se pudieron cargar los permisos");
			}
			setPermissions(Array.isArray(json.permissions) ? json.permissions : []);
			setAvailablePermissions(
				Array.isArray(json.available) ? json.available : [],
			);
		} catch (err) {
			setPermissions([]);
			setAvailablePermissions([]);
			setError(err instanceof Error ? err.message : "Error cargando permisos");
		} finally {
			setLoadingPermissions(false);
		}
	}, []);

	const handleSavePermissions = async () => {
		if (!selectedUserId || !selectedCompanyId || !selectedProjectId) return;
		try {
			setSavingPermissions(true);
			setError(null);
			setSuccess(null);
			const token = await getAccessToken();
			if (!token) throw new Error("No hay sesión activa");
			const response = await fetch(
				`/api/admin/pr/users/${encodeURIComponent(selectedUserId)}/permissions`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						company_id: selectedCompanyId,
						project_id: selectedProjectId,
						permissions,
					}),
				},
			);
			const json = (await response.json()) as { error?: string };
			if (!response.ok) {
				throw new Error(json?.error || "No se pudieron guardar los permisos");
			}
			setSuccess("Permisos guardados correctamente.");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error guardando permisos");
		} finally {
			setSavingPermissions(false);
		}
	};

	useEffect(() => {
		loadCompanies();
	}, [loadCompanies]);

	useEffect(() => {
		if (!companyIdFromUrl) return;
		setSelectedCompanyId(companyIdFromUrl);
		if (projectIdFromUrl) {
			setSelectedProjectId(projectIdFromUrl);
		}
		setSuccess(null);
	}, [companyIdFromUrl, projectIdFromUrl]);

	useEffect(() => {
		if (!selectedCompanyId) return;
		loadProjectsByCompany(selectedCompanyId);
	}, [selectedCompanyId, loadProjectsByCompany]);

	useEffect(() => {
		if (!selectedCompanyId || !selectedProjectId) return;
		loadUsersByCompanyProject(selectedCompanyId, selectedProjectId);
	}, [selectedCompanyId, selectedProjectId, loadUsersByCompanyProject]);

	useEffect(() => {
		if (!selectedUserId || !selectedCompanyId || !selectedProjectId) return;
		loadPermissions(selectedUserId, selectedCompanyId, selectedProjectId);
	}, [selectedUserId, selectedCompanyId, selectedProjectId, loadPermissions]);

	return (
		<div className="p-2 sm:p-3 lg:p-4">
			<div className="mb-4 flex items-center justify-between">
				<button
					type="button"
					onClick={() => {
						const params = new URLSearchParams();
						if (selectedCompanyId || companyIdFromUrl) {
							params.set("company_id", selectedCompanyId || companyIdFromUrl);
						}
						if (selectedProjectId || projectIdFromUrl) {
							params.set("project_id", selectedProjectId || projectIdFromUrl);
						}
						router.push(`/admin/pr/users?${params.toString()}`);
					}}
					aria-label="Volver a usuarios"
					title="Volver"
					className="inline-flex items-center gap-2 rounded-md border border-gray9 bg-white px-3 py-2 text-blue7 hover:text-blue6 hover:shadow-sm"
				>
					<ChevronLeft className="w-5 h-5" />
					<span className="text-sm font-medium">Volver</span>
				</button>
			</div>

			<div className="bg-white rounded-md shadow-sm border border-gray9 p-4 mb-4">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<div>
						<label
							htmlFor="access-company"
							className="block text-sm font-medium text-blue7 mb-1"
						>
							Empresa
						</label>
						<select
							id="access-company"
							className="w-full px-3 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/20 focus:border-blue6"
							value={selectedCompanyId}
							onChange={(e) => {
								setSelectedCompanyId(e.target.value);
								setSuccess(null);
							}}
							disabled={loadingCompanies}
						>
							<option value="">
								{loadingCompanies ? "Cargando empresas..." : "Seleccione empresa"}
							</option>
							{companies.map((company) => (
								<option key={company.id} value={company.id}>
									{company.name}
								</option>
							))}
						</select>
					</div>
					<div>
						<label
							htmlFor="access-project"
							className="block text-sm font-medium text-blue7 mb-1"
						>
							Proyecto
						</label>
						<select
							id="access-project"
							className="w-full px-3 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/20 focus:border-blue6 disabled:bg-gray10 disabled:text-blue7"
							value={selectedProjectId}
							onChange={(e) => {
								setSelectedProjectId(e.target.value);
								setSuccess(null);
							}}
							disabled={!selectedCompanyId}
						>
							<option value="">
								{!selectedCompanyId ? "Selecciona empresa" : "Selecciona proyecto"}
							</option>
							{projects.map((project) => (
								<option key={project.id} value={project.id}>
									{project.name}
								</option>
							))}
						</select>
					</div>
					<div>
						<label
							htmlFor="access-search"
							className="block text-sm font-medium text-blue7 mb-1"
						>
							Buscar usuario
						</label>
						<div className="relative">
							<Search className="w-4 h-4 text-blue7 absolute left-3 top-3" />
							<input
								id="access-search"
								type="text"
								className="w-full pl-10 pr-3 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/20 focus:border-blue6"
								placeholder="Nombre o correo..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
						</div>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
				<div className="xl:col-span-5 bg-white rounded-md shadow-sm border border-gray9 overflow-hidden">
					<div
						className="flex min-h-14 items-center gap-2 border-b border-gray9 bg-gray10"
						style={{ padding: "12px 24px" }}
					>
						<Users className="w-4 h-4 text-blue6" />
						<h2 className="text-xs font-semibold uppercase tracking-wide text-blue1">
							Usuarios de la empresa
						</h2>
					</div>
					<div className="max-h-[520px] overflow-auto">
						{loadingUsers ? (
							<p className="p-4 text-sm text-blue7">Cargando usuarios...</p>
						) : filteredUsers.length === 0 ? (
							<p className="p-4 text-sm text-blue7">
								No hay usuarios para esta empresa.
							</p>
						) : (
							filteredUsers.map((user) => {
								const isSelected = user.id === selectedUserId;
								const fullName = [user.first_name || user.name, user.last_name]
									.filter(Boolean)
									.join(" ")
									.trim();
								return (
									<button
										key={user.id}
										type="button"
										onClick={() => {
											setSelectedUserId(user.id);
											setSuccess(null);
										}}
										className={`w-full text-left px-6 py-3 border-b border-gray9 transition-colors ${
											isSelected
												? "bg-blue15"
												: "bg-white hover:bg-gray10"
										}`}
									>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<p className="truncate text-sm font-medium uppercase text-blue1">
													{fullName || user.email}
												</p>
												<p className="mt-0.5 truncate text-xs text-gray5">
													{user.email}
												</p>
											</div>
											<span className="shrink-0 text-sm font-semibold uppercase text-blue7">
												{user.role}
											</span>
										</div>
									</button>
								);
							})
						)}
					</div>
				</div>

				<div className="xl:col-span-7 bg-white rounded-md shadow-sm border border-gray9 overflow-hidden">
					<div
						className="flex min-h-14 items-center justify-between gap-4 border-b border-gray9 bg-gray10"
						style={{ padding: "12px 24px" }}
					>
						<div className="flex min-w-0 items-center gap-2">
							<KeyRound className="w-4 h-4 text-blue6" />
							<h2 className="text-xs font-semibold uppercase tracking-wide text-blue1">
								Permisos del usuario
							</h2>
						</div>
						{selectedUser ? (
							<div className="max-w-[45%] truncate text-right text-xs font-medium uppercase tracking-wide text-blue7">
								{selectedUser.first_name || selectedUser.name || selectedUser.email}
							</div>
						) : null}
					</div>

					<div className="p-6 space-y-4">
						{loadingPermissions ? (
							<p className="text-sm text-blue7">Cargando permisos...</p>
						) : !selectedUser ? (
							<p className="text-sm text-blue7">
								Selecciona un usuario para editar sus accesos.
							</p>
						) : availablePermissions.length === 0 ? (
							<p className="text-sm text-blue7">
								No hay recursos disponibles para esta empresa.
							</p>
						) : (
							<>
								<div className="flex items-center gap-2">
									<button
										type="button"
										className="px-3 py-1.5 text-xs font-medium border border-blue13 rounded-md bg-gray10 text-blue6 hover:border-blue6 hover:bg-white"
										onClick={() => setPermissions(availablePermissions)}
									>
										Seleccionar todo
									</button>
									<button
										type="button"
										className="px-3 py-1.5 text-xs font-medium border border-blue13 rounded-md bg-gray10 text-blue6 hover:border-blue6 hover:bg-white"
										onClick={() => setPermissions([])}
									>
										Limpiar
									</button>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
									{availablePermissions.map((resourceKey) => {
										const checked = permissions.includes(resourceKey);
										return (
											<label
												key={resourceKey}
												className="inline-flex items-center gap-2 text-sm text-blue1 border border-gray9 rounded-md px-3 py-2 hover:bg-gray10"
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
													className="rounded border-gray9 accent-blue6"
												/>
												<span>{PR_RESOURCE_LABELS[resourceKey] || resourceKey}</span>
											</label>
										);
									})}
								</div>

								<div className="pt-2">
									<button
										type="button"
										className="px-4 py-2 bg-blue6 text-white rounded-md hover:bg-blue5 disabled:opacity-50"
										disabled={savingPermissions || !selectedUserId}
										onClick={handleSavePermissions}
									>
										{savingPermissions ? "Guardando..." : "Guardar permisos"}
									</button>
								</div>
							</>
						)}

						{error ? <p className="text-sm text-gold1">{error}</p> : null}
						{success ? <p className="text-sm text-blue6">{success}</p> : null}
					</div>
				</div>
			</div>
		</div>
	);
}
