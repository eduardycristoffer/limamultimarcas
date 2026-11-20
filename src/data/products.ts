import scooterStudio from "@/assets/scooter-500w-studio.jpg.asset.json";
import scooterHero from "@/assets/scooter-500w-hero.jpg.asset.json";
import scooterCut from "@/assets/scooter-500w-cut.png.asset.json";
import capStudio from "@/assets/cappuccino-studio.jpg.asset.json";
import capHero from "@/assets/cappuccino-hero.jpg.asset.json";
import capCut from "@/assets/cappuccino-cut.png.asset.json";
import gtStudio from "@/assets/foston-gt6x-studio.jpg.asset.json";
import gtHero from "@/assets/foston-gt6x-hero.jpg.asset.json";
import gtCut from "@/assets/foston-gt6x-cut.png.asset.json";

export type Product = {
  slug: string;
  name: string;
  /** Preço em centavos */
  price: number;
  color: string;
  condition: "Novo";
  highlights: string[];
  /** Ficha técnica: somente dados confirmados. O dono pode acrescentar linhas aqui. */
  specs: { label: string; value: string }[];
  stock: number;
  badge: string;
  images: { studio: string; hero: string; cut: string };
};

export const products: Product[] = [
  {
    slug: "scooter-500w",
    name: "Scooter Elétrica 500 W",
    price: 399000,
    color: "Preta",
    condition: "Novo",
    highlights: ["500 W de potência", "Cesta dianteira", "Encosto/banco com apoio", "Zero gasolina"],
    specs: [
      { label: "Potência", value: "500 W" },
      { label: "Cesta dianteira", value: "Sim" },
      { label: "Encosto/banco com apoio", value: "Sim" },
    ],
    stock: 10,
    badge: "Oferta de inauguração",
    images: { studio: scooterStudio.url, hero: scooterHero.url, cut: scooterCut.url },
  },
  {
    slug: "cappuccino",
    name: "Cappuccino",
    price: 799000,
    color: "Verde-menta (única cor disponível)",
    condition: "Novo",
    highlights: ["Visual retrô", "Até 70 km de autonomia", "Baú traseiro", "Banco bege"],
    specs: [
      { label: "Autonomia", value: "Até 70 km" },
      { label: "Estilo", value: "Retrô" },
      { label: "Baú traseiro", value: "Sim" },
      { label: "Banco", value: "Bege" },
    ],
    stock: 10,
    badge: "Oferta de inauguração",
    images: { studio: capStudio.url, hero: capHero.url, cut: capCut.url },
  },
  {
    slug: "foston-gt6x",
    name: "Foston GT6X",
    price: 999000,
    color: "Cinza/prata",
    condition: "Novo",
    highlights: ["Até 60 km de autonomia", "Farol em LED", "Freio a disco na roda dianteira"],
    specs: [
      { label: "Autonomia", value: "Até 60 km" },
      { label: "Farol", value: "LED" },
      { label: "Freio dianteiro", value: "A disco" },
    ],
    stock: 10,
    badge: "Oferta de inauguração",
    images: { studio: gtStudio.url, hero: gtHero.url, cut: gtCut.url },
  },
];

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);
