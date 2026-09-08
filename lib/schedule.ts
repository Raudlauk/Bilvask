export const ZONE = 'Europe/Oslo';
export function today() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
export function currentMinutes() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(new Date())
    .split(':');
  return Number(parts[0]) * 60 + Number(parts[1]);
}
export function blocked(date: string) {
  const day = new Date(date + 'T12:00:00Z').getUTCDay();
  return day === 0 || day === 1 || day === 4 || day === 6;
}
export function validDate(date: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !isNaN(Date.parse(date)) &&
    new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) === date
  );
}
export function timeLabel(minutes: number) {
  return `${Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`;
}
export function dateLabel(date: string, language: 'nb' | 'en' = 'nb') {
  return new Date(date + 'T12:00:00Z').toLocaleDateString(language === 'nb' ? 'nb-NO' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
export function available(
  date: string,
  duration: number,
  busy: { start: number; duration: number }[],
) {
  if (
    !validDate(date) ||
    date < today() ||
    blocked(date) ||
    ![30, 60].includes(duration)
  )
    return [];
  if (busy.length >= 4) return [];
  const morningCount = busy.filter(b => b.start < 720).length;
  const afternoonCount = busy.filter(b => b.start >= 720).length;
  return Array.from({ length: 13 }, (_, i) => 480 + i * 30).filter(
    (start) =>
      start <= 840 &&
      start + duration <= 900 &&
      (start + duration <= 690 || start >= 720) &&
      (start < 720 ? morningCount < 2 : afternoonCount < 2) &&
      (date !== today() || start > currentMinutes()) &&
      !busy.some(
        (b) => start < b.start + b.duration && start + duration > b.start,
      ),
  );
}
