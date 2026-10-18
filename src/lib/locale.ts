/** Best guess at the user's country from the browser language (e.g. "en-MY" → "Malaysia"). Empty if unknown. */
export function guessCountry() {
  try {
    const region = new Intl.Locale(navigator.language).region;
    return region ? (new Intl.DisplayNames(["en"], { type: "region" }).of(region) ?? "") : "";
  } catch {
    return "";
  }
}
