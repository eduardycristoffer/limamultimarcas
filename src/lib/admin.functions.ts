import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { OrderStatus } from "./order-rules";

const requireAdmin = createMiddleware({ type: "function" }).middleware([requireSupabaseAuth]).server(async ({ next, context }) => {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Acesso negado.");
  return next();
});

export const amIAdmin = createServerFn({ method: "GET" }).middleware([requireAdmin]).handler(async () => ({ ok: true }));

export const adminDashboard = createServerFn({ method: "GET" }).middleware([requireAdmin]).handler(async ({ context }) => {
  const sb = context.supabase;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const c = async (f: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => (await f(base())).count ?? 0;
  const base = () => sb.from("orders").select("id", { count: "exact", head: true });
  const [today, awaitingPay, toDeliver, paid] = await Promise.all([
    c((q) => q.gte("created_at", start.toISOString())),
    c((q) => q.eq("status", "aguardando_pagamento")),
    c((q) => q.in("status", ["aguardando_entrega", "aguardando_retirada", "pago"]).is("delivered_at", null)),
    c((q) => q.eq("status", "pago")),
  ]);
  const { data: latest } = await sb.from("orders").select("order_number, customer_name, product_name, total_cents, status, payment_method, created_at").order("created_at", { ascending: false }).limit(8);
  const { count: unmatched } = await sb.from("webhook_events").select("id", { count: "exact", head: true }).eq("result", "sem_correspondencia");
  return { today, awaitingPay, toDeliver, paid, unmatched: unmatched ?? 0, latest: latest ?? [] };
});

export const adminListOrders = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ status: z.string().max(40).optional(), method: z.string().max(40).optional(), q: z.string().max(100).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("orders").select("order_number, customer_name, customer_phone, product_name, quantity, total_cents, status, payment_method, delivery_method, city, uf, created_at").order("created_at", { ascending: false }).limit(200);
    if (data.status) q = q.eq("status", data.status);
    if (data.method) q = q.eq("payment_method", data.method);
    if (data.q) { const s = data.q.replace(/[%,()]/g, ""); q = q.or(`order_number.ilike.%${s}%,customer_name.ilike.%${s}%,customer_email.ilike.%${s}%,customer_phone.ilike.%${s}%`); }
    const { data: rows, error } = await q;
    if (error) throw new Error("Erro ao listar pedidos.");
    return rows ?? [];
  });

export const adminGetOrder = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ orderNumber: z.string().max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: o } = await context.supabase.from("orders").select("*").eq("order_number", data.orderNumber).maybeSingle();
    if (!o) return null;
    const { data: events } = await context.supabase.from("webhook_events").select("created_at, result").eq("order_number", o.order_number).order("created_at");
    return { order: o, events: events ?? [] };
  });

export const adminSetStatus = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ orderNumber: z.string().max(20), status: z.enum(["pago", "entregue", "cancelado"]), note: z.string().max(500).optional() }).parse(d))
  .handler(async ({ data }) => {
    const { db, applyStatus } = await import("./store.server");
    const { data: o } = await db.from("orders").select("*").eq("order_number", data.orderNumber).maybeSingle();
    if (!o) return { ok: false, error: "Pedido não encontrado." };
    const extra = data.note ? { admin_notes: [o.admin_notes, data.note].filter(Boolean).join("\n") } : {};
    const r = await applyStatus(o, data.status as OrderStatus, extra);
    return r.applied ? { ok: true } : { ok: false, error: "Essa mudança de status não é permitida para este pedido." };
  });

export const adminSaveNotes = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({ orderNumber: z.string().max(20), notes: z.string().max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("orders").update({ admin_notes: data.notes }).eq("order_number", data.orderNumber);
    return { ok: !error };
  });

export const adminListProducts = createServerFn({ method: "GET" }).middleware([requireAdmin]).handler(async ({ context }) => {
  const { data } = await context.supabase.from("products").select("slug, name, price_cents, stock, active, vega_checkout_url").order("price_cents");
  return data ?? [];
});

const httpsUrl = z.string().trim().max(500).refine((v) => { try { return new URL(v).protocol === "https:"; } catch { return false; } }, "Use um link https:// válido");
export const adminUpdateProduct = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({
    slug: z.string().max(60), priceReais: z.number().positive().max(1_000_000), stock: z.number().int().min(0).max(100000), active: z.boolean(),
    vegaCheckoutUrl: z.union([httpsUrl, z.literal("")]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("products").update({
      price_cents: Math.round(data.priceReais * 100), stock: data.stock, active: data.active, vega_checkout_url: data.vegaCheckoutUrl || null,
    }).eq("slug", data.slug);
    return error ? { ok: false, error: "Não foi possível salvar." } : { ok: true };
  });

export const adminGetSettings = createServerFn({ method: "GET" }).middleware([requireAdmin]).handler(async ({ context }) => {
  const { data } = await context.supabase.from("store_settings").select("*").eq("id", 1).single();
  return data!;
});

export const adminSaveSettings = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({
    whatsapp_number: z.string().transform((v) => v.replace(/\D/g, "")).refine((v) => v === "" || (v.length >= 12 && v.length <= 13), "Use DDI+DDD+número, ex.: 5538999999999"),
    free_shipping_radius_km: z.number().min(0).max(5000), road_factor: z.number().min(1).max(3), pay_on_delivery_max_km: z.number().min(0).max(5000),
    extra_km_price_cents: z.number().int().min(0).max(100000).nullable(), delivery_estimate_text: z.string().trim().min(1).max(80),
    pix_enabled: z.boolean(), card_enabled: z.boolean(), cod_enabled: z.boolean(), cod_methods: z.array(z.string().trim().min(1).max(40)).max(10),
    site_url: z.union([httpsUrl, z.literal("")]),
  }).partial().parse(d))
  .handler(async ({ data, context }) => {
    const patch = { ...data, ...(data.site_url !== undefined ? { site_url: data.site_url.replace(/\/+$/, "") } : {}), updated_at: new Date().toISOString() };
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as Record<string, never>;
    const { error } = await context.supabase.from("store_settings").update(clean).eq("id", 1);
    return error ? { ok: false, error: "Não foi possível salvar." } : { ok: true };
  });

export const getVegaStatus = createServerFn({ method: "GET" }).middleware([requireAdmin]).handler(async () => {
  const srv = await import("./store.server");
  const s = await srv.getSettings();
  const key = await srv.getSecret("vega_api_key");
  const secret = await srv.ensureWebhookSecret();
  return { hasKey: !!key, last4: key ? key.slice(-4) : null, baseUrl: s.vega_base_url, domain: s.vega_domain, siteUrl: s.site_url, webhookUrl: srv.webhookUrl(s.site_url, secret) };
});

export const saveVegaCredentials = createServerFn({ method: "POST" }).middleware([requireAdmin])
  .inputValidator((d: unknown) => z.object({
    apiKey: z.string().trim().min(8).max(500).optional(),
    baseUrl: z.union([httpsUrl, z.literal("")]),
    domain: z.string().trim().max(200).regex(/^$|^[a-z0-9.-]+\.[a-z]{2,}$/i, "Informe só o domínio, sem https://"),
  }).parse(d))
  .handler(async ({ data }) => {
    const srv = await import("./store.server");
    if (data.apiKey) await srv.setSecret("vega_api_key", data.apiKey);
    const { error } = await srv.db.from("store_settings").update({ vega_base_url: data.baseUrl.replace(/\/+$/, ""), vega_domain: data.domain.toLowerCase() }).eq("id", 1);
    return error ? { ok: false } : { ok: true };
  });

export const adminWebhookEvents = createServerFn({ method: "GET" }).middleware([requireAdmin]).handler(async ({ context }) => {
  const { data } = await context.supabase.from("webhook_events").select("id, result, order_number, created_at, payload").order("created_at", { ascending: false }).limit(30);
  return data ?? [];
});
