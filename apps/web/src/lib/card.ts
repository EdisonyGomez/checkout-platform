export function maskCard(num: string) {
  const n = num.replace(/\D+/g, '');
  const last4 = n.slice(-4).padStart(4, '0');
  return `**** **** **** ${last4}`;
}

export function brandFromNumber(num: string) {
  const n = num.replace(/\D+/g, '');
  if (/^4\d{12,18}$/.test(n)) return 'Visa';
  // MasterCard: 51-55, 2221-2720
  if (/^(5[1-5]\d{14})$/.test(n)) return 'Mastercard';
  if (/^(222[1-9]\d{12}|22[3-9]\d{13}|2[3-6]\d{14}|27[01]\d{13}|2720\d{12})$/.test(n)) return 'Mastercard';
  return 'Card';
}

export function formatCardInput(num: string) {
  const n = num.replace(/\D+/g, '').slice(0, 19);
  return n.replace(/(.{4})/g, '$1 ').trim();
}
