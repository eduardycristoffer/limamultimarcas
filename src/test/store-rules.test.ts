import { describe, expect, it, vi } from "vitest";
import { freightFor, mapVegaStatus, canTransition, paymentAvailability, parseVegaWebhook, type PaymentContext } from "@/lib/order-rules";
import { computeQuote, haversineKm, ORIGIN } from "@/lib/shipping";
import { isValidCpf, money } from "@/lib/format";

const ship = { free_shipping_radius_km: 100, road_factor: 1.2, pay_on_delivery_max_km: 100, extra_km_price_cents: null };

describe("frete", () => {
  it("grátis até 100 km", () => expect(freightFor(100, ship)).toEqual({ mode: "free", freightCents: 0 }));
  it("acima de 100 km sem preço por km fica a combinar", () => expect(freightFor(101, ship)).toEqual({ mode: "arrange", freightCents: null }));
  it("acima de 100 km com preço por km cobra só o excedente", () => expect(freightFor(110, { ...ship, extra_km_price_cents: 200 })).toEqual({ mode: "paid", freightCents: 2000 }));
  it("sem distância é desconhecido", () => expect(freightFor(null, ship).mode).toBe("unknown"));
  it("aplica fator de estrada 1,2 sobre a linha reta", async () => {
    const dest = { lat: -16.0, lon: -43.8578 };
    const f = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes("viacep") ? { localidade: "X", uf: "MG" } : { location: { coordinates: { latitude: dest.lat, longitude: dest.lon } } })));
    const q = await computeQuote("39400-001", ship, f as unknown as typeof fetch);
    expect(q.distanceKm).toBe(Math.round(haversineKm(ORIGIN, dest) * 1.2));
  });
});

const ctx: PaymentContext = { pixEnabled: true, cardEnabled: true, codEnabled: true, vegaConfigured: true, productCardUrl: "https://x", delivery: "full", distanceKm: 50, payOnDeliveryMaxKm: 100 };
describe("regras de pagamento", () => {
  it("Pix exige Vega configurada", () => expect(paymentAvailability({ ...ctx, vegaConfigured: false }).pix.ok).toBe(false));
  it("cartão exige link Vega do produto", () => expect(paymentAvailability({ ...ctx, productCardUrl: null }).cartao_vega.ok).toBe(false));
  it("cartão exige cartão ligado", () => expect(paymentAvailability({ ...ctx, cardEnabled: false }).cartao_vega.ok).toBe(false));
  it("pagar na entrega até 100 km", () => expect(paymentAvailability(ctx).pagar_na_entrega.ok).toBe(true));
  it("pagar na entrega recusado acima de 100 km", () => expect(paymentAvailability({ ...ctx, distanceKm: 101 }).pagar_na_entrega.ok).toBe(false));
  it("pagar na entrega recusado na retirada; pagar na loja liberado", () => {
    const a = paymentAvailability({ ...ctx, delivery: "pickup" });
    expect(a.pagar_na_entrega.ok).toBe(false); expect(a.pagar_na_loja.ok).toBe(true);
  });
});

describe("webhook Vega", () => {
  it("mapeia status", () => {
    expect(mapVegaStatus("approved")).toBe("pago"); expect(mapVegaStatus("refused")).toBe("recusado");
    expect(mapVegaStatus("expired")).toBe("expirado"); expect(mapVegaStatus("charge_back")).toBe("estornado");
    expect(mapVegaStatus("chargeback")).toBe("estornado"); expect(mapVegaStatus("refunded")).toBe("estornado");
    expect(mapVegaStatus("pending")).toBeNull(); expect(mapVegaStatus("in_process")).toBeNull();
  });
  it("nunca volta de pago para aguardando e é idempotente", () => {
    expect(canTransition("pago", "aguardando_pagamento")).toBe(false);
    expect(canTransition("pago", "pago")).toBe(false);
    expect(canTransition("aguardando_pagamento", "pago")).toBe(true);
    expect(canTransition("cancelado", "pago")).toBe(false);
  });
  it("aceita o campo tansaction_token (grafia do contrato)", () => expect(parseVegaWebhook({ tansaction_token: "abc", payment_status: "approved" }).token).toBe("abc"));
  it("aceita transaction_token", () => expect(parseVegaWebhook({ transaction_token: "xyz" }).token).toBe("xyz"));
  it("lê payload de Venda com total em centavos string", () => {
    const w = parseVegaWebhook({ transaction_token: "t", status: "approved", method: "credit_card", total_price: "799000", customer: { email: "A@B.com" } });
    expect(w).toMatchObject({ totalCents: 799000, email: "a@b.com", method: "credit_card" });
  });
});

describe("formatos", () => {
  it("CPF com dígito errado é recusado", () => { expect(isValidCpf("529.982.247-25")).toBe(true); expect(isValidCpf("529.982.247-24")).toBe(false); });
  it("preço em reais", () => expect(money(799000).replace(/\s/g, " ")).toBe("R$ 7.990"));
});
