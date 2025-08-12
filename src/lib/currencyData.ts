export interface Currency {
    code: string;
    name: string;
    symbol: string;
    exchangeRate: number; // Tasa de cambio aproximada a USD
}

export const COUNTRY_CURRENCIES: Record<string, Currency> = {
    "Chile": {
        code: "CLP",
        name: "Peso Chileno",
        symbol: "$",
        exchangeRate: 0.0011 // 1 USD ≈ 900 CLP
    },
    "Argentina": {
        code: "ARS",
        name: "Peso Argentino",
        symbol: "$",
        exchangeRate: 0.0012 // 1 USD ≈ 850 ARS
    },
    "Colombia": {
        code: "COP",
        name: "Peso Colombiano",
        symbol: "$",
        exchangeRate: 0.00025 // 1 USD ≈ 4000 COP
    },
    "México": {
        code: "MXN",
        name: "Peso Mexicano",
        symbol: "$",
        exchangeRate: 0.059 // 1 USD ≈ 17 MXN
    },
    "Perú": {
        code: "PEN",
        name: "Sol Peruano",
        symbol: "S/",
        exchangeRate: 0.27 // 1 USD ≈ 3.7 PEN
    },
    "Ecuador": {
        code: "USD",
        name: "Dólar Estadounidense",
        symbol: "$",
        exchangeRate: 1.0 // Ecuador usa USD
    },
    "Venezuela": {
        code: "USD",
        name: "Dólar Estadounidense",
        symbol: "$",
        exchangeRate: 1.0 // Venezuela prefiere USD
    },
    "Paraguay": {
        code: "PYG",
        name: "Guaraní Paraguayo",
        symbol: "₲",
        exchangeRate: 0.00014 // 1 USD ≈ 7200 PYG
    },
    "Uruguay": {
        code: "UYU",
        name: "Peso Uruguayo",
        symbol: "$",
        exchangeRate: 0.025 // 1 USD ≈ 40 UYU
    },
    "Bolivia": {
        code: "BOB",
        name: "Boliviano",
        symbol: "Bs",
        exchangeRate: 0.145 // 1 USD ≈ 6.9 BOB
    },
    "Brasil": {
        code: "BRL",
        name: "Real Brasileño",
        symbol: "R$",
        exchangeRate: 0.21 // 1 USD ≈ 4.8 BRL
    },
    "España": {
        code: "EUR",
        name: "Euro",
        symbol: "€",
        exchangeRate: 1.09 // 1 USD ≈ 0.92 EUR
    },
    "Estados Unidos": {
        code: "USD",
        name: "Dólar Estadounidense",
        symbol: "$",
        exchangeRate: 1.0
    }
};

export const getCurrencyByCountry = (country: string): Currency => {
    return COUNTRY_CURRENCIES[country] || COUNTRY_CURRENCIES["Estados Unidos"];
};

export const formatCurrency = (amount: number, currency: Currency): string => {
    const formatter = new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: currency.code,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
    
    return formatter.format(amount);
}; 