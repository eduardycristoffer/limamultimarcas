import { onlyDigits } from "./format";
import { freightFor, type FreightMode, type ShippingSettings } from "./order-rules";

export type CepAddress = { cep: string; street: string; district: string; city: string; uf: string };
export type ShippingQuote = { address: CepAddress; distanceKm: number | null; mode: FreightMode; freightCents: number | null; withinPayOnDelivery: boolean };

export const ORIGIN = { lat: -16.7282, lon: -43.8578 };

export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371, rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export class ShippingError extends Error {}

export async function lookupCep(cep: string, f: typeof fetch = fetch): Promise<CepAddress> {
  const d = onlyDigits(cep);
  if (d.length !== 8) throw new ShippingError("CEP inválido. Digite os 8 números.");
  let j: Record<string, string | boolean>;
  try { const r = await f(`https://viacep.com.br/ws/${d}/json/`); if (!r.ok) throw new Error(); j = await r.json(); }
  catch { throw new ShippingError("Não conseguimos consultar o CEP agora."); }
  if (j["erro"]) throw new ShippingError("CEP não encontrado. Confira os números.");
  return { cep: d, street: String(j["logradouro"] ?? ""), district: String(j["bairro"] ?? ""), city: String(j["localidade"] ?? ""), uf: String(j["uf"] ?? "") };
}

const UF: Record<string, string> = { AC:"Acre",AL:"Alagoas",AP:"Amapá",AM:"Amazonas",BA:"Bahia",CE:"Ceará",DF:"Distrito Federal",ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",MT:"Mato Grosso",MS:"Mato Grosso do Sul",MG:"Minas Gerais",PA:"Pará",PB:"Paraíba",PR:"Paraná",PE:"Pernambuco",PI:"Piauí",RJ:"Rio de Janeiro",RN:"Rio Grande do Norte",RS:"Rio Grande do Sul",RO:"Rondônia",RR:"Roraima",SC:"Santa Catarina",SP:"São Paulo",SE:"Sergipe",TO:"Tocantins" };

export async function coordsFor(addr: CepAddress, f: typeof fetch = fetch): Promise<{ lat: number; lon: number } | null> {
  try {
    const r = await f(`https://brasilapi.com.br/api/cep/v2/${addr.cep}`);
    if (r.ok) {
      const j = await r.json();
      const c = j?.location?.coordinates;
      if (c?.latitude && c?.longitude) return { lat: Number(c.latitude), lon: Number(c.longitude) };
    }
  } catch { /* fallback */ }
  try {
    const r = await f(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(addr.city)}&count=10&language=pt&countryCode=BR`);
    if (!r.ok) return null;
    const j = await r.json();
    const hit = (j.results ?? []).find((x: { admin1?: string }) => x.admin1 === UF[addr.uf]);
    return hit ? { lat: hit.latitude, lon: hit.longitude } : null;
  } catch { return null; }
}

/** Cálculo completo (usado no servidor). */
export async function computeQuote(cep: string, s: ShippingSettings, f: typeof fetch = fetch): Promise<ShippingQuote> {
  const address = await lookupCep(cep, f);
  const coords = await coordsFor(address, f);
  const distanceKm = coords ? Math.round(haversineKm(ORIGIN, coords) * s.road_factor) : null;
  const { mode, freightCents } = freightFor(distanceKm, s);
  return { address, distanceKm, mode, freightCents, withinPayOnDelivery: distanceKm != null && distanceKm <= s.pay_on_delivery_max_km };
}
