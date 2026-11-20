// Somente servidor. API de Conversões da Meta (Facebook/Instagram).
// Envia "Purchase" quando um pedido é pago (ou quando o sinal do "pague na entrega" é pago),
// com o mesmo event_id do Pixel do navegador para a Meta não contar em dobro.
import type { OrderRow } from "./store.server";

/** Versão da Graph API. v26.0 saiu em julho/2026 e vale por ~2 anos. */
export const GRAPH_VERSION = "v26.0";

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export async function sha256(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const purchaseEventId = (orderNumber: string) => `purchase-${orderNumber}`;

/** Monta o evento no formato da Meta. Dados pessoais vão normalizados e em SHA-256. */
export async function buildPurchaseEvent(o: OrderRow, siteUrl: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  const [first = "", ...rest] = o.customer_name.trim().split(/\s+/);
  const h = async (v: string | null | undefined) => (v ? [await sha256(v)] : undefined);
  const phone = o.customer_phone.replace(/\D/g, "");
  const user_data: Record<string, unknown> = {
    em: await h(o.customer_email.trim().toLowerCase()),
    ph: await h(phone ? `55${phone}` : ""),
    fn: await h(strip(first)),
    ln: await h(strip(rest.join(" ")).replace(/\s+/g, "")),
    ct: await h(o.city ? strip(o.city).replace(/[^a-z]/g, "") : ""),
    st: await h(o.uf ? o.uf.toLowerCase() : ""),
    zp: await h(o.cep ? o.cep.replace(/\D/g, "") : ""),
    country: await h("br"),
    client_ip_address: o.client_ip ?? undefined,
    client_user_agent: o.client_user_agent ?? undefined,
    fbp: o.fbp ?? undefined,
    fbc: o.fbc ?? undefined,
  };
  for (const k of Object.keys(user_data)) if (user_data[k] === undefined) delete user_data[k];
  return {
    event_name: "Purchase",
    event_time: nowSeconds,
    event_id: o.meta_event_id || purchaseEventId(o.order_number),
    action_source: "website",
    event_source_url: siteUrl ? `${siteUrl}/moto/${o.product_slug}` : undefined,
    user_data,
    custom_data: {
      currency: "BRL",
      value: o.total_cents / 100,
      order_id: o.order_number,
      content_type: "product",
      content_ids: [o.product_slug],
      contents: [{ id: o.product_slug, quantity: o.quantity, item_price: o.unit_price_cents / 100 }],
    },
  };
}

type Deps = {
  getSettings: () => Promise<{ meta_pixel_id: string; meta_test_event_code: string; site_url: string }>;
  getSecret: (k: string) => Promise<string | null>;
  markSent: (orderId: string) => Promise<void>;
};

/** Envia o Purchase uma única vez por pedido, só se o cliente aceitou os cookies. Nunca lança erro. */
export async function sendPurchase(o: OrderRow, deps: Deps, f: typeof fetch = fetch): Promise<"sent" | "skipped" | "failed"> {
  try {
    if (!o.tracking_consent || o.capi_purchase_sent_at) return "skipped";
    const s = await deps.getSettings();
    const token = await deps.getSecret("meta_capi_token");
    if (!s.meta_pixel_id || !token) return "skipped";
    const event = await buildPurchaseEvent(o, s.site_url.replace(/\/+$/, ""));
    const body: Record<string, unknown> = { data: [event], access_token: token };
    if (s.meta_test_event_code) body["test_event_code"] = s.meta_test_event_code;
    const r = await f(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(s.meta_pixel_id)}/events`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!r.ok) { console.error(`meta capi http ${r.status}`); return "failed"; }
    await deps.markSent(o.id);
    return "sent";
  } catch {
    console.error("meta capi failed");
    return "failed";
  }
}
