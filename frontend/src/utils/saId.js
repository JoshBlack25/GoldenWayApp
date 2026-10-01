/**
 * SA ID number validation & formatting — mirrors the backend's
 * CommuterFactory rules (13 digits, Luhn checksum, YYMMDD birth date).
 *
 * Extracted from RegisterScreen.jsx so the checks live in one place and
 * can be unit-tested against the backend contract directly.
 */

/** "9001015800085" → "900101 5800 085" (max 13 digits). */
export function formatIdNumber(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 13);
  const parts = [];
  if (digits.length > 0) parts.push(digits.slice(0, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 10));
  if (digits.length > 10) parts.push(digits.slice(10, 13));
  return parts.join(" ");
}

/** Same Luhn check the backend runs on SA ID numbers. */
export function luhnValid(numStr) {
  let sum = 0;
  let double = false;
  for (let i = numStr.length - 1; i >= 0; i--) {
    let d = numStr.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** A complete, checksum-valid 13-digit SA ID. */
export function idNumberValid(idDigits) {
  return idDigits.length === 13 && luhnValid(idDigits);
}

/** Derive an ISO date (YYYY-MM-DD) from the first 6 digits of an SA ID, or "" if not yet valid/complete. */
export function deriveDobFromId(idDigits) {
  if (idDigits.length < 6) return "";
  const yy = idDigits.slice(0, 2);
  const mm = idDigits.slice(2, 4);
  const dd = idDigits.slice(4, 6);
  const month = Number(mm);
  const day = Number(dd);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";

  const currentYY = new Date().getFullYear() % 100;
  const century = Number(yy) > currentYY ? 1900 : 2000;
  const year = century + Number(yy);

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  )
    return "";

  return `${year}-${mm}-${dd}`;
}
