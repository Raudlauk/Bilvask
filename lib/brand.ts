// Site name shown in headers, page titles, SMS, email and calendar invites.
// No imports here so client components can use it without pulling in the database.
export const DEFAULT_SITE_NAME = 'Steam';
export const SITE_NAME_MAX = 40;
export function validSiteName(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const name = value.trim();
  // oxlint-disable-next-line no-control-regex
  return name.length >= 1 && name.length <= SITE_NAME_MAX && !/[\u0000-\u001f\u007f<>]/.test(name);
}
