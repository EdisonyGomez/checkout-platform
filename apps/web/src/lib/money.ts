export function formatCop(cents: number, currency: string) {
  const value = cents / 100;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency || 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}