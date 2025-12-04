"use client";
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function useVercelAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    // Obtener el subdomain actual
    const getSubdomain = () => {
      if (typeof window === 'undefined') return 'main';
      
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      
      // Si es localhost, usar el pathname para determinar el subdomain
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        if (pathname.includes('/admin/hl')) return 'hl';
        if (pathname.includes('/admin/mt')) return 'mt';
        if (pathname.includes('/admin/ws')) return 'ws';
        if (pathname.includes('/admin/pr')) return 'pr';
        return 'main';
      }
      
      // En producción, extraer el subdomain
      if (parts.length > 2) {
        return parts[0];
      }
      
      return 'main';
    };

    const subdomain = getSubdomain();
    
    // Track page view con información del subdomain
    // Vercel Analytics se encarga automáticamente del tracking
    // Solo agregamos información adicional si es necesario
    if (typeof window !== 'undefined') {
      // Vercel Analytics ya está configurado en el layout
      // No necesitamos hacer nada adicional aquí
      console.log(`📊 Analytics: Tracking page view for subdomain: ${subdomain}, path: ${pathname}`);
    }

  }, [pathname]);
}

// Función para trackear eventos personalizados
export function trackEvent(eventName: string, parameters?: Record<string, any>) {
  if (typeof window === 'undefined') return;

  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  const subdomain = hostname === 'localhost' || hostname === '127.0.0.1' 
    ? 'main' 
    : parts.length > 2 ? parts[0] : 'main';

  // Google Analytics
  if (window.gtag) {
    window.gtag('event', eventName, {
      ...parameters,
      custom_parameter_subdomain: subdomain
    });
  }

  // Vercel Analytics
  if ((window as any).va) {
    (window as any).va('track', {
      event: eventName,
      subdomain: subdomain,
      ...parameters
    });
  }
}

// Función para trackear conversiones específicas
export function trackConversion(conversionType: string, value?: number) {
  trackEvent('conversion', {
    conversion_type: conversionType,
    value: value
  });
}

// Función para trackear interacciones del dashboard
export function trackDashboardInteraction(action: string, target: string) {
  trackEvent('dashboard_interaction', {
    action: action,
    target: target
  });
}
