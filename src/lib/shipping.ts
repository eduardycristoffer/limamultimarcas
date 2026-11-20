import { shippingConfig, store } from "@/config/store";
import { onlyDigits } from "./format";

export type CepAddress = { cep: string; street: string; district: string; city: string; uf: string };
export type ShippingQuote = {
  address: CepAddress;
  distanceKm: number | null;
  /** centavos; null = a combinar */
  price: number | null;
  free: boolean;
  withinPayOnDelivery: boolean;
  label: string;
};

export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371, rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Regra de preço a partir da distância por estrada (km). */
export function priceForDistance(roadKm: number, cfg = shippingConfig) {
  if (roadKm <= cfg.freeShippingRadiusKm) return { price: 0, free: true, label: "Frete grátis" };
  if (cfg.extraKmPrice != null) {
    const price = Math.round((roadKm - cfg.freeShippingRadiusKm) * cfg.extraKmPrice);
    return { price, free: false, label: "Frete" };
  }
  return { price: null, free: false, label: "Frete a combinar com a loja" };
}

export async function lookupCep(cep: string): Promise<CepAddress> {
  const d = onlyDigits(cep);
  if (d.length !== 8) throw new Error("CEP inválido. Digite os 8 números.");
  const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
  if (!r.ok) throw new Error("Não conseguimos consultar o CEP agora.");
  const j = await r.json();
  if (j.erro) throw new Error("CEP não encontrado. Confira os números.");
  return { cep: d, street: j.logradouro ?? "", district: j.bairro ?? "", city: j.localidade ?? "", uf: j.uf ?? "" };
}

async function coordsFor(addr: CepAddress): Promise<{ lat: number; lon: number } | null> {
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${addr.cep}`);
    if (r.ok) {
      const j = await r.json();
      const c = j?.location?.coordinates;
      if (c?.latitude && c?.longitude) return { lat: Number(c.latitude), lon: Number(c.longitude) };
    }
  } catch { /* tenta o próximo */ }
  const UF: Record<string, string> = { AC:"Acre",AL:"Alagoas",AP:"Amapá",AM:"Amazonas",BA:"Bahia",CE:"Ceará",DF:"Distrito Federal",ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",MT:"Mato Grosso",MS:"Mato Grosso do Sul",MG:"Minas Gerais",PA:"Pará",PB:"Paraíba",PR:"Paraná",PE:"Pernambuco",PI:"Piauí",RJ:"Rio de Janeiro",RN:"Rio Grande do Norte",RS:"Rio Grande do Sul",RO:"Rondônia",RR:"Roraima",SC:"Santa Catarina",SP:"São Paulo",SE:"Sergipe",TO:"Tocantins" };
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(addr.city)}&count=10&language=pt&countryCode=BR`);
  if (!r.ok) return null;
  const j = await r.json();
  const hit = (j.results ?? []).find((x: { admin1?: string }) => x.admin1 === UF[addr.uf]);
  return hit ? { lat: hit.latitude, lon: hit.longitude } : null;
}

export async function quoteShipping(cep: string): Promise<ShippingQuote> {
  const address = await lookupCep(cep);
  const coords = await coordsFor(address).catch(() => null);
  if (!coords) throw Object.assign(new Error("Não conseguimos calcular a distância agora. Você ainda pode retirar na loja."), { address });
  const km = Math.round(haversineKm(store.origin, coords) * shippingConfig.roadFactor);
  const p = priceForDistance(km);
  return { address, distanceKm: km, ...p, withinPayOnDelivery: km <= shippingConfig.payOnDeliveryMaxKm };
}
