/**
 * Rough units of each currency per 1 USD. Only used to scale level milestones
 * ("first 1,000 in sales") into the user's currency, never for accounting.
 */
const PER_USD: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  MYR: 4.4,
  SGD: 1.34,
  IDR: 16000,
  PHP: 57,
  THB: 35,
  VND: 25000,
  INR: 84,
  PKR: 280,
  BDT: 120,
  AUD: 1.52,
  NZD: 1.65,
  CAD: 1.37,
  JPY: 150,
  CNY: 7.2,
  HKD: 7.8,
  KRW: 1350,
  AED: 3.67,
  SAR: 3.75,
  NGN: 1550,
  KES: 129,
  ZAR: 18,
  EGP: 48,
  BRL: 5.4,
  MXN: 18,
};

export const CURRENCIES = Object.keys(PER_USD);

const COUNTRY_CURRENCY: Record<string, string> = {
  malaysia: "MYR",
  singapore: "SGD",
  indonesia: "IDR",
  philippines: "PHP",
  thailand: "THB",
  vietnam: "VND",
  india: "INR",
  pakistan: "PKR",
  bangladesh: "BDT",
  australia: "AUD",
  "new zealand": "NZD",
  canada: "CAD",
  japan: "JPY",
  china: "CNY",
  "hong kong": "HKD",
  "south korea": "KRW",
  "united arab emirates": "AED",
  "saudi arabia": "SAR",
  nigeria: "NGN",
  kenya: "KES",
  "south africa": "ZAR",
  egypt: "EGP",
  brazil: "BRL",
  mexico: "MXN",
  "united kingdom": "GBP",
  uk: "GBP",
  "united states": "USD",
  usa: "USD",
  germany: "EUR",
  france: "EUR",
  spain: "EUR",
  italy: "EUR",
  netherlands: "EUR",
  ireland: "EUR",
  portugal: "EUR",
  belgium: "EUR",
  austria: "EUR",
  finland: "EUR",
};

export function currencyForCountry(country: string) {
  return COUNTRY_CURRENCY[country.trim().toLowerCase()] ?? null;
}

/** Converts a USD amount to `currency`, rounded to two significant figures so milestones read cleanly. */
export function usdToLocal(usd: number, currency: string) {
  const raw = usd * (PER_USD[currency] ?? 1);
  if (raw === 0) return 0;
  const magnitude = 10 ** (Math.floor(Math.log10(raw)) - 1);
  return Math.round(raw / magnitude) * magnitude;
}
