import {
	countries as fallbackCountries,
	getCitiesByRegion as fallbackGetCities,
	getRegionsByCountry as fallbackGetRegions,
} from "./countries";

// Adapter functions: attempt to use an external library if available at runtime.
// If not installed, fall back to the local dataset in src/lib/countries.ts

export const countries = fallbackCountries;

type CSCState = { isoCode?: string; code?: string; name?: string };
type CSCCity = { name?: string; city?: string } | string;

export const getRegionsByCountry = (countryCode: string) => {
	// try to use optional library 'country-state-city' if present
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-call
		const csc = require("country-state-city");
		if (csc?.State && typeof csc.State.getStatesOfCountry === "function") {
			const states = (csc.State.getStatesOfCountry(countryCode) ||
				[]) as CSCState[];
			return states.map((s) => ({
				code: s.isoCode || s.code || s.name,
				name: s.name,
				cities: undefined,
			}));
		}
	} catch (_err) {
		// library not installed, fall through
	}
	return fallbackGetRegions(countryCode);
};

export const getCitiesByRegion = (countryCode: string, regionCode: string) => {
	try {
		const csc = require("country-state-city");
		if (csc?.City && typeof csc.City.getCitiesOfState === "function") {
			const cities = (csc.City.getCitiesOfState(countryCode, regionCode) ||
				[]) as CSCCity[];
			return cities.map((c) =>
				typeof c === "string" ? c : c.name || c.city || "",
			);
		}
	} catch (_err) {
		// fall back
	}
	return fallbackGetCities(countryCode, regionCode);
};

export default {
	countries,
	getRegionsByCountry,
	getCitiesByRegion,
};
