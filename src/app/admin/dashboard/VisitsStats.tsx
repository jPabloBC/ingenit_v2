"use client";
import { CalendarDays, Eye, Loader2, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { supabase } from "@/lib/supabaseClient";

export default function VisitsStats() {
	const [stats, setStats] = useState<{
		today: number;
		month: number;
		year: number;
		total: number;
	} | null>(null);
	const [statsLoading, setStatsLoading] = useState(true);
	const [dateLoading, setDateLoading] = useState(false);
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [visitCount, setVisitCount] = useState<number | null>(null);

	useEffect(() => {
		fetch("/api/visits?excludeLocal=true")
			.then((res) => res.json())
			.then((data) => {
				setStats(data);
				setStatsLoading(false);
			});
	}, []);

	useEffect(() => {
		const channel = supabase
			.channel("rt_visits_updates")
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "rt_visits",
				},
				() => {
					// Actualizar estadísticas de visitas en tiempo real
					fetch("/api/visits?excludeLocal=true")
						.then((res) => res.json())
						.then((data) => {
							setStats(data);
							setStatsLoading(false);
						});
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, []);

	const handleDateChange = (date: Date | null) => {
		setSelectedDate(date);
		if (!date) {
			setVisitCount(null);
			return;
		}
		setDateLoading(true);
		// Formatear la fecha a yyyy-MM-dd
		const formattedDate = date.toISOString().split("T")[0];
		fetch(`/api/visits?date=${formattedDate}&excludeLocal=true`)
			.then((res) => res.json())
			.then((data) => {
				setVisitCount(data.count ?? 0);
				setDateLoading(false);
			});
	};

	if (statsLoading)
		return (
			<div className="rounded-md border border-gray9 bg-white p-6 text-gray5 shadow-sm">
				<div className="flex items-center gap-3">
					<Loader2 className="h-5 w-5 animate-spin text-blue6" />
					<span>Cargando visitas...</span>
				</div>
			</div>
		);
	if (!stats)
		return (
			<div className="rounded-md border border-gold6 bg-gold7 p-6 text-gold1">
				No se pudieron cargar las visitas
			</div>
		);

	const visitCards = [
		{ label: "Hoy", value: stats.today, accent: "bg-blue6", text: "text-blue6" },
		{
			label: "Mes",
			value: stats.month,
			accent: "bg-blue5",
			text: "text-blue5",
		},
		{
			label: "Año",
			value: stats.year,
			accent: "bg-blue7",
			text: "text-blue7",
		},
		{
			label: "Total",
			value: stats.total,
			accent: "bg-gold2",
			text: "text-gold2",
		},
	];

	return (
		<div className="rounded-md border border-gray9 bg-white p-4 shadow-sm">
			<div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<h3 className="flex items-center gap-3 text-lg font-semibold text-gray1">
					<span className="rounded-md bg-blue15 p-2 text-blue6">
						<TrendingUp className="h-5 w-5" />
					</span>
					Estadísticas de Visitas
				</h3>
				<p className="text-sm text-gray5">Tráfico público sin visitas locales</p>
			</div>
			<div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
				{visitCards.map((card) => (
					<div
						key={card.label}
						className="relative overflow-hidden rounded-md border border-gray9 bg-gray10 p-4 shadow-sm"
					>
						<div className={`absolute inset-x-0 top-0 h-1 ${card.accent}`} />
						<p className="text-xs font-medium uppercase tracking-wide text-gray5">
							{card.label}
						</p>
						<p className={`mt-2 text-3xl font-semibold leading-none ${card.text}`}>
							{card.value.toLocaleString("es-CL")}
						</p>
					</div>
				))}
			</div>
			<div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.45fr)]">
				<div className="flex flex-col gap-2">
					<label className="flex items-center gap-2 text-sm font-medium text-gray4">
						<CalendarDays className="h-4 w-4 text-gray6" />
						Consultar por fecha
					</label>
					<DatePicker
						selected={selectedDate}
						onChange={handleDateChange}
						dateFormat="yyyy-MM-dd"
						className="visits-datepicker-input w-full rounded-md border border-gray9 bg-white px-4 py-3 text-left text-sm text-gray3 shadow-sm placeholder:text-gray6 focus:border-blue6 focus:ring-2 focus:ring-blue6/10 md:text-base"
						placeholderText="Elige una fecha"
						maxDate={new Date()}
						isClearable
						withPortal
						closeOnScroll={false}
						popperClassName="custom-datepicker-popper"
					/>
				</div>
				<div className="flex min-h-20 items-center justify-center rounded-md border border-gray9 bg-gray10 px-4 py-3 text-center">
					{selectedDate && visitCount !== null && !dateLoading && (
						<div>
							<p className="flex items-center justify-center gap-2 text-sm text-gray5">
								<Eye className="h-4 w-4" />
								Visitas del día
							</p>
							<p className="mt-1 text-3xl font-semibold text-gray1">
								{visitCount.toLocaleString("es-CL")}
							</p>
						</div>
					)}
					{selectedDate && dateLoading && (
						<span className="flex items-center gap-2 text-sm text-gray5">
							<Loader2 className="h-4 w-4 animate-spin" />
							Cargando...
						</span>
					)}
					{!selectedDate && (
						<span className="text-sm text-gray6">
							Selecciona una fecha para ver el detalle
						</span>
					)}
				</div>
			</div>
		</div>
	);
}
