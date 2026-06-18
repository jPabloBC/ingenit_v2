"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface StandaloneData {
	title: string;
	description: string;
	value: number;
}

interface AdminUserInfo {
	email: string;
	role: string;
	name: string;
}

export default function StandalonePage() {
	const [_data, _setData] = useState<StandaloneData[]>([]);
	const [_loading, _setLoading] = useState(true);
	const [authStatus, setAuthStatus] = useState("checking");
	const [userInfo, setUserInfo] = useState<AdminUserInfo | null>(null);
	const _router = useRouter();

	useEffect(() => {
		const checkAuth = () => {
			const token = localStorage.getItem("adminToken");
			const user = localStorage.getItem("adminUser");

			console.log("🔍 Standalone - Verificando autenticación:");
			console.log("Token:", token ? "✅ Presente" : "❌ Ausente");
			console.log("User:", user ? "✅ Presente" : "❌ Ausente");

			if (!token || !user) {
				console.log("❌ No autenticado");
				setAuthStatus("not-authenticated");
				return;
			}

			try {
				const userData = JSON.parse(user);
				console.log("✅ Usuario autenticado:", userData);
				setUserInfo(userData);
				setAuthStatus("authenticated");
			} catch (error) {
				console.error("💥 Error parseando usuario:", error);
				setAuthStatus("error");
			}
		};

		checkAuth();
	}, []);

	const createSession = () => {
		const token = `standalone-token-${Date.now()}`;
		const userData = {
			email: "gerencia@ingenit.cl",
			role: "admin",
			name: "Administrador",
		};

		localStorage.setItem("adminToken", token);
		localStorage.setItem("adminUser", JSON.stringify(userData));

		console.log("🔧 Sesión creada:", { token, userData });
		window.location.reload();
	};

	const clearSession = () => {
		localStorage.removeItem("adminToken");
		localStorage.removeItem("adminUser");
		console.log("🚪 Sesión limpiada");
		window.location.reload();
	};

	if (authStatus === "checking") {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Verificando...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="max-w-4xl mx-auto">
				<h1 className="text-3xl font-bold text-gray-900 mb-8">
					Página Standalone - Sin Layout
				</h1>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Estado */}
					<div className="bg-white p-6 rounded-lg shadow">
						<h2 className="text-xl font-semibold mb-4">
							Estado de Autenticación
						</h2>
						<div className="space-y-2">
							<p>
								<strong>Estado:</strong>
								<span
									className={`ml-2 px-2 py-1 rounded text-sm ${
										authStatus === "authenticated"
											? "bg-green-100 text-green-800"
											: authStatus === "not-authenticated"
												? "bg-red-100 text-red-800"
												: "bg-yellow-100 text-yellow-800"
									}`}
								>
									{authStatus === "authenticated"
										? "✅ Autenticado"
										: authStatus === "not-authenticated"
											? "❌ No Autenticado"
											: "⚠️ Error"}
								</span>
							</p>
							<p>
								<strong>Token:</strong>{" "}
								{localStorage.getItem("adminToken")
									? "✅ Presente"
									: "❌ Ausente"}
							</p>
							<p>
								<strong>Usuario:</strong>{" "}
								{localStorage.getItem("adminUser")
									? "✅ Presente"
									: "❌ Ausente"}
							</p>
						</div>
					</div>

					{/* Usuario */}
					{userInfo && (
						<div className="bg-white p-6 rounded-lg shadow">
							<h2 className="text-xl font-semibold mb-4">
								Información del Usuario
							</h2>
							<div className="space-y-2">
								<p>
									<strong>Email:</strong> {userInfo.email}
								</p>
								<p>
									<strong>Rol:</strong> {userInfo.role}
								</p>
								<p>
									<strong>Nombre:</strong> {userInfo.name}
								</p>
							</div>
						</div>
					)}

					{/* Acciones */}
					<div className="bg-white p-6 rounded-lg shadow">
						<h2 className="text-xl font-semibold mb-4">Acciones</h2>
						<div className="space-y-2">
							{authStatus === "not-authenticated" ? (
								<button
									type="button"
									onClick={createSession}
									className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
								>
									🔧 Crear Sesión
								</button>
							) : (
								<button
									type="button"
									onClick={clearSession}
									className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
								>
									🚪 Limpiar Sesión
								</button>
							)}

							<button
								type="button"
								onClick={() => window.location.reload()}
								className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
							>
								🔄 Recargar
							</button>
						</div>
					</div>

					{/* Enlaces */}
					<div className="bg-white p-6 rounded-lg shadow">
						<h2 className="text-xl font-semibold mb-4">Enlaces de Prueba</h2>
						<div className="space-y-2">
							<a
								href="/admin/login"
								className="block text-blue-600 hover:underline"
							>
								📝 Login
							</a>
							<a
								href="/admin/simple"
								className="block text-blue-600 hover:underline"
							>
								🧪 Simple
							</a>
							<a
								href="/admin/debug"
								className="block text-blue-600 hover:underline"
							>
								🐛 Debug
							</a>
							<a
								href="/admin/dashboard"
								className="block text-blue-600 hover:underline"
							>
								📊 Dashboard
							</a>
							<a
								href="/admin/test"
								className="block text-blue-600 hover:underline"
							>
								✅ Test
							</a>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
