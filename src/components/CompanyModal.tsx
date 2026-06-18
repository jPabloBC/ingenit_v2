"use client";

function generateRandomPassword(length = 12) {
	const chars =
		"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
	let pass = "";
	for (let i = 0; i < length; i++) {
		pass += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return pass;
}

import {
	Eye,
	EyeOff,
	Image,
	RefreshCw,
	Save,
	UploadCloud,
	X,
} from "lucide-react";
import NextImage from "next/image";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PhoneField from "@/components/PhoneField";
import { useSidebar } from "@/contexts/SidebarContext";
import {
	countries,
	getCitiesByRegion,
	getRegionsByCountry,
} from "@/lib/geoAdapter";
import { supabase } from "@/lib/supabaseClient";

interface Company {
	id?: string;
	name: string;
	document?: string;
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
	size_category?: string;
	status: "active" | "inactive" | "prospect";
	logo_url?: string;
}

interface CompanyModalProps {
	isOpen: boolean;
	onClose: () => void;
	onCompanyCreated?: () => void;
	editingCompany?: Company | null;
}

interface CompanyWithLegacyRut extends Company {
	rut?: string;
}

const getErrorMessage = (error: unknown): string => {
	if (error instanceof Error) return error.message;
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
};

function cleanRut(input: string) {
	return input.replace(/[^0-9kK]/g, "").toUpperCase();
}

function formatRut(rut: string) {
	// expects cleaned rut like 12345678K
	const cleaned = rut.replace(/\W/g, "");
	if (cleaned.length <= 1) return cleaned;
	const body = cleaned.slice(0, -1);
	const dv = cleaned.slice(-1);
	// add dots every 3 chars
	return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
}

function validateRut(rut: string) {
	const r = cleanRut(rut);
	if (!r || r.length < 2) return false;
	const body = r.slice(0, -1);
	const dv = r.slice(-1);
	let sum = 0;
	let multiplier = 2;
	for (let i = body.length - 1; i >= 0; i--) {
		sum += parseInt(body.charAt(i), 10) * multiplier;
		multiplier = multiplier === 7 ? 2 : multiplier + 1;
	}
	const mod = 11 - (sum % 11);
	const dvExpected = mod === 11 ? "0" : mod === 10 ? "K" : String(mod);
	return dv.toUpperCase() === dvExpected;
}

export default function CompanyModal({
	isOpen,
	onClose,
	onCompanyCreated,
	editingCompany,
}: CompanyModalProps) {
	const [formData, setFormData] = useState<Company>({
		name: "",
		industry: "",
		website: "",
		email: "",
		phone: "",
		address: "",
		city: "",
		region: "",
		comuna: "",
		country: "CL",
		employee_count: undefined,
		status: "prospect",
		logo_url: "",
		document: "",
	});
	// phone stored as E.164 in formData.phone (e.g. +56912345678)
	const [regions, setRegions] = useState<{ code: string; name: string }[]>([]);
	const [cities, setCities] = useState<string[]>([]);
	const [customIndustry, setCustomIndustry] = useState<string>("");
	const [isSaving, setIsSaving] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
	const [logoPreviewUrl, setLogoPreviewUrl] = useState<string>("");
	const [adminEmailToCreate, setAdminEmailToCreate] = useState("");
	const [adminPasswordToCreate, setAdminPasswordToCreate] = useState("");
	const [adminFirstName, setAdminFirstName] = useState("");
	const [adminLastName, setAdminLastName] = useState("");
	const [adminRut, setAdminRut] = useState("");
	const [adminPhone, setAdminPhone] = useState("");
	const [adminAvailable, setAdminAvailable] = useState<boolean | null>(null);
	const [showAdminPassword, setShowAdminPassword] = useState(false);
	const [isLogoDragOver, setIsLogoDragOver] = useState(false);
	const { isCollapsed } = useSidebar();
	const [mounted, setMounted] = useState(false);

	function toTitleCase(str: string) {
		return str
			.toLowerCase()
			.split(" ")
			.map((s) => (s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : ""))
			.join(" ");
	}

	const loadAdministratorData = useCallback(async (companyId: string) => {
		try {
			const { data, error } = await supabase
				.from("pr_users")
				.select("*")
				.eq("company_id", companyId)
				.eq("role", "admin")
				.single();

			if (data && !error) {
				console.log("Loading administrator data:", data);
				setAdminEmailToCreate(data.email);
				setAdminFirstName(data.nombres || "");
				setAdminLastName(data.apellidos || "");

				// Format document for display: if it's a valid RUT, show formatted, otherwise show plain
				const document = data.document || "";
				if (document && validateRut(document)) {
					setAdminRut(formatRut(document));
				} else {
					setAdminRut(document);
				}

				setAdminPhone(data.phone || "");
			} else {
				console.error("Error loading administrator:", error);
			}
		} catch (error) {
			console.error("Error loading administrator data:", error);
		}
	}, []);

	const handleAdminFirstNameBlur = () => {
		if (!adminFirstName) return;
		setAdminFirstName(toTitleCase(adminFirstName));
	};

	const handleAdminLastNameBlur = () => {
		if (!adminLastName) return;
		setAdminLastName(toTitleCase(adminLastName));
	};

	useEffect(() => {
		// ensure DOM is available for portal
		setMounted(true);
	}, []);

	useEffect(() => {
		if (editingCompany) {
			// Format document for display: if it's a valid RUT, show formatted, otherwise show plain
			const companyData: CompanyWithLegacyRut = { ...editingCompany };
			// Backward compatibility: some rows may still have `rut` instead of `document`
			if (!companyData.document && companyData.rut) {
				companyData.document = companyData.rut;
			}
			if (companyData.document) {
				if (validateRut(companyData.document)) {
					companyData.document = formatRut(companyData.document);
				}
				// If not valid RUT, keep as plain text
			}

			setFormData(companyData);
			// phone field already stored as E.164 in editingCompany.phone

			// if the stored industry isn't one of our predefined ones, treat it as a custom industry
			const predefined = [
				"Agricultura",
				"Construcción",
				"Consultoría",
				"Contratos",
				"Educación",
				"Energía",
				"Hostelería y Turismo",
				"Inmobiliaria",
				"Manufactura",
				"Medios y Entretenimiento",
				"Minería",
				"Retail",
				"Salud",
				"Servicios Financieros",
				"Servicios Públicos",
				"Telecomunicaciones",
				"Tecnología",
				"Transporte y Logística",
				"Otro",
			];
			if (
				editingCompany.industry &&
				!predefined.includes(editingCompany.industry)
			) {
				setFormData((prev) => ({ ...prev, industry: "Otro" }) as Company);
				setCustomIndustry(editingCompany.industry);
			}

			// Load administrator data for editing (only if we have a valid id)
			if (editingCompany.id) {
				loadAdministratorData(editingCompany.id);
			}
		} else {
			// Reset form data for new company
			setFormData({
				name: "",
				industry: "",
				website: "",
				email: "",
				phone: "",
				address: "",
				city: "",
				region: "",
				comuna: "",
				country: "CL",
				employee_count: undefined,
				status: "prospect",
				logo_url: "",
				document: "",
			});
			setAdminEmailToCreate("");
			setAdminPasswordToCreate("");
			setAdminFirstName("");
			setAdminLastName("");
			setAdminRut("");
			setAdminPhone("");
			setCustomIndustry("");
			// Limpiar estados de logo para nueva empresa
			setPendingLogoFile(null);
			setLogoPreviewUrl("");
		}
	}, [editingCompany, loadAdministratorData]);

	useEffect(() => {
		// detect if server supports admin creation (has service role key set)
		let mounted = true;
		(async () => {
			try {
				const res = await fetch("/api/admin/available");
				if (!mounted) return;
				const json = await res.json();
				setAdminAvailable(!!json.available);
			} catch (_e) {
				setAdminAvailable(false);
			}
		})();
		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		if (formData.country) {
			const regs = getRegionsByCountry(formData.country) || [];
			type R = { code?: string; name?: string };
			setRegions(
				regs.map((r: R) => ({
					code: r.code || r.name || "",
					name: r.name || r.code || "",
				})),
			);
		} else {
			setRegions([]);
		}
		setCities([]);
	}, [formData.country]);

	useEffect(() => {
		if (formData.region && formData.country) {
			const c = getCitiesByRegion(formData.country, formData.region) || [];
			setCities(c);
		} else {
			setCities([]);
		}
	}, [formData.region, formData.country]);

	if (!isOpen) return null;
	if (!mounted) return null;

	const handleChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => {
		const { name, value } = e.target as HTMLInputElement;
		let v: string = value;
		if (name === "email") v = value.toLowerCase();
		if (name === "name") v = toTitleCase(value);
		if (name === "employee_count") {
			const num = value === "" ? undefined : Number(value);
			setFormData((prev) => ({ ...prev, [name]: num }) as Company);
			return;
		}
		// if user selects an industry other than 'Otro', clear any custom industry
		if (name === "industry" && value !== "Otro") {
			setCustomIndustry("");
		}
		setFormData((prev) => ({ ...prev, [name]: v }) as Company);
	};

	// derive company size from employee_count
	function getSizeCategory(count?: number) {
		if (count === undefined || count === null) return "";
		// Ranges (adjust as desired):
		// Micro: 1-9
		// Pequeña: 10-49
		// Mediana: 50-249
		// Grande: 250+
		if (count <= 0) return "Sin colaboradores";
		if (count <= 9) return "Micro";
		if (count <= 49) return "Pequeña";
		if (count <= 249) return "Mediana";
		return "Grande";
	}

	const handleAddressBlur = () => {
		const addr = formData.address || "";
		if (!addr) return;
		setFormData((prev) => ({ ...prev, address: toTitleCase(addr) }) as Company);
	};

	const handleDocumentBlur = () => {
		const raw = formData.document || "";
		if (!raw) return;
		const cleaned = cleanRut(raw);
		if (!cleaned) return;
		if (validateRut(cleaned)) {
			setFormData(
				(prev) => ({ ...prev, document: formatRut(cleaned) }) as Company,
			);
		} else {
			// keep as cleaned digits (no dots or dash) when invalid
			setFormData((prev) => ({ ...prev, document: cleaned }) as Company);
		}
	};

	const handleAdminRutBlur = () => {
		const raw = adminRut || "";
		if (!raw) return;
		const cleaned = cleanRut(raw);
		if (!cleaned) return;
		if (validateRut(cleaned)) {
			setAdminRut(formatRut(cleaned));
		} else {
			setAdminRut(cleaned);
		}
	};

	const handleLogoSelectedFile = async (file: File) => {
		if (!file.type.startsWith("image/")) {
			alert("Solo se permiten archivos de imagen.");
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			alert("La imagen excede 5MB. Selecciona un archivo más liviano.");
			return;
		}

		// Solo subir inmediatamente si estamos editando una empresa existente
		if (editingCompany?.id) {
			await uploadFile(file, editingCompany.id);
		} else {
			// Para nuevas empresas, solo guardar el archivo y mostrar preview
			setPendingLogoFile(file);
			try {
				if (logoPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(logoPreviewUrl);
				const url = URL.createObjectURL(file);
				setLogoPreviewUrl(url);
			} catch {
				// ignore preview creation issues
			}
		}
	};

	const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		await handleLogoSelectedFile(file);
		// allow selecting the same file again
		e.target.value = "";
	};

	const updateCompanyViaAdminEndpoint = async (
		companyId: string,
		companyPayload: Record<string, unknown>,
	) => {
		const sess = await supabase.auth.getSession();
		const token = sess.data.session?.access_token;
		if (!token) {
			throw new Error(
				"Debes iniciar sesión como administrador para actualizar la empresa.",
			);
		}
		const res = await fetch("/api/admin/update-company", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				companyId,
				payloadFields: companyPayload,
			}),
		});
		const text = await res.text().catch(() => null);
		let json: unknown = null;
		try {
			json = text ? JSON.parse(text) : null;
		} catch (_e) {
			json = text;
		}
		if (!res.ok) {
			const jsonRecord =
				json && typeof json === "object"
					? (json as Record<string, unknown>)
					: null;
			const errorValue = jsonRecord?.error;
			const messageValue = jsonRecord?.message;
			const detailValue = jsonRecord?.detail;
			const detailMessage =
				detailValue && typeof detailValue === "object"
					? (((detailValue as Record<string, unknown>).message as
							| string
							| undefined) ||
						((detailValue as Record<string, unknown>).error_description as
							| string
							| undefined) ||
						((detailValue as Record<string, unknown>).msg as string | undefined))
					: typeof detailValue === "string"
						? detailValue
						: undefined;
			throw new Error(
				(typeof messageValue === "string" && messageValue) ||
					(typeof detailMessage === "string" && detailMessage) ||
					(typeof errorValue === "string" && errorValue) ||
					text ||
					"update company failed",
			);
		}
		return json;
	};

	// centralized upload used by file input and dropzone
	const uploadFile = async (file: File, companyId?: string): Promise<string> => {
		setUploading(true);
		try {
			const fileExt = file.name.split(".").pop();
			const slug = (formData.name || "company")
				.toString()
				.trim()
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/(^-|-$)/g, "");
			const ts = Date.now();
			const fileNameOnly = `company-${ts}-${slug}.${fileExt}`;
			const storagePath = companyId
				? `${companyId}/logo/${fileNameOnly}`
				: `tmp/${ts}-${slug}/logo/${fileNameOnly}`;
			const { data, error: uploadError } = await supabase.storage
				.from("companies")
				.upload(storagePath, file, { upsert: true });
			if (uploadError) throw uploadError;
			const { data: pub } = supabase.storage
				.from("companies")
				.getPublicUrl(data.path);
			const publicUrl = pub.publicUrl || "";
			setFormData((prev) => ({ ...prev, logo_url: publicUrl }) as Company);
			setLogoPreviewUrl(publicUrl);

			// If editing existing company, update database immediately
			if (companyId && editingCompany?.id) {
				if (adminAvailable !== false) {
					await updateCompanyViaAdminEndpoint(editingCompany.id, {
						logo_url: publicUrl,
					});
				} else {
					await supabase
						.from("pr_companies")
						.update({ logo_url: publicUrl })
						.eq("id", editingCompany.id);
				}
			}
			return publicUrl;
		} catch (err) {
			console.error("Error uploading file", err);
			try {
				const msg = getErrorMessage(err);
				if (/bucket not found/i.test(msg) || /Bucket not found/i.test(msg)) {
					alert(
						'Error: el bucket "companies" no existe en Supabase. Crea el bucket llamado "companies" en el panel de Supabase o ejecuta el script `scripts/create-logos-bucket.js` con la SERVICE_ROLE key.',
					);
				}
			} catch (_e) {
				// ignore
			}
			return "";
		} finally {
			setUploading(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.name) return;
		setIsSaving(true);
		try {
			// prepare final payload: combine phone prefix + local, ensure email lowercase and title-case name/address
			const payload: Company = { ...formData };
			payload.email = payload.email
				? payload.email.toLowerCase()
				: payload.email;
			payload.name = payload.name ? toTitleCase(payload.name) : payload.name;
			payload.address = payload.address
				? toTitleCase(payload.address)
				: payload.address;
			// ensure website has protocol if provided
			if (payload.website && !/^https?:\/\//i.test(payload.website)) {
				payload.website = `https://${payload.website}`;
			}
			// if industry is 'Otro', require a custom industry value and use it in payload
			if (payload.industry === "Otro") {
				if (!customIndustry || !customIndustry.trim()) {
					alert('Por favor especifica la industria cuando seleccionas "Otro".');
					setIsSaving(false);
					return;
				}
				payload.industry = customIndustry.trim();
			}

			// compute size category from employee_count and include in payload
			payload.size_category = getSizeCategory(payload.employee_count);
			// If adminEmailToCreate and adminPasswordToCreate are provided and we're creating a new company,
			// call the protected server endpoint which uses the SERVICE_ROLE key.
			if (!editingCompany && adminEmailToCreate && adminPasswordToCreate) {
				if (adminAvailable) {
					// Use protected server endpoint which runs with SERVICE_ROLE key and will create auth user, company
					// and insert the pr_users row server-side (role set by server).
					try {
						const sess = await supabase.auth.getSession();
						console.debug("DEBUG supabase.getSession ->", sess);
						const token = sess.data.session?.access_token;
						console.debug(
							"DEBUG token ->",
							token ? `${token.slice(0, 8)}...${token.slice(-8)}` : token,
						);
						if (!token) {
							alert(
								"Debes iniciar sesión como un usuario con permisos de administrador para crear empresa con administrador.",
							);
							setIsSaving(false);
							return;
						}
						const endpointBody = {
							companyName: payload.name,
							adminEmail: adminEmailToCreate,
							adminPassword: adminPasswordToCreate,
							payloadFields: payload,
							// include admin personal details for server to insert into pr_users
							payloadAdmin: {
								nombres: adminFirstName
									? toTitleCase(adminFirstName)
									: undefined,
								apellidos: adminLastName
									? toTitleCase(adminLastName)
									: undefined,
								document: adminRut ? adminRut : undefined,
								phone: adminPhone ? adminPhone : undefined,
							},
						};

						const headers: HeadersInit = {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token || ""}`,
						};

						const res = await fetch("/api/admin/create-company", {
							method: "POST",
							headers,
							body: JSON.stringify(endpointBody),
						});
						const text = await res.text().catch(() => null);
						let json: unknown = null;
						try {
							json = text ? JSON.parse(text) : null;
						} catch (_e) {
							json = text;
						}
						console.debug("DEBUG create-company response", res.status, json);
						if (!res.ok) {
							const jsonRecord =
								json && typeof json === "object"
									? (json as Record<string, unknown>)
									: null;
							const errorValue = jsonRecord?.error;
							const messageValue = jsonRecord?.message;
							const detailValue = jsonRecord?.detail;
							const detailMessage =
								detailValue && typeof detailValue === "object"
									? (((detailValue as Record<string, unknown>).message as
											| string
											| undefined) ||
										((detailValue as Record<string, unknown>)
											.error_description as string | undefined) ||
										((detailValue as Record<string, unknown>).msg as
											| string
											| undefined) ||
										((detailValue as Record<string, unknown>)
											.error_code as string | undefined))
									: typeof detailValue === "string"
										? detailValue
									: undefined;
							throw new Error(
									(typeof messageValue === "string" && messageValue) ||
									(typeof detailMessage === "string" && detailMessage) ||
									(typeof errorValue === "string" && errorValue) ||
									text ||
									"create company failed",
							);
						}
						// After company is created, if we have a pending logo file, upload to companies/{uuid}/logo/
						try {
							const jsonRecord =
								json && typeof json === "object"
									? (json as Record<string, unknown>)
									: null;
							const companyRecord =
								jsonRecord?.company && typeof jsonRecord.company === "object"
									? (jsonRecord.company as Record<string, unknown>)
									: null;
							const companyIdValue =
								(companyRecord?.id as string | undefined) ||
								(jsonRecord?.id as string | undefined);
							const createdCompanyId = companyIdValue;
							if (createdCompanyId && pendingLogoFile) {
								const logoUrl = await uploadFile(
									pendingLogoFile,
									createdCompanyId,
								);
								// Persist the exact uploaded URL in the company row.
								if (logoUrl) {
									if (adminAvailable !== false) {
										await updateCompanyViaAdminEndpoint(createdCompanyId, {
											logo_url: logoUrl,
										});
									} else {
										await supabase
											.from("pr_companies")
											.update({ logo_url: logoUrl })
											.eq("id", createdCompanyId);
									}
								}
								setPendingLogoFile(null);
								setLogoPreviewUrl(""); // Clear preview URL
							}
						} catch (e) {
							console.error("Error finalizing logo upload", e);
						}
					} catch (err) {
						console.error("Error creating company via admin endpoint", err);
						setIsSaving(false);
						alert(
							"Error creando la empresa con administrador: " +
								getErrorMessage(err),
						);
						return;
					}
				} else {
					// Fallback: create auth user and company with anon client, but pr_users insertion must be done separately by an admin
					// Crear usuario admin con Supabase Auth
					const { data: signUpData, error: signUpError } =
						await supabase.auth.signUp({
							email: adminEmailToCreate,
							password: adminPasswordToCreate,
							options: {
								data: {
									nombres: adminFirstName
										? toTitleCase(adminFirstName)
										: undefined,
									apellidos: adminLastName
										? toTitleCase(adminLastName)
										: undefined,
									document: adminRut ? cleanRut(adminRut) : undefined,
									phone: adminPhone ? adminPhone : undefined,
									role: "admin",
								},
							},
						});
					if (
						signUpError?.message
							?.toLowerCase()
							.includes("user already registered")
					) {
						alert(
							"El correo ingresado ya est\u00e1 registrado como usuario. Por favor ingresa un correo diferente.",
						);
						setIsSaving(false);
						return;
					}
					if (signUpError)
						throw new Error(
							signUpError.message || "Error creando usuario administrador",
						);
					if (!signUpData?.user?.id)
						throw new Error(
							"No se pudo obtener el ID del usuario administrador",
						);

					// Crear empresa en la vista p\u00fablica pr_companies
						const { data: createdCompany, error: companyError } = await supabase
							.from("pr_companies")
							.insert([{ ...payload }])
							.select("id")
							.single();
						if (companyError) throw companyError;

						if (createdCompany?.id && pendingLogoFile) {
							const logoUrl = await uploadFile(pendingLogoFile, createdCompany.id);
							if (logoUrl) {
								await supabase
									.from("pr_companies")
									.update({ logo_url: logoUrl })
									.eq("id", createdCompany.id);
							}
							setPendingLogoFile(null);
							setLogoPreviewUrl("");
						}
					}
				} else {
				if (editingCompany?.id) {
					if (adminAvailable && adminPasswordToCreate.trim()) {
						const sess = await supabase.auth.getSession();
						const token = sess.data.session?.access_token;
						if (!token) {
							alert(
								"Debes iniciar sesión como administrador para restablecer la contraseña del usuario administrador.",
							);
							setIsSaving(false);
							return;
						}
						const resetRes = await fetch(
							"/api/admin/reset-company-admin-password",
							{
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									Authorization: `Bearer ${token}`,
								},
								body: JSON.stringify({
									companyId: editingCompany.id,
									adminEmail: adminEmailToCreate || undefined,
									newPassword: adminPasswordToCreate.trim(),
								}),
							},
						);
						const resetText = await resetRes.text().catch(() => null);
						let resetJson: unknown = null;
						try {
							resetJson = resetText ? JSON.parse(resetText) : null;
						} catch (_e) {
							resetJson = resetText;
						}
						if (!resetRes.ok) {
							const jsonRecord =
								resetJson && typeof resetJson === "object"
									? (resetJson as Record<string, unknown>)
									: null;
							const errorValue = jsonRecord?.error;
							const detailValue = jsonRecord?.detail;
							throw new Error(
								(typeof detailValue === "string" && detailValue) ||
									(typeof errorValue === "string" && errorValue) ||
									resetText ||
									"No se pudo restablecer la contraseña del administrador",
							);
						}
					}
					if (adminAvailable !== false) {
						await updateCompanyViaAdminEndpoint(editingCompany.id, {
							...payload,
						});
					} else {
						const { error } = await supabase
							.from("pr_companies")
							.update({ ...payload })
							.eq("id", editingCompany.id);
						if (error) throw error;
					}
					} else {
						const { data: createdCompany, error } = await supabase
							.from("pr_companies")
							.insert([{ ...payload }])
							.select("id")
							.single();
						if (error) throw error;

						if (createdCompany?.id && pendingLogoFile) {
							const logoUrl = await uploadFile(pendingLogoFile, createdCompany.id);
							if (logoUrl) {
								if (adminAvailable !== false) {
									await updateCompanyViaAdminEndpoint(createdCompany.id, {
										logo_url: logoUrl,
									});
								} else {
									await supabase
										.from("pr_companies")
										.update({ logo_url: logoUrl })
										.eq("id", createdCompany.id);
								}
							}
							setPendingLogoFile(null);
							setLogoPreviewUrl("");
						}
					}
				}
			onCompanyCreated?.();
			onClose();
		} catch (err) {
			console.error("Error saving company", err);
			alert("Error guardando empresa: " + getErrorMessage(err));
		} finally {
			setIsSaving(false);
		}
	};

	const modalMarkup = (
		<div
			className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 ${isCollapsed ? "lg:left-16" : "lg:left-64"}`}
		>
			<div className="w-full max-w-5xl bg-white rounded shadow p-6 lg:p-8 max-h-[95vh] overflow-auto">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold">
						{editingCompany ? "Editar Empresa" : "Crear Empresa"}
					</h3>
					<button
						type="button"
						onClick={onClose}
						aria-label="Cerrar"
						className="p-1"
					>
						<X />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						<div>
							<label htmlFor="company-name" className="block text-sm mb-1">
								Nombre Empresa
							</label>
							<input
								id="company-name"
								name="name"
								value={formData.name}
								onChange={handleChange}
								placeholder="Nombre"
								className="border p-2 rounded w-full"
							/>
						</div>

						<div>
							<label htmlFor="company-document" className="block text-sm mb-1">
								RUT / Documento
							</label>
							<input
								id="company-document"
								name="document"
								value={formData.document ?? ""}
								onChange={handleChange}
								onBlur={handleDocumentBlur}
								placeholder="12.345.678-K"
								className="border p-2 rounded w-full"
							/>
						</div>

						<div>
							<label htmlFor="company-industry" className="block text-sm mb-1">
								Industria
							</label>
							<select
								id="company-industry"
								name="industry"
								value={formData.industry}
								onChange={handleChange}
								className="border p-2 rounded w-full"
							>
								<option value="">Seleccionar industria</option>
								{[
									"Agricultura",
									"Construcción",
									"Consultoría",
									"Contratos",
									"Educación",
									"Energía",
									"Hostelería y Turismo",
									"Inmobiliaria",
									"Manufactura",
									"Medios y Entretenimiento",
									"Minería",
									"Retail",
									"Salud",
									"Servicios Financieros",
									"Servicios Públicos",
									"Telecomunicaciones",
									"Tecnología",
									"Transporte y Logística",
									"Otro",
								].map((opt) => (
									<option key={opt} value={opt}>
										{opt}
									</option>
								))}
							</select>
						</div>

						<div>
							<label htmlFor="company-email" className="block text-sm mb-1">
								Email Empresa
							</label>
							<input
								id="company-email"
								name="email"
								value={formData.email}
								onChange={handleChange}
								placeholder="Email Empresa"
								className="border p-2 rounded w-full"
							/>
						</div>

						<div>
							<p className="block text-sm mb-1">Teléfono</p>
							<div className="border p-2 rounded w-full">
								<PhoneField
									value={formData.phone}
									onChange={(v) =>
										setFormData((prev) => ({ ...prev, phone: v }) as Company)
									}
									defaultCountry={formData.country || "CL"}
									className="w-full"
								/>
							</div>
						</div>

						<div>
							<label htmlFor="company-country" className="block text-sm mb-1">
								País
							</label>
							<select
								id="company-country"
								name="country"
								value={formData.country}
								onChange={(e) => {
									handleChange(e);
									setFormData(
										(prev) =>
											({
												...prev,
												region: "",
												city: "",
												comuna: "",
											}) as Company,
									);
								}}
								className="border p-2 rounded w-full"
							>
								{countries.map((c) => (
									<option key={c.code} value={c.code}>
										{c.name}
									</option>
								))}
							</select>
						</div>

						<div>
							<label htmlFor="company-region" className="block text-sm mb-1">
								Región / Departamento
							</label>
							<select
								id="company-region"
								name="region"
								value={formData.region}
								onChange={(e) => {
									handleChange(e);
									setFormData(
										(prev) => ({ ...prev, city: "", comuna: "" }) as Company,
									);
								}}
								className="border p-2 rounded w-full"
								disabled={!formData.country}
							>
								<option value="">Seleccionar región</option>
								{regions.map((r) => (
									<option key={r.code} value={r.code}>
										{r.name}
									</option>
								))}
							</select>
						</div>

						<div>
							<label htmlFor="company-city" className="block text-sm mb-1">
								Ciudad / Comuna
							</label>
							<select
								id="company-city"
								name="city"
								value={formData.city || formData.comuna || ""}
								onChange={(e) => {
									const v = e.target.value;
									setFormData(
										(prev) => ({ ...prev, city: v, comuna: v }) as Company,
									);
								}}
								className="border p-2 rounded w-full"
								disabled={!formData.region}
							>
								<option value="">Seleccionar ciudad / comuna</option>
								{cities.map((city) => (
									<option key={city} value={city}>
										{city}
									</option>
								))}
							</select>
						</div>

						<div>
							<label htmlFor="company-address" className="block text-sm mb-1">
								Dirección
							</label>
							<input
								id="company-address"
								name="address"
								value={formData.address}
								onChange={handleChange}
								onBlur={handleAddressBlur}
								placeholder="Dirección"
								className="border p-2 rounded w-full"
							/>
						</div>

						{/* Admin personal details: nombres, apellidos */}
						<div>
							<label htmlFor="admin-first-name" className="block text-sm mb-1">
								Nombres administrador
							</label>
							<input
								id="admin-first-name"
								value={adminFirstName}
								onChange={(e) => setAdminFirstName(e.target.value)}
								onBlur={handleAdminFirstNameBlur}
								placeholder="Nombres"
								className="border p-2 rounded w-full"
							/>
						</div>

						<div>
							<label htmlFor="admin-last-name" className="block text-sm mb-1">
								Apellidos administrador
							</label>
							<input
								id="admin-last-name"
								value={adminLastName}
								onChange={(e) => setAdminLastName(e.target.value)}
								onBlur={handleAdminLastNameBlur}
								placeholder="Apellidos"
								className="border p-2 rounded w-full"
							/>
						</div>

						<div>
							<label className="block text-sm mb-1 flex items-center justify-between">
								<span>Correo administrador</span>
								<button
									type="button"
									className="text-xs text-orange-600 hover:underline ml-2"
									onClick={() => setAdminEmailToCreate(formData.email || "")}
									disabled={!formData.email}
								>
									Email Empresa
								</button>
							</label>
							<input
								id="admin-email"
								value={adminEmailToCreate}
								onChange={(e) => setAdminEmailToCreate(e.target.value)}
								placeholder="Email admin@empresa.com"
								className="border p-2 rounded w-full"
							/>
						</div>

						<div>
							<label htmlFor="admin-password" className="block text-sm mb-1">
								Contraseña administrador (temporal)
							</label>
							<div className="relative">
								<input
									id="admin-password"
									type={showAdminPassword ? "text" : "password"}
									value={adminPasswordToCreate}
									onChange={(e) => setAdminPasswordToCreate(e.target.value)}
									placeholder="Contraseña temporal"
									className="border p-2 rounded w-full pr-16"
								/>
								<button
									type="button"
									onClick={() =>
										setAdminPasswordToCreate(generateRandomPassword(12))
									}
									className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-orange-600"
									title="Generar contraseña aleatoria"
								>
									<RefreshCw className="w-4 h-4" />
								</button>
								<button
									type="button"
									onClick={() => setShowAdminPassword(!showAdminPassword)}
									className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
								>
									{showAdminPassword ? (
										<EyeOff className="w-4 h-4" />
									) : (
										<Eye className="w-4 h-4" />
									)}
								</button>
							</div>
						</div>

						{/* Admin personal details: rut, telefono */}
						<div>
							<label htmlFor="admin-document" className="block text-sm mb-1">
								RUT / Documento administrador
							</label>
							<input
								id="admin-document"
								value={adminRut}
								onChange={(e) => setAdminRut(e.target.value)}
								onBlur={handleAdminRutBlur}
								placeholder="12.345.678-K"
								className="border p-2 rounded w-full"
							/>
						</div>

						<div>
							<p className="block text-sm mb-1">Teléfono administrador</p>
							<div className="border p-2 rounded w-full">
								<PhoneField
									value={adminPhone}
									onChange={(v) => setAdminPhone(v || "")}
									defaultCountry={formData.country || "CL"}
									className="w-full"
								/>
							</div>
						</div>

						<div>
							<label
								htmlFor="company-employee-count"
								className="block text-sm mb-1"
							>
								Número de Colaboradores
							</label>
							<input
								id="company-employee-count"
								name="employee_count"
								value={formData.employee_count ?? ""}
								onChange={handleChange}
								placeholder="Número de Colaboradores"
								type="number"
								className="border p-2 rounded w-full"
							/>
						</div>

						<div>
							<p className="block text-sm mb-1">Tamaño</p>
							<div className="border p-2 rounded w-full text-base text-gray-600">
								{" "}
								<span className="font-medium">
									{getSizeCategory(formData.employee_count) || "—"}
								</span>
							</div>
						</div>

						<div>
							<label htmlFor="company-website" className="block text-sm mb-1">
								Website
							</label>
							<input
								id="company-website"
								name="website"
								value={formData.website}
								onChange={handleChange}
								onBlur={() => {
									const w = (formData.website || "").toString().trim();
									if (w && !/^https?:\/\//i.test(w)) {
										setFormData(
											(prev) =>
												({ ...prev, website: `https://${w}` }) as Company,
										);
									}
								}}
								placeholder="Website"
								className="border p-2 rounded w-full"
							/>
						</div>

						<div>
							<p className="block text-sm mb-1">Logo</p>
							<label
								htmlFor="company-logo-hidden"
								className={`w-full rounded-lg border-2 border-dashed p-3 cursor-pointer transition-colors block ${
									isLogoDragOver
										? "border-orange-500 bg-orange-50"
										: "border-gray-300 hover:border-gray-400 bg-gray-50"
								}`}
								onDragEnter={(e) => {
									e.preventDefault();
									setIsLogoDragOver(true);
								}}
								onDragOver={(e) => {
									e.preventDefault();
									setIsLogoDragOver(true);
								}}
								onDragLeave={(e) => {
									e.preventDefault();
									setIsLogoDragOver(false);
								}}
								onDrop={async (e) => {
									e.preventDefault();
									setIsLogoDragOver(false);
									const f = e.dataTransfer?.files?.[0];
									if (f) await handleLogoSelectedFile(f);
								}}
							>
								{uploading ? (
									<div className="h-28 flex items-center justify-center text-sm text-gray-600">
										Subiendo logo...
									</div>
								) : logoPreviewUrl || formData.logo_url ? (
									<div className="h-28 w-full bg-white rounded border border-gray-200 p-2 flex items-center justify-center overflow-hidden">
										<NextImage
											src={logoPreviewUrl || formData.logo_url || ""}
											alt="logo"
											className="max-h-full max-w-full w-auto h-auto object-contain"
											width={640}
											height={320}
											unoptimized
										/>
									</div>
								) : (
									<div className="h-28 flex flex-col items-center justify-center text-center text-gray-500">
										<Image className="w-7 h-7 text-gray-400 mb-2" />
										<p className="text-sm font-medium">
											Arrastra y suelta tu logo aquí
										</p>
										<p className="text-xs mt-1">
											o haz clic para seleccionar (PNG, JPG o GIF, máx. 5MB)
										</p>
									</div>
								)}
								{(logoPreviewUrl || formData.logo_url) && !uploading ? (
									<p className="text-xs text-gray-500 mt-2 text-center">
										Arrastra otra imagen o haz clic para reemplazar.
									</p>
								) : null}
								<input
									id="company-logo-hidden"
									type="file"
									accept="image/*"
									onChange={handleFile}
									className="hidden"
								/>
							</label>
						</div>

						<div>
							<label htmlFor="company-status" className="block text-sm">
								Estado
							</label>
							<select
								id="company-status"
								name="status"
								value={formData.status}
								onChange={handleChange}
								className="border p-2 rounded w-full"
							>
								<option value="prospect">Prospect</option>
								<option value="active">Active</option>
								<option value="inactive">Inactive</option>
							</select>
						</div>
					</div>

					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 bg-gray-200 rounded"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={isSaving}
							className="px-4 py-2 bg-amber-600 text-white rounded flex items-center gap-2"
						>
							{uploading ? (
								<UploadCloud className="w-4 h-4" />
							) : (
								<Save className="w-4 h-4" />
							)}
							{isSaving
								? "Guardando..."
								: editingCompany
									? "Actualizar"
									: "Crear"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);

	return createPortal(modalMarkup, document.body);
}
