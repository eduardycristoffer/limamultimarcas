import { describe, expect, it, vi } from "vitest";
import { handleVegaWebhook } from "@/lib/webhook.server";
import { buildVegaPixBody } from "@/lib/store.server";

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));

type Row = Record<string, unknown>;
function fakeDeps(orders: Row[]) {
  const inserted: Row[] = [];
  const applied: string[] = [];
  const query = (rows: Row[]) => {
    let r = rows;
    const q = {
      select: () => q,
      eq: (k: string, v: unknown) => { r = r.filter((x) => x[k] === v); return q; },
      gte: () => q,
      maybeSingle: async () => ({ data: r[0] ?? null }),
      then: (res: (v: { data: Row[] }) => void) => res({ data: r }),
    };
    return q;
  };
  const deps = {
    getSecret: async () => "segredo",
    db: { from: (t: string) => (t === "webhook_events" ? { insert: async (x: Row) => { inserted.push(x); return {}; } } : query(orders)) },
    applyStatus: async (o: Row, to: string) => { const ok = o["status"] !== to; applied.push(to); return { applied: ok, order: o }; },
  };
  return { deps: deps as never, inserted, applied };
}

describe("handleVegaWebhook (Vega mockada)", () => {
  const order = { id: "1", order_number: "LM-AAA", status: "aguardando_pagamento", vega_transaction_token: "tok", payment_method: "pix", customer_email: "a@b.com", total_cents: 100 };
  it("401 com segredo errado", async () => {
    const { deps } = fakeDeps([order]);
    expect((await handleVegaWebhook("errado", {}, deps)).status).toBe(401);
  });
  it("aplica pago via tansaction_token e grava evento", async () => {
    const { deps, inserted, applied } = fakeDeps([order]);
    const r = await handleVegaWebhook("segredo", { tansaction_token: "tok", external_code: "LM-AAA", payment_status: "approved" }, deps);
    expect(r.result).toBe("aplicado"); expect(applied).toEqual(["pago"]); expect(inserted).toHaveLength(1);
  });
  it("external_code diferente não casa", async () => {
    const { deps } = fakeDeps([order]);
    expect((await handleVegaWebhook("segredo", { transaction_token: "tok", external_code: "LM-ZZZ", payment_status: "approved" }, deps)).result).toBe("sem_correspondencia");
  });
  it("pendente não altera", async () => {
    const { deps, applied } = fakeDeps([order]);
    await handleVegaWebhook("segredo", { transaction_token: "tok", payment_status: "pending" }, deps);
    expect(applied).toEqual([]);
  });
  it("venda de cartão casa por e-mail + total quando único", async () => {
    const card = { ...order, vega_transaction_token: null, payment_method: "cartao_vega" };
    const { deps, applied } = fakeDeps([card]);
    const r = await handleVegaWebhook("segredo", { transaction_token: "new", status: "approved", method: "credit_card", total_price: "100", customer: { email: "a@b.com" } }, deps);
    expect(r.result).toBe("aplicado"); expect(applied).toEqual(["pago"]);
  });
});

describe("corpo do Pix para a Vega", () => {
  it("segue o formato documentado", () => {
    const body = buildVegaPixBody({
      order_number: "LM-AAA", customer_name: "Maria Souza", customer_cpf: "52998224725", customer_email: "m@x.com", customer_phone: "38999998888",
      street: "Rua A", number: "10", district: "Centro", cep: "39400001", city: "Montes Claros", uf: "MG", complement: null,
      product_slug: "cappuccino", product_name: "Cappuccino", unit_price_cents: 799000, quantity: 1, subtotal_cents: 799000, freight_cents: 0, discount_cents: 0,
      utm_source: "insta", src: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null,
    } as never, { siteUrl: "https://loja.com", webhookSecret: "s3", description: "d", imagePath: "/img.jpg" });
    expect(body).toMatchObject({
      customer: { document: "52998224725", phone: "+5538999998888", address: { zipcode: "39400001", state: "MG" } },
      products: [{ code: "cappuccino", price: 799000, is_digital: false, quantity: 1, image_url: "https://loja.com/img.jpg" }],
      payment: { method: "pix", payment_value: 799000, freight_value: 0, discount_value: 0, external_code: "LM-AAA", currency: "BRL" },
      notification_url: "https://loja.com/api/public/vega-webhook?s=s3", utm_source: "insta",
    });
    expect(body).not.toHaveProperty("src");
  });
});
