// The shopping calendar: sale days and festive seasons coming up, so every AI answer knows what
// today is and what's ahead (models guess dates badly when left to recall them).

export interface CalendarEvent {
  name: string;
  /** "YYYY-MM-DD". */
  date: string;
  /** Moon-sighted festivals can move by a day or so. */
  approx?: boolean;
}

/** Festive dates in Malaysia and Singapore. Lunar ones are approximate until announced. */
const FESTIVALS: { name: string; date: string; approx?: boolean; countries: string[] }[] = [
  { name: "Chinese New Year", date: "2026-02-17", countries: ["malaysia", "singapore"] },
  { name: "Ramadan begins (bazaar season)", date: "2026-02-18", approx: true, countries: ["malaysia", "singapore"] },
  { name: "Hari Raya Aidilfitri", date: "2026-03-20", approx: true, countries: ["malaysia", "singapore"] },
  { name: "Hari Raya Haji", date: "2026-05-27", approx: true, countries: ["malaysia", "singapore"] },
  { name: "Deepavali", date: "2026-11-08", countries: ["malaysia", "singapore"] },
  { name: "Chinese New Year", date: "2027-02-06", countries: ["malaysia", "singapore"] },
  { name: "Ramadan begins (bazaar season)", date: "2027-02-08", approx: true, countries: ["malaysia", "singapore"] },
  { name: "Hari Raya Aidilfitri", date: "2027-03-10", approx: true, countries: ["malaysia", "singapore"] },
  { name: "Hari Raya Haji", date: "2027-05-17", approx: true, countries: ["malaysia", "singapore"] },
  { name: "Deepavali", date: "2027-10-28", approx: true, countries: ["malaysia", "singapore"] },
];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** The nth given weekday (0 = Sunday) of a month. */
function nthWeekday(y: number, m: number, weekday: number, n: number) {
  const first = new Date(y, m, 1).getDay();
  return 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
}

function yearEvents(y: number, country: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (let m = 0; m < 12; m++) {
    events.push({ name: m >= 8 ? `${m + 1}.${m + 1} sale (big online sale day)` : `${m + 1}.${m + 1} sale`, date: iso(y, m, m + 1) });
  }
  const thanksgiving = nthWeekday(y, 10, 4, 4);
  events.push(
    { name: "Valentine's Day", date: iso(y, 1, 14) },
    { name: "Mother's Day", date: iso(y, 4, nthWeekday(y, 4, 0, 2)) },
    { name: "Father's Day", date: iso(y, 5, nthWeekday(y, 5, 0, 3)) },
    { name: "Black Friday", date: iso(y, 10, thanksgiving + 1) },
    { name: "Christmas", date: iso(y, 11, 25) },
    { name: "New Year's Eve", date: iso(y, 11, 31) },
  );
  const c = country.toLowerCase();
  if (c.includes("malaysia")) events.push({ name: "Merdeka (National Day)", date: iso(y, 7, 31) }, { name: "Malaysia Day", date: iso(y, 8, 16) });
  if (c.includes("singapore")) events.push({ name: "National Day", date: iso(y, 7, 9) });
  for (const f of FESTIVALS) {
    if (f.date.startsWith(String(y)) && f.countries.some((k) => c.includes(k))) events.push({ name: f.name, date: f.date, approx: f.approx });
  }
  return events;
}

/** Sale days and festive dates from `today` ("YYYY-MM-DD") up to `days` ahead, soonest first. */
export function upcomingEvents(today: string, days: number, country: string): CalendarEvent[] {
  const [y, m, d] = today.split("-").map(Number);
  const end = new Date(y, m - 1, d + days);
  const until = iso(end.getFullYear(), end.getMonth(), end.getDate());
  return [...yearEvents(y, country), ...yearEvents(y + 1, country)]
    .filter((e) => e.date >= today && e.date <= until)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** "Saturday 17 October 2026". */
export function longDate(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** "11.11 sale (Wed 11 Nov), Deepavali (around Sun 8 Nov)". */
export function describeEvents(events: CalendarEvent[]) {
  return events
    .map((e) => {
      const [y, m, d] = e.date.split("-").map(Number);
      const when = new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
      return `${e.name} (${e.approx ? "around " : ""}${when})`;
    })
    .join(", ");
}
