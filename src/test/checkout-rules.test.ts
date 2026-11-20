import { describe, expect, it, vi } from "vitest";
import { canTransition, DEFAULT_RATES, depositFor, installmentPlan, paymentAvailability, resolveTarget, sanitizeRates, type PaymentContext } from "@/lib/order-rules";
import { buildVegaPixBody } from "@/lib/store.server";
import { buildPurchaseEvent, sendPurchase, sha256 } from "@/lib/meta.server";

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));

const ctx: PaymentContext = { pixEnabled: true, cardEnabled: true, codEnabled: true, vegaConfigured: true, productCardUrl: "https://x", delivery: "full", distanceKm: 50, payOnDeliveryMaxKm: 100, depositCents: 30000 };

describe("sinal do pague na entrega", () => {
  it("é R$ 300 e nunca maior que o total", () => { expect(depositFor(799000, 30000)).toBe(30000); expect(depositFor(20000, 30000)).toBe(20000); expect(depositFor(799000, 0)).toBe(0); });
  it("precisa da Vega para cobrar o sinal", () => expect(paymentAvailability({ ...ctx, vegaConfigured: false }).pagar_na_entrega.ok).toBe(false));
  it("sem sinal não depende da Vega", () => expect(paymentAvailability({ ...ctx, vegaConfigured: false, depositCents: 0 }).pagar_na_entrega.ok).toBe(true));
  it("vale também na retirada (pague na loja)", () => expect(paymentAvailability({ ...ctx, delivery: "pickup" }).pagar_na_loja.ok).toBe(true));
  it("sinal pago leva para entrega ou retirada, não para pago", () => {
    expect(resolveTarget({ status: "aguardando_sinal", delivery_method: "full" }, "pago")).toBe("aguardando_entrega");
    expect(resolveTarget({ status: "aguardando_sinal", delivery_method: "pickup" }, "pago")).toBe("aguardando_retirada");
    expect(resolveTarget({ status: "aguardando_pagamento", delivery_method: "full" }, "pago")).toBe("pago");
    expect(canTransition("aguardando_sinal", "aguardando_entrega")).toBe(true);
    expect(canTransition("aguardando_sinal", "pago")).toBe(false);
    expect(canTransition("aguardando_entrega", "pago")).toBe(true);
  });
});

describe("parcelamento", () => {
  it("padrão é proporcional: 23% em 21x ≈ 1,0952% por parcela, 1x à vista", () => {
    expect(DEFAULT_RATES["1"]).toBe(0); expect(DEFAULT_RATES["2"]).toBe(2.19); expect(DEFAULT_RATES["18"]).toBe(19.71);
    expect(Object.keys(DEFAULT_RATES)).toHaveLength(18);
  });
  it("calcula total e parcela em centavos", () => {
    const plan = installmentPlan(799000, DEFAULT_RATES, 18);
    expect(plan[0]).toEqual({ n: 1, ratePct: 0, totalCents: 799000, perCents: 799000 });
    const p18 = plan.at(-1)!;
    expect(p18.n).toBe(18); expect(p18.totalCents).toBe(Math.round(799000 * 1.1971)); expect(p18.perCents).toBe(Math.round(p18.totalCents / 18));
  });
  it("respeita o máximo de parcelas", () => expect(installmentPlan(399000, DEFAULT_RATES, 12).at(-1)!.n).toBe(12));
  it("descarta lixo vindo do banco", () => {
    expect(sanitizeRates({ "1": 0, "2": "3", "99": 5, x: 1, "3": -1 })).toEqual({ "1": 0, "2": 3 });
    expect(sanitizeRates(null)).toEqual(DEFAULT_RATES);
  });
});

const baseOrder = {
  id: "o1", order_number: "LM-AAA", customer_name: "Maria Souza Lima", customer_cpf: "52998224725", customer_email: "M@X.com", customer_phone: "38999998888",
  street: "Rua A", number: "10", district: "Centro", cep: "39400001", city: "Montes Claros", uf: "MG", complement: null,
  product_slug: "cappuccino", product_name: "Cappuccino", unit_price_cents: 799000, quantity: 1, subtotal_cents: 799000, freight_cents: 0, discount_cents: 0, total_cents: 799000,
  deposit_cents: 30000, balance_cents: 769000, utm_source: null, src: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null,
  tracking_consent: true, capi_purchase_sent_at: null, meta_event_id: "purchase-LM-AAA", fbp: "fb.1.1.2", fbc: null, client_ip: "200.1.2.3", client_user_agent: "UA",
};

describe("Pix do sinal na Vega", () => {
  it("cobra só o sinal, como item de reserva", () => {
    const body = buildVegaPixBody(baseOrder as never, { siteUrl: "https://loja.com", webhookSecret: "s", description: "d", imagePath: "/img/x.jpg" }) as Record<string, unknown>;
    expect(body).toMatchObject({
      products: [{ code: "cappuccino-sinal", price: 30000, quantity: 1, is_digital: false }],
      payment: { method: "pix", payment_value: 30000, freight_value: 0, external_code: "LM-AAA", currency: "BRL" },
    });
  });
});

describe("API de Conversões da Meta", () => {
  it("normaliza e aplica SHA-256 nos dados pessoais", async () => {
    const e = await buildPurchaseEvent(baseOrder as never, "https://loja.com", 1000);
    expect(e.event_id).toBe("purchase-LM-AAA");
    expect(e.user_data["em"]).toEqual([await sha256("m@x.com")]);
    expect(e.user_data["ph"]).toEqual([await sha256("5538999998888")]);
    expect(e.user_data["ct"]).toEqual([await sha256("montesclaros")]);
    expect(e.user_data["client_ip_address"]).toBe("200.1.2.3");
    expect(e.custom_data).toMatchObject({ currency: "BRL", value: 7990, order_id: "LM-AAA" });
  });
  it("não envia sem consentimento nem duas vezes", async () => {
    const f = vi.fn();
    const deps = { getSettings: async () => ({ meta_pixel_id: "123456", meta_test_event_code: "", site_url: "https://loja.com" }), getSecret: async () => "tok", markSent: async () => {} };
    expect(await sendPurchase({ ...baseOrder, tracking_consent: false } as never, deps, f as never)).toBe("skipped");
    expect(await sendPurchase({ ...baseOrder, capi_purchase_sent_at: "2026-01-01" } as never, deps, f as never)).toBe("skipped");
    expect(f).not.toHaveBeenCalled();
  });
  it("envia para a Graph API com o pixel configurado", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    const marked: string[] = [];
    const deps = { getSettings: async () => ({ meta_pixel_id: "123456", meta_test_event_code: "TEST1", site_url: "https://loja.com" }), getSecret: async () => "tok", markSent: async (id: string) => { marked.push(id); } };
    expect(await sendPurchase(baseOrder as never, deps, f as never)).toBe("sent");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/graph\.facebook\.com\/v\d+\.0\/123456\/events$/);
    expect(JSON.parse(String(init.body))).toMatchObject({ test_event_code: "TEST1", access_token: "tok" });
    expect(marked).toEqual(["o1"]);
  });
});
