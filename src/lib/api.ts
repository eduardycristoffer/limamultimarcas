// Única porta de dados/pagamento. Na Fase 2, troque as implementações por chamadas reais.
import { getProduct, products, type Product } from "@/data/products";

export const IS_DEMO = true;

export type PaymentMethod = "pix" | "payOnDelivery" | "payInStore" | "card";
export type DeliveryMethod = "full" | "pickup";
export type OrderInput = {
  productSlug: string;
  quantity: number;
  customer: { name: string; cpf: string; email: string; phone: string };
  delivery: {
    method: DeliveryMethod;
    cep?: string | undefined; street?: string | undefined; number?: string | undefined; complement?: string | undefined; district?: string | undefined; city?: string | undefined; uf?: string | undefined;
    distanceKm?: number | null | undefined;
    shippingPrice: number | null;
  };
  payment: { method: PaymentMethod; onDeliveryMethod?: string | undefined };
  tracking: Record<string, string>;
};
export type Order = OrderInput & {
  id: string; createdAt: string; subtotal: number; total: number;
  status: "awaiting_payment" | "paid" | "received";
  pix?: { copyPaste: string } | undefined;
};

const KEY = "lima:orders";
const read = (): Record<string, Order> => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };

export async function listProducts(): Promise<Product[]> { return products; }
export async function getProductBySlug(slug: string) { return getProduct(slug) ?? null; }

export async function createOrder(input: OrderInput): Promise<Order> {
  const p = getProduct(input.productSlug);
  if (!p) throw new Error("Produto não encontrado.");
  const subtotal = p.price * input.quantity;
  const id = `LM${Date.now().toString(36).toUpperCase()}`;
  const order: Order = {
    ...input, id, createdAt: new Date().toISOString(), subtotal,
    total: subtotal + (input.delivery.shippingPrice ?? 0),
    status: input.payment.method === "pix" ? "awaiting_payment" : "received",
    pix: input.payment.method === "pix" ? { copyPaste: `00020126DEMONSTRACAO-LIMA-${id}-NAO-PAGAR5204000053039865802BR` } : undefined,
  };
  const all = read(); all[id] = order; localStorage.setItem(KEY, JSON.stringify(all));
  return order;
}

export async function getOrder(id: string): Promise<Order | null> { return read()[id] ?? null; }

/** Simulação: o Pix é "aprovado" alguns segundos depois de criado. */
export async function getPaymentStatus(id: string): Promise<Order["status"] | null> {
  const o = read()[id]; if (!o) return null;
  if (o.status === "awaiting_payment" && Date.now() - new Date(o.createdAt).getTime() > 15000) {
    o.status = "paid"; const all = read(); all[id] = o; localStorage.setItem(KEY, JSON.stringify(all));
  }
  return o.status;
}
