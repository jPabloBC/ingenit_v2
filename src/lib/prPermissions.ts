export const DEFAULT_PR_RESOURCE_KEYS = [
	"dashboard",
	"collaborators",
	"crews",
	"field-reports",
	"daily-report",
	"staffing-activities",
	"program",
	"attendance",
	"profile",
	"admin-permissions",
	"management",
	"settings",
] as const;

export const PR_RESOURCE_LABELS: Record<string, string> = {
	dashboard: "Dashboard",
	collaborators: "Colaboradores",
	crews: "Cuadrillas",
	"field-reports": "Reportes de terreno",
	"daily-report": "Reporte diario",
	"staffing-activities": "Dotación y actividades",
	program: "Programa",
	attendance: "Asistencia",
	profile: "Perfil",
	"admin-permissions": "Permisos admin",
	management: "Gestión",
	settings: "Ajustes",
};

export function mergeAndSortPRResourceKeys(keys: string[]): string[] {
	return Array.from(new Set(keys.filter(Boolean))).sort((a, b) =>
		a.localeCompare(b),
	);
}
