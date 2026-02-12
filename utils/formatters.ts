
export const formatCurrency = (amount: number): string => {
  if (amount < 1000000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(amount);
  }

  const suffixes = ['', 'K', 'M', 'B', 'T', 'Q', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  const suffixNum = Math.floor(("" + Math.floor(amount)).length / 3);
  let shortValue = parseFloat((suffixNum !== 0 ? (amount / Math.pow(1000, suffixNum)) : amount).toPrecision(4));
  if (shortValue % 1 !== 0) {
    shortValue = parseFloat(shortValue.toFixed(2));
  }
  return '$' + shortValue + suffixes[suffixNum];
};

export const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`;
};
