// Somente servidor. Importar apenas com `await import()` dentro de handlers.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { canTransition, newToken, toVegaPhone, type OrderStatus } from "./order-rules";
import type { Database } from "@/integrations/supabase/types";

export const db = supabaseAdmin;
export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type SettingsRow = Database["public"]["Tables"]["store_settings"]["Row"];

export async function getSettings(): Promise<SettingsRow> {
  const { data, error } = await db.from("store_settings").select("*").eq("id", 1).single();
  if (error || !data) throw new Error("settings unavailable");
  return data;
}

export async function getSecret(key: string): Promise<string | null> {
  const { data } = await db.from("app_secrets").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}
export async function setSecret(key: string, value: string) {
  const { error } = await db.from("app_secrets").upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error("secret save failed");
}
export async function ensureWebhookSecret(): Promise<string> {
  const cur = await getSecret("vega_webhook_secret");
  if (cur) return cur;
  const s = newToken() + newToken();
  await setSecret("vega_webhook_secret", s);
  return s;
}

export async function vegaConfig(settings?: SettingsRow) {
  const s = settings ?? (await getSettings());
  const apiKey = await getSecret("vega_api_key");
  const ready = !!(apiKey && s.vega_base_url && s.vega_domain);
  return { ready, apiKey, baseUrl: s.vega_base_url.replace(/\/+$/, ""), domain: s.vega_domain, siteUrl: s.site_url.replace(/\/+$/, "") };
}

export function webhookUrl(siteUrl: string, secret: string) {
  return siteUrl ? `${siteUrl.replace(/\/+$/, "")}/api/public/vega-webhook?s=${secret}` : "";
}

export type VegaPixResult = { transactionToken: string | null; paymentStatus: string | null; pixCopyPaste: string | null };

/** Cria a cobrança Pix na Vega. `f` permite mock nos testes. */
export async function createVegaPix(order: OrderRow, opts: { apiKey: string; baseUrl: string; domain: string; siteUrl: string; webhookSecret: string; description: string; imagePath: string }, f: typeof fetch = fetch): Promise<VegaPixResult> {
  const body = buildVegaPixBody(order, opts);
  const res = await f(`${opts.baseUrl}/api/checkout`, {
    method: "POST",
    headers: { "api-key": opts.apiKey, "x-domain": opts.domain, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as { data?: Record<string, unknown> } | null;
  if (!res.ok || !json?.data) throw new Error(`vega http ${res.status}`);
  const d = json.data;
  return {
    transactionToken: typeof d["transaction_token"] === "string" ? d["transaction_token"] : null,
    paymentStatus: typeof d["payment_status"] === "string" ? d["payment_status"] : null,
    pixCopyPaste: typeof d["pix_copy_paste"] === "string" ? d["pix_copy_paste"] : null,
  };
}

export function buildVegaPixBody(o: OrderRow, opts: { siteUrl: string; webhookSecret: string; description: string; imagePath: string }) {
  const img = opts.imagePath.startsWith("http") ? opts.imagePath : `${opts.siteUrl}${opts.imagePath}`;
  const body: Record<string, unknown> = {
    customer: {
      name: o.customer_name, document: o.customer_cpf.replace(/\D/g, ""), email: o.customer_email, phone: toVegaPhone(o.customer_phone),
      address: { street: o.street ?? "", number: o.number ?? "", district: o.district ?? "", zipcode: (o.cep ?? "").replace(/\D/g, ""), city: o.city ?? "", state: o.uf ?? "", complement: o.complement ?? "" },
    },
    products: [{ code: o.product_slug, name: o.product_name, price: o.unit_price_cents, is_digital: false, quantity: o.quantity, description: opts.description, image_url: img }],
    payment: { method: "pix", payment_value: o.subtotal_cents + o.freight_cents - o.discount_cents, freight_value: o.freight_cents, discount_value: 0, external_code: o.order_number, currency: "BRL" },
    notification_url: `${opts.siteUrl}/api/public/vega-webhook?s=${opts.webhookSecret}`,
  };
  for (const k of ["src", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const) if (o[k]) body[k] = o[k];
  return body;
}

/** Aplica uma mudança de status respeitando transições e estoque. Idempotente. */
export async function applyStatus(order: OrderRow, to: OrderStatus, extra: Partial<OrderRow> = {}): Promise<{ applied: boolean; order: OrderRow }> {
  const from = order.status as OrderStatus;
  if (!canTransition(from, to)) return { applied: false, order };
  const patch: Partial<OrderRow> = { ...extra, status: to };
  const notes: string[] = [];
  if (to === "pago") {
    patch.paid_at = new Date().toISOString();
    if (!order.stock_reserved) {
      const { data: ok } = await db.rpc("adjust_stock", { _slug: order.product_slug, _delta: -order.quantity });
      if (ok) patch.stock_reserved = true; else notes.push("Pago sem estoque disponível para baixa — conferir.");
    }
  }
  if ((to === "cancelado" || to === "estornado") && order.stock_reserved) {
    await db.rpc("adjust_stock", { _slug: order.product_slug, _delta: order.quantity });
    patch.stock_reserved = false;
  }
  if (to === "cancelado") patch.canceled_at = new Date().toISOString();
  if (to === "entregue") patch.delivered_at = new Date().toISOString();
  if (notes.length) patch.admin_notes = [order.admin_notes, ...notes].filter(Boolean).join("\n");
  // Condição otimista no status atual evita corrida entre webhook e admin.
  const { data, error } = await db.from("orders").update(patch).eq("id", order.id).eq("status", from).select("*").maybeSingle();
  if (error || !data) return { applied: false, order };
  return { applied: true, order: data };
}
