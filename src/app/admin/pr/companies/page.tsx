"use client";
import {
	Building2,
	ChevronLeft,
	Edit,
	Globe,
	Mail,
	MapPin,
	Phone,
	Plus,
	Search,
	Trash2,
	Users,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import CompanyModal from "@/components/CompanyModal";
import { supabase } from "@/lib/supabaseClient";

interface Company {
	id: string;
	name: string;
	description?: string;
	industry: string;
	website?: string;
	email?: string;
	phone?: string;
	address?: string;
	city?: string;
	region?: string;
	comuna?: string;
	country?: string;
	employee_count?: number;
	status: "active" | "inactive" | "prospect";
	created_at: string;
	updated_at?: string;
	logo_url?: string;
	document?: string;
}

export default function CompaniesPage() {
	const router = useRouter();
	const [companies, setCompanies] = useState<Company[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [industryFilter, setIndustryFilter] = useState("all");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingCompany, setEditingCompany] = useState<Company | null>(null);

	const loadCompanies = useCallback(async () => {
		try {
			console.log("🔍 Cargando empresas...");

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
					const json = (await res.json()) as { companies?: Company[] };
					setCompanies(json.companies || []);
					return;
				}
				const errorText = await res.text().catch(() => "");
				console.warn(
					"⚠️ Fallback to client query after admin endpoint failure:",
					res.status,
					errorText,
				);
			}

			// Fallback: direct client query
			const { data, error } = await supabase
				.from("pr_companies")
				.select("*")
				.order("created_at", { ascending: false });

			if (error) throw error;
			setCompanies(data || []);
		} catch (error) {
			console.error("❌ Error cargando empresas:", error);
			setCompanies([]);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadCompanies();
	}, [loadCompanies]);

	const deleteCompany = async (id: string) => {
		if (!confirm("¿Estás seguro de que quieres eliminar esta empresa?")) return;

		try {
			const { error } = await supabase
				.from("pr_companies")
				.delete()
				.eq("id", id);

			if (error) throw error;

			setCompanies((prev) => prev.filter((company) => company.id !== id));
			console.log("✅ Empresa eliminada exitosamente");
		} catch (error) {
			console.error("❌ Error eliminando empresa:", error);
			alert("Error al eliminar la empresa");
		}
	};

	const handleCreateCompany = () => {
		setEditingCompany(null);
		setIsModalOpen(true);
	};

	const handleEditCompany = (company: Company) => {
		setEditingCompany(company);
		setIsModalOpen(true);
	};

	const handleModalClose = () => {
		setIsModalOpen(false);
		setEditingCompany(null);
	};

	const handleCompanyCreated = () => {
		loadCompanies(); // Refresh the list
	};

	const filteredCompanies = companies.filter((company) => {
		const matchesSearch =
			company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			company.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			company.industry.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesStatus =
			statusFilter === "all" || company.status === statusFilter;
		const matchesIndustry =
			industryFilter === "all" || company.industry === industryFilter;

		return matchesSearch && matchesStatus && matchesIndustry;
	});

	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return "bg-green-100 text-green-800 border-green-200";
			case "inactive":
				return "bg-red-100 text-red-800 border-red-200";
			case "prospect":
				return "bg-yellow-100 text-yellow-800 border-yellow-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	const getStatusText = (status: string) => {
		switch (status) {
			case "active":
				return "Activa";
			case "inactive":
				return "Inactiva";
			case "prospect":
				return "Prospecto";
			default:
				return status;
		}
	};

	if (isLoading) {
		return (
			<div className="p-8">
				<div className="flex items-center justify-center min-h-64">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
					<span className="ml-3 text-gray-600">Cargando empresas...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="bg-white border-b border-gray-200">
				<div className="px-8 py-6">
					<div className="flex items-center justify-between gap-4">
						<div>
							<button
								type="button"
								onClick={() => router.push("/admin/pr")}
								aria-label="Volver al panel PR"
								title="Volver"
								className="inline-flex items-center text-gray-200 hover:text-orange-600 transition-colors mb-3"
							>
								<ChevronLeft className="w-7 h-7" />
							</button>
							<h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
								<Building2 className="w-6 h-6 text-orange-600" />
								Gestión de Empresas
							</h1>
							<p className="text-gray-600 mt-1">
								Administra las empresas del sistema PR
							</p>
						</div>
						{companies.length > 0 ? (
							<button
								type="button"
								onClick={handleCreateCompany}
								className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors flex items-center gap-2"
							>
								<Plus className="w-4 h-4" />
								Nueva Empresa
							</button>
						) : null}
					</div>
				</div>
			</div>

			<div className="px-8">
				{/* Search and Filters */}
				<div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
					<div className="flex flex-col lg:flex-row gap-4">
						<div className="flex-1">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
								<input
									type="text"
									placeholder="Buscar empresas..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
								/>
							</div>
						</div>

						<div className="flex gap-3">
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
								className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
							>
								<option value="all">Todos los estados</option>
								<option value="active">Activas</option>
								<option value="inactive">Inactivas</option>
								<option value="prospect">Prospectos</option>
							</select>

							<select
								value={industryFilter}
								onChange={(e) => setIndustryFilter(e.target.value)}
								className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
							>
								<option value="all">Todas las industrias</option>
								<option value="Tecnología">Tecnología</option>
								<option value="Consultoría">Consultoría</option>
								<option value="Manufactura">Manufactura</option>
								<option value="Servicios Financieros">
									Servicios Financieros
								</option>
								<option value="Salud">Salud</option>
								<option value="Educación">Educación</option>
								<option value="Retail">Retail</option>
								<option value="Construcción">Construcción</option>
								<option value="Agricultura">Agricultura</option>
								<option value="Otro">Otro</option>
							</select>
						</div>
					</div>
				</div>

				{/* Companies Grid */}
				{filteredCompanies.length === 0 ? (
					<div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
						<Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
						<h3 className="text-lg font-medium text-gray-900 mb-2">
							{companies.length === 0
								? "No hay empresas"
								: "No se encontraron empresas"}
						</h3>
						<p className="text-gray-600 mb-6">
							{companies.length === 0
								? "Comienza creando tu primera empresa"
								: "Intenta ajustar los filtros de búsqueda"}
						</p>
						{companies.length === 0 ? (
							<button
								type="button"
								onClick={handleCreateCompany}
								className="bg-orange-600 text-white px-6 py-3 rounded-md hover:bg-orange-700 transition-colors inline-flex items-center gap-2"
							>
								<Plus className="w-5 h-5" />
								Crear primera empresa
							</button>
						) : searchTerm ||
							statusFilter !== "all" ||
							industryFilter !== "all" ? (
							<button
								type="button"
								onClick={() => {
									setSearchTerm("");
									setStatusFilter("all");
									setIndustryFilter("all");
								}}
								className="text-orange-600 hover:text-orange-700 font-medium"
							>
								Limpiar filtros
							</button>
						) : (
							<button
								type="button"
								onClick={handleCreateCompany}
								className="bg-orange-600 text-white px-6 py-3 rounded-md hover:bg-orange-700 transition-colors inline-flex items-center gap-2"
							>
								<Plus className="w-5 h-5" />
								Crear Primera Empresa
							</button>
						)}
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
						{filteredCompanies.map((company) => (
							<div
								key={company.id}
								className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow"
							>
								{/* Company Header */}
								<div className="p-6 border-b border-gray-100">
									<div className="flex items-start justify-between">
										<div className="flex items-center gap-3">
											{company.logo_url ? (
												<Image
													src={company.logo_url}
													alt={company.name}
													width={48}
													height={48}
													unoptimized
													className="w-12 h-12 rounded-lg object-cover"
												/>
											) : (
												<div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
													<Building2 className="w-6 h-6 text-orange-600" />
												</div>
											)}
											<div>
												<h3 className="font-semibold text-gray-900 text-lg">
													{company.name}
												</h3>
												<p className="text-sm text-gray-500">
													{company.industry}
												</p>
											</div>
										</div>

										<div className="flex gap-1">
											<button
												type="button"
												onClick={() => handleEditCompany(company)}
												className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
												title="Editar empresa"
											>
												<Edit className="w-4 h-4" />
											</button>
											<button
												type="button"
												onClick={() => deleteCompany(company.id)}
												className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
												title="Eliminar empresa"
											>
												<Trash2 className="w-4 h-4" />
											</button>
										</div>
									</div>

									{/* Status Badge */}
									<div className="mt-3">
										<span
											className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(company.status)}`}
										>
											{getStatusText(company.status)}
										</span>
									</div>
								</div>

								{/* Company Info */}
								<div className="p-6">
									{company.description && (
										<p className="text-gray-600 text-sm mb-4 line-clamp-2">
											{company.description}
										</p>
									)}

									<div className="space-y-2 text-sm">
										{company.email && (
											<div className="flex items-center gap-2 text-gray-600">
												<Mail className="w-4 h-4 text-gray-400" />
												<a
													href={`mailto:${company.email}`}
													className="hover:text-orange-600 transition-colors"
												>
													{company.email}
												</a>
											</div>
										)}

										{company.phone && (
											<div className="flex items-center gap-2 text-gray-600">
												<Phone className="w-4 h-4 text-gray-400" />
												<a
													href={`tel:${company.phone}`}
													className="hover:text-orange-600 transition-colors"
												>
													{company.phone}
												</a>
											</div>
										)}

										{company.website && (
											<div className="flex items-center gap-2 text-gray-600">
												<Globe className="w-4 h-4 text-gray-400" />
												<a
													href={
														company.website.startsWith("http")
															? company.website
															: `https://${company.website}`
													}
													target="_blank"
													rel="noopener noreferrer"
													className="hover:text-orange-600 transition-colors"
												>
													{company.website.replace(/^https?:\/\//, "")}
												</a>
											</div>
										)}

										{(company.city || company.country) && (
											<div className="flex items-center gap-2 text-gray-600">
												<MapPin className="w-4 h-4 text-gray-400" />
												<span>
													{[company.city, company.country]
														.filter(Boolean)
														.join(", ")}
												</span>
											</div>
										)}

										{company.employee_count && (
											<div className="flex items-center gap-2 text-gray-600">
												<Users className="w-4 h-4 text-gray-400" />
												<span>{company.employee_count} empleados</span>
											</div>
										)}
									</div>

									<div className="mt-5 pt-4 border-t border-gray-100">
										<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
											Módulos de esta empresa
										</p>
										<div className="grid grid-cols-1 gap-2">
											<button
												type="button"
												onClick={() =>
													router.push(
														`/admin/pr/projects?company_id=${encodeURIComponent(company.id)}`,
													)
												}
												className="w-full p-3 bg-green-50 hover:bg-green-100 rounded-md border border-green-200 transition-colors text-left"
											>
												<p className="text-sm font-medium text-gray-900">
													Proyectos
												</p>
												<p className="text-xs text-gray-600 mt-0.5">
													Gestionar proyectos por empresa
												</p>
											</button>

											</div>
										</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Company Modal */}
			<CompanyModal
				isOpen={isModalOpen}
				onClose={handleModalClose}
				onCompanyCreated={handleCompanyCreated}
				editingCompany={editingCompany}
			/>
		</div>
	);
}
