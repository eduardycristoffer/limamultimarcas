import { describe, expect, it } from "vitest";
import { mergeCatalog, vegaCheckoutHref } from "@/lib/api";

describe("checkout da Vega por moto", () => {
  it("leva as UTMs da visita para o link da Vega", () => {
    const href = vegaCheckoutHref("https://checkout.l1mamultimarcas.com.br/VCCL1O8SDC9C", { utm_source: "facebook", utm_campaign: "x15", outra: "ignorada" });
    const u = new URL(href);
    expect(u.origin + u.pathname).toBe("https://checkout.l1mamultimarcas.com.br/VCCL1O8SDC9C");
    expect(u.searchParams.get("utm_source")).toBe("facebook");
    expect(u.searchParams.get("utm_campaign")).toBe("x15");
    expect(u.searchParams.has("outra")).toBe(false);
  });

  it("sem UTMs, devolve o link como está", () => {
    expect(vegaCheckoutHref("https://checkout.l1mamultimarcas.com.br/ABC", {})).toBe("https://checkout.l1mamultimarcas.com.br/ABC");
  });

  it("o catálogo repassa o link só para a moto que tem", () => {
    const list = mergeCatalog([
      { slug: "foston-x15-max", price_cents: 618999, stock: 3, card_available: true, checkout_url: "https://checkout.l1mamultimarcas.com.br/ABC" },
      { slug: "cappuccino", price_cents: 799000, stock: 10, card_available: false, checkout_url: null },
    ]);
    expect(list.find((p) => p.slug === "foston-x15-max")?.checkoutUrl).toBe("https://checkout.l1mamultimarcas.com.br/ABC");
    expect(list.find((p) => p.slug === "cappuccino")?.checkoutUrl).toBeNull();
    // Moto que não está no banco não aparece.
    expect(list.some((p) => p.slug === "scooter-500w")).toBe(false);
  });
});
