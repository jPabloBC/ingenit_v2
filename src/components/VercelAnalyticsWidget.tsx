"use client";
import {
	BarChart3,
	CalendarDays,
	ExternalLink,
	Eye,
	TrendingUp,
	Users,
} from "lucide-react";
import { useEffect, useState } from "react";

interface AnalyticsData {
	totalViews: number;
	uniqueVisitors: number;
	viewsToday: number;
	viewsThisWeek: number;
	viewsThisMonth: number;
	topPages: Array<{ page: string; views: number }>;
}

export default function VercelAnalyticsWidget({
	subdomain,
}: {
	subdomain: string;
}) {
	const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
		null,
	);
	const [loading, setLoading] = useState(true);
	const [error, _setError] = useState<string | null>(null);

	useEffect(() => {
		// Datos simulados para demostración
		// En producción, estos datos vendrían de Vercel Analytics API
		const mockData: AnalyticsData = {
			totalViews: 1247,
			uniqueVisitors: 892,
			viewsToday: 23,
			viewsThisWeek: 156,
			viewsThisMonth: 1247,
			topPages: [
				{ page: "/", views: 456 },
				{ page: "/admin", views: 234 },
				{ page: "/admin/hl", views: 189 },
				{ page: "/contact", views: 123 },
				{ page: "/services", views: 98 },
			],
		};

		// Simulamos carga
		setTimeout(() => {
			setAnalyticsData(mockData);
			setLoading(false);
		}, 1000);
	}, []);

	if (loading) {
		return (
			<div className="bg-white rounded-md shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
				<div className="flex items-center justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<span className="ml-3 text-gray-600">Cargando estadísticas...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-white rounded-md shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
				<div className="text-center text-red-500">
					<p>Error al cargar estadísticas: {error}</p>
				</div>
			</div>
		);
	}

	if (!analyticsData) {
		return null;
	}

	return (
		<div className="bg-white rounded-md shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-2">
					<BarChart3 className="w-5 h-5 text-blue-600" />
					<h3 className="text-lg font-semibold text-gray-900">
						Analytics - {subdomain}.ingenit.cl
					</h3>
				</div>
				<a
					href={`https://vercel.com/dashboard`}
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
				>
					Ver en Vercel
					<ExternalLink className="w-4 h-4" />
				</a>
			</div>

			{/* Información sobre Vercel Analytics */}
			<div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
				<p className="text-sm text-blue-800">
					<strong>📊 Vercel Analytics activo:</strong> Los datos reales se
					mostrarán después del deploy. Actualmente mostrando datos de
					demostración.
				</p>
			</div>

			{/* Métricas principales */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<div className="flex items-center gap-3 p-3 bg-blue-50 rounded-md">
					<Eye className="w-5 h-5 text-blue-500" />
					<div>
						<p className="text-sm font-medium text-gray-900">Total Visitas</p>
						<p className="text-lg font-bold text-gray-800">
							{analyticsData.totalViews.toLocaleString()}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-3 p-3 bg-green-50 rounded-md">
					<Users className="w-5 h-5 text-green-500" />
					<div>
						<p className="text-sm font-medium text-gray-900">
							Visitantes Únicos
						</p>
						<p className="text-lg font-bold text-gray-800">
							{analyticsData.uniqueVisitors.toLocaleString()}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-3 p-3 bg-purple-50 rounded-md">
					<CalendarDays className="w-5 h-5 text-purple-500" />
					<div>
						<p className="text-sm font-medium text-gray-900">Visitas Hoy</p>
						<p className="text-lg font-bold text-gray-800">
							{analyticsData.viewsToday}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-3 p-3 bg-orange-50 rounded-md">
					<TrendingUp className="w-5 h-5 text-orange-500" />
					<div>
						<p className="text-sm font-medium text-gray-900">Este Mes</p>
						<p className="text-lg font-bold text-gray-800">
							{analyticsData.viewsThisMonth.toLocaleString()}
						</p>
					</div>
				</div>
			</div>

			{/* Páginas más visitadas */}
			<div>
				<h4 className="text-sm font-semibold text-gray-900 mb-3">
					Páginas Más Visitadas
				</h4>
				<div className="space-y-2">
					{analyticsData.topPages.map((page) => (
						<div
							key={`${page.page}-${page.views}`}
							className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
						>
							<span className="text-sm text-gray-700 font-mono">
								{page.page}
							</span>
							<span className="text-sm font-semibold text-gray-900">
								{page.views} vistas
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
