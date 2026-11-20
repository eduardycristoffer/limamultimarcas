// Pixel da Meta no navegador. Só carrega depois que o cliente aceita os cookies (LGPD).
import { useSyncExternalStore } from "react";

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue: unknown[]; loaded: boolean; version: string; push: unknown };
declare global { interface Window { fbq?: Fbq; _fbq?: Fbq } }

export type Consent = "granted" | "denied";
const KEY = "lima:consent";
const subs = new Set<() => void>();
let consent: Consent | null | undefined;

function readConsent(): Consent | null {
  try { const v = localStorage.getItem(KEY); return v === "granted" || v === "denied" ? v : null; } catch { return null; }
}
export function getConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  if (consent === undefined) consent = readConsent();
  return consent;
}
export function setConsent(c: Consent) {
  consent = c;
  try { localStorage.setItem(KEY, c); } catch { /* sem armazenamento */ }
  subs.forEach((f) => f());
}
export function useConsent(): Consent | null | undefined {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => getConsent(), () => undefined);
}

let loadedId: string | null = null;

/** Injeta o script oficial do Pixel (connect.facebook.net) e registra o PageView. */
export function loadPixel(pixelId: string) {
  if (typeof window === "undefined" || !/^\d{5,20}$/.test(pixelId) || loadedId || getConsent() !== "granted") return;
  if (!window.fbq) {
    const n = function (...args: unknown[]) { if (n.callMethod) n.callMethod(...args); else n.queue.push(args); } as Fbq;
    n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    window.fbq = n; window._fbq = n;
    const s = document.createElement("script");
    s.async = true; s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
  }
  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
  loadedId = pixelId;
}

export function track(event: string, params: Record<string, unknown> = {}, eventId?: string) {
  if (!loadedId || !window.fbq) return;
  if (eventId) window.fbq("track", event, params, { eventID: eventId });
  else window.fbq("track", event, params);
}

const FBC = "lima:fbc";
/** Guarda o fbclid do anúncio no formato fbc (fb.1.<ms>.<fbclid>) para a API de Conversões. */
export function captureFbclid() {
  if (typeof window === "undefined") return;
  const id = new URLSearchParams(window.location.search).get("fbclid");
  if (!id) return;
  try { localStorage.setItem(FBC, `fb.1.${Date.now()}.${id.slice(0, 300)}`); } catch { /* sem armazenamento */ }
}

/** Cookies _fbp/_fbc do Pixel (só existem se o cliente aceitou). */
export function fbIds(): { fbp?: string; fbc?: string } {
  if (typeof document === "undefined" || getConsent() !== "granted") return {};
  const c = Object.fromEntries(document.cookie.split(";").map((p) => p.trim().split("=")).filter((x) => x.length === 2)) as Record<string, string>;
  let stored: string | null = null;
  try { stored = localStorage.getItem(FBC); } catch { stored = null; }
  const fbc = c["_fbc"] ?? stored ?? undefined;
  return { ...(c["_fbp"] ? { fbp: c["_fbp"] } : {}), ...(fbc ? { fbc } : {}) };
}
