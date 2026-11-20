// Conteúdo das motos. Preço, estoque e link do cartão vêm do banco (painel /admin → Produtos).
// Ficha técnica: SOMENTE dados confirmados pela loja. Para acrescentar, edite `specs`.

export type Product = {
  slug: string;
  /** Nome curto (resumo, carrinho, WhatsApp). */
  name: string;
  /** Título do anúncio, no padrão Mercado Livre. */
  title: string;
  category: string;
  /** Preço à vista em centavos (padrão; o banco manda o valor real). */
  price: number;
  color: string;
  condition: "Novo";
  highlights: string[];
  /** Destaques curtos mostrados sobre a foto (ícone + texto). */
  badges: { icon: "zap" | "battery" | "basket" | "seat" | "leaf" | "retro" | "box" | "light" | "disc"; label: string }[];
  specs: { label: string; value: string }[];
  stock: number;
  badge: string;
  images: { white: string; studio: string; street: string };
  video: { src: string; poster: string };
};

const img = (slug: string) => ({ white: `/img/${slug}-branco.jpg`, studio: `/img/${slug}-estudio.jpg`, street: `/img/${slug}-rua.jpg` });
const vid = (slug: string) => ({ src: `/videos/${slug}.mp4`, poster: `/videos/${slug}-poster.jpg` });

export const products: Product[] = [
  {
    slug: "scooter-500w",
    name: "Scooter Elétrica 500 W",
    title: "Scooter Elétrica 500W Preta com Cesta Dianteira e Encosto",
    category: "Scooters elétricas",
    price: 399000,
    color: "Preta",
    condition: "Novo",
    highlights: ["Motor de 500 W de potência", "Cesta dianteira", "Banco com encosto", "Zero gasolina: você só carrega a bateria"],
    badges: [{ icon: "zap", label: "500 W" }, { icon: "basket", label: "Cesta" }, { icon: "seat", label: "Encosto" }, { icon: "leaf", label: "Zero gasolina" }],
    specs: [
      { label: "Potência", value: "500 W" },
      { label: "Cesta dianteira", value: "Sim" },
      { label: "Encosto/banco com apoio", value: "Sim" },
    ],
    stock: 10,
    badge: "Oferta de inauguração",
    images: img("scooter-500w"),
    video: vid("scooter-500w"),
  },
  {
    slug: "cappuccino",
    name: "Cappuccino",
    title: "Scooter Elétrica Cappuccino Retrô Verde-menta Até 70 km com Baú",
    category: "Scooters elétricas",
    price: 799000,
    color: "Verde-menta",
    condition: "Novo",
    highlights: ["Visual retrô", "Até 70 km de autonomia", "Baú traseiro", "Banco bege"],
    badges: [{ icon: "battery", label: "Até 70 km" }, { icon: "retro", label: "Retrô" }, { icon: "box", label: "Baú" }, { icon: "leaf", label: "Zero gasolina" }],
    specs: [
      { label: "Autonomia", value: "Até 70 km" },
      { label: "Estilo", value: "Retrô" },
      { label: "Baú traseiro", value: "Sim" },
      { label: "Banco", value: "Bege" },
    ],
    stock: 10,
    badge: "Oferta de inauguração",
    images: img("cappuccino"),
    video: vid("cappuccino"),
  },
  {
    slug: "foston-gt6x",
    name: "Foston GT6X",
    title: "Scooter Elétrica Foston GT6X Até 60 km Farol LED Freio a Disco",
    category: "Scooters elétricas",
    price: 999000,
    color: "Cinza/prata",
    condition: "Novo",
    highlights: ["Até 60 km de autonomia", "Farol em LED", "Freio a disco na roda dianteira"],
    badges: [{ icon: "battery", label: "Até 60 km" }, { icon: "light", label: "Farol LED" }, { icon: "disc", label: "Freio a disco" }, { icon: "leaf", label: "Zero gasolina" }],
    specs: [
      { label: "Autonomia", value: "Até 60 km" },
      { label: "Farol", value: "LED" },
      { label: "Freio dianteiro", value: "A disco" },
    ],
    stock: 10,
    badge: "Oferta de inauguração",
    images: img("foston-gt6x"),
    video: vid("foston-gt6x"),
  },
];

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);
