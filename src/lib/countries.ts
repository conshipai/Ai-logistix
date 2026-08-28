/**
 * ISO 3166-1 alpha-2 country list.
 *
 * Kept as data rather than a dependency. Ordered with the markets MConnect is
 * initially deployed into first, then alphabetically — nothing in the platform
 * assumes a single country, so the full list is always available.
 */
export interface Country {
  code: string
  name: string
}

const PRIORITY = ['MZ', 'ZA', 'TZ', 'US', 'PT', 'AE', 'GB', 'IN', 'CN']

export const COUNTRIES: Country[] = [
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'AO', name: 'Angola' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AT', name: 'Austria' },
  { code: 'AU', name: 'Australia' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BW', name: 'Botswana' },
  { code: 'CA', name: 'Canada' },
  { code: 'CD', name: 'Congo (Democratic Republic)' },
  { code: 'CG', name: 'Congo (Republic)' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'CN', name: 'China' },
  { code: 'DE', name: 'Germany' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'EG', name: 'Egypt' },
  { code: 'ES', name: 'Spain' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IN', name: 'India' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KR', name: 'Korea (Republic of)' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' },
  { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SE', name: 'Sweden' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SN', name: 'Senegal' },
  { code: 'TR', name: 'Türkiye' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'UG', name: 'Uganda' },
  { code: 'US', name: 'United States' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
]

export const COUNTRY_OPTIONS: Country[] = [
  ...PRIORITY.map((code) => COUNTRIES.find((c) => c.code === code)!).filter(Boolean),
  ...COUNTRIES.filter((c) => !PRIORITY.includes(c.code)),
]

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c.name]))

export function countryName(code: string | null | undefined): string {
  if (!code) return '—'
  return BY_CODE.get(code.toUpperCase()) ?? code
}

/** Currencies the platform quotes in. USD is the default for cross-border trade. */
export const CURRENCIES = [
  { code: 'USD', name: 'US dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'MZN', name: 'Mozambican metical' },
  { code: 'ZAR', name: 'South African rand' },
  { code: 'GBP', name: 'Pound sterling' },
  { code: 'AED', name: 'UAE dirham' },
  { code: 'INR', name: 'Indian rupee' },
  { code: 'CNY', name: 'Chinese yuan' },
  { code: 'JPY', name: 'Japanese yen' },
]

/** Incoterms 2020. */
export const INCOTERMS = [
  'EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP',
]
