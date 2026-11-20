// Única porta de dados/pagamento do front. Tudo passa pelas funções do servidor.
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { products as staticProducts, type Product } from "@/data/products";
import { paymentConfig, shippingConfig, store } from "@/config/store";
import {
  createOrder as createOrderFn, getCatalog, getOrderPublic as getOrderPublicFn, getPublicSettings, getVisitorLocation as getVisitorLocationFn,
  quoteShipping as quoteShippingFn,
  type CatalogItem, type CreateOrderInput, type PublicSettings,
} from "./store.functions";
import { DEFAULT_RATES, installmentPlan, type Installment } from "./order-rules";

export const IS_DEMO = false;
export type { CreateOrderInput, PublicSettings };
export type { PublicOrder, CreateOrderResult, VisitorLocation } from "./store.functions";

export const catalogQuery = queryOptions({ queryKey: ["catalog"], queryFn: () => getCatalog(), staleTime: 30_000 });
export const settingsQuery = queryOptions({ queryKey: ["settings"], queryFn: () => getPublicSettings().catch(() => defaultSettings), staleTime: 60_000 });

export const defaultSettings: PublicSettings = {
  whatsapp_number: store.whatsappNumber, free_shipping_radius_km: shippingConfig.freeShippingRadiusKm, road_factor: shippingConfig.roadFactor,
  pay_on_delivery_max_km: shippingConfig.payOnDeliveryMaxKm, extra_km_price_cents: shippingConfig.extraKmPrice, delivery_estimate_text: shippingConfig.deliveryEstimateText,
  pix_available: false, card_enabled: paymentConfig.payments.card, cod_enabled: paymentConfig.payments.payOnDelivery, cod_methods: paymentConfig.payOnDeliveryMethods,
  deposit_cents: paymentConfig.depositCents, deposit_available: false,
  installments_max: paymentConfig.installmentsMax, installment_rates: DEFAULT_RATES, meta_pixel_id: "", site_url: "",
};

export type LiveProduct = Product & { cardAvailable: boolean };
/** Une o conteúdo estático (fotos, textos) ao que o banco diz (preço, estoque, ativo, link Vega). Inativos somem. */
export function mergeCatalog(items: CatalogItem[]): LiveProduct[] {
  return staticProducts.flatMap((p) => {
    const db = items.find((i) => i.slug === p.slug);
    return db ? [{ ...p, price: db.price_cents, stock: db.stock, cardAvailable: db.card_available }] : [];
  });
}

export function useProducts() { return mergeCatalog(useSuspenseQuery(catalogQuery).data); }
export function useSettings() { return useSuspenseQuery(settingsQuery).data; }

/** Parcelamento no cartão de um produto, só quando o cartão está liberado para ele. */
export function cardPlan(p: LiveProduct, s: PublicSettings): Installment[] {
  if (!s.card_enabled || !p.cardAvailable) return [];
  return installmentPlan(p.price, s.installment_rates, s.installments_max);
}

export async function listProducts() { return mergeCatalog(await getCatalog()); }
export async function getProductBySlug(slug: string) { return (await listProducts()).find((p) => p.slug === slug) ?? null; }
export const quoteShipping = (cep: string) => quoteShippingFn({ data: { cep } });
export const createOrder = (input: CreateOrderInput) => createOrderFn({ data: input });
export const getOrderPublic = (orderNumber: string, token: string) => getOrderPublicFn({ data: { orderNumber, token } });
export const getVisitorLocation = () => getVisitorLocationFn();

export function waLink(number: string, text: string): string | null {
  const n = number.replace(/\D/g, "");
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}
