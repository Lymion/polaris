/**
 * Time zones that belong to one country, for the countries Polaris has a currency for. The time
 * zone says where someone is far more often than the browser language does: most people in
 * Malaysia, say, browse in "en-US".
 */
const ZONE_COUNTRY: Record<string, string> = {
  "Asia/Kuala_Lumpur": "Malaysia",
  "Asia/Kuching": "Malaysia",
  "Asia/Singapore": "Singapore",
  "Asia/Jakarta": "Indonesia",
  "Asia/Pontianak": "Indonesia",
  "Asia/Makassar": "Indonesia",
  "Asia/Jayapura": "Indonesia",
  "Asia/Manila": "Philippines",
  "Asia/Bangkok": "Thailand",
  "Asia/Ho_Chi_Minh": "Vietnam",
  "Asia/Saigon": "Vietnam",
  "Asia/Kolkata": "India",
  "Asia/Calcutta": "India",
  "Asia/Karachi": "Pakistan",
  "Asia/Dhaka": "Bangladesh",
  "Asia/Tokyo": "Japan",
  "Asia/Shanghai": "China",
  "Asia/Hong_Kong": "Hong Kong",
  "Asia/Seoul": "South Korea",
  "Asia/Dubai": "United Arab Emirates",
  "Asia/Riyadh": "Saudi Arabia",
  "Africa/Lagos": "Nigeria",
  "Africa/Nairobi": "Kenya",
  "Africa/Johannesburg": "South Africa",
  "Africa/Cairo": "Egypt",
  "Pacific/Auckland": "New Zealand",
  "Europe/London": "United Kingdom",
  "Europe/Dublin": "Ireland",
  "Europe/Berlin": "Germany",
  "Europe/Paris": "France",
  "Europe/Madrid": "Spain",
  "Europe/Rome": "Italy",
  "Europe/Amsterdam": "Netherlands",
  "Europe/Lisbon": "Portugal",
  "Europe/Brussels": "Belgium",
  "Europe/Vienna": "Austria",
  "Europe/Helsinki": "Finland",
};

/**
 * Best guess at the user's country: from the time zone when it belongs to one country, else from
 * the browser language (e.g. "en-MY" → "Malaysia"). Empty if unknown, so the owner types it.
 */
export function guessCountry() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (ZONE_COUNTRY[zone]) return ZONE_COUNTRY[zone];
    if (zone.startsWith("Australia/")) return "Australia";
    const region = new Intl.Locale(navigator.language).region;
    // "en-US" is the default language almost everywhere, so only trust it from the Americas.
    if (!region || (region === "US" && !zone.startsWith("America/") && zone !== "Pacific/Honolulu")) return "";
    return new Intl.DisplayNames(["en"], { type: "region" }).of(region) ?? "";
  } catch {
    return "";
  }
}
