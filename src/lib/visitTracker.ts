// Utility para registrar visitas a proyectos
// Se puede usar desde cualquier proyecto de IngenIT

interface TrackVisitOptions {
  project_code: string; // 'hl', 'mt', 'ws', 'pr', 'main'
  project_url: string;
  api_endpoint?: string; // default: https://ingenit.cl/api/track-visit
}

export async function trackProjectVisit(options: TrackVisitOptions) {
  const { 
    project_code, 
    project_url, 
    api_endpoint = 'https://ingenit.cl/api/track-visit' 
  } = options;

  try {
    const response = await fetch(api_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_code,
        project_url
      }),
    });

    if (!response.ok) {
      console.warn('Failed to track visit:', response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('Error tracking visit:', error);
    return false;
  }
}

// Función para uso en navegador (detecta automáticamente URL actual)
export function trackCurrentPage(project_code: string, api_endpoint?: string) {
  if (typeof window === 'undefined') return Promise.resolve(false);
  
  return trackProjectVisit({
    project_code,
    project_url: window.location.href,
    api_endpoint
  });
}

// Códigos de proyecto disponibles
export const PROJECT_CODES = {
  MAIN: 'main',      // ingenit.cl
  HL: 'hl',          // hl.ingenit.cl
  MT: 'mt',          // mt.ingenit.cl
  WS: 'ws',          // ws.ingenit.cl
  PR: 'pr'           // Panel PR interno
} as const;

export type ProjectCode = typeof PROJECT_CODES[keyof typeof PROJECT_CODES];