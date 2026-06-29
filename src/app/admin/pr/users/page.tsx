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
				return "text-blue6";
			case "inactive":
				return "text-gold1";
			case "pending":
				return "text-gold2";
			default:
				return "text-blue7";
		}
	};

	const getRoleColor = (role: string) => {
		switch (role) {
			case "admin":
				return "text-blue4";
			case "dev":
				return "text-gold2";
			case "user":
				return "text-blue6";
			case "viewer":
				return "text-blue7";
			default:
				return "text-blue7";
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
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue6 mx-auto mb-4"></div>
					<p className="text-blue7">Cargando usuarios...</p>
				</div>
			</div>
		);
	}

	return (
		<>
			<div className="relative p-2 sm:p-3 lg:p-4">
				<div className="mb-4 flex items-center justify-between">
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
						className="inline-flex items-center gap-2 rounded-md border border-gray9 bg-white px-3 py-2 text-blue7 hover:text-blue6 hover:shadow-sm"
					>
						<ChevronLeft className="w-5 h-5" />
						<span className="text-sm font-medium">Volver</span>
					</button>
				</div>

				<button
					type="button"
					onClick={() => setShowCreateModal(true)}
					className="fixed right-5 top-[94px] z-40 flex h-16 w-16 items-center justify-center rounded-full border border-blue8 bg-blue5 text-blue15 shadow-lg hover:bg-blue4"
					aria-label="Nuevo usuario"
					title="Nuevo usuario"
				>
					<Plus className="h-9 w-9" />
				</button>

				{/* Stats Cards */}
				<div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
					<div className="relative overflow-hidden bg-white p-4 rounded-md shadow-md border border-blue13">
						<div className="absolute inset-x-0 top-0 h-1 bg-blue6" />
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-blue7">Total Usuarios</p>
								<p className="text-2xl font-bold text-blue1">{users.length}</p>
							</div>
							<div className="p-3 bg-blue6 rounded-md">
								<Users className="w-7 h-7 text-white" />
							</div>
						</div>
					</div>

					<div className="relative overflow-hidden bg-white p-4 rounded-md shadow-md border border-blue13">
						<div className="absolute inset-x-0 top-0 h-1 bg-blue5" />
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-blue7">Activos</p>
								<p className="text-2xl font-bold text-blue1">
									{users.filter((u) => u.status === "active").length}
								</p>
							</div>
							<div className="p-3 bg-blue5 rounded-md">
								<UserCheck className="w-7 h-7 text-white" />
							</div>
						</div>
					</div>

					<div className="relative overflow-hidden bg-white p-4 rounded-md shadow-md border border-gold6">
						<div className="absolute inset-x-0 top-0 h-1 bg-gold2" />
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-gold1">Pendientes</p>
								<p className="text-2xl font-bold text-gold">
									{users.filter((u) => u.status === "pending").length}
								</p>
							</div>
							<div className="p-3 bg-gold2 rounded-md">
								<Calendar className="w-7 h-7 text-white" />
							</div>
						</div>
					</div>

					<div className="relative overflow-hidden bg-white p-4 rounded-md shadow-md border border-blue13">
						<div className="absolute inset-x-0 top-0 h-1 bg-blue7" />
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-blue7">Inactivos</p>
								<p className="text-2xl font-bold text-blue1">
									{users.filter((u) => u.status === "inactive").length}
								</p>
							</div>
							<div className="p-3 bg-blue7 rounded-md">
								<UserX className="w-7 h-7 text-white" />
							</div>
						</div>
					</div>
				</div>

				{/* Filters and Search */}
				<div className="bg-white rounded-md shadow-sm border border-gray9 p-4 mb-4">
					<div className="flex flex-col lg:flex-row gap-4">
						<div className="flex-1">
							<div className="relative">
								<Search className="w-4 h-4 text-blue7 absolute left-3 top-1/2 transform -translate-y-1/2" />
								<input
									type="text"
									placeholder="Buscar usuarios..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-full pl-10 pr-4 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/20 focus:border-blue6"
								/>
							</div>
						</div>

						<div className="flex flex-col sm:flex-row gap-3">
							<select
								value={filterStatus}
								onChange={(e) => setFilterStatus(e.target.value)}
								className="px-3 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/20 focus:border-blue6"
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
								className="px-3 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/20 focus:border-blue6"
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
								className="px-3 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/20 focus:border-blue6 disabled:bg-gray10 disabled:text-blue7"
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
								className="px-3 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/20 focus:border-blue6"
							>
								<option value="all">Todos los roles</option>
								{/* Removed deprecated roles */}
								<option value="admin">Administrador</option>
								<option value="user">Usuario</option>
								<option value="viewer">Visualizador</option>
								<option value="dev">Desarrollador (Dev)</option>
							</select>

						</div>
					</div>
				</div>

				{loadError && (
					<div className="mb-4 rounded-md border border-gold6 bg-white px-4 py-3 text-sm text-gold">
						Error cargando `pr_users`: {loadError}
					</div>
				)}

				{/* Users Table */}
				<div className="bg-white rounded-md shadow-sm border border-gray9 overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-gray10 border-b border-gray9">
								<tr>
									<th className="px-4 py-3 text-left text-xs font-semibold text-blue7 uppercase tracking-wider">
										Usuario
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-blue7 uppercase tracking-wider">
										Contacto
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-blue7 uppercase tracking-wider">
										Rol
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-blue7 uppercase tracking-wider">
										Proyectos
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-blue7 uppercase tracking-wider">
										Estado
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-blue7 uppercase tracking-wider">
										Último acceso
									</th>
									<th className="px-4 py-3 text-left text-xs font-semibold text-blue7 uppercase tracking-wider">
										Acciones
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray9">
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
											<tr className="bg-blue15">
												<td
													colSpan={7}
													className="px-4 py-2 text-sm font-semibold text-blue1"
												>
													{key === "__no_company__"
														? "IngenIT"
														: companyNames[key] || key}
												</td>
											</tr>
											{groups[key].map((user) => (
												<tr key={user.id} className="hover:bg-gray10">
													<td className="px-4 py-4">
														<div className="flex items-center">
															<div className="w-10 h-10 bg-blue6 rounded-md flex items-center justify-center">
																<Users className="w-5 h-5 text-white" />
															</div>
															<div className="ml-4">
																<div className="text-sm font-medium text-blue1">
																	{toTitleCase(
																		`${user.first_name || user.name || ""} ${user.last_name || user.apellidos || ""}`.trim(),
																	) ||
																		"Sin nombre"}
																</div>
																<div className="text-sm text-gray5">
																	ID: {user.auth_id}
																</div>
															</div>
														</div>
													</td>

													<td className="px-4 py-4">
														<div className="text-sm text-blue1 flex items-center gap-1">
															<Mail className="w-4 h-4 text-blue7" />
															{user.email}
														</div>
														{user.phone && (
															<div className="text-sm text-gray5 flex items-center gap-1 mt-1">
																<Phone className="w-4 h-4 text-blue7" />
																{user.phone}
															</div>
														)}
													</td>

													<td className="px-4 py-4">
														<span
															className={`text-xs font-semibold uppercase ${getRoleColor(user.role)}`}
														>
															{user.role}
														</span>
													</td>

													<td className="px-4 py-4">
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
																		className="rounded-md border border-blue13 bg-gray10 px-2 py-1 text-xs font-semibold text-blue6 hover:border-blue6 hover:bg-white"
																	>
																		{project.name}
																	</button>
																))
															) : (
																<span className="text-xs text-gray6">
																	Sin acceso a proyectos
																</span>
															)}
														</div>
													</td>

													<td className="px-4 py-4">
														<span
															className={`text-xs font-semibold uppercase ${getStatusColor(user.status)}`}
														>
															{user.status}
														</span>
													</td>

													<td className="px-4 py-4 text-sm text-gray5">
														{user.updated_at
															? new Date(user.updated_at).toLocaleString(
																	"es-CL",
																)
															: "Nunca"}
													</td>

													<td className="px-4 py-4">
														<div className="flex items-center gap-2">
															<button
																type="button"
																onClick={() => handleEditUser(user)}
																className="text-blue6 hover:text-blue5 p-1"
																title="Editar usuario"
															>
																<Edit className="w-4 h-4" />
															</button>
															<button
																type="button"
																onClick={() => handleDeleteUser(user)}
																className="text-gold1 hover:text-gold p-1"
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
							<Users className="w-12 h-12 text-blue11 mx-auto mb-4" />
							<p className="text-blue1 font-medium">No se encontraron usuarios</p>
							<p className="text-sm text-blue7">
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
