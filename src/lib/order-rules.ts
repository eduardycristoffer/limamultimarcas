// Regras puras (sem I/O) usadas pelo servidor e testadas em src/test.
export type ShippingSettings = {
  free_shipping_radius_km: number;
  road_factor: number;
  pay_on_delivery_max_km: number;
  extra_km_price_cents: number | null;
};
export type FreightMode = "free" | "paid" | "arrange" | "unknown";

export function freightFor(roadKm: number | null, s: ShippingSettings): { mode: FreightMode; freightCents: number | null } {
  if (roadKm == null || !Number.isFinite(roadKm)) return { mode: "unknown", freightCents: null };
  if (roadKm <= s.free_shipping_radius_km) return { mode: "free", freightCents: 0 };
  if (s.extra_km_price_cents != null) return { mode: "paid", freightCents: Math.round((roadKm - s.free_shipping_radius_km) * s.extra_km_price_cents) };
  return { mode: "arrange", freightCents: null };
}

export type PaymentMethod = "pix" | "cartao_vega" | "pagar_na_entrega" | "pagar_na_loja";
export type PaymentContext = {
  pixEnabled: boolean; cardEnabled: boolean; codEnabled: boolean;
  vegaConfigured: boolean;
  productCardUrl: string | null;
  delivery: "full" | "pickup";
  distanceKm: number | null;
  payOnDeliveryMaxKm: number;
};
export type PaymentAvailability = Record<PaymentMethod, { ok: boolean; reason?: string }>;

export function paymentAvailability(c: PaymentContext): PaymentAvailability {
  const codInRange = c.delivery === "full" && c.distanceKm != null && c.distanceKm <= c.payOnDeliveryMaxKm;
  return {
    pix: c.pixEnabled && c.vegaConfigured ? { ok: true } : { ok: false, reason: "Pix indisponível no momento" },
    cartao_vega: c.cardEnabled && !!c.productCardUrl ? { ok: true } : { ok: false, reason: "Cartão indisponível para este produto" },
    pagar_na_entrega: !c.codEnabled ? { ok: false, reason: "Indisponível" }
      : c.delivery !== "full" ? { ok: false, reason: "Só para entrega FULL" }
      : codInRange ? { ok: true } : { ok: false, reason: `Disponível só para entregas até ${c.payOnDeliveryMaxKm} km da loja` },
    pagar_na_loja: c.codEnabled && c.delivery === "pickup" ? { ok: true } : { ok: false, reason: "Só para retirada na loja" },
  };
}

export type OrderStatus = "aguardando_pagamento" | "pago" | "recusado" | "expirado" | "estornado" | "aguardando_entrega" | "aguardando_retirada" | "entregue" | "cancelado";

/** Mapeia status da Vega para o nosso. null = não altera (pendente/em análise/desconhecido). */
export function mapVegaStatus(s: unknown): OrderStatus | null {
  switch (String(s ?? "").toLowerCase()) {
    case "approved": case "paid": return "pago";
    case "refused": return "recusado";
    case "expired": return "expirado";
    case "refunded": case "chargeback": case "charge_back": return "estornado";
    default: return null;
  }
}

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  aguardando_pagamento: ["pago", "recusado", "expirado", "cancelado"],
  recusado: ["pago", "cancelado"],
  expirado: ["pago", "cancelado"],
  pago: ["estornado", "entregue", "cancelado"],
  aguardando_entrega: ["pago", "entregue", "cancelado"],
  aguardando_retirada: ["pago", "entregue", "cancelado"],
  entregue: ["estornado"],
  estornado: [],
  cancelado: [],
};
export const canTransition = (from: OrderStatus, to: OrderStatus) => from !== to && TRANSITIONS[from].includes(to);

export type WebhookInfo = { token: string | null; externalCode: string | null; status: unknown; method: string | null; totalCents: number | null; email: string | null };
/** Lê os dois formatos de webhook da Vega (status de transação e "Venda"). Aceita `tansaction_token` (grafia do contrato) e `transaction_token`. */
export function parseVegaWebhook(raw: unknown): WebhookInfo {
  const p = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = (p["data"] && typeof p["data"] === "object" ? p["data"] : {}) as Record<string, unknown>;
  const pick = (k: string) => (p[k] ?? d[k]) as unknown;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null);
  const totalRaw = pick("total_price") ?? pick("amount");
  const total = totalRaw == null ? null : Number(String(totalRaw).replace(/\D/g, ""));
  const customer = (pick("customer") && typeof pick("customer") === "object" ? pick("customer") : {}) as Record<string, unknown>;
  return {
    token: str(pick("tansaction_token")) ?? str(pick("transaction_token")),
    externalCode: str(pick("external_code")),
    status: pick("payment_status") ?? pick("status"),
    method: str(pick("method")) ?? str(pick("payment_type")),
    totalCents: total != null && Number.isFinite(total) ? total : null,
    email: str(customer["email"])?.toLowerCase() ?? null,
  };
}

export function timingSafeEqualStr(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function randomString(len: number, alphabet = ALPHA) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
export const newOrderNumber = () => `LM-${randomString(6)}`;
export const newToken = () => randomString(32, "abcdefghijklmnopqrstuvwxyz0123456789");

export function toVegaPhone(digits: string) { return `+55${digits.replace(/\D/g, "")}`; }
export function maskCpfPublic(cpf: string) { const d = cpf.replace(/\D/g, ""); return d.length === 11 ? `***.${d.slice(3, 6)}.***-**` : "***"; }
