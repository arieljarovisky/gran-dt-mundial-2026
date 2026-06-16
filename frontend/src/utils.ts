export function formatMoney(amount: number) {
  return `$${(amount / 1_000_000).toFixed(1)}M`;
}
