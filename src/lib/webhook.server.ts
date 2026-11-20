import { mapVegaStatus, parseVegaWebhook, timingSafeEqualStr } from "./order-rules";
import type { OrderRow } from "./store.server";

type Deps = typeof import("./store.server");

/** Processa um webhook da Vega. Retorna o resultado gravado. `deps` injetável para testes. */
export async function handleVegaWebhook(secretParam: string | null, payload: unknown, deps: Deps): Promise<{ status: number; result: string }> {
  const secret = await deps.getSecret("vega_webhook_secret");
  if (!secret || !secretParam || !timingSafeEqualStr(secretParam, secret)) return { status: 401, result: "unauthorized" };
  const info = parseVegaWebhook(payload);
  const target = mapVegaStatus(info.status);
  let result = "ignorado";
  let order: OrderRow | null = null;

  if (info.token) {
    const { data } = await deps.db.from("orders").select("*").eq("vega_transaction_token", info.token).maybeSingle();
    order = data;
  }
  if (order && info.externalCode && info.externalCode !== order.order_number) order = null;

  if (!order && target === "pago" && /credit|card|cartao/i.test(info.method ?? "") && info.email && info.totalCents != null) {
    const since = new Date(Date.now() - 7 * 86400_000).toISOString();
    const { data: cands } = await deps.db.from("orders").select("*").eq("payment_method", "cartao_vega").eq("status", "aguardando_pagamento")
      .eq("customer_email", info.email).eq("total_cents", info.totalCents).gte("created_at", since);
    if (cands && cands.length === 1) order = cands[0]!;
  }

  if (!order) result = "sem_correspondencia";
  else if (target) {
    const r = await deps.applyStatus(order, target, { vega_status: String(info.status ?? ""), ...(info.token && !order.vega_transaction_token ? { vega_transaction_token: info.token } : {}) });
    result = r.applied ? "aplicado" : "ignorado";
  }
  await deps.db.from("webhook_events").insert({ source: "vega", payload: (payload ?? {}) as never, result, order_number: order?.order_number ?? null });
  return { status: 200, result };
}
