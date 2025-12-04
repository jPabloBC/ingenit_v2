import { countries as fallbackCountries, getRegionsByCountry as fallbackGetRegions, getCitiesByRegion as fallbackGetCities } from './countries';

// Adapter functions: attempt to use an external library if available at runtime.
// If not installed, fall back to the local dataset in src/lib/countries.ts

export const countries = fallbackCountries;

export const getRegionsByCountry = (countryCode: string) => {
  // try to use optional library 'country-state-city' if present
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-call
    const csc = require('country-state-city');
    if (csc && csc.State && typeof csc.State.getStatesOfCountry === 'function') {
      const states = csc.State.getStatesOfCountry(countryCode) || [];
      return states.map((s: any) => ({ code: s.isoCode || s.code || s.name, name: s.name, cities: undefined }));
    }
  } catch (err) {
    // library not installed, fall through
  }
  return fallbackGetRegions(countryCode);
};

export const getCitiesByRegion = (countryCode: string, regionCode: string) => {
  try {
    const csc = require('country-state-city');
    if (csc && csc.City && typeof csc.City.getCitiesOfState === 'function') {
      const cities = csc.City.getCitiesOfState(countryCode, regionCode) || [];
      return cities.map((c: any) => c.name || c.city || c);
    }
  } catch (err) {
    // fall back
  }
  return fallbackGetCities(countryCode, regionCode);
};

export default {
  countries,
  getRegionsByCountry,
  getCitiesByRegion,
};
