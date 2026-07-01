"use client";
import {
	AlertTriangle,
	ArrowLeft,
	Bell,
	Database,
	Globe,
	Key,
	RefreshCw,
	Save,
	Shield,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface PRSettings {
	general: {
		siteName: string;
		siteDescription: string;
		siteUrl: string;
		adminEmail: string;
		timezone: string;
		language: string;
	};
	notifications: {
		emailNotifications: boolean;
		smsNotifications: boolean;
		systemAlerts: boolean;
		userRegistrations: boolean;
		errorReports: boolean;
	};
	security: {
		twoFactorAuth: boolean;
		passwordPolicy: "basic" | "medium" | "strong";
		sessionTimeout: number;
		maxLoginAttempts: number;
	};
	api: {
		apiUrl: string;
		apiKey: string;
		rateLimit: number;
		enableCors: boolean;
	};
}

export default function PRSettingsPage() {
	const [settings, setSettings] = useState<PRSettings>({
		general: {
			siteName: "PR IngenIT",
			siteDescription: "Sistema de gestión de proyectos PR",
			siteUrl: "https://pr.ingenit.cl",
			adminEmail: "admin@pr.ingenit.cl",
			timezone: "America/Santiago",
			language: "es",
		},
		notifications: {
			emailNotifications: true,
			smsNotifications: false,
			systemAlerts: true,
			userRegistrations: true,
			errorReports: true,
		},
		security: {
			twoFactorAuth: false,
			passwordPolicy: "medium",
			sessionTimeout: 30,
			maxLoginAttempts: 5,
		},
		api: {
			apiUrl: "https://api.pr.ingenit.cl",
			apiKey: "***************",
			rateLimit: 1000,
			enableCors: true,
		},
	});

	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [savedMessage, setSavedMessage] = useState("");
	const router = useRouter();

	const loadSettings = useCallback(async () => {
		try {
			setIsLoading(true);
			console.log("🔍 Cargando configuraciones PR...");

			// Simular carga de configuraciones desde Supabase
			// En un caso real, cargaríamos desde pr_settings
			await new Promise((resolve) => setTimeout(resolve, 500));
		} catch (error) {
			console.error("❌ Error cargando configuraciones PR:", error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadSettings();
	}, [loadSettings]);

	const saveSettings = async () => {
		try {
			setIsSaving(true);
			console.log("💾 Guardando configuraciones PR...");

			// Simular guardado en Supabase
			await new Promise((resolve) => setTimeout(resolve, 1000));

			setSavedMessage("Configuraciones guardadas exitosamente");
			setTimeout(() => setSavedMessage(""), 3000);
		} catch (error) {
			console.error("❌ Error guardando configuraciones PR:", error);
			setSavedMessage("Error al guardar configuraciones");
		} finally {
			setIsSaving(false);
		}
	};

	const handleInputChange = (
		section: keyof PRSettings,
		field: string,
		value: string | number | boolean,
	) => {
		setSettings((prev) => ({
			...prev,
			[section]: {
				...prev[section],
				[field]: value,
			},
		}));
	};

	if (isLoading) {
		return (
				<div className="flex items-center justify-center h-screen">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue6 mx-auto mb-4"></div>
						<p className="text-gray4">Cargando configuraciones...</p>
					</div>
				</div>
			);
		}

	return (
		<div className="min-h-screen bg-gray10 p-2 sm:p-3 lg:p-4">
			<div className="w-full max-w-none">
				<div className="mb-4 rounded-md border border-gray9 bg-white p-4 shadow-sm">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<button
							type="button"
							onClick={() => router.push("/admin/pr")}
							className="inline-flex w-fit items-center gap-2 rounded-md border border-gray9 bg-white px-3 py-2 text-sm font-medium text-gray3 shadow-sm transition-colors duration-200 hover:bg-gray10 hover:text-gray1"
						>
							<ArrowLeft className="h-4 w-4" />
							Volver atrás
						</button>

						<div className="flex flex-wrap gap-3">
							<button
								type="button"
								onClick={loadSettings}
								className="flex items-center gap-2 rounded-md border border-gray9 bg-gray10 px-4 py-2 font-medium text-gray3 transition-colors hover:bg-white"
							>
								<RefreshCw className="w-4 h-4" />
								Recargar
							</button>

							<button
								type="button"
								onClick={saveSettings}
								disabled={isSaving}
								className="flex items-center gap-2 rounded-md bg-blue6 px-4 py-2 font-medium text-white transition-colors hover:bg-blue5 disabled:bg-blue8"
							>
								{isSaving ? (
									<>
										<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
										Guardando...
									</>
								) : (
									<>
										<Save className="w-4 h-4" />
										Guardar
									</>
								)}
							</button>
						</div>
					</div>

					{savedMessage && (
						<div
							className={`mt-4 rounded-md border p-3 text-sm ${savedMessage.includes("Error") ? "border-gold6 bg-gold7 text-gold1" : "border-green6 bg-green6 text-green2"}`}
						>
							{savedMessage}
						</div>
					)}
				</div>

				<div className="space-y-4">
				{/* General Settings */}
				<div className="rounded-md border border-gray9 bg-white p-4 shadow-sm">
					<div className="flex items-center gap-2 mb-4">
						<Globe className="w-5 h-5 text-blue6" />
						<h2 className="text-lg font-semibold text-gray1">
							Configuración General
						</h2>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label
								htmlFor="general-site-name"
								className="block text-sm font-medium text-gray3 mb-1"
							>
								Nombre del Sitio
							</label>
							<input
								id="general-site-name"
								type="text"
								value={settings.general.siteName}
								onChange={(e) =>
									handleInputChange("general", "siteName", e.target.value)
								}
								className="w-full px-3 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/10 focus:border-blue6"
							/>
						</div>

						<div>
							<label
								htmlFor="general-site-url"
								className="block text-sm font-medium text-gray3 mb-1"
							>
								URL del Sitio
							</label>
							<input
								id="general-site-url"
								type="url"
								value={settings.general.siteUrl}
								onChange={(e) =>
									handleInputChange("general", "siteUrl", e.target.value)
								}
								className="w-full px-3 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/10 focus:border-blue6"
							/>
						</div>

						<div className="md:col-span-2">
							<label
								htmlFor="general-site-description"
								className="block text-sm font-medium text-gray3 mb-1"
							>
								Descripción
							</label>
							<textarea
								id="general-site-description"
								rows={3}
								value={settings.general.siteDescription}
								onChange={(e) =>
									handleInputChange(
										"general",
										"siteDescription",
										e.target.value,
									)
								}
								className="w-full px-3 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/10 focus:border-blue6"
							/>
						</div>

						<div>
							<label
								htmlFor="general-admin-email"
								className="block text-sm font-medium text-gray3 mb-1"
							>
								Email de Administrador
							</label>
							<input
								id="general-admin-email"
								type="email"
								value={settings.general.adminEmail}
								onChange={(e) =>
									handleInputChange("general", "adminEmail", e.target.value)
								}
								className="w-full px-3 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/10 focus:border-blue6"
							/>
						</div>

						<div>
							<label
								htmlFor="general-timezone"
								className="block text-sm font-medium text-gray3 mb-1"
							>
								Zona Horaria
							</label>
							<select
								id="general-timezone"
								value={settings.general.timezone}
								onChange={(e) =>
									handleInputChange("general", "timezone", e.target.value)
								}
								className="w-full px-3 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/10 focus:border-blue6"
							>
								<option value="America/Santiago">Chile (Santiago)</option>
								<option value="UTC">UTC</option>
								<option value="America/New_York">Estados Unidos (Este)</option>
								<option value="Europe/Madrid">España (Madrid)</option>
							</select>
						</div>
					</div>
				</div>

				{/* Notification Settings */}
				<div className="rounded-md border border-gray9 bg-white p-4 shadow-sm">
					<div className="flex items-center gap-2 mb-4">
						<Bell className="w-5 h-5 text-blue6" />
						<h2 className="text-lg font-semibold text-gray1">
							Notificaciones
						</h2>
					</div>

					<div className="space-y-4">
						{Object.entries(settings.notifications).map(([key, value]) => (
							<div key={key} className="flex items-center justify-between">
								<div>
									<p className="font-medium text-gray1">
										{key === "emailNotifications" && "Notificaciones por Email"}
										{key === "smsNotifications" && "Notificaciones por SMS"}
										{key === "systemAlerts" && "Alertas del Sistema"}
										{key === "userRegistrations" && "Registros de Usuario"}
										{key === "errorReports" && "Reportes de Error"}
									</p>
									<p className="text-sm text-gray5">
										{key === "emailNotifications" &&
											"Recibir notificaciones por correo electrónico"}
										{key === "smsNotifications" &&
											"Recibir notificaciones por mensaje de texto"}
										{key === "systemAlerts" && "Alertas críticas del sistema"}
										{key === "userRegistrations" &&
											"Notificar cuando se registren nuevos usuarios"}
										{key === "errorReports" &&
											"Reportes automáticos de errores"}
									</p>
								</div>
								<label className="relative inline-flex items-center cursor-pointer">
									<input
										type="checkbox"
										checked={value as boolean}
										onChange={(e) =>
											handleInputChange("notifications", key, e.target.checked)
										}
										className="sr-only peer"
									/>
									<div className="w-11 h-6 bg-gray9 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue6/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray9 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue6"></div>
								</label>
							</div>
						))}
					</div>
				</div>

				{/* Security Settings */}
				<div className="rounded-md border border-gray9 bg-white p-4 shadow-sm">
					<div className="flex items-center gap-2 mb-4">
						<Shield className="w-5 h-5 text-blue6" />
						<h2 className="text-lg font-semibold text-gray1">Seguridad</h2>
					</div>

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium text-gray1">
									Autenticación de Dos Factores
								</p>
								<p className="text-sm text-gray5">
									Require verificación adicional para iniciar sesión
								</p>
							</div>
							<label className="relative inline-flex items-center cursor-pointer">
								<input
									type="checkbox"
									checked={settings.security.twoFactorAuth}
									onChange={(e) =>
										handleInputChange(
											"security",
											"twoFactorAuth",
											e.target.checked,
										)
									}
									className="sr-only peer"
								/>
								<div className="w-11 h-6 bg-gray9 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue6/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray9 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue6"></div>
							</label>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label
									htmlFor="security-password-policy"
									className="block text-sm font-medium text-gray3 mb-1"
								>
									Política de Contraseñas
								</label>
								<select
									id="security-password-policy"
									value={settings.security.passwordPolicy}
									onChange={(e) =>
										handleInputChange(
											"security",
											"passwordPolicy",
											e.target.value,
										)
									}
									className="w-full px-3 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/10 focus:border-blue6"
								>
									<option value="basic">Básica (6+ caracteres)</option>
									<option value="medium">
										Media (8+ caracteres, mayús/minús)
									</option>
									<option value="strong">
										Fuerte (12+ caracteres, símbolos)
									</option>
								</select>
							</div>

							<div>
								<label
									htmlFor="security-session-timeout"
									className="block text-sm font-medium text-gray3 mb-1"
								>
									Tiempo de Sesión (minutos)
								</label>
								<input
									id="security-session-timeout"
									type="number"
									min="5"
									max="480"
									value={settings.security.sessionTimeout}
									onChange={(e) =>
										handleInputChange(
											"security",
											"sessionTimeout",
											parseInt(e.target.value, 10),
										)
									}
									className="w-full px-3 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/10 focus:border-blue6"
								/>
							</div>
						</div>
					</div>
				</div>

				{/* API Settings */}
				<div className="rounded-md border border-gray9 bg-white p-4 shadow-sm">
					<div className="flex items-center gap-2 mb-4">
						<Database className="w-5 h-5 text-blue6" />
						<h2 className="text-lg font-semibold text-gray1">
							Configuración API
						</h2>
					</div>

					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label
									htmlFor="api-url"
									className="block text-sm font-medium text-gray3 mb-1"
								>
									URL de la API
								</label>
								<input
									id="api-url"
									type="url"
									value={settings.api.apiUrl}
									onChange={(e) =>
										handleInputChange("api", "apiUrl", e.target.value)
									}
									className="w-full px-3 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/10 focus:border-blue6"
								/>
							</div>

							<div>
								<label
									htmlFor="api-rate-limit"
									className="block text-sm font-medium text-gray3 mb-1"
								>
									Límite de Peticiones/hora
								</label>
								<input
									id="api-rate-limit"
									type="number"
									min="100"
									max="10000"
									value={settings.api.rateLimit}
									onChange={(e) =>
										handleInputChange(
											"api",
											"rateLimit",
											parseInt(e.target.value, 10),
										)
									}
									className="w-full px-3 py-2 border border-gray9 rounded-md focus:outline-none focus:ring-2 focus:ring-blue6/10 focus:border-blue6"
								/>
							</div>
						</div>

						<div>
							<label
								htmlFor="api-key"
								className="block text-sm font-medium text-gray3 mb-1"
							>
								API Key
							</label>
							<div className="flex gap-2">
								<input
									id="api-key"
									type="password"
									value={settings.api.apiKey}
									readOnly
									className="flex-1 px-3 py-2 border border-gray9 rounded-md bg-gray10 text-gray5"
								/>
								<button
									type="button"
									className="px-4 py-2 border border-gray9 text-gray3 rounded-md hover:bg-white flex items-center gap-2"
								>
									<Key className="w-4 h-4" />
									Regenerar
								</button>
							</div>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium text-gray1">Habilitar CORS</p>
								<p className="text-sm text-gray5">
									Permitir peticiones desde otros dominios
								</p>
							</div>
							<label className="relative inline-flex items-center cursor-pointer">
								<input
									type="checkbox"
									checked={settings.api.enableCors}
									onChange={(e) =>
										handleInputChange("api", "enableCors", e.target.checked)
									}
									className="sr-only peer"
								/>
								<div className="w-11 h-6 bg-gray9 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue6/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray9 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue6"></div>
							</label>
						</div>
					</div>
				</div>

				{/* Danger Zone */}
				<div className="bg-red-50 border border-red-200 rounded-md p-6">
					<div className="flex items-center gap-2 mb-4">
						<AlertTriangle className="w-5 h-5 text-red-600" />
						<h2 className="text-lg font-semibold text-red-900">
							Zona de Peligro
						</h2>
					</div>

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium text-red-900">
									Restablecer Configuraciones
								</p>
								<p className="text-sm text-red-700">
									Restaura todas las configuraciones a sus valores por defecto
								</p>
							</div>
							<button
								type="button"
								className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
							>
								Restablecer
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium text-red-900">
									Limpiar Caché del Sistema
								</p>
								<p className="text-sm text-red-700">
									Elimina todos los archivos en caché (puede afectar el
									rendimiento temporalmente)
								</p>
							</div>
							<button
								type="button"
								className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
							>
								Limpiar Caché
							</button>
						</div>
					</div>
				</div>
				</div>
			</div>
		</div>
		);
	}
