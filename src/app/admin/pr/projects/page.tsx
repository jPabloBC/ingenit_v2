"use client";
import {
	Activity,
	AlertTriangle,
	CheckCircle,
	ChevronLeft,
	Edit,
	FolderOpen,
	GitBranch,
	Globe,
	MapPin,
	Plus,
	Search,
	Trash2,
	XCircle,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import CreatePRProjectModal from "@/components/CreatePRProjectModal";
import { supabase } from "@/lib/supabaseClient";

interface PRProject {
	id: string;
	company_id?: string | null;
	name: string;
	description?: string;
	status: "active" | "inactive" | "maintenance";
	environment: string;
	health_status: "healthy" | "warning" | "error";
	repository_url?: string;
	deployment_url?: string;
	country?: string;
	region?: string;
	city?: string;
	comuna?: string;
	address?: string;
	created_at: string;
	last_deployment?: string;
}

interface PRCompany {
	id: string;
	name: string;
}

const normalizeProjectStatus = (
	status: string | null | undefined,
): "active" | "inactive" | "maintenance" => {
	const value = (status || "").trim().toLowerCase();
	if (value === "maintenance") return "maintenance";
	if (value === "inactive") return "inactive";
	return "active";
};

export default function PRProjectsPage() {
	const searchParams = useSearchParams();
	const companyIdFromUrl = searchParams?.get("company_id") || "";
	const isCompanyContextLocked = Boolean(companyIdFromUrl);
	const [projects, setProjects] = useState<PRProject[]>([]);
	const [companies, setCompanies] = useState<PRCompany[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
		companyIdFromUrl || "all",
	);
	const [filterStatus, setFilterStatus] = useState<string>("all");
	const [filterEnvironment, setFilterEnvironment] = useState<string>("all");
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [editingProject, setEditingProject] = useState<PRProject | null>(null);

	const selectedCompanyName =
		companies.find((c) => c.id === selectedCompanyId)?.name || null;

	const loadCompanies = useCallback(async () => {
		try {
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
					const companyList = (json.companies || []).map((c) => ({
						id: c.id,
						name: c.name,
					}));
					setCompanies(companyList);
					return;
				}
			}

			const { data, error } = await supabase
				.from("pr_companies")
				.select("id,name")
				.order("name", { ascending: true });
			if (error) {
				setCompanies([]);
			} else {
				setCompanies((data || []).map((c) => ({ id: c.id, name: c.name })));
			}
		} catch {
			setCompanies([]);
		}
	}, []);

	const loadProjects = useCallback(async () => {
		try {
			console.log("🔍 Cargando proyectos PR...");
			setLoadError(null);
			setIsLoading(true);

			const session = await supabase.auth.getSession();
			const token = session.data.session?.access_token;
			if (!token) {
				throw new Error("No hay sesión activa");
			}

			const params = new URLSearchParams();
			if (selectedCompanyId !== "all") {
				params.set("company_id", selectedCompanyId);
			}
			const res = await fetch(`/api/admin/pr/projects?${params.toString()}`, {
				headers: { Authorization: `Bearer ${token}` },
				cache: "no-store",
			});
			const json = (await res.json()) as {
				projects?: PRProject[];
				error?: string;
			};
			if (!res.ok) {
				throw new Error(json.error || "Error cargando proyectos PR");
			}
			setProjects(
				(json.projects || []).map((project) => ({
					...project,
					status: normalizeProjectStatus(project.status),
				})),
			);
		} catch (error) {
			console.error("❌ Error cargando proyectos PR:", error);
			setProjects([]);
			setLoadError(
				error instanceof Error
					? error.message
					: "Error cargando proyectos del sistema PR",
			);
		} finally {
			setIsLoading(false);
		}
	}, [selectedCompanyId]);

	useEffect(() => {
		loadProjects();
	}, [loadProjects]);

	useEffect(() => {
		loadCompanies();
	}, [loadCompanies]);

	useEffect(() => {
		if (!companyIdFromUrl) return;
		setSelectedCompanyId(companyIdFromUrl);
	}, [companyIdFromUrl]);

	const filteredProjects = projects.filter((project) => {
		const matchesSearch =
			project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			project.description?.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesStatus =
			filterStatus === "all" || project.status === filterStatus;
		const matchesEnvironment =
			filterEnvironment === "all" || project.environment === filterEnvironment;

		return matchesSearch && matchesStatus && matchesEnvironment;
	});

	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return "text-white bg-blue6";
			case "inactive":
				return "text-white bg-gold1";
			case "maintenance":
				return "text-white bg-gold2";
			default:
				return "text-white bg-blue7";
		}
	};

	const getEnvironmentColor = (environment: string) => {
		switch (environment) {
			case "production":
				return "text-white bg-blue4";
			case "qa":
			case "uat":
				return "text-white bg-blue6";
			case "staging":
				return "text-white bg-blue5";
			case "sandbox":
				return "text-white bg-blue7";
			case "demo":
			case "training":
				return "text-white bg-gold2";
			case "pilot":
				return "text-white bg-blue8";
			case "dr":
				return "text-white bg-gold1";
			case "mining":
				return "text-white bg-gold3";
			case "industrial":
				return "text-white bg-blue7";
			case "development":
				return "text-white bg-blue6";
			default:
				return "text-white bg-blue7";
		}
	};

	const getEnvironmentLabel = (environment: string) => {
		switch (environment) {
			case "development":
				return "Desarrollo";
			case "qa":
				return "QA";
			case "uat":
				return "UAT";
			case "staging":
				return "Preproducción";
			case "sandbox":
				return "Sandbox";
			case "demo":
				return "Demo";
			case "training":
				return "Capacitación";
			case "pilot":
				return "Piloto";
			case "dr":
				return "Contingencia (DR)";
			case "mining":
				return "Minero";
			case "industrial":
				return "Industrial";
			case "production":
				return "Producción";
			default:
				return environment
					.split(/[_-]+/g)
					.map((part) =>
						part.length > 0
							? part.charAt(0).toUpperCase() + part.slice(1)
							: "",
					)
					.join(" ");
		}
	};

	const getHealthIcon = (health: string) => {
		switch (health) {
			case "healthy":
				return <CheckCircle className="w-4 h-4 text-blue6" />;
			case "warning":
				return <AlertTriangle className="w-4 h-4 text-gold2" />;
			case "error":
				return <XCircle className="w-4 h-4 text-gold1" />;
			default:
				return <Activity className="w-4 h-4 text-blue7" />;
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue6 mx-auto mb-4"></div>
					<p className="text-blue7">Cargando proyectos...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="relative p-2 sm:p-3 lg:p-4">
			{companyIdFromUrl ? (
				<div className="mb-4 flex items-center justify-between">
					<button
						type="button"
						onClick={() => {
							window.location.href = "/admin/pr/companies";
						}}
						aria-label="Volver a empresas"
						title="Volver"
						className="inline-flex items-center gap-2 rounded-md border border-gray9 bg-white px-3 py-2 text-blue7 hover:text-blue6 hover:shadow-sm"
					>
						<ChevronLeft className="w-5 h-5" />
						<span className="text-sm font-medium">Volver</span>
					</button>
				</div>
			) : null}

			<button
				type="button"
				onClick={() => {
					setEditingProject(null);
					setShowCreateModal(true);
				}}
				className="fixed right-5 top-[94px] z-40 flex h-16 w-16 items-center justify-center rounded-full border border-blue8 bg-blue5 text-blue15 shadow-lg hover:bg-blue4"
				aria-label="Nuevo proyecto"
				title="Nuevo proyecto"
			>
				<Plus className="h-9 w-9" />
			</button>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
				<div className="relative overflow-hidden bg-white p-4 rounded-md shadow-md border border-blue13">
					<div className="absolute inset-x-0 top-0 h-1 bg-blue6" />
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-blue7">Total Proyectos</p>
							<p className="text-2xl font-bold text-blue1">{projects.length}</p>
						</div>
						<div className="p-3 bg-blue6 rounded-md">
							<FolderOpen className="w-7 h-7 text-white" />
						</div>
					</div>
				</div>

				<div className="relative overflow-hidden bg-white p-4 rounded-md shadow-md border border-blue13">
					<div className="absolute inset-x-0 top-0 h-1 bg-blue5" />
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-blue7">Activos</p>
							<p className="text-2xl font-bold text-blue1">
								{projects.filter((p) => p.status === "active").length}
							</p>
						</div>
						<div className="p-3 bg-blue5 rounded-md">
							<CheckCircle className="w-7 h-7 text-white" />
						</div>
					</div>
				</div>

				<div className="relative overflow-hidden bg-white p-4 rounded-md shadow-md border border-blue13">
					<div className="absolute inset-x-0 top-0 h-1 bg-blue4" />
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-blue7">Producción</p>
							<p className="text-2xl font-bold text-blue1">
								{projects.filter((p) => p.environment === "production").length}
							</p>
						</div>
						<div className="p-3 bg-blue4 rounded-md">
							<Globe className="w-7 h-7 text-white" />
						</div>
					</div>
				</div>

				<div className="relative overflow-hidden bg-white p-4 rounded-md shadow-md border border-gold6">
					<div className="absolute inset-x-0 top-0 h-1 bg-gold2" />
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gold1">Con Problemas</p>
							<p className="text-2xl font-bold text-gold">
								{
									projects.filter(
										(p) =>
											p.health_status === "warning" ||
											p.health_status === "error",
									).length
								}
							</p>
						</div>
						<div className="p-3 bg-gold2 rounded-md">
							<AlertTriangle className="w-7 h-7 text-white" />
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
								placeholder="Buscar proyectos..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full pl-10 pr-4 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/20 focus:border-blue6"
							/>
						</div>
					</div>

					<div className="flex flex-col sm:flex-row gap-3">
						{isCompanyContextLocked ? (
							<input
								value={selectedCompanyName || "Empresa seleccionada"}
								disabled
								className="px-3 py-2 border border-gray9 rounded-md bg-gray10 text-blue7 min-w-[260px]"
								aria-label="Empresa seleccionada"
							/>
						) : (
							<select
								value={selectedCompanyId}
								onChange={(e) => setSelectedCompanyId(e.target.value)}
								className="px-3 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/20 focus:border-blue6"
							>
								<option value="all">Todas las empresas</option>
								{companies.map((c) => (
									<option key={c.id} value={c.id}>
										{c.name}
									</option>
								))}
							</select>
						)}

						<select
							value={filterStatus}
							onChange={(e) => setFilterStatus(e.target.value)}
							className="px-3 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/20 focus:border-blue6"
						>
							<option value="all">Todos los estados</option>
							<option value="active">Activos</option>
							<option value="inactive">Inactivos</option>
							<option value="maintenance">Mantenimiento</option>
						</select>

						<select
							value={filterEnvironment}
							onChange={(e) => setFilterEnvironment(e.target.value)}
							className="px-3 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/20 focus:border-blue6"
						>
							<option value="all">Todos los entornos</option>
							<option value="development">Desarrollo</option>
							<option value="qa">QA (pruebas técnicas)</option>
							<option value="uat">UAT (validación cliente)</option>
							<option value="staging">Preproducción</option>
							<option value="sandbox">Sandbox</option>
							<option value="demo">Demo</option>
							<option value="training">Capacitación</option>
							<option value="pilot">Piloto</option>
							<option value="dr">Contingencia (DR)</option>
							<option value="mining">Minero</option>
							<option value="industrial">Industrial</option>
							<option value="production">Producción</option>
						</select>
					</div>
				</div>
			</div>

			{loadError ? (
				<div className="mb-4 rounded-md border border-gold6 bg-white px-4 py-3 text-sm text-gold">
					{loadError}
				</div>
			) : null}

			{/* Projects Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{filteredProjects.map((project) => (
					<div
						key={project.id}
						className="relative overflow-hidden bg-white rounded-md shadow-sm border border-gray9 hover:shadow-md transition-shadow"
					>
						<div className="absolute inset-x-0 top-0 h-1 bg-blue6" />
						<div className="p-4">
							<div className="flex items-center justify-between mb-4">
								<div className="flex items-center gap-2">
									<div className="h-10 w-10 rounded-md bg-blue6 flex items-center justify-center">
										<FolderOpen className="w-5 h-5 text-white" />
									</div>
									<h3 className="font-semibold text-blue1">
										{project.name}
									</h3>
								</div>
								{getHealthIcon(project.health_status)}
							</div>

							{project.description && (
								<p className="text-sm text-gray4 mb-4 line-clamp-2">
									{project.description}
								</p>
							)}

							<div className="flex flex-wrap gap-2 mb-4">
								<span
									className={`px-2 py-1 text-xs rounded-full ${getStatusColor(project.status)}`}
								>
									{project.status}
								</span>
								<span
									className={`px-2 py-1 text-xs rounded-full ${getEnvironmentColor(project.environment)}`}
								>
									{getEnvironmentLabel(project.environment)}
								</span>
							</div>

							<div className="space-y-2 mb-4">
								{(project.address ||
									project.city ||
									project.comuna ||
									project.region ||
									project.country) && (
									<div className="flex items-center gap-2 text-sm text-gray4">
										<MapPin className="w-4 h-4 text-blue7" />
										<span className="truncate">
											{[
												project.address,
												project.comuna || project.city,
												project.region,
												project.country,
											]
												.filter(Boolean)
												.join(", ")}
										</span>
									</div>
								)}
								{project.deployment_url && (
									<div className="flex items-center gap-2 text-sm text-gray4">
										<Globe className="w-4 h-4 text-blue7" />
										<a
											href={project.deployment_url}
											target="_blank"
											rel="noopener noreferrer"
											className="hover:text-blue6 truncate"
										>
											{project.deployment_url}
										</a>
									</div>
								)}
								{project.repository_url && (
									<div className="flex items-center gap-2 text-sm text-gray4">
										<GitBranch className="w-4 h-4 text-blue7" />
										<a
											href={project.repository_url}
											target="_blank"
											rel="noopener noreferrer"
											className="hover:text-blue6 truncate"
										>
											Repository
										</a>
									</div>
								)}
							</div>

							<div className="text-xs text-gray5 mb-4">
								{project.last_deployment ? (
									<>
										Último deploy:{" "}
										{new Date(project.last_deployment).toLocaleString("es-CL")}
									</>
								) : (
									<>
										Creado:{" "}
										{new Date(project.created_at).toLocaleString("es-CL")}
									</>
								)}
							</div>

							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => {
											setEditingProject(project);
											setShowCreateModal(true);
										}}
										className="text-blue6 hover:text-blue5 p-1"
									>
										<Edit className="w-4 h-4" />
									</button>
									<button
										type="button"
										className="text-gold1 hover:text-gold p-1"
									>
										<Trash2 className="w-4 h-4" />
									</button>
								</div>
								<div className="text-xs text-gray6">ID: {project.id}</div>
							</div>

							<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
								<button
									type="button"
									onClick={() => {
										const params = new URLSearchParams();
										if (project.company_id) {
											params.set("company_id", project.company_id);
										}
										params.set("project_id", project.id);
										window.location.href = `/admin/pr/users?${params.toString()}`;
									}}
									className="relative w-full overflow-hidden p-3 bg-gray10 hover:bg-white rounded-md border border-blue13 transition-colors text-left"
								>
									<div className="absolute inset-x-0 top-0 h-1 bg-blue6" />
									<p className="text-sm font-medium text-blue1">Usuarios</p>
									<p className="text-xs text-blue7 mt-0.5">
										Asignación por proyecto
									</p>
								</button>
								<button
									type="button"
									onClick={() => {
										const params = new URLSearchParams();
										if (project.company_id) {
											params.set("company_id", project.company_id);
										}
										params.set("project_id", project.id);
										window.location.href = `/admin/pr/access?${params.toString()}`;
									}}
									className="relative w-full overflow-hidden p-3 bg-gray10 hover:bg-white rounded-md border border-blue13 transition-colors text-left"
								>
									<div className="absolute inset-x-0 top-0 h-1 bg-blue5" />
									<p className="text-sm font-medium text-blue1">Accesos</p>
									<p className="text-xs text-blue7 mt-0.5">
										Permisos por proyecto
									</p>
								</button>
							</div>
						</div>
					</div>
				))}
			</div>

			{filteredProjects.length === 0 && (
				<div className="bg-white rounded-md border border-gray9 p-10 text-center shadow-sm">
					<FolderOpen className="w-16 h-16 text-blue11 mx-auto mb-4" />
					<p className="text-blue1 text-lg font-medium mb-2">
						No se encontraron proyectos
					</p>
					<p className="text-sm text-blue7">
						{searchTerm || filterStatus !== "all" || filterEnvironment !== "all"
							? "Intenta ajustar los filtros de búsqueda"
							: "Los proyectos aparecerán aquí cuando se creen"}
					</p>
				</div>
			)}

			<CreatePRProjectModal
				isOpen={showCreateModal}
				onClose={() => {
					setShowCreateModal(false);
					setEditingProject(null);
				}}
				onProjectCreated={loadProjects}
				companyId={selectedCompanyId === "all" ? null : selectedCompanyId}
				companies={companies}
				projectToEdit={editingProject}
			/>
		</div>
	);
}
