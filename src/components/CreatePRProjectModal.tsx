"use client";
import { AlertCircle, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
	countries,
	getCitiesByRegion,
	getRegionsByCountry,
} from "@/lib/geoAdapter";
import { supabase } from "@/lib/supabaseClient";

interface CreatePRProjectModalProps {
	isOpen: boolean;
	onClose: () => void;
	onProjectCreated: () => Promise<void> | void;
	companyId?: string | null;
	companies?: Array<{ id: string; name: string }>;
	projectToEdit?: {
		id: string;
		company_id?: string | null;
		name: string;
		description?: string;
		environment?: string;
		status?: "active" | "inactive" | "maintenance";
		repository_url?: string;
		deployment_url?: string;
		country?: string;
		region?: string;
		city?: string;
		comuna?: string;
		address?: string;
	} | null;
}

interface ProjectFormData {
	name: string;
	description: string;
	environment: string;
	status: "active" | "inactive" | "maintenance";
	repository_url: string;
	deployment_url: string;
	country: string;
	region: string;
	city: string;
	comuna: string;
	address: string;
}

interface CompanyAdminUser {
	id: string;
	first_name?: string;
	name?: string;
	last_name?: string;
	email: string;
	phone?: string | null;
	role?: string;
}

export default function CreatePRProjectModal({
	isOpen,
	onClose,
	onProjectCreated,
	companyId = null,
	companies = [],
	projectToEdit = null,
}: CreatePRProjectModalProps) {
	const MANUAL_CITY_OPTION = "__manual_city__";
	const [formData, setFormData] = useState<ProjectFormData>({
		name: "",
		description: "",
		environment: "development",
		status: "active",
		repository_url: "",
		deployment_url: "",
		country: "CL",
		region: "",
		city: "",
		comuna: "",
		address: "",
	});
	const [regions, setRegions] = useState<{ code: string; name: string }[]>([]);
	const [cities, setCities] = useState<string[]>([]);
	const [cityManualMode, setCityManualMode] = useState(false);
	const [customEnvironment, setCustomEnvironment] = useState("");
	const [createProjectAdminNow, setCreateProjectAdminNow] = useState(false);
	const [projectAdminMode, setProjectAdminMode] = useState<
		"existing" | "new" | "mixed"
	>("existing");
	const [companyAdmins, setCompanyAdmins] = useState<CompanyAdminUser[]>([]);
	const [loadingCompanyAdmins, setLoadingCompanyAdmins] = useState(false);
	const [selectedExistingAdminId, setSelectedExistingAdminId] = useState("");
	const [projectAdminFirstName, setProjectAdminFirstName] = useState("");
	const [projectAdminLastName, setProjectAdminLastName] = useState("");
	const [projectAdminEmail, setProjectAdminEmail] = useState("");
	const [projectAdminPhone, setProjectAdminPhone] = useState("");
	const [projectAdminPassword, setProjectAdminPassword] = useState("");
	const [projectAdminPasswordConfirm, setProjectAdminPasswordConfirm] =
		useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
		companyId || "",
	);

	const lockedCompanyName =
		companies.find((company) => company.id === companyId)?.name || "";

	const isCompanyLocked = Boolean(companyId);
	const isEditMode = Boolean(projectToEdit?.id);

	useEffect(() => {
		if (!isOpen) return;
		setSelectedCompanyId(projectToEdit?.company_id || companyId || "");
		setCityManualMode(false);
		setCustomEnvironment("");
		setCreateProjectAdminNow(false);
		setProjectAdminMode("existing");
		setCompanyAdmins([]);
		setSelectedExistingAdminId("");
		setProjectAdminFirstName("");
		setProjectAdminLastName("");
		setProjectAdminEmail("");
		setProjectAdminPhone("");
		setProjectAdminPassword("");
		setProjectAdminPasswordConfirm("");
		if (projectToEdit) {
			setFormData({
				name: projectToEdit.name || "",
				description: projectToEdit.description || "",
				environment: projectToEdit.environment || "development",
				status: projectToEdit.status || "active",
				repository_url: projectToEdit.repository_url || "",
				deployment_url: projectToEdit.deployment_url || "",
				country: projectToEdit.country || "CL",
				region: projectToEdit.region || "",
				city: projectToEdit.city || "",
				comuna: projectToEdit.comuna || "",
				address: projectToEdit.address || "",
			});
			if (
				projectToEdit.environment &&
				![
					"development",
					"qa",
					"uat",
					"staging",
					"sandbox",
					"demo",
					"training",
					"pilot",
					"dr",
					"mining",
					"industrial",
					"production",
					"custom",
				].includes(projectToEdit.environment)
			) {
				setFormData((prev) => ({ ...prev, environment: "custom" }));
				setCustomEnvironment(projectToEdit.environment);
			}
		} else {
			setFormData({
				name: "",
				description: "",
				environment: "development",
				status: "active",
				repository_url: "",
				deployment_url: "",
				country: "CL",
				region: "",
				city: "",
				comuna: "",
				address: "",
			});
		}
	}, [companyId, isOpen, projectToEdit]);

	useEffect(() => {
		let cancelled = false;
		const loadCompanyAdmins = async () => {
			if (!selectedCompanyId || !createProjectAdminNow) {
				setCompanyAdmins([]);
				setSelectedExistingAdminId("");
				return;
			}
			try {
				setLoadingCompanyAdmins(true);
				const session = await supabase.auth.getSession();
				const token = session.data.session?.access_token;
				if (!token) throw new Error("No hay sesión activa");
				const response = await fetch(
					`/api/admin/pr/users?company_id=${encodeURIComponent(selectedCompanyId)}`,
					{ headers: { Authorization: `Bearer ${token}` } },
				);
				const json = (await response.json()) as {
					users?: CompanyAdminUser[];
					error?: string;
				};
				if (!response.ok) {
					throw new Error(json.error || "No se pudieron cargar admins de compañía");
				}
				const admins = (json.users || []).filter((user) => user.role === "admin");
				if (cancelled) return;
				setCompanyAdmins(admins);
				setSelectedExistingAdminId((prev) => {
					if (prev && admins.some((admin) => admin.id === prev)) return prev;
					return admins[0]?.id || "";
				});
			} catch {
				if (!cancelled) {
					setCompanyAdmins([]);
					setSelectedExistingAdminId("");
				}
			} finally {
				if (!cancelled) setLoadingCompanyAdmins(false);
			}
		};
		loadCompanyAdmins();
		return () => {
			cancelled = true;
		};
	}, [selectedCompanyId, createProjectAdminNow]);

	useEffect(() => {
		if (formData.country) {
			const regs = getRegionsByCountry(formData.country) || [];
			type RegionLike = { code?: string; name?: string };
			setRegions(
				regs.map((region: RegionLike) => ({
					code: region.code || region.name || "",
					name: region.name || region.code || "",
				})),
			);
		} else {
			setRegions([]);
		}
		setCities([]);
		setCityManualMode(false);
	}, [formData.country]);

	useEffect(() => {
		if (formData.country && formData.region) {
			const loadedCities = getCitiesByRegion(formData.country, formData.region) || [];
			setCities(loadedCities);
		} else {
			setCities([]);
		}
		setCityManualMode(false);
	}, [formData.country, formData.region]);

	const toTitleCase = (value: string) =>
		value
			.toLowerCase()
			.split(" ")
			.map((part) =>
				part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : "",
			)
			.join(" ");

	const createProjectViaAdminEndpoint = async (
		payloadToInsert: Record<string, unknown>,
	) => {
		const session = await supabase.auth.getSession();
		const token = session.data.session?.access_token;
		if (!token) {
			throw new Error("No hay sesión activa");
		}

		const response = await fetch("/api/admin/pr/projects", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(payloadToInsert),
		});

		const json = (await response.json()) as {
			error?: string;
			removedColumns?: string[];
			project?: { id?: string };
		};
		if (!response.ok) {
			throw new Error(json.error || "No se pudo crear el proyecto");
		}

		return {
			removedColumns: json.removedColumns || [],
			projectId: json.project?.id || "",
		};
	};

	const updateProjectViaAdminEndpoint = async (
		projectId: string,
		payloadToUpdate: Record<string, unknown>,
	) => {
		const session = await supabase.auth.getSession();
		const token = session.data.session?.access_token;
		if (!token) throw new Error("No hay sesión activa");

		const response = await fetch("/api/admin/pr/projects", {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				id: projectId,
				...payloadToUpdate,
			}),
		});
		const json = (await response.json()) as {
			error?: string;
			removedColumns?: string[];
		};
		if (!response.ok) {
			throw new Error(json.error || "No se pudo actualizar el proyecto");
		}
		return { removedColumns: json.removedColumns || [] };
	};

	const createOrAssignProjectAdmin = async (
		companyId: string,
		projectId: string,
		adminData: {
			firstName: string;
			lastName?: string | null;
			email: string;
			phone?: string | null;
			password?: string | null;
		},
	) => {
		const session = await supabase.auth.getSession();
		const token = session.data.session?.access_token;
		if (!token) throw new Error("No hay sesión activa");

		const response = await fetch("/api/admin/pr/users", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				company_id: companyId,
				project_id: projectId,
				first_name: adminData.firstName.trim(),
				last_name: adminData.lastName?.trim() || null,
				email: adminData.email.trim().toLowerCase(),
				phone: adminData.phone?.trim() || null,
				role: "admin",
				new_password_create: adminData.password || null,
			}),
		});
		const json = (await response.json()) as { error?: string };
		if (!response.ok) {
			throw new Error(json.error || "No se pudo crear/asignar el admin de proyecto");
		}
	};

	const handleAddressBlur = () => {
		if (!formData.address) return;
		setFormData((prev) => ({ ...prev, address: toTitleCase(prev.address) }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		const requiresCompany = isCompanyLocked || companies.length > 0;
		if (requiresCompany && !selectedCompanyId) {
			setError("Debes seleccionar una empresa para el proyecto.");
			setIsLoading(false);
			return;
		}
		if (createProjectAdminNow) {
			if (
				(projectAdminMode === "existing" || projectAdminMode === "mixed") &&
				!selectedExistingAdminId
			) {
				setError("Selecciona un admin de compañía para asignarlo al proyecto.");
				setIsLoading(false);
				return;
			}
			if (projectAdminMode === "new" || projectAdminMode === "mixed") {
				if (!projectAdminFirstName.trim()) {
					setError("Debes ingresar el nombre del admin de proyecto.");
					setIsLoading(false);
					return;
				}
				if (!projectAdminEmail.trim()) {
					setError("Debes ingresar el correo del admin de proyecto.");
					setIsLoading(false);
					return;
				}
				if (!projectAdminPassword || projectAdminPassword.length < 8) {
					setError(
						"La contraseña del admin de proyecto debe tener al menos 8 caracteres.",
					);
					setIsLoading(false);
					return;
				}
				if (projectAdminPassword !== projectAdminPasswordConfirm) {
					setError("La confirmación de contraseña no coincide.");
					setIsLoading(false);
					return;
				}
			}
		}
		if (
			formData.environment === "custom" &&
			customEnvironment.trim().length === 0
		) {
			setError("Debes indicar el entorno personalizado.");
			setIsLoading(false);
			return;
		}

		try {
			const payload: Record<string, unknown> = {
				...formData,
				environment:
					formData.environment === "custom"
						? customEnvironment.trim().toLowerCase()
						: formData.environment,
				name: toTitleCase(formData.name),
				address: formData.address ? toTitleCase(formData.address) : "",
				health_status: "healthy",
				created_at: new Date().toISOString(),
				last_deployment: new Date().toISOString(),
			};
			if (selectedCompanyId) {
				payload.company_id = selectedCompanyId;
			}

			let result:
				| { removedColumns: string[]; projectId?: string }
				| { removedColumns: string[]; projectId: string };
			if (isEditMode) {
				if (!projectToEdit?.id) {
					throw new Error("No se encontró el proyecto a editar.");
				}
				result = await updateProjectViaAdminEndpoint(projectToEdit.id, payload);
			} else {
				result = await createProjectViaAdminEndpoint(payload);
			}
			if (result.removedColumns.length > 0) {
				console.warn(
					"Se cre\u00f3 el proyecto, pero se omitieron columnas no soportadas:",
					result.removedColumns,
				);
			}
			if (!isEditMode && createProjectAdminNow) {
				if (!result.projectId) {
					throw new Error(
						"Proyecto creado sin ID de respuesta. No se pudo asignar admin de proyecto.",
					);
				}
				if (projectAdminMode === "existing" || projectAdminMode === "mixed") {
					const selectedExistingAdmin = companyAdmins.find(
						(admin) => admin.id === selectedExistingAdminId,
					);
					if (!selectedExistingAdmin?.email) {
						throw new Error("No se pudo resolver el admin de compañía seleccionado.");
					}
					await createOrAssignProjectAdmin(selectedCompanyId, result.projectId, {
						firstName:
							selectedExistingAdmin.first_name ||
							selectedExistingAdmin.name ||
							"Administrador",
						lastName: selectedExistingAdmin.last_name || null,
						email: selectedExistingAdmin.email,
						phone: selectedExistingAdmin.phone || null,
					});
				}
				if (projectAdminMode === "new" || projectAdminMode === "mixed") {
					const sameAsExisting =
						projectAdminMode === "mixed" &&
						companyAdmins
							.find((admin) => admin.id === selectedExistingAdminId)
							?.email?.toLowerCase()
							.trim() === projectAdminEmail.toLowerCase().trim();
					if (!sameAsExisting) {
						await createOrAssignProjectAdmin(selectedCompanyId, result.projectId, {
							firstName: projectAdminFirstName,
							lastName: projectAdminLastName || null,
							email: projectAdminEmail,
							phone: projectAdminPhone || null,
							password: projectAdminPassword,
						});
					}
				}
			}

			console.log(
				isEditMode
					? "✅ Proyecto PR actualizado exitosamente"
					: "✅ Proyecto PR creado exitosamente",
			);
			await onProjectCreated();
			onClose();

			// Resetear formulario
				setFormData({
					name: "",
					description: "",
					environment: "development",
				status: "active",
				repository_url: "",
				deployment_url: "",
				country: "CL",
				region: "",
				city: "",
				comuna: "",
					address: "",
				});
				setSelectedCompanyId(companyId || "");
				setCityManualMode(false);
				setCustomEnvironment("");
				setCreateProjectAdminNow(false);
				setProjectAdminMode("existing");
				setCompanyAdmins([]);
				setSelectedExistingAdminId("");
				setProjectAdminFirstName("");
				setProjectAdminLastName("");
				setProjectAdminEmail("");
				setProjectAdminPhone("");
				setProjectAdminPassword("");
				setProjectAdminPasswordConfirm("");
			} catch (error: unknown) {
				console.error("❌ Error creando proyecto PR:", error);
				setError(
				error instanceof Error ? error.message : "Error al crear el proyecto",
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
		>,
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<h2 className="text-xl font-normal text-gray-400 p-3">
						{isEditMode ? "Editar Proyecto PR" : "Crear Nuevo Proyecto PR"}
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="p-2 hover:bg-gray-100 rounded-full transition-colors"
					>
						<X className="w-5 h-5 text-gray-500" />
					</button>
				</div>

				{/* Error Message */}
				{error && (
					<div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
						<AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
						<p className="text-sm text-red-700">{error}</p>
					</div>
				)}

				{/* Form */}
				<form onSubmit={handleSubmit} className="p-6 space-y-5">
						{(isCompanyLocked || companies.length > 0) && (
							<div>
							<label
								htmlFor="company_id"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Empresa
							</label>
							{isCompanyLocked && lockedCompanyName ? (
								<input
									id="company_id"
									value={lockedCompanyName}
									disabled
									className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
								/>
							) : (
								<select
									id="company_id"
									value={selectedCompanyId}
									onChange={(e) => setSelectedCompanyId(e.target.value)}
									required
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
								>
									<option value="">Selecciona una empresa</option>
									{companies.map((company) => (
										<option key={company.id} value={company.id}>
											{company.name}
										</option>
									))}
								</select>
							)}
							</div>
						)}

						{!isEditMode ? (
							<div className="rounded-md border border-gray-200 p-4 bg-gray-50">
							<label className="inline-flex items-center gap-2 text-sm font-medium text-gray-800">
								<input
									type="checkbox"
									checked={createProjectAdminNow}
									onChange={(e) => setCreateProjectAdminNow(e.target.checked)}
									className="rounded border-gray-300"
								/>
								Crear admin de proyecto ahora
							</label>
							<p className="text-xs text-gray-600 mt-1">
								Opcional. Puedes asignar un admin existente de compañía, crear uno
								nuevo o aplicar modo mixto.
							</p>

							{createProjectAdminNow ? (
								<div className="mt-3 space-y-3">
									<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
										<label className="inline-flex items-center gap-2 text-sm text-gray-700">
											<input
												type="radio"
												name="project-admin-mode"
												checked={projectAdminMode === "existing"}
												onChange={() => setProjectAdminMode("existing")}
											/>
											Usar admin de compañía
										</label>
										<label className="inline-flex items-center gap-2 text-sm text-gray-700">
											<input
												type="radio"
												name="project-admin-mode"
												checked={projectAdminMode === "new"}
												onChange={() => setProjectAdminMode("new")}
											/>
											Crear admin nuevo
										</label>
										<label className="inline-flex items-center gap-2 text-sm text-gray-700">
											<input
												type="radio"
												name="project-admin-mode"
												checked={projectAdminMode === "mixed"}
												onChange={() => setProjectAdminMode("mixed")}
											/>
											Mixto (ambos)
										</label>
									</div>

									{projectAdminMode === "existing" || projectAdminMode === "mixed" ? (
										<div>
											<label className="block text-xs text-gray-600 mb-1">
												Admin de compañía
											</label>
											<select
												value={selectedExistingAdminId}
												onChange={(e) => setSelectedExistingAdminId(e.target.value)}
												disabled={loadingCompanyAdmins || companyAdmins.length === 0}
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
											>
												<option value="">
													{loadingCompanyAdmins
														? "Cargando admins..."
														: companyAdmins.length === 0
															? "No hay admins de compañía"
															: "Selecciona admin de compañía"}
												</option>
												{companyAdmins.map((admin) => (
													<option key={admin.id} value={admin.id}>
														{`${admin.first_name || admin.name || "Admin"} ${admin.last_name || ""}`.trim()} - {admin.email}
													</option>
												))}
											</select>
										</div>
									) : null}

									{projectAdminMode === "new" || projectAdminMode === "mixed" ? (
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
											<input
												type="text"
												value={projectAdminFirstName}
												onChange={(e) => setProjectAdminFirstName(e.target.value)}
												placeholder="Nombre admin *"
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
											/>
											<input
												type="text"
												value={projectAdminLastName}
												onChange={(e) => setProjectAdminLastName(e.target.value)}
												placeholder="Apellido admin"
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
											/>
											<input
												type="email"
												value={projectAdminEmail}
												onChange={(e) => setProjectAdminEmail(e.target.value)}
												placeholder="Correo admin *"
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:col-span-2"
											/>
											<input
												type="text"
												value={projectAdminPhone}
												onChange={(e) => setProjectAdminPhone(e.target.value)}
												placeholder="Teléfono admin (opcional)"
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:col-span-2"
											/>
											<input
												type="password"
												value={projectAdminPassword}
												onChange={(e) => setProjectAdminPassword(e.target.value)}
												placeholder="Contraseña admin * (mínimo 8)"
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:col-span-2"
											/>
											<input
												type="password"
												value={projectAdminPasswordConfirm}
												onChange={(e) =>
													setProjectAdminPasswordConfirm(e.target.value)
												}
												placeholder="Confirmar contraseña admin *"
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent sm:col-span-2"
											/>
										</div>
									) : null}
								</div>
							) : null}
							</div>
						) : null}

						<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<div>
						<label
							htmlFor="name"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Nombre del Proyecto
						</label>
						<input
							type="text"
							id="name"
							name="name"
							required
							value={formData.name}
							onChange={handleChange}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
							placeholder="Ej: PR Analytics Dashboard"
						/>
						</div>

						<div>
						<label
							htmlFor="description"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Descripción
						</label>
						<textarea
							id="description"
							name="description"
							rows={3}
							value={formData.description}
							onChange={handleChange}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
							placeholder="Descripción del proyecto..."
						/>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="country"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								País
							</label>
							<select
								id="country"
								name="country"
								value={formData.country}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										country: e.target.value,
										region: "",
										city: "",
										comuna: "",
									}))
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
							>
								{countries.map((country) => (
									<option key={country.code} value={country.code}>
										{country.name}
									</option>
								))}
							</select>
						</div>
						<div>
							<label
								htmlFor="region"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Región / Departamento
							</label>
							<select
								id="region"
								name="region"
								value={formData.region}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											region: e.target.value,
											city: "",
											comuna: "",
										}))
									}
								disabled={!formData.country}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
							>
								<option value="">Selecciona región</option>
								{regions.map((region) => (
									<option key={region.code} value={region.code}>
										{region.name}
									</option>
								))}
							</select>
						</div>
					</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label
									htmlFor="comuna"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Comuna
								</label>
								<select
									id="comuna"
									name="comuna"
									value={formData.comuna}
									onChange={(e) => {
										const selectedComuna = e.target.value;
										setFormData((prev) => ({
											...prev,
											comuna: selectedComuna,
										}));
									}}
									disabled={!formData.region}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
								>
									<option value="">Selecciona comuna</option>
									{cities.map((city) => (
										<option key={city} value={city}>
											{city}
										</option>
									))}
								</select>
							</div>
							<div>
								<label
									htmlFor="city"
									className="block text-sm font-medium text-gray-700 mb-1"
								>
									Ciudad / Distrito / Sector / Barrio / Localidad
								</label>
								{cities.length > 0 && !cityManualMode ? (
									<select
										id="city"
										name="city"
										value={formData.city}
										onChange={(e) => {
											const selectedCity = e.target.value;
											if (selectedCity === MANUAL_CITY_OPTION) {
												setCityManualMode(true);
												setFormData((prev) => ({ ...prev, city: "" }));
												return;
											}
											setFormData((prev) => ({ ...prev, city: selectedCity }));
										}}
										disabled={!formData.region}
										className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
									>
										<option value="">
											Selecciona ciudad / distrito / sector (opcional)
										</option>
										{cities.map((city) => (
											<option key={city} value={city}>
												{city}
											</option>
										))}
										<option value={MANUAL_CITY_OPTION}>Ingresar manualmente</option>
									</select>
								) : (
									<div className="space-y-2">
										<input
											type="text"
											id="city"
											name="city"
											list={cities.length > 0 ? "project-cities-list" : undefined}
											value={formData.city}
											onChange={handleChange}
											disabled={!formData.region}
											className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
											placeholder="Ingresa ciudad / distrito / sector"
										/>
										{cities.length > 0 ? (
											<>
												<datalist id="project-cities-list">
													{cities.map((city) => (
														<option key={city} value={city} />
													))}
												</datalist>
												<button
													type="button"
													onClick={() => setCityManualMode(false)}
													className="text-xs text-orange-600 hover:text-orange-700"
												>
													Volver a selección por lista
												</button>
											</>
										) : null}
									</div>
								)}
							</div>
						</div>

					<div>
						<label
							htmlFor="address"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							Dirección
						</label>
						<input
							type="text"
							id="address"
							name="address"
							value={formData.address}
							onChange={handleChange}
							onBlur={handleAddressBlur}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
							placeholder="Dirección comercial/operativa del proyecto"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="environment"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Entorno *
							</label>
								<select
									id="environment"
									name="environment"
									required
									value={formData.environment}
									onChange={handleChange}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
								>
									<option value="development">Desarrollo (interno)</option>
									<option value="qa">QA (pruebas técnicas)</option>
									<option value="uat">UAT (validación cliente)</option>
									<option value="staging">Preproducción</option>
									<option value="sandbox">Sandbox (aislado)</option>
									<option value="demo">Demo comercial</option>
									<option value="training">Capacitación</option>
									<option value="pilot">Piloto</option>
									<option value="dr">Contingencia (DR)</option>
									<option value="mining">Minero</option>
									<option value="industrial">Industrial</option>
									<option value="custom">Personalizado</option>
									<option value="production">Producción (en uso)</option>
								</select>
								<p className="text-xs text-gray-500 mt-1">
									Selecciona dónde opera realmente este proyecto.
								</p>
								{formData.environment === "custom" ? (
									<input
										type="text"
										value={customEnvironment}
										onChange={(e) => setCustomEnvironment(e.target.value)}
										placeholder="Ej: Minería Subterránea, Planta A, Logística Norte"
										className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
									/>
								) : null}
							</div>

						<div>
							<label
								htmlFor="status"
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Estado *
							</label>
							<select
								id="status"
								name="status"
								required
								value={formData.status}
								onChange={handleChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
							>
								<option value="active">Activo</option>
								<option value="inactive">Inactivo</option>
								<option value="maintenance">Mantenimiento</option>
							</select>
						</div>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<div>
						<label
							htmlFor="repository_url"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							URL del Repositorio
						</label>
						<input
							type="url"
							id="repository_url"
							name="repository_url"
							value={formData.repository_url}
							onChange={handleChange}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
							placeholder="https://github.com/usuario/proyecto"
						/>
						</div>

						<div>
						<label
							htmlFor="deployment_url"
							className="block text-sm font-medium text-gray-700 mb-1"
						>
							URL de Despliegue
						</label>
						<input
							type="url"
							id="deployment_url"
							name="deployment_url"
							value={formData.deployment_url}
							onChange={handleChange}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
							placeholder="https://proyecto.pr.ingenit.cl"
						/>
						</div>
					</div>

					{/* Actions */}
					<div className="flex gap-3 pt-4">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={isLoading}
							className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:bg-orange-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
						>
							{isLoading ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
									{isEditMode ? "Guardando..." : "Creando..."}
								</>
							) : (
								<>
									<Save className="w-4 h-4" />
									{isEditMode ? "Guardar cambios" : "Crear Proyecto"}
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
