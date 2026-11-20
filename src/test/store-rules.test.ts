import { describe, expect, it } from "vitest";
import { priceForDistance } from "@/lib/shipping";
import { isValidCpf, money } from "@/lib/format";

describe("regras da loja", () => {
  it("frete grátis até 100 km", () => expect(priceForDistance(100).price).toBe(0));
  it("acima de 100 km sem preço por km fica a combinar", () => expect(priceForDistance(101)).toMatchObject({ price: null, free: false }));
  it("CPF com dígito errado é recusado", () => { expect(isValidCpf("529.982.247-25")).toBe(true); expect(isValidCpf("529.982.247-24")).toBe(false); });
  it("preço formatado em reais", () => expect(money(799000).replace(/\s/g, " ")).toBe("R$ 7.990"));
});
