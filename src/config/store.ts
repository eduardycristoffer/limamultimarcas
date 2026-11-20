// Valores PADRÃO da loja. Na Fase 2 os valores vivos vêm do painel admin (store_settings);
// estes servem só de semente/fallback enquanto as configurações carregam.
export const store = {
  name: "Lima Multimarcas",
  city: "Montes Claros/MG",
  address: "Av. João XXIII, 990 — Montes Claros/MG",
  addressReference: "Em frente ao Hospital Aroldo Tourinho",
  /** Somente dígitos com DDI, ex.: "5538999999999". Vazio = botões de WhatsApp ficam escondidos. */
  whatsappNumber: "",
  origin: { lat: -16.7282, lon: -43.8578 },
};

export const shippingConfig = {
  freeShippingRadiusKm: 100,
  roadFactor: 1.2,
  payOnDeliveryMaxKm: 100,
  /** Preço em centavos por km além do raio. null = "Frete a combinar com a loja". */
  extraKmPrice: null as number | null,
  deliveryEstimateText: "em até 2 dias úteis",
};

export const paymentConfig = {
  payments: { pix: true, card: false, payOnDelivery: true },
  payOnDeliveryMethods: ["Dinheiro", "Pix", "Cartão (maquininha)"],
  /** null = não exibe parcelamento. */
  maxInstallments: null as number | null,
};

export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Av. João XXIII, 990, Montes Claros - MG")}`;

