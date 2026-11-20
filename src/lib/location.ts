// Para onde o cliente quer receber: começa pela cidade do IP (aproximada) e vira exata quando ele digita o CEP.
import { useSyncExternalStore } from "react";
import type { FreightMode } from "./order-rules";
import type { ShippingQuote } from "./shipping";
import { getVisitorLocation } from "./api";

export type DeliveryLocation = {
  source: "ip" | "cep";
  city: string; uf: string; cep?: string; street?: string; district?: string;
  distanceKm: number | null; mode: FreightMode; codAvailable: boolean;
};

const KEY = "lima:local";
let current: DeliveryLocation | null = null;
let started = false;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

function read(): DeliveryLocation | null {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); return v && typeof v.city === "string" ? v : null; } catch { return null; }
}

export function setDeliveryLocation(l: DeliveryLocation | null) {
  current = l;
  try { if (l) localStorage.setItem(KEY, JSON.stringify(l)); else localStorage.removeItem(KEY); } catch { /* sem armazenamento */ }
  notify();
}

export function locationFromQuote(q: ShippingQuote): DeliveryLocation {
  return {
    source: "cep", cep: q.address.cep, city: q.address.city, uf: q.address.uf, street: q.address.street, district: q.address.district,
    distanceKm: q.distanceKm, mode: q.mode, codAvailable: q.withinPayOnDelivery,
  };
}

/** Chamado uma vez no navegador: recupera a escolha salva ou pergunta ao servidor a cidade do IP. */
export function startDeliveryLocation() {
  if (started || typeof window === "undefined") return;
  started = true;
  current = read();
  notify();
  if (current) return;
  getVisitorLocation()
    .then((l) => { if (l && !current) setDeliveryLocation({ source: "ip", ...l }); })
    .catch(() => { /* sem localização: o cliente informa o CEP */ });
}

const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function useDeliveryLocation(): DeliveryLocation | null {
  return useSyncExternalStore(subscribe, () => current, () => null);
}

/** "Montes Claros - MG" */
export const placeLabel = (l: DeliveryLocation) => `${l.city} - ${l.uf}`;
