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
  video?: { src: string; poster: string };
  /** Opiniões do MESMO modelo no Mercado Livre (página de catálogo, compradores de várias lojas). */
  reviews?: MarketplaceReviews;
};

export type MarketplaceReviews = {
  source: "Mercado Livre";
  /** Página do modelo no Mercado Livre, para o cliente conferir. */
  url: string;
  rating: number;
  total: number;
  /** Quando a nota foi copiada (mês/ano). */
  checkedAt: string;
  /**
   * Comentários copiados sem edição. Ficam de fora os que falam da loja que vendeu
   * (atendimento, entrega, embalagem), elogio ou reclamação, porque não são da Lima.
   */
  comments: { stars: number; text: string; when: string }[];
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
  {
    // Ficha técnica do anúncio da própria loja no Mercado Livre (MLB5592991609).
    slug: "foston-x15-max",
    name: "Foston X15 Max",
    title: "Scooter Elétrica Foston X15 Max 1000W 32 km/h Até 50 km Cinza",
    category: "Scooters elétricas",
    price: 618999,
    color: "Cinza",
    condition: "Novo",
    highlights: ["Motor de 1.000 W", "Até 50 km de autonomia", "Velocidade máxima de 32 km/h", "Bateria de lítio 48 V 12 Ah, carrega em 4 horas"],
    badges: [{ icon: "zap", label: "1.000 W" }, { icon: "battery", label: "Até 50 km" }, { icon: "disc", label: "Freio a disco" }, { icon: "leaf", label: "Zero gasolina" }],
    specs: [
      { label: "Marca", value: "Foston" },
      { label: "Modelo", value: "X15 MAX (X13-EX)" },
      { label: "Potência do motor", value: "1.000 W" },
      { label: "Velocidade máxima", value: "32 km/h" },
      { label: "Autonomia", value: "Até 50 km" },
      { label: "Bateria", value: "Lítio 48 V 12 Ah" },
      { label: "Tempo de carga", value: "4 horas" },
      { label: "Rodas", value: "14\"" },
      { label: "Freio", value: "Disco traseiro" },
      { label: "Peso", value: "45 kg" },
      { label: "Carga máxima", value: "100 kg" },
      { label: "Idade mínima recomendada", value: "16 anos" },
    ],
    stock: 3,
    badge: "Oferta de inauguração",
    images: img("foston-x15-max"),
    reviews: {
      source: "Mercado Livre",
      url: "https://www.mercadolivre.com.br/moto-eletrica-foston-x15-max-32km-h-preto/p/MLB76780703",
      rating: 4.3,
      total: 30,
      checkedAt: "nov/2026",
      comments: [
        { stars: 5, text: "Meus filhos estão amando muito, ela é linda, a bateria dura muito, show de bola.", when: "nov/2026" },
        { stars: 4, text: "Gostei muito anda bem bom equilíbrio bem estável recomendo só a montagem é um pouco complicado más da para montar você mesmo se tiver alguma noção.", when: "nov/2026" },
        { stars: 5, text: "Então produto vem desmontada,e não vem manual,como montar sozinho.", when: "out/2026" },
        { stars: 5, text: "Moto bonita.", when: "out/2026" },
        { stars: 5, text: "Ótima escolha.", when: "nov/2026" },
      ],
    },
  },
];

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);
