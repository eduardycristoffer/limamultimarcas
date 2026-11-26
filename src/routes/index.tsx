import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, CreditCard, HandCoins, MapPin, QrCode, Store, Truck } from "lucide-react";
import { LocationBar, TopBar } from "@/components/ml/TopBar";
import { BottomNav, Full, HotBadge, SiteFooter } from "@/components/ml/Chrome";
import { ProductTile } from "@/components/ml/ProductTile";
import { openLocationSheet } from "@/components/ml/LocationSheet";
import { moneyCents } from "@/components/ml/Price";
import { mapsUrl, store } from "@/config/store";
import { cardPlan, catalogQuery, settingsQuery, useProducts, useSettings, type LiveProduct } from "@/lib/api";
import { depositFor } from "@/lib/order-rules";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { q?: string | undefined } => ({ q: typeof s["q"] === "string" && s["q"] ? s["q"].slice(0, 80) : undefined }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(catalogQuery), context.queryClient.ensureQueryData(settingsQuery)]),
  errorComponent: () => <div className="p-10 text-center">Não conseguimos carregar a loja agora. Atualize a página.</div>,
  notFoundComponent: () => <div className="p-10 text-center">Página não encontrada.</div>,
  head: () => ({
    meta: [
      { title: "Lima Multimarcas — Scooters elétricas em Montes Claros/MG" },
      { name: "description", content: "Scooter 500 W, Cappuccino, Foston GT6X e Foston X15 Max. Frete grátis até 100 km de Montes Claros." },
      { property: "og:title", content: "Lima Multimarcas — Scooters elétricas em Montes Claros" },
      { property: "og:description", content: "Frete grátis até 100 km e pague na entrega. Oferta de inauguração." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Home() {
  const { q } = Route.useSearch();
  const products = useProducts();
  const list = q ? products.filter((p) => norm(`${p.title} ${p.color} ${p.highlights.join(" ")}`).includes(norm(q))) : products;
  useEffect(() => { if (window.location.hash === "#busca") document.getElementById("busca")?.focus(); }, []);

  return (
    <div className="min-h-screen bg-background">
      <TopBar key={q} initialQuery={q ?? ""} />
      <LocationBar />
      <div className="bg-[linear-gradient(var(--primary)_0,var(--primary)_96px,var(--background)_96px)] md:bg-[linear-gradient(var(--primary)_0,var(--primary)_140px,var(--background)_140px)]">
        <Banners products={products} />
      </div>
      <Shortcuts products={products} />

      <main className="mx-auto max-w-6xl px-3 md:px-4">
        <section id="ofertas" className="scroll-mt-20 rounded-md bg-card p-3 shadow-[0_1px_2px_rgba(0,0,0,0.12)] md:p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[18px] font-normal md:text-[22px]">{q ? `Resultados para “${q}”` : "Ofertas de inauguração"}</h2>
            {q && <Link to="/" search={{ q: undefined }} className="text-[14px] text-link">Ver todas</Link>}
          </div>
          {list.length === 0 ? (
            <div className="py-8 text-center"><p>Nenhuma moto encontrada.</p><Link to="/" search={{ q: undefined }} className="mt-2 inline-block text-link">Ver todos os modelos</Link></div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">{list.map((p) => <ProductTile key={p.slug} p={p} />)}</div>
          )}
        </section>

        <HowToBuyHome products={products} />

        <Benefits />

        <section className="mt-3 flex items-center gap-3 rounded-md bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft"><MapPin className="h-5 w-5 text-primary" /></span>
          <div className="min-w-0 flex-1"><p className="font-semibold">Visite a loja</p><p className="text-[13px] text-muted-foreground">{store.address} · {store.addressReference}</p></div>
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex items-center text-[14px] text-link">Mapa<ChevronRight className="h-4 w-4" /></a>
        </section>
      </main>
      <SiteFooter />
      <BottomNav active="inicio" />
    </div>
  );
}

function Banners({ products }: { products: LiveProduct[] }) {
  const s = useSettings();
  const codOn = s.cod_enabled && (s.deposit_cents === 0 || s.deposit_available);
  const order = ["cappuccino", "foston-gt6x", "foston-x15-max", "scooter-500w"];
  const list = [...products].sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
  const [active, setActive] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (list.length < 2) return;
    const t = setInterval(() => {
      const el = track.current; if (!el || document.hidden) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % list.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, 5000);
    return () => clearInterval(t);
  }, [list.length]);
  return (
    <div className="mx-auto max-w-6xl px-3 pt-1 md:px-4 md:pt-4">
      <div ref={track} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-md shadow-[0_2px_8px_rgba(0,0,0,0.18)]" aria-label="Destaques"
        onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {list.map((p, i) => (
          <Link key={p.slug} to="/moto/$slug" params={{ slug: p.slug }} className="relative block aspect-[16/9] w-full shrink-0 snap-center overflow-hidden bg-ink md:aspect-[21/7]">
            <img src={p.images.street} alt={`${p.name} na rua`} width={1280} height={723} loading={i ? "lazy" : "eager"} fetchPriority={i ? undefined : "high"} className="absolute inset-0 h-full w-full object-cover object-right" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.45)_45%,transparent_70%)]" />
            <div className="relative flex h-full flex-col justify-center p-4 text-white md:p-10">
              <HotBadge className="self-start">{p.badge}</HotBadge>
              <p className="mt-2 text-[24px] font-black uppercase italic leading-none md:text-[44px]">{p.name}</p>
              <p className="mt-2 text-[22px] font-light leading-none md:text-[34px]">{moneyCents(p.price).replace(",00", "")} <span className="text-[12px] font-semibold uppercase md:text-[14px]">à vista</span></p>
              <p className="mt-2 max-w-[55%] text-[12px] font-semibold leading-snug md:max-w-none md:text-[15px]">Frete grátis até {s.free_shipping_radius_km} km<span className="hidden md:inline">{codOn ? " · Pague na entrega" : ""}</span></p>
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
        {list.map((p, i) => <span key={p.slug} className={cn("h-1.5 rounded-full transition-all", active === i ? "w-4 bg-primary" : "w-1.5 bg-input")} />)}
      </div>
    </div>
  );
}

function Shortcuts({ products }: { products: LiveProduct[] }) {
  const s = useSettings();
  const maxN = Math.max(0, ...products.map((p) => cardPlan(p, s).at(-1)?.n ?? 0));
  const deposit = depositFor(Math.min(...products.map((p) => p.price)), s.deposit_cents);
  const codOn = s.cod_enabled && (deposit === 0 || s.deposit_available);
  type Item = { icon: typeof Truck; label: string; sub: string; href?: string; external?: boolean; onClick?: () => void };
  const items: Item[] = [
    { icon: Truck, label: "Frete grátis", sub: `até ${s.free_shipping_radius_km} km`, onClick: openLocationSheet },
    ...(codOn ? [{ icon: HandCoins, label: "Pague na", sub: "entrega", href: "#ofertas" }] : []),
    ...(maxN > 1 ? [{ icon: CreditCard, label: "Cartão", sub: `até ${maxN}x`, href: "#ofertas" }] : s.pix_available ? [{ icon: QrCode, label: "Pix", sub: "na hora", href: "#ofertas" }] : []),
    { icon: Store, label: "Retire", sub: "na loja", href: mapsUrl, external: true },
  ];
  return (
    <nav aria-label="Atalhos" className="mx-auto max-w-6xl px-3 py-4 md:px-4">
      {/* Celular: bolinhas do app. Computador: cartões lado a lado, como os benefícios do Mercado Livre. */}
      <ul className="flex justify-around gap-2 md:grid md:auto-cols-fr md:grid-flow-col md:gap-3">
        {items.map((it) => {
          const inner = (
            <>
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-card shadow-[0_1px_2px_rgba(0,0,0,0.15)] md:bg-primary-soft md:shadow-none"><it.icon className="h-6 w-6 text-primary" /></span>
              <span className="text-center text-[12px] leading-tight md:text-left md:text-[15px]">{it.label}<br /><span className="text-muted-foreground">{it.sub}</span></span>
            </>
          );
          const cls = "flex w-20 flex-col items-center gap-1.5 md:w-full md:flex-row md:gap-3 md:rounded-md md:bg-card md:p-4 md:shadow-[0_1px_2px_rgba(0,0,0,0.12)] md:transition-shadow md:hover:shadow-[0_6px_16px_rgba(0,0,0,0.14)]";
          return (
            <li key={it.label}>
              {it.onClick ? <button type="button" onClick={it.onClick} className={cls}>{inner}</button>
                : <a href={it.href} {...(it.external ? { target: "_blank", rel: "noreferrer" } : {})} className={cls}>{inner}</a>}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function HowToBuyHome({ products }: { products: LiveProduct[] }) {
  const s = useSettings();
  const viaVega = products.some((p) => p.checkoutUrl);
  const codOn = s.cod_enabled && (s.deposit_cents === 0 || s.deposit_available);
  const steps = [
    { t: "Escolha sua moto", d: "Veja fotos, ficha técnica e o preço à vista de cada modelo." },
    viaVega
      ? { t: "Pague no Pix ou no cartão", d: `Toque em Comprar agora e conclua no checkout seguro da Vega.${codOn ? " Se preferir, pague na entrega." : ""}` }
      : { t: "Escolha como pagar", d: codOn ? "Pague na entrega ou combine com a loja." : "Combine o pagamento com a loja." },
    { t: "Receba ou retire", d: `Frete grátis até ${s.free_shipping_radius_km} km de Montes Claros, ou retire grátis na loja.` },
  ];
  return (
    <section id="como-comprar" className="mt-3 scroll-mt-20 rounded-md bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)] md:p-5">
      <h2 className="mb-3 text-[18px] font-normal md:text-[22px]">Como comprar</h2>
      <ol className="grid gap-4 md:grid-cols-3">
        {steps.map((st, i) => (
          <li key={st.t} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[14px] font-bold text-primary-foreground">{i + 1}</span>
            <span><strong className="block font-semibold">{st.t}</strong><span className="text-[14px] text-muted-foreground">{st.d}</span></span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Benefits() {
  const s = useSettings();
  const deposit = s.deposit_cents;
  const codOn = s.cod_enabled && (deposit === 0 || s.deposit_available);
  return (
    <section className="mt-3 rounded-md bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)] md:p-5">
      <h2 className="mb-3 text-[18px] font-normal">Por que comprar na Lima</h2>
      <ul className="grid gap-4 sm:grid-cols-3">
        <li className="flex gap-3"><Truck className="h-6 w-6 shrink-0 text-success-strong" /><span className="text-[14px]"><strong className="font-semibold">Frete grátis</strong> até {s.free_shipping_radius_km} km de Montes Claros <Full className="ml-1" /></span></li>
        {codOn && <li className="flex gap-3"><HandCoins className="h-6 w-6 shrink-0 text-primary" /><span className="text-[14px]"><strong className="font-semibold">Pague na entrega</strong>{deposit > 0 ? ` com sinal de ${moneyCents(deposit)} no Pix` : ""}</span></li>}
        <li className="flex gap-3"><Store className="h-6 w-6 shrink-0 text-primary" /><span className="text-[14px]"><strong className="font-semibold">Loja física</strong> em Montes Claros: veja a moto antes de comprar</span></li>
      </ul>
    </section>
  );
}
