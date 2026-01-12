export type CardBrand = 'VISA' | 'MASTERCARD' | 'UNKNOWN';

export function detectBrand(cardNumberRaw: string): CardBrand {
  const n = cardNumberRaw.replace(/\s+/g, '');
  if (/^4\d{12}(\d{3})?(\d{3})?$/.test(n)) return 'VISA'; // 13-19
  // MasterCard: 51-55 or 2221-2720
  if (/^(5[1-5]\d{14})$/.test(n)) return 'MASTERCARD';
  if (/^(222[1-9]\d{12}|22[3-9]\d{13}|2[3-6]\d{14}|27[01]\d{13}|2720\d{12})$/.test(n)) return 'MASTERCARD';
  return 'UNKNOWN';
}

export function formatCardNumber(cardNumberRaw: string) {
  const n = cardNumberRaw.replace(/\D+/g, '').slice(0, 19);
  return n.replace(/(.{4})/g, '$1 ').trim();
}
