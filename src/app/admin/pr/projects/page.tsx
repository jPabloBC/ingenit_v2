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
				return "text-green-600 bg-green-100";
			case "inactive":
				return "text-red-600 bg-red-100";
			case "maintenance":
				return "text-yellow-600 bg-yellow-100";
			default:
				return "text-gray-600 bg-gray-100";
		}
	};

	const getEnvironmentColor = (environment: string) => {
		switch (environment) {
			case "production":
				return "text-red-600 bg-red-100";
			case "qa":
			case "uat":
				return "text-teal-700 bg-teal-100";
			case "staging":
				return "text-yellow-600 bg-yellow-100";
			case "sandbox":
				return "text-sky-700 bg-sky-100";
			case "demo":
			case "training":
				return "text-violet-700 bg-violet-100";
			case "pilot":
				return "text-emerald-700 bg-emerald-100";
			case "dr":
				return "text-fuchsia-700 bg-fuchsia-100";
			case "mining":
				return "text-amber-700 bg-amber-100";
			case "industrial":
				return "text-slate-700 bg-slate-100";
			case "development":
				return "text-blue-600 bg-blue-100";
			default:
				return "text-gray-600 bg-gray-100";
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
				return <CheckCircle className="w-4 h-4 text-green-500" />;
			case "warning":
				return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
			case "error":
				return <XCircle className="w-4 h-4 text-red-500" />;
			default:
				return <Activity className="w-4 h-4 text-gray-500" />;
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Cargando proyectos...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="p-4 sm:p-6">
			{/* Header */}
			<div className="mb-6 sm:mb-8">
				{companyIdFromUrl ? (
					<button
						type="button"
						onClick={() => {
							window.location.href = "/admin/pr/companies";
						}}
						aria-label="Volver a empresas"
						title="Volver"
						className="inline-flex items-center text-gray-300 hover:text-orange-600 transition-colors mb-3"
					>
						<ChevronLeft className="w-7 h-7" />
					</button>
				) : null}
				<div className="flex items-center gap-3 mb-2">
					<div className="p-2 bg-orange-100 rounded-lg">
						<FolderOpen className="w-6 h-6 text-orange-600" />
					</div>
					<h1 className="text-2xl sm:text-3xl font-title text-gray-900">
						Gestión de Proyectos PR
					</h1>
				</div>
				<p className="text-sm sm:text-base text-gray-600">
					Administra los proyectos y deployments del ecosistema PR
				</p>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
				<div className="bg-white p-4 rounded-lg shadow border">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">
								Total Proyectos
							</p>
							<p className="text-2xl font-bold text-gray-900">
								{projects.length}
							</p>
						</div>
						<FolderOpen className="w-8 h-8 text-orange-600" />
					</div>
				</div>

				<div className="bg-white p-4 rounded-lg shadow border">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Activos</p>
							<p className="text-2xl font-bold text-green-600">
								{projects.filter((p) => p.status === "active").length}
							</p>
						</div>
						<CheckCircle className="w-8 h-8 text-green-600" />
					</div>
				</div>

				<div className="bg-white p-4 rounded-lg shadow border">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Producción</p>
							<p className="text-2xl font-bold text-red-600">
								{projects.filter((p) => p.environment === "production").length}
							</p>
						</div>
						<Globe className="w-8 h-8 text-red-600" />
					</div>
				</div>

				<div className="bg-white p-4 rounded-lg shadow border">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-gray-600">Con Problemas</p>
							<p className="text-2xl font-bold text-yellow-600">
								{
									projects.filter(
										(p) =>
											p.health_status === "warning" ||
											p.health_status === "error",
									).length
								}
							</p>
						</div>
						<AlertTriangle className="w-8 h-8 text-yellow-600" />
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
								placeholder="Buscar proyectos..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
							/>
						</div>
					</div>

					<div className="flex gap-2">
						{isCompanyContextLocked ? (
							<input
								value={selectedCompanyName || "Empresa seleccionada"}
								disabled
								className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 min-w-[260px]"
								aria-label="Empresa seleccionada"
							/>
						) : (
							<select
								value={selectedCompanyId}
								onChange={(e) => setSelectedCompanyId(e.target.value)}
								className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
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
							className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
						>
							<option value="all">Todos los estados</option>
							<option value="active">Activos</option>
							<option value="inactive">Inactivos</option>
							<option value="maintenance">Mantenimiento</option>
						</select>

						<select
							value={filterEnvironment}
							onChange={(e) => setFilterEnvironment(e.target.value)}
							className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
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

						<button
							type="button"
							onClick={() => {
								setEditingProject(null);
								setShowCreateModal(true);
							}}
							className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center gap-2"
						>
							<Plus className="w-4 h-4" />
							Nuevo Proyecto
						</button>
					</div>
				</div>
			</div>

			{loadError ? (
				<div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
					{loadError}
				</div>
			) : null}

			{/* Projects Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{filteredProjects.map((project) => (
					<div
						key={project.id}
						className="bg-white rounded-lg shadow border hover:shadow-lg transition-shadow"
					>
						<div className="p-6">
							<div className="flex items-center justify-between mb-4">
								<div className="flex items-center gap-2">
									<FolderOpen className="w-5 h-5 text-orange-600" />
									<h3 className="font-semibold text-gray-900">
										{project.name}
									</h3>
								</div>
								{getHealthIcon(project.health_status)}
							</div>

							{project.description && (
								<p className="text-sm text-gray-600 mb-4 line-clamp-2">
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
									<div className="flex items-center gap-2 text-sm text-gray-600">
										<MapPin className="w-4 h-4" />
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
									<div className="flex items-center gap-2 text-sm text-gray-600">
										<Globe className="w-4 h-4" />
										<a
											href={project.deployment_url}
											target="_blank"
											rel="noopener noreferrer"
											className="hover:text-orange-600 truncate"
										>
											{project.deployment_url}
										</a>
									</div>
								)}
								{project.repository_url && (
									<div className="flex items-center gap-2 text-sm text-gray-600">
										<GitBranch className="w-4 h-4" />
										<a
											href={project.repository_url}
											target="_blank"
											rel="noopener noreferrer"
											className="hover:text-orange-600 truncate"
										>
											Repository
										</a>
									</div>
								)}
							</div>

							<div className="text-xs text-gray-500 mb-4">
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
										className="text-blue-600 hover:text-blue-800 p-1"
									>
										<Edit className="w-4 h-4" />
									</button>
									<button
										type="button"
										className="text-red-600 hover:text-red-800 p-1"
									>
										<Trash2 className="w-4 h-4" />
									</button>
								</div>
								<div className="text-xs text-gray-400">ID: {project.id}</div>
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
										className="w-full p-3 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors text-left"
									>
										<p className="text-sm font-medium text-gray-900">Usuarios</p>
										<p className="text-xs text-gray-600 mt-0.5">
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
										className="w-full p-3 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200 transition-colors text-left"
									>
										<p className="text-sm font-medium text-gray-900">Accesos</p>
										<p className="text-xs text-gray-600 mt-0.5">
											Permisos por proyecto
										</p>
									</button>
								</div>
							</div>
						</div>
					))}
			</div>

			{filteredProjects.length === 0 && (
				<div className="text-center py-12">
					<FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
					<p className="text-gray-500 text-lg mb-2">
						No se encontraron proyectos
					</p>
					<p className="text-sm text-gray-400">
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
