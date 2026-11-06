// src/utils/format.ts

/**
 * Formatea un número como dinero en pesos argentinos: "$ 12.500"
 */
export function formatMoney(amount: number): string {
  const rounded = Math.round(amount || 0);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$ ${formatted}`;
}

/**
 * Formatea una fecha ISO a texto legible en español
 * Ej: "06/11/2026 15:30"
 */
export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
}

/**
 * Formatea solo la fecha "DD/MM/AAAA"
 */
export function formatDateOnly(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return isoString;
  }
}

/**
 * Formato plural para botellas
 */
export function formatBottlesCount(count: number, size?: 'GRANDE' | 'CHICA'): string {
  const c = Math.max(0, count);
  if (!size) {
    return c === 1 ? '1 botella' : `${c} botellas`;
  }
  const sizeLabel = size === 'GRANDE' ? (c === 1 ? 'grande' : 'grandes') : (c === 1 ? 'chica' : 'chicas');
  return `${c} ${sizeLabel}`;
}
