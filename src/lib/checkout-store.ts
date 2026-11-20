const CART = "lima:buy";
const UTM = "lima:utm";
export type BuyIntent = { slug: string; quantity: number };
export const setBuyIntent = (b: BuyIntent) => sessionStorage.setItem(CART, JSON.stringify(b));
export const getBuyIntent = (): BuyIntent | null => { try { return JSON.parse(sessionStorage.getItem(CART) || "null"); } catch { return null; } };
const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "src"];
/** Guarda UTMs apenas no primeiro acesso. */
export function captureTracking() {
  if (localStorage.getItem(UTM)) return;
  const q = new URLSearchParams(window.location.search);
  const t: Record<string, string> = {};
  KEYS.forEach((k) => { const v = q.get(k); if (v) t[k] = v.slice(0, 200); });
  if (Object.keys(t).length) localStorage.setItem(UTM, JSON.stringify(t));
}
export const getTracking = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(UTM) || "{}"); } catch { return {}; } };
