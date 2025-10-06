export function buildOccSymbol(underlying: string, expiration: string, strike: number, right: string) {
  const yymmdd = expiration.replace(/-/g,"").slice(2);
  const strikeFixed = String(Math.round(strike*1000)).padStart(8,"0");
  return `O:${underlying.toUpperCase()}${yymmdd}${right.toUpperCase()}${strikeFixed}`;
}
