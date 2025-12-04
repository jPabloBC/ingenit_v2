"use client";
import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";

export default function VisitsStats() {
  const [stats, setStats] = useState<{ today: number; month: number; year: number; total: number } | null>(null);
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
    const channel = supabase.channel('rt_visits_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rt_visits'
        },
        (payload: any) => {
            // Actualizar estadísticas de visitas en tiempo real
          fetch("/api/visits?excludeLocal=true")
            .then((res) => res.json())
            .then((data) => {
              setStats(data);
              setStatsLoading(false);
            });
        }
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

        if (statsLoading) return <div className="text-gray-500">Cargando visitas...</div>;
  if (!stats) return <div className="text-red-500">No se pudieron cargar las visitas</div>;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6 border border-gray-200">
      <h3 className="font-bold mb-6 text-gray-800 text-lg flex items-center gap-3">
        <svg
          className="w-6 h-6 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        Estadísticas de Visitas
      </h3>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-200 rounded-lg flex justify-center gap-0.5 md:gap-2 items-center border border-gray-100">
          <span className="text-xs text-gray-400">Hoy</span>
          <span className="text-xl md:text-3xl font-normal text-white font-mono">
            {stats.today}
          </span>
        </div>
        <div className="bg-gray-200 rounded-lg flex justify-center gap-0.5 md:gap-2 items-center border border-gray-100">
          <span className="text-xs text-gray-400">Mes</span>
          <span className="text-xl md:text-3xl font-normal text-white font-mono">
            {stats.month}
          </span>
        </div>
        <div className="bg-gray-200 rounded-lg flex justify-center gap-0.5 md:gap-2 items-center border border-gray-100">
          <span className="text-xs text-gray-400">Año</span>
          <span className="text-xl md:text-3xl font-normal text-white font-mono">
            {stats.year}
          </span>
        </div>
        <div className="bg-gray-200 rounded-lg flex justify-center gap-0.5 md:gap-2 items-center border border-gray-100">
          <span className="text-xs text-gray-400">Total</span>
          <span className="text-xl md:text-3xl font-normal text-white font-mono">
            {stats.total}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-4">
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            dateFormat="yyyy-MM-dd"
            className="visits-datepicker-input border rounded-lg px-4 py-3 text-sm md:text-base shadow-sm focus:ring focus:ring-gray-200 text-center text-gray-600 w-full rounded-md"
            placeholderText="Elige una fecha"
            maxDate={new Date()}
            isClearable
            withPortal
            closeOnScroll={false}
            popperClassName="custom-datepicker-popper"
          />
        </div>
        <div className="flex items-center justify-center">
          {selectedDate && visitCount !== null && !dateLoading && (
            <span className="text-gray-400 font-regular text-3xl">
              Visitas: {visitCount}
            </span>
          )}
          {selectedDate && dateLoading && (
            <span className="text-gray-400">Cargando...</span>
          )}
        </div>
      </div>
    </div>
  );
}
