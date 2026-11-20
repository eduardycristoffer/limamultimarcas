import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { isValidCpf, onlyDigits } from "./format";
import { maskCpfPublic, newOrderNumber, newToken, paymentAvailability, timingSafeEqualStr, type PaymentMethod } from "./order-rules";
import { getProduct } from "@/data/products";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: { fetch: (input, init) => {
      const h = new Headers(init?.headers);
      if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
      h.set("apikey", key);
      return fetch(input, { ...init, headers: h });
    } },
  });
}

export type CatalogItem = { slug: string; price_cents: number; stock: number; card_available: boolean };

export const getCatalog = createServerFn({ method: "GET" }).handler(async (): Promise<CatalogItem[]> => {
  const { data, error } = await publicClient().from("products").select("slug, price_cents, stock, vega_checkout_url");
  if (error) throw new Error("Não foi possível carregar os produtos.");
  return (data ?? []).map((p) => ({ slug: p.slug, price_cents: p.price_cents, stock: p.stock, card_available: !!p.vega_checkout_url }));
});

export type PublicSettings = {
  whatsapp_number: string; free_shipping_radius_km: number; road_factor: number; pay_on_delivery_max_km: number;
  extra_km_price_cents: number | null; delivery_estimate_text: string;
  pix_available: boolean; card_enabled: boolean; cod_enabled: boolean; cod_methods: string[];
};

export const getPublicSettings = createServerFn({ method: "GET" }).handler(async (): Promise<PublicSettings> => {
  const { getSettings, vegaConfig } = await import("./store.server");
  const s = await getSettings();
  const v = await vegaConfig(s);
  return {
    whatsapp_number: s.whatsapp_number, free_shipping_radius_km: Number(s.free_shipping_radius_km), road_factor: Number(s.road_factor),
    pay_on_delivery_max_km: Number(s.pay_on_delivery_max_km), extra_km_price_cents: s.extra_km_price_cents, delivery_estimate_text: s.delivery_estimate_text,
    pix_available: s.pix_enabled && v.ready && !!s.site_url, card_enabled: s.card_enabled, cod_enabled: s.cod_enabled, cod_methods: s.cod_methods,
  };
});

const shippingSettings = (s: { free_shipping_radius_km: unknown; road_factor: unknown; pay_on_delivery_max_km: unknown; extra_km_price_cents: number | null }) => ({
  free_shipping_radius_km: Number(s.free_shipping_radius_km), road_factor: Number(s.road_factor),
  pay_on_delivery_max_km: Number(s.pay_on_delivery_max_km), extra_km_price_cents: s.extra_km_price_cents,
});

export const quoteShipping = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ cep: z.string().regex(/^\d{5}-?\d{3}$/) }).parse(d))
  .handler(async ({ data }) => {
    const { getSettings } = await import("./store.server");
    const { computeQuote, ShippingError } = await import("./shipping");
    const s = await getSettings();
    try { return { ok: true as const, quote: await computeQuote(data.cep, shippingSettings(s)) }; }
    catch (e) { return { ok: false as const, error: e instanceof ShippingError ? e.message : "Não conseguimos calcular o frete agora." }; }
  });

const orderSchema = z.object({
  productSlug: z.string().min(1).max(60),
  quantity: z.number().int().min(1).max(50),
  customer: z.object({
    name: z.string().trim().min(5).max(100),
    cpf: z.string().refine(isValidCpf),
    email: z.string().trim().email().max(255),
    phone: z.string().transform(onlyDigits).refine((v) => v.length >= 10 && v.length <= 11),
  }),
  delivery: z.object({
    method: z.enum(["full", "pickup"]),
    cep: z.string().regex(/^\d{5}-?\d{3}$/),
    street: z.string().trim().min(1).max(150),
    number: z.string().trim().min(1).max(20),
    complement: z.string().trim().max(80).optional(),
    district: z.string().trim().max(100).optional(),
    city: z.string().trim().max(100).optional(),
    uf: z.string().trim().max(2).optional(),
  }),
  payment: z.object({ method: z.enum(["pix", "cartao_vega", "pagar_na_entrega", "pagar_na_loja"]), codMethod: z.string().max(40).optional() }),
  tracking: z.record(z.string().max(200)).optional(),
  website: z.string().max(200).optional(), // honeypot
});
export type CreateOrderInput = z.input<typeof orderSchema>;
export type CreateOrderResult = { ok: true; orderNumber: string; token: string; next: "pix" | "redirect" | "done"; redirectUrl?: string } | { ok: false; error: string };

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => orderSchema.parse(d))
  .handler(async ({ data }): Promise<CreateOrderResult> => {
    const fail = (error: string): CreateOrderResult => ({ ok: false, error });
    if (data.website) return fail("Não foi possível concluir o pedido.");
    const srv = await import("./store.server");
    const { computeQuote } = await import("./shipping");
    const db = srv.db;

    const ip = (getRequestHeader("cf-connecting-ip") || getRequestHeader("x-forwarded-for") || "unknown").split(",")[0]!.trim();
    const { data: limited } = await db.rpc("hit_rate_limit", { _key: `order:${ip}`, _max: 8, _window_seconds: 600 });
    if (limited) return fail("Muitas tentativas. Aguarde alguns minutos e tente de novo.");

    const { data: product } = await db.from("products").select("*").eq("slug", data.productSlug).maybeSingle();
    const stat = getProduct(data.productSlug);
    if (!product || !product.active || !stat) return fail("Produto indisponível.");
    if (product.stock < data.quantity) return fail("Estoque insuficiente para essa quantidade.");

    const s = await srv.getSettings();
    const vega = await srv.vegaConfig(s);
    const quote = await computeQuote(data.delivery.cep, shippingSettings(s)).catch(() => null);
    if (data.delivery.method === "full" && (!quote || quote.mode === "unknown")) return fail("Não conseguimos calcular a entrega para esse CEP. Escolha retirar na loja.");

    const avail = paymentAvailability({
      pixEnabled: s.pix_enabled && !!s.site_url, cardEnabled: s.card_enabled, codEnabled: s.cod_enabled, vegaConfigured: vega.ready,
      productCardUrl: product.vega_checkout_url, delivery: data.delivery.method, distanceKm: quote?.distanceKm ?? null, payOnDeliveryMaxKm: Number(s.pay_on_delivery_max_km),
    });
    const pm = data.payment.method as PaymentMethod;
    if (!avail[pm].ok) return fail(avail[pm].reason ?? "Forma de pagamento indisponível.");
    if ((pm === "pagar_na_entrega" || pm === "pagar_na_loja") && data.payment.codMethod && !s.cod_methods.includes(data.payment.codMethod)) return fail("Forma de pagamento na entrega inválida.");

    const freight = data.delivery.method === "full" ? quote!.freightCents ?? 0 : 0;
    const subtotal = product.price_cents * data.quantity;
    const reserveNow = pm === "pagar_na_entrega" || pm === "pagar_na_loja";
    if (reserveNow) {
      const { data: ok } = await db.rpc("adjust_stock", { _slug: product.slug, _delta: -data.quantity });
      if (!ok) return fail("Estoque insuficiente para essa quantidade.");
    }
    const t = data.tracking ?? {};
    const row = {
      order_number: newOrderNumber(), public_token: newToken(),
      status: pm === "pagar_na_entrega" ? "aguardando_entrega" : pm === "pagar_na_loja" ? "aguardando_retirada" : "aguardando_pagamento",
      payment_method: pm, cod_method: reserveNow ? data.payment.codMethod ?? null : null,
      product_slug: product.slug, product_name: product.name, unit_price_cents: product.price_cents, quantity: data.quantity,
      subtotal_cents: subtotal, freight_cents: freight, freight_mode: data.delivery.method === "full" ? quote!.mode : "free", discount_cents: 0, total_cents: subtotal + freight,
      customer_name: data.customer.name, customer_cpf: onlyDigits(data.customer.cpf), customer_email: data.customer.email.toLowerCase(), customer_phone: data.customer.phone,
      delivery_method: data.delivery.method, cep: onlyDigits(data.delivery.cep), street: data.delivery.street, number: data.delivery.number,
      complement: data.delivery.complement ?? null, district: data.delivery.district ?? quote?.address.district ?? null,
      city: quote?.address.city ?? data.delivery.city ?? null, uf: quote?.address.uf ?? data.delivery.uf ?? null, distance_km: quote?.distanceKm ?? null,
      utm_source: t["utm_source"] ?? null, utm_medium: t["utm_medium"] ?? null, utm_campaign: t["utm_campaign"] ?? null,
      utm_content: t["utm_content"] ?? null, utm_term: t["utm_term"] ?? null, src: t["src"] ?? null,
      stock_reserved: reserveNow,
    };
    const { data: order, error } = await db.from("orders").insert(row).select("*").single();
    if (error || !order) {
      if (reserveNow) await db.rpc("adjust_stock", { _slug: product.slug, _delta: data.quantity });
      console.error("order insert failed");
      return fail("Não foi possível registrar o pedido. Tente de novo.");
    }

    if (pm === "pix") {
      try {
        const secret = await srv.ensureWebhookSecret();
        const r = await srv.createVegaPix(order, { apiKey: vega.apiKey!, baseUrl: vega.baseUrl, domain: vega.domain, siteUrl: vega.siteUrl, webhookSecret: secret, description: stat.highlights.join(", "), imagePath: stat.images.studio });
        if (!r.pixCopyPaste) throw new Error("vega sem pix_copy_paste");
        await db.from("orders").update({ vega_transaction_token: r.transactionToken, vega_status: r.paymentStatus, pix_copy_paste: r.pixCopyPaste }).eq("id", order.id);
      } catch (e) {
        await db.from("orders").update({ status: "cancelado", canceled_at: new Date().toISOString(), admin_notes: `Falha ao criar Pix na Vega: ${(e as Error).message}`.slice(0, 500) }).eq("id", order.id);
        return fail("Não conseguimos gerar o Pix agora. Tente de novo em instantes ou escolha outra forma de pagamento.");
      }
      return { ok: true, orderNumber: order.order_number, token: order.public_token, next: "pix" };
    }
    if (pm === "cartao_vega") {
      const u = new URL(product.vega_checkout_url!);
      for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) if (t[k]) u.searchParams.set(k, t[k]!);
      return { ok: true, orderNumber: order.order_number, token: order.public_token, next: "redirect", redirectUrl: u.toString() };
    }
    return { ok: true, orderNumber: order.order_number, token: order.public_token, next: "done" };
  });

export type PublicOrder = {
  orderNumber: string; status: string; paymentMethod: string; codMethod: string | null;
  productSlug: string; productName: string; quantity: number; unitPriceCents: number;
  subtotalCents: number; freightCents: number; freightMode: string | null; totalCents: number;
  customerName: string; customerCpf: string; deliveryMethod: string;
  address: { street: string | null; number: string | null; complement: string | null; district: string | null; city: string | null; uf: string | null; cep: string | null };
  pixCopyPaste: string | null; paidAt: string | null; createdAt: string;
};

export const getOrderPublic = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ orderNumber: z.string().max(20), token: z.string().max(64) }).parse(d))
  .handler(async ({ data }): Promise<PublicOrder | null> => {
    const { db } = await import("./store.server");
    const { data: o } = await db.from("orders").select("*").eq("order_number", data.orderNumber).maybeSingle();
    if (!o || !timingSafeEqualStr(o.public_token, data.token)) return null;
    return {
      orderNumber: o.order_number, status: o.status, paymentMethod: o.payment_method, codMethod: o.cod_method,
      productSlug: o.product_slug, productName: o.product_name, quantity: o.quantity, unitPriceCents: o.unit_price_cents,
      subtotalCents: o.subtotal_cents, freightCents: o.freight_cents, freightMode: o.freight_mode, totalCents: o.total_cents,
      customerName: o.customer_name.split(" ")[0] ?? "", customerCpf: maskCpfPublic(o.customer_cpf), deliveryMethod: o.delivery_method,
      address: { street: o.street, number: o.number, complement: o.complement, district: o.district, city: o.city, uf: o.uf, cep: o.cep },
      pixCopyPaste: o.status === "aguardando_pagamento" ? o.pix_copy_paste : null, paidAt: o.paid_at, createdAt: o.created_at,
    };
  });

export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await import("./store.server");
  const { count } = await db.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
  return { exists: (count ?? 0) > 0 };
});

export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: z.string().trim().email().max(255), password: z.string().min(8).max(72) }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await import("./store.server");
    const { count } = await db.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) return { ok: false as const, error: "Já existe um administrador. Entre com e-mail e senha." };
    const { data: u, error } = await db.auth.admin.createUser({ email: data.email, password: data.password, email_confirm: true });
    if (error || !u.user) return { ok: false as const, error: "Não foi possível criar o administrador. Tente outra senha mais forte." };
    const { error: rErr } = await db.from("user_roles").insert({ user_id: u.user.id, role: "admin" });
    if (rErr) { await db.auth.admin.deleteUser(u.user.id); return { ok: false as const, error: "Não foi possível criar o administrador." }; }
    return { ok: true as const };
  });
