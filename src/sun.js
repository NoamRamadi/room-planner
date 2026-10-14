// Where the sun is in the sky, for a place and a local date and time: NOAA's solar position equations
// (good to a fraction of a degree), with local clock time taken from the place's time zone, summer
// time included.

const RAD = Math.PI / 180;

export const ROSH_HAAYIN = { name: 'Rosh HaAyin', lat: 32.0956, lon: 34.9566, timeZone: 'Asia/Jerusalem' };

// The days to look at: midsummer, the autumn equinox, midwinter, and today.
export const SUN_DAYS = [
  { id: 'jun', label: '21 Jun', month: 6, day: 21 },
  { id: 'sep', label: '22 Sep', month: 9, day: 22 },
  { id: 'dec', label: '21 Dec', month: 12, day: 21 },
  { id: 'today', label: 'Today' },
];

// The calendar date of a day choice, this year: { y, m, d }.
export function dateOf(id, now = new Date()) {
  const choice = SUN_DAYS.find((x) => x.id === id);
  if (!choice?.month) return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
  return { y: now.getFullYear(), m: choice.month, d: choice.day };
}

// Minutes the place's clock is ahead of UTC at a moment (summer time included).
export function zoneOffset(when, timeZone) {
  try {
    const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(when).find((p) => p.type === 'timeZoneName')?.value ?? '';
    const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
    return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0;
  } catch {
    return 0;
  }
}

// The sun's declination (radians) and the equation of time (minutes) at a moment.
function solar(when) {
  const jd = when.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545) / 36525;
  const L0 = (((280.46646 + T * (36000.76983 + T * 0.0003032)) % 360) + 360) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = Math.sin(M * RAD) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * RAD) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * RAD) * 0.000289;
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * RAD);
  const decl = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD));
  const y = Math.tan((eps * RAD) / 2) ** 2;
  const eqTime =
    (4 / RAD) *
    (y * Math.sin(2 * L0 * RAD) - 2 * e * Math.sin(M * RAD) + 4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD) - 0.5 * y * y * Math.sin(4 * L0 * RAD) - 1.25 * e * e * Math.sin(2 * M * RAD));
  return { decl, eqTime };
}

// The moment a local clock time (minutes after midnight) on a date happens.
function momentOf({ y, m, d }, minutes, place) {
  const guess = new Date(Date.UTC(y, m - 1, d, 12));
  return new Date(Date.UTC(y, m - 1, d) + (minutes - zoneOffset(guess, place.timeZone)) * 60000);
}

// The sun at a local time on a date: how high it is above the horizon and its compass bearing
// (clockwise from north), in degrees.
export function sunAt(date, minutes, place = ROSH_HAAYIN) {
  const when = momentOf(date, minutes, place);
  const { decl, eqTime } = solar(when);
  const utc = (((when.getTime() / 60000) % 1440) + 1440) % 1440;
  const solarTime = (((utc + eqTime + 4 * place.lon) % 1440) + 1440) % 1440;
  const ha = (solarTime / 4 - 180) * RAD;
  const lat = place.lat * RAD;
  const cosZen = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha);
  const zen = Math.acos(Math.min(1, Math.max(-1, cosZen)));
  const azimuth = (Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat)) / RAD + 180 + 360) % 360;
  return { altitude: 90 - zen / RAD, azimuth };
}

// Sunrise and sunset on a date, as local clock minutes after midnight.
export function sunDay(date, place = ROSH_HAAYIN) {
  const noonGuess = momentOf(date, 12 * 60, place);
  const { decl, eqTime } = solar(noonGuess);
  const lat = place.lat * RAD;
  const cosH = Math.cos(90.833 * RAD) / (Math.cos(lat) * Math.cos(decl)) - Math.tan(lat) * Math.tan(decl);
  const H = (Math.acos(Math.min(1, Math.max(-1, cosH))) / RAD) * 4; // minutes either side of solar noon
  const offset = zoneOffset(noonGuess, place.timeZone);
  const noon = 720 - 4 * place.lon - eqTime + offset;
  return { sunrise: noon - H, sunset: noon + H, noon };
}

export const clockText = (minutes) => {
  const m = Math.round(minutes);
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
