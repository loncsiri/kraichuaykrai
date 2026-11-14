/**
 * Exact integer-satang currency helpers to prevent JavaScript IEEE-754
 * floating-point precision drift (e.g. 239.99999999999997 vs 240.00).
 */

export function toSatang(baht: number): number {
  if (!Number.isFinite(baht)) return 0;
  return Math.round(baht * 100);
}

export function fromSatang(satang: number): number {
  if (!Number.isFinite(satang)) return 0;
  return Math.round(satang) / 100;
}

export function roundMoney(baht: number): number {
  return fromSatang(toSatang(baht));
}

export function formatMoney(amount: number): string {
  return roundMoney(amount).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
