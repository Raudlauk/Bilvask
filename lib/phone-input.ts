/** Normalize complete Norwegian numbers without truncating invalid input. */
export function normalizePhoneInput(value: string): string {
  const digits = value.replace(/[^0-9]/g, '');
  if (/^0047[0-9]{8}$/.test(digits)) return digits.slice(4);
  if (/^47[0-9]{8}$/.test(digits)) return digits.slice(2);
  // Keep unsupported/incomplete international prefixes invalid for the form.
  return value.trimStart().startsWith('+') ? '+' + digits : digits;
}
