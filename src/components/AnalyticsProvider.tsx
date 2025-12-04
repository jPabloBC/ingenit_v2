"use client";
import { useVercelAnalytics } from "@/hooks/useVercelAnalytics";

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export default function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  // Inicializar el tracking de Analytics
  useVercelAnalytics();

  return <>{children}</>;
}

