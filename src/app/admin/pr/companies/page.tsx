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
				return "bg-blue6 text-white border-blue6";
			case "inactive":
				return "bg-gold1 text-white border-gold1";
			case "prospect":
				return "bg-gold2 text-white border-gold2";
			default:
				return "bg-blue7 text-white border-blue7";
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
			<div className="p-2 sm:p-3 lg:p-4">
				<div className="flex items-center justify-center min-h-64">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue6"></div>
					<span className="ml-3 text-blue7">Cargando empresas...</span>
				</div>
			</div>
		);
	}

	return (
		<div className="relative p-2 sm:p-3 lg:p-4">
			<div className="mb-4 flex items-center justify-between">
				<button
					type="button"
					onClick={() => router.push("/admin/pr")}
					aria-label="Volver al panel PR"
					title="Volver"
					className="inline-flex items-center gap-2 rounded-md border border-gray9 bg-white px-3 py-2 text-blue7 hover:text-blue6 hover:shadow-sm"
				>
					<ChevronLeft className="w-5 h-5" />
					<span className="text-sm font-medium">Volver</span>
				</button>
			</div>

			<button
				type="button"
				onClick={handleCreateCompany}
				className="fixed right-5 top-[94px] z-40 flex h-16 w-16 items-center justify-center rounded-full border border-blue8 bg-blue5 text-blue15 shadow-lg hover:bg-blue4"
				aria-label="Nueva empresa"
				title="Nueva empresa"
			>
				<Plus className="h-9 w-9" />
			</button>

				{/* Search and Filters */}
				<div className="bg-white rounded-md border border-gray9 p-4 mb-4 shadow-sm">
					<div className="flex flex-col lg:flex-row gap-4">
						<div className="flex-1">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue7 w-4 h-4" />
								<input
									type="text"
									placeholder="Buscar empresas..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-full pl-10 pr-4 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/20 focus:border-blue6"
								/>
							</div>
						</div>

						<div className="flex gap-3">
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
								className="px-3 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/20 focus:border-blue6"
							>
								<option value="all">Todos los estados</option>
								<option value="active">Activas</option>
								<option value="inactive">Inactivas</option>
								<option value="prospect">Prospectos</option>
							</select>

							<select
								value={industryFilter}
								onChange={(e) => setIndustryFilter(e.target.value)}
								className="px-3 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/20 focus:border-blue6"
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
					<div className="bg-white rounded-md border border-gray9 p-10 text-center shadow-sm">
						<Building2 className="w-16 h-16 text-blue11 mx-auto mb-4" />
						<h3 className="text-lg font-medium text-blue1 mb-2">
							{companies.length === 0
								? "No hay empresas"
								: "No se encontraron empresas"}
						</h3>
						<p className="text-blue7 mb-6">
							{companies.length === 0
								? "Comienza creando tu primera empresa"
								: "Intenta ajustar los filtros de búsqueda"}
						</p>
						{companies.length === 0 ? (
							<button
								type="button"
								onClick={handleCreateCompany}
								className="bg-blue6 text-white px-6 py-3 rounded-md hover:bg-blue5 transition-colors inline-flex items-center gap-2"
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
								className="text-blue6 hover:text-blue5 font-medium"
							>
								Limpiar filtros
							</button>
						) : (
							<button
								type="button"
								onClick={handleCreateCompany}
								className="bg-blue6 text-white px-6 py-3 rounded-md hover:bg-blue5 transition-colors inline-flex items-center gap-2"
							>
								<Plus className="w-5 h-5" />
								Crear Primera Empresa
							</button>
						)}
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
						{filteredCompanies.map((company) => (
							<div
								key={company.id}
								className="relative overflow-hidden bg-white rounded-md border border-gray9 hover:shadow-md transition-shadow"
							>
								<div className="absolute inset-x-0 top-0 h-1 bg-blue6" />
								{/* Company Header */}
								<div className="p-4 border-b border-gray9">
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
												<div className="w-12 h-12 bg-blue6 rounded-md flex items-center justify-center">
													<Building2 className="w-6 h-6 text-white" />
												</div>
											)}
											<div>
												<h3 className="font-semibold text-blue1 text-lg">
													{company.name}
												</h3>
												<p className="text-sm text-blue7">
													{company.industry}
												</p>
											</div>
										</div>

										<div className="flex gap-1">
											<button
												type="button"
												onClick={() => handleEditCompany(company)}
												className="p-2 text-gray6 hover:text-blue6 hover:bg-gray10 rounded-md transition-colors"
												title="Editar empresa"
											>
												<Edit className="w-4 h-4" />
											</button>
											<button
												type="button"
												onClick={() => deleteCompany(company.id)}
												className="p-2 text-gray6 hover:text-gold1 hover:bg-gray10 rounded-md transition-colors"
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
								<div className="p-4">
									{company.description && (
										<p className="text-gray4 text-sm mb-4 line-clamp-2">
											{company.description}
										</p>
									)}

									<div className="space-y-2 text-sm">
										{company.email && (
											<div className="flex items-center gap-2 text-gray4">
												<Mail className="w-4 h-4 text-blue7" />
												<a
													href={`mailto:${company.email}`}
													className="hover:text-blue6 transition-colors"
												>
													{company.email}
												</a>
											</div>
										)}

										{company.phone && (
											<div className="flex items-center gap-2 text-gray4">
												<Phone className="w-4 h-4 text-blue7" />
												<a
													href={`tel:${company.phone}`}
													className="hover:text-blue6 transition-colors"
												>
													{company.phone}
												</a>
											</div>
										)}

										{company.website && (
											<div className="flex items-center gap-2 text-gray4">
												<Globe className="w-4 h-4 text-blue7" />
												<a
													href={
														company.website.startsWith("http")
															? company.website
															: `https://${company.website}`
													}
													target="_blank"
													rel="noopener noreferrer"
													className="hover:text-blue6 transition-colors"
												>
													{company.website.replace(/^https?:\/\//, "")}
												</a>
											</div>
										)}

										{(company.city || company.country) && (
											<div className="flex items-center gap-2 text-gray4">
												<MapPin className="w-4 h-4 text-blue7" />
												<span>
													{[company.city, company.country]
														.filter(Boolean)
														.join(", ")}
												</span>
											</div>
										)}

										{company.employee_count && (
											<div className="flex items-center gap-2 text-gray4">
												<Users className="w-4 h-4 text-blue7" />
												<span>{company.employee_count} empleados</span>
											</div>
										)}
									</div>

									<div className="mt-5 pt-4 border-t border-gray9">
										<p className="text-xs font-semibold text-blue7 uppercase tracking-wide mb-3">
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
												className="relative w-full overflow-hidden p-3 bg-gray10 hover:bg-white rounded-md border border-blue13 transition-colors text-left"
											>
												<div className="absolute inset-x-0 top-0 h-1 bg-blue6" />
												<p className="text-sm font-medium text-blue1">
													Proyectos
												</p>
												<p className="text-xs text-blue7 mt-0.5">
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
