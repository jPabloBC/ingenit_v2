"use client";
import {
	Calendar,
	ChevronLeft,
	Edit,
	Mail,
	Phone,
	Plus,
	Search,
	Trash2,
	UserCheck,
	Users,
	UserX,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";
import CreatePRUserModal from "@/components/CreatePRUserModal";
import EditPRUserModal from "@/components/EditPRUserModal";
import { supabase } from "@/lib/supabaseClient";

interface PRUser {
	id: string;
	auth_id: string;
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
	created_at: string;
	updated_at?: string;
	project_access?: Array<{ id: string; name: string; company_id?: string | null }>;
}

interface PRCompany {
	id: string;
	name: string;
}

interface PRProject {
	id: string;
	name: string;
	company_id?: string | null;
}

export default function PRUsersPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const companyIdFromUrl = searchParams?.get("company_id") || "";
	const projectIdFromUrl = searchParams?.get("project_id") || "";
	const [users, setUsers] = useState<PRUser[]>([]);
	const [companies, setCompanies] = useState<PRCompany[]>([]);
	const [projects, setProjects] = useState<PRProject[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [filterStatus, setFilterStatus] = useState<string>("all");
	const [filterRole, setFilterRole] = useState<string>("all");
	const [filterCompany, setFilterCompany] = useState<string>(
		companyIdFromUrl || "all",
	);
	const [filterProject, setFilterProject] = useState<string>(
		projectIdFromUrl || "all",
	);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [editingUser, setEditingUser] = useState<PRUser | null>(null);

	const loadUsers = useCallback(async () => {
		try {
			setLoadError(null);
			setIsLoading(true);

			const session = await supabase.auth.getSession();
			const token = session.data.session?.access_token;
			if (!token) throw new Error("No hay sesión activa");

				const params = new URLSearchParams();
				if (filterCompany !== "all") params.set("company_id", filterCompany);
				if (filterProject !== "all") {
					params.set("project_id", filterProject);
					// Keep company users visible even when a project filter is active.
					params.set("include_unassigned", "true");
				}

			const res = await fetch(`/api/admin/pr/users?${params.toString()}`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			const json = (await res.json()) as { users?: PRUser[]; error?: string };
			if (!res.ok) {
				throw new Error(json.error || "Error cargando usuarios");
			}
			setUsers(json.users || []);
		} catch (error) {
			setUsers([]);
			setLoadError(error instanceof Error ? error.message : String(error));
		} finally {
			setIsLoading(false);
		}
	}, [filterCompany, filterProject]);

	const loadCompanies = useCallback(async () => {
		try {
			// Prefer server endpoint (service-role) to avoid client-side RLS hiding rows.
			const sess = await supabase.auth.getSession();
			const token = sess.data.session?.access_token;
			if (token) {
				const res = await fetch("/api/admin/pr/companies", {
					method: "GET",
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});
				if (res.ok) {
					const json = (await res.json()) as { companies?: PRCompany[] };
					setCompanies((json.companies || []).map((c) => ({ id: c.id, name: c.name })));
					return;
				}
				const errorText = await res.text().catch(() => "");
				console.warn(
					"No se pudieron cargar empresas PR desde endpoint admin; fallback a cliente:",
					res.status,
					errorText,
				);
			}

			// Fallback: direct client query
			const { data, error } = await supabase
				.from("pr_companies")
				.select("id,name")
				.order("name", { ascending: true });
			if (error) {
				console.warn("No se pudieron cargar las empresas PR:", error);
				setCompanies([]);
			} else {
				setCompanies(data || []);
			}
		} catch (e) {
			console.error("Error cargando empresas PR:", e);
			setCompanies([]);
		}
	}, []);

	useEffect(() => {
		loadCompanies();
	}, [loadCompanies]);

	const loadProjects = useCallback(
		async (companyId: string) => {
			if (!companyId || companyId === "all") {
				setProjects([]);
				setFilterProject("all");
				return;
			}
			try {
				const { data, error } = await supabase
					.from("pr_projects")
					.select("id,name,company_id")
					.eq("company_id", companyId)
					.order("created_at", { ascending: false });

					if (error) {
						setProjects([]);
						setFilterProject("all");
						return;
					}

				const list = (data || []) as PRProject[];
				setProjects(list);
				setFilterProject((prev) => {
					if (prev !== "all" && list.some((project) => project.id === prev)) {
						return prev;
					}
						if (
							projectIdFromUrl &&
							list.some((project) => project.id === projectIdFromUrl)
						) {
							return projectIdFromUrl;
						}
						// Default to all projects to avoid hiding company users accidentally.
						return "all";
					});
			} catch {
				setProjects([]);
				setFilterProject("all");
			}
		},
		[projectIdFromUrl],
	);

	useEffect(() => {
		if (companyIdFromUrl) setFilterCompany(companyIdFromUrl);
		if (projectIdFromUrl) setFilterProject(projectIdFromUrl);
	}, [companyIdFromUrl, projectIdFromUrl]);

	useEffect(() => {
		loadProjects(filterCompany);
	}, [filterCompany, loadProjects]);

	useEffect(() => {
		loadUsers();
	}, [loadUsers]);

	const handleEditUser = async (user: PRUser) => {
		setEditingUser(user);
	};

	const handleDeleteUser = async (user: PRUser) => {
		const confirmed = window.confirm(
			`¿Eliminar usuario?\n\n${user.first_name || user.name || user.email}\n${user.email}\n\nEsta acción no se puede deshacer.`,
		);
		if (!confirmed) return;

		try {
			const session = await supabase.auth.getSession();
			const token = session.data.session?.access_token;
			if (!token) throw new Error("No hay sesión activa");

			const resp = await fetch("/api/admin/pr/users", {
				method: "DELETE",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					id: user.id,
					auth_id: user.auth_id || user.id,
				}),
			});

			const json = await resp.json();
			if (!resp.ok)
				throw new Error(json?.error || "No se pudo eliminar el usuario");

			await loadUsers();
			alert("Usuario eliminado correctamente");
		} catch (error) {
			console.error("Error eliminando usuario:", error);
			alert(
				`Error eliminando usuario: ${error instanceof Error ? error.message : "Error desconocido"}`,
			);
		}
	};

	const filteredUsers = users.filter((user) => {
		const fullName = [
			user.first_name || user.name,
			user.last_name || user.apellidos,
		]
			.filter(Boolean)
			.join(" ")
			.trim();
		const nameLower = fullName.toLowerCase();
		const emailLower = (user.email || "").toLowerCase();
		const matchesSearch =
			nameLower.includes(searchTerm.toLowerCase()) ||
			emailLower.includes(searchTerm.toLowerCase());
		const matchesStatus =
			filterStatus === "all" || user.status === filterStatus;
		const matchesRole = filterRole === "all" || user.role === filterRole;

		return matchesSearch && matchesStatus && matchesRole;
	});

	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return "text-green-600 bg-green-100";
			case "inactive":
				return "text-red-600 bg-red-100";
			case "pending":
				return "text-yellow-600 bg-yellow-100";
			default:
				return "text-gray-600 bg-gray-100";
		}
	};

	const getRoleColor = (role: string) => {
		switch (role) {
			case "admin":
				return "text-purple-600 bg-purple-100";
			case "dev":
				return "text-yellow-700 bg-yellow-100";
			case "user":
				return "text-blue-600 bg-blue-100";
			case "viewer":
				return "text-gray-600 bg-gray-100";
			default:
				return "text-gray-600 bg-gray-100";
		}
	};

	const toTitleCase = (value: string) =>
		value
			.toLowerCase()
			.split(/\s+/)
			.filter(Boolean)
			.map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
			.join(" ");

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Cargando usuarios...</p>
				</div>
			</div>
		);
	}

	return (
		<>
			<div className="p-4 sm:p-6">
				{/* Header */}
				<div className="mb-6 sm:mb-8">
					<button
						type="button"
						onClick={() => {
							const query = companyIdFromUrl
								? `?company_id=${encodeURIComponent(companyIdFromUrl)}`
								: "";
							router.push(`/admin/pr/projects${query}`);
						}}
						aria-label="Volver a proyectos"
						title="Volver"
						className="inline-flex items-center text-gray-300 hover:text-orange-600 transition-colors mb-3"
					>
						<ChevronLeft className="w-7 h-7" />
					</button>
					<div className="flex items-center gap-3 mb-2">
						<div className="p-2 bg-orange-100 rounded-lg">
							<Users className="w-6 h-6 text-orange-600" />
						</div>
						<h1 className="text-2xl sm:text-3xl font-title text-gray-900">
							Gestión de Usuarios PR
						</h1>
					</div>
					<p className="text-sm sm:text-base text-gray-600">
						{filterProject !== "all"
							? "Administra los usuarios asignados a este proyecto"
							: "Administra los usuarios del proyecto PR"}
					</p>
				</div>

				{/* Stats Cards */}
				<div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
					<div className="bg-white p-4 rounded-lg shadow border">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray-600">
									Total Usuarios
								</p>
								<p className="text-2xl font-bold text-gray-900">
									{users.length}
								</p>
							</div>
							<Users className="w-8 h-8 text-orange-600" />
						</div>
					</div>

					<div className="bg-white p-4 rounded-lg shadow border">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray-600">Activos</p>
								<p className="text-2xl font-bold text-green-600">
									{users.filter((u) => u.status === "active").length}
								</p>
							</div>
							<UserCheck className="w-8 h-8 text-green-600" />
						</div>
					</div>

					<div className="bg-white p-4 rounded-lg shadow border">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray-600">Pendientes</p>
								<p className="text-2xl font-bold text-yellow-600">
									{users.filter((u) => u.status === "pending").length}
								</p>
							</div>
							<Calendar className="w-8 h-8 text-yellow-600" />
						</div>
					</div>

					<div className="bg-white p-4 rounded-lg shadow border">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gray-600">Inactivos</p>
								<p className="text-2xl font-bold text-red-600">
									{users.filter((u) => u.status === "inactive").length}
								</p>
							</div>
							<UserX className="w-8 h-8 text-red-600" />
						</div>
					</div>
				</div>

				{/* Filters and Search */}
				<div className="bg-white rounded-lg shadow border p-4 mb-6">
					<div className="flex flex-col sm:flex-row gap-4">
						<div className="flex-1">
							<div className="relative">
								<Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
								<input
									type="text"
									placeholder="Buscar usuarios..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
								/>
							</div>
						</div>

						<div className="flex gap-2">
							<select
								value={filterStatus}
								onChange={(e) => setFilterStatus(e.target.value)}
								className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
							>
								<option value="all">Todos los estados</option>
								<option value="active">Activos</option>
								<option value="inactive">Inactivos</option>
								<option value="pending">Pendientes</option>
							</select>

							<select
								value={filterCompany}
								onChange={(e) => {
									setFilterCompany(e.target.value);
									setFilterProject("all");
								}}
								className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
							>
								<option value="all">Todas las empresas</option>
								{companies.map((c) => (
									<option key={c.id} value={c.id}>
										{c.name}
									</option>
								))}
							</select>

							<select
								value={filterProject}
								onChange={(e) => setFilterProject(e.target.value)}
								disabled={filterCompany === "all"}
								className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
							>
								<option value="all">
									{filterCompany === "all"
										? "Selecciona empresa primero"
										: "Todos los proyectos"}
								</option>
								{projects.map((project) => (
									<option key={project.id} value={project.id}>
										{project.name}
									</option>
								))}
							</select>

							<select
								value={filterRole}
								onChange={(e) => setFilterRole(e.target.value)}
								className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
							>
								<option value="all">Todos los roles</option>
								{/* Removed deprecated roles */}
								<option value="admin">Administrador</option>
								<option value="user">Usuario</option>
								<option value="viewer">Visualizador</option>
								<option value="dev">Desarrollador (Dev)</option>
							</select>

							<button
								type="button"
								onClick={() => setShowCreateModal(true)}
								className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center gap-2"
							>
								<Plus className="w-4 h-4" />
								Nuevo Usuario
							</button>
						</div>
					</div>
				</div>

				{loadError && (
					<div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
						Error cargando `pr_users`: {loadError}
					</div>
				)}

				{/* Users Table */}
				<div className="bg-white rounded-lg shadow border overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-gray-50 border-b">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Usuario
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Contacto
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Rol
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Proyectos
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Estado
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Último acceso
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Acciones
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200">
								{/** Group users by company */}
								{(() => {
									const groups: Record<string, PRUser[]> = {};
									const companyNames: Record<string, string> = {};
									// initialize company names
									companies.forEach((c) => {
										companyNames[c.id] = c.name;
									});

									// group users
									filteredUsers.forEach((u) => {
										const key = u.company_id || "__no_company__";
										if (!groups[key]) groups[key] = [];
										groups[key].push(u);
									});

									// determine order: companies first, then no company
									const orderedKeys = Object.keys(groups).sort((a, b) => {
										if (a === "__no_company__") return 1;
										if (b === "__no_company__") return -1;
										const nameA = companyNames[a] || a;
										const nameB = companyNames[b] || b;
										return nameA.localeCompare(nameB);
									});

									return orderedKeys.map((key) => (
										<Fragment key={key}>
											<tr className="bg-gray-100">
												<td
													colSpan={7}
													className="px-6 py-2 text-sm font-semibold text-gray-700"
												>
													{key === "__no_company__"
														? "IngenIT"
														: companyNames[key] || key}
												</td>
											</tr>
											{groups[key].map((user) => (
												<tr key={user.id} className="hover:bg-gray-50">
													<td className="px-6 py-4">
														<div className="flex items-center">
															<div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
																<Users className="w-5 h-5 text-orange-600" />
															</div>
															<div className="ml-4">
																<div className="text-sm font-medium text-gray-900">
																	{toTitleCase(
																		`${user.first_name || user.name || ""} ${user.last_name || user.apellidos || ""}`.trim(),
																	) ||
																		"Sin nombre"}
																</div>
																<div className="text-sm text-gray-500">
																	ID: {user.auth_id}
																</div>
															</div>
														</div>
													</td>

													<td className="px-6 py-4">
														<div className="text-sm text-gray-900 flex items-center gap-1">
															<Mail className="w-4 h-4 text-gray-400" />
															{user.email}
														</div>
														{user.phone && (
															<div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
																<Phone className="w-4 h-4 text-gray-400" />
																{user.phone}
															</div>
														)}
													</td>

													<td className="px-6 py-4">
														<span
															className={`px-2 py-1 text-xs rounded-full ${getRoleColor(user.role)}`}
														>
															{user.role}
														</span>
													</td>

													<td className="px-6 py-4">
														<div className="flex flex-wrap gap-1.5">
															{(user.project_access || []).length > 0 ? (
																(user.project_access || []).map((project) => (
																	<button
																		type="button"
																		key={`${user.id}-${project.id}`}
																		onClick={() => {
																			const companyId =
																				project.company_id ||
																				user.company_id ||
																				(filterCompany !== "all" ? filterCompany : "");
																			const params = new URLSearchParams();
																			if (companyId) params.set("company_id", companyId);
																			params.set("project_id", project.id);
																			router.push(`/admin/pr/access?${params.toString()}`);
																		}}
																		title={`Ir a accesos del proyecto ${project.name}`}
																		className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors cursor-pointer"
																	>
																		{project.name}
																	</button>
																))
															) : (
																<span className="text-xs text-gray-400">
																	Sin acceso a proyectos
																</span>
															)}
														</div>
													</td>

													<td className="px-6 py-4">
														<span
															className={`px-2 py-1 text-xs rounded-full ${getStatusColor(user.status)}`}
														>
															{user.status}
														</span>
													</td>

													<td className="px-6 py-4 text-sm text-gray-500">
														{user.updated_at
															? new Date(user.updated_at).toLocaleString(
																	"es-CL",
																)
															: "Nunca"}
													</td>

													<td className="px-6 py-4">
														<div className="flex items-center gap-2">
															<button
																type="button"
																onClick={() => handleEditUser(user)}
																className="text-blue-600 hover:text-blue-800 p-1"
																title="Editar usuario"
															>
																<Edit className="w-4 h-4" />
															</button>
															<button
																type="button"
																onClick={() => handleDeleteUser(user)}
																className="text-red-600 hover:text-red-800 p-1"
																title="Eliminar usuario"
															>
																<Trash2 className="w-4 h-4" />
															</button>
														</div>
													</td>
												</tr>
											))}
										</Fragment>
									));
								})()}
							</tbody>
						</table>
					</div>

					{filteredUsers.length === 0 && (
						<div className="text-center py-8">
							<Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<p className="text-gray-500">No se encontraron usuarios</p>
							<p className="text-sm text-gray-400">
								{filterCompany !== "all" && filterProject !== "all"
									? "Este proyecto aún no tiene usuarios asignados. El administrador creado al crear la compañía es de nivel compañía."
									: searchTerm || filterStatus !== "all" || filterRole !== "all"
									? "Intenta ajustar los filtros de búsqueda"
									: "Los usuarios aparecerán aquí cuando se registren"}
							</p>
						</div>
					)}
				</div>
			</div>

			<CreatePRUserModal
				isOpen={showCreateModal}
				onClose={() => setShowCreateModal(false)}
				onCreated={() => {
					loadUsers();
					setShowCreateModal(false);
				}}
				companies={companies}
				defaultCompanyId={filterCompany === "all" ? undefined : filterCompany}
				defaultProjectId={filterProject === "all" ? undefined : filterProject}
			/>

			<EditPRUserModal
				isOpen={Boolean(editingUser)}
				onClose={() => setEditingUser(null)}
				onSaved={() => {
					loadUsers();
					setEditingUser(null);
				}}
				user={editingUser}
				companies={companies}
				defaultProjectId={filterProject !== "all" ? filterProject : undefined}
			/>
		</>
	);
}
