"use client";

import { KeyRound, Search, ShieldCheck, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
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
		<div className="p-4 sm:p-6">
			<div className="mb-6">
				<div className="flex items-center gap-3 mb-2">
					<div className="p-2 bg-indigo-100 rounded-lg">
						<ShieldCheck className="w-6 h-6 text-indigo-600" />
					</div>
					<h1 className="text-2xl sm:text-3xl font-title text-gray-900">
						Accesos PR por Proyecto
					</h1>
				</div>
				<p className="text-sm sm:text-base text-gray-600">
					Administra permisos de pantallas por usuario en cada proyecto.
				</p>
			</div>

			<div className="bg-white rounded-md shadow-lg border border-gray-100 p-4 sm:p-6 mb-6">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<div>
						<label
							htmlFor="access-company"
							className="block text-sm text-gray-700 mb-1"
						>
							Empresa
						</label>
						<select
							id="access-company"
							className="w-full px-3 py-2 border rounded-md"
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
							className="block text-sm text-gray-700 mb-1"
						>
							Proyecto
						</label>
						<select
							id="access-project"
							className="w-full px-3 py-2 border rounded-md"
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
							className="block text-sm text-gray-700 mb-1"
						>
							Buscar usuario
						</label>
						<div className="relative">
							<Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
							<input
								id="access-search"
								type="text"
								className="w-full pl-10 pr-3 py-2 border rounded-md"
								placeholder="Nombre o correo..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
						</div>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
				<div className="xl:col-span-5 bg-white rounded-md shadow-lg border border-gray-100">
					<div className="px-4 py-3 border-b flex items-center gap-2">
						<Users className="w-4 h-4 text-gray-600" />
						<h2 className="text-sm font-semibold text-gray-900">
							Usuarios de la empresa
						</h2>
					</div>
					<div className="max-h-[520px] overflow-auto">
						{loadingUsers ? (
							<p className="p-4 text-sm text-gray-500">Cargando usuarios...</p>
						) : filteredUsers.length === 0 ? (
							<p className="p-4 text-sm text-gray-500">
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
										className={`w-full text-left px-4 py-3 border-b transition-colors ${
											isSelected ? "bg-indigo-50" : "hover:bg-gray-50"
										}`}
									>
										<p className="text-sm font-medium text-gray-900">
											{fullName || user.email}
										</p>
										<p className="text-xs text-gray-600 mt-0.5">{user.email}</p>
										<span className="inline-flex mt-2 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
											{user.role}
										</span>
									</button>
								);
							})
						)}
					</div>
				</div>

				<div className="xl:col-span-7 bg-white rounded-md shadow-lg border border-gray-100">
					<div className="px-4 py-3 border-b flex items-center justify-between">
						<div className="flex items-center gap-2">
							<KeyRound className="w-4 h-4 text-gray-600" />
							<h2 className="text-sm font-semibold text-gray-900">
								Permisos del usuario
							</h2>
						</div>
						{selectedUser ? (
							<div className="text-xs text-gray-600">
								{selectedUser.first_name || selectedUser.name || selectedUser.email}
							</div>
						) : null}
					</div>

					<div className="p-4 space-y-4">
						{loadingPermissions ? (
							<p className="text-sm text-gray-500">Cargando permisos...</p>
						) : !selectedUser ? (
							<p className="text-sm text-gray-500">
								Selecciona un usuario para editar sus accesos.
							</p>
						) : availablePermissions.length === 0 ? (
							<p className="text-sm text-gray-500">
								No hay recursos disponibles para esta empresa.
							</p>
						) : (
							<>
								<div className="flex items-center gap-2">
									<button
										type="button"
										className="px-3 py-1.5 text-xs border rounded-md bg-gray-50 hover:bg-gray-100"
										onClick={() => setPermissions(availablePermissions)}
									>
										Seleccionar todo
									</button>
									<button
										type="button"
										className="px-3 py-1.5 text-xs border rounded-md bg-gray-50 hover:bg-gray-100"
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
												className="inline-flex items-center gap-2 text-sm text-gray-700 border rounded-md px-3 py-2 hover:bg-gray-50"
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
												<span>{PR_RESOURCE_LABELS[resourceKey] || resourceKey}</span>
											</label>
										);
									})}
								</div>

								<div className="pt-2">
									<button
										type="button"
										className="px-4 py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50"
										disabled={savingPermissions || !selectedUserId}
										onClick={handleSavePermissions}
									>
										{savingPermissions ? "Guardando..." : "Guardar permisos"}
									</button>
								</div>
							</>
						)}

						{error ? <p className="text-sm text-red-600">{error}</p> : null}
						{success ? <p className="text-sm text-green-600">{success}</p> : null}
					</div>
				</div>
			</div>
		</div>
	);
}
