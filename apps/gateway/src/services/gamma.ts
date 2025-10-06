/**
 * Gamma Exposure: sum(gamma * OI * 100 * spot) over the chain
 * `chain` should be Polygon's option chain snapshot ({ results: [...] })
 */
export function computeGEX(chain:any, spot:number){
  if (!chain?.results || !Array.isArray(chain.results)) return 0;
  let gex = 0;
  for (const c of chain.results){
    const gamma = c?.greeks?.gamma ?? 0;
    const oi = c?.open_interest ?? 0;
    gex += gamma * oi * 100 * spot;
  }
  return gex;
}
