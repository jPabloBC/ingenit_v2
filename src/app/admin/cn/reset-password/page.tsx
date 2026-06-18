"use client";
import { Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ResetPasswordCN() {
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const _router = useRouter();
	const searchParams = useSearchParams();

	useEffect(() => {
		// Comprobar que hay token de restablecimiento personalizado en la URL
		const t = searchParams?.get("token");
		if (!t) {
			setError("Enlace de restablecimiento inválido");
			return;
		}
	}, [searchParams]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError("");
		setSuccess("");

		// Validaciones
		if (password.length < 6) {
			setError("La contraseña debe tener al menos 6 caracteres");
			setIsLoading(false);
			return;
		}

		if (password !== confirmPassword) {
			setError("Las contraseñas no coinciden");
			setIsLoading(false);
			return;
		}

		try {
			const token = searchParams?.get("token");
			if (!token) {
				setError("Token de restablecimiento no proporcionado");
				setIsLoading(false);
				return;
			}

			const res = await fetch("/api/admin/cn/set-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token, password }),
			});

			const bodyRes = await res.json().catch(() => null);
			if (!res.ok) {
				setError(bodyRes?.error || "Error al actualizar contraseña");
			} else {
				setSuccess("¡Contraseña actualizada exitosamente!");
			}
		} catch (err) {
			console.error("Error setting password:", err);
			setError("Error al actualizar la contraseña");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 flex items-center justify-center px-4">
			<div className="max-w-md w-full">
				{/* Logo */}
				<div className="text-center mb-8">
					<h1 className="text-2xl font-title text-gray-900 mb-2">
						Restablecer Contraseña CN
					</h1>
					<p className="text-gray-600">
						Establece tu nueva contraseña segura para CN
					</p>
				</div>

				{/* Formulario */}
				<div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
					<form onSubmit={handleSubmit} className="space-y-6">
						{error && (
							<div className="bg-red-50 border border-red-200 rounded-xl p-4">
								<p className="text-red-600 text-sm">{error}</p>
							</div>
						)}

						{success && (
							<div className="bg-green-50 border border-green-200 rounded-xl p-4">
								<p className="text-green-600 text-sm">{success}</p>
								<p className="text-green-600 text-xs mt-2">
									Pulsa el botón para abrir la aplicación CN.
								</p>
								<div className="mt-3 text-center">
									<button
										type="button"
										onClick={() => {
											try {
												window.open("https://cn.ingenit.cl", "_blank");
											} catch (_e) {}
											try {
												window.close();
											} catch (_e) {}
										}}
										className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
									>
										Abrir CN
									</button>
								</div>
							</div>
						)}

						<div>
							<label
								htmlFor="new-password"
								className="block text-sm font-semibold text-gray-800 mb-2"
							>
								Nueva Contraseña
							</label>
							<div className="relative">
								<input
									id="new-password"
									type={showPassword ? "text" : "password"}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
									placeholder="••••••••"
									required
									minLength={6}
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									aria-label={
										showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
									}
									className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
								>
									{showPassword ? (
										<EyeOff className="w-5 h-5" />
									) : (
										<Eye className="w-5 h-5" />
									)}
								</button>
							</div>
							<p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
						</div>

						<div>
							<label
								htmlFor="confirm-password"
								className="block text-sm font-semibold text-gray-800 mb-2"
							>
								Confirmar Contraseña
							</label>
							<div className="relative">
								<input
									id="confirm-password"
									type={showConfirmPassword ? "text" : "password"}
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all duration-200"
									placeholder="••••••••"
									required
								/>
								<button
									type="button"
									onClick={() => setShowConfirmPassword(!showConfirmPassword)}
									aria-label={
										showConfirmPassword
											? "Ocultar confirmación de contraseña"
											: "Mostrar confirmación de contraseña"
									}
									className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
								>
									{showConfirmPassword ? (
										<EyeOff className="w-5 h-5" />
									) : (
										<Eye className="w-5 h-5" />
									)}
								</button>
							</div>
						</div>

						<button
							type="submit"
							disabled={isLoading}
							className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
						>
							{isLoading ? "Actualizando..." : "Actualizar Contraseña"}
						</button>

						<div className="text-center">
							{/* Botón de volver al login eliminado para app de escritorio */}
						</div>
					</form>

					{/* Información de seguridad */}
					<div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
						<h3 className="text-sm font-semibold text-blue-800 mb-2">
							Consejos de Seguridad:
						</h3>
						<ul className="text-xs text-blue-700 space-y-1">
							<li>• Usa al menos 6 caracteres</li>
							<li>• Combina letras, números y símbolos</li>
							<li>• No uses información personal</li>
							<li>• Cambia tu contraseña regularmente</li>
							<li>
								• Después de actualizar, inicia sesión con tu nueva contraseña
							</li>
						</ul>
					</div>

					{/* Información del proceso */}
					<div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
						<h3 className="text-sm font-semibold text-green-800 mb-2">
							¿Qué pasa después?
						</h3>
						<p className="text-xs text-green-700">
							Después de actualizar la contraseña se mostrará un mensaje de
							éxito; la ventana intentará cerrarse y se abrirá la aplicación de
							escritorio CN en cn.ingenit.cl. El enlace de restablecimiento ya
							no será válido.
						</p>
					</div>
				</div>

				{/* Footer */}
				<div className="text-center mt-8">
					<p className="text-sm text-gray-500">
						© 2025 IngenIT ® - Panel de Administración CN
					</p>
				</div>
			</div>
		</div>
	);
}
