import { createFileRoute, Link, notFound, useNavigate, type ErrorComponentProps } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Check, CreditCard, HandCoins, QrCode, ShieldCheck, Store, Zap } from "lucide-react";
import { Header } from "@/components/lima/Header";
import { Footer } from "@/components/lima/Footer";
import { ProductCard } from "@/components/lima/ProductCard";
import { FullBadge, OfferBadge } from "@/components/lima/Badges";
import { ShippingCalculator } from "@/components/lima/ShippingCalculator";
import { WhatsAppIcon } from "@/components/lima/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getProduct, type Product } from "@/data/products";
import { mapsUrl, store } from "@/config/store";
import { catalogQuery, mergeCatalog, settingsQuery, useProducts, useSettings, waLink } from "@/lib/api";
import { money } from "@/lib/format";
import { setBuyIntent } from "@/lib/checkout-store";

export const Route = createFileRoute("/moto/$slug")({
  loader: async ({ params, context }) => {
    const [cat, s] = await Promise.all([context.queryClient.ensureQueryData(catalogQuery), context.queryClient.ensureQueryData(settingsQuery)]);
    const p = mergeCatalog(cat).find((x) => x.slug === params.slug);
    if (!p) throw notFound();
    return { slug: p.slug, price: p.price, stock: p.stock, radius: s.free_shipping_radius_km };
  },
  head: ({ loaderData }) => {
    const base = loaderData ? getProduct(loaderData.slug) : undefined;
    const p = base && loaderData ? { ...base, price: loaderData.price, stock: loaderData.stock } : undefined;
    if (!p || !loaderData) return { meta: [{ title: "Moto não encontrada — Lima Multimarcas" }, { name: "robots", content: "noindex" }] };
    const title = `${p.name} por ${money(p.price)} — Lima Multimarcas`;
    const desc = `${p.name}: ${p.highlights.join(", ")}. Frete grátis até ${loaderData.radius} km de Montes Claros.`;
    return {
      meta: [
        { title }, { name: "description", content: desc },
        { property: "og:title", content: title }, { property: "og:description", content: desc },
        { property: "og:type", content: "product" }, { property: "og:url", content: `/moto/${p.slug}` },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `/moto/${p.slug}` }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org", "@type": "Product", name: p.name, color: p.color,
          description: desc, image: [p.images.studio, p.images.hero],
          brand: { "@type": "Brand", name: store.name },
          offers: { "@type": "Offer", price: (p.price / 100).toFixed(2), priceCurrency: "BRL", itemCondition: "https://schema.org/NewCondition",
            availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: `/moto/${p.slug}` },
        }),
      }],
    };
  },
  component: ProductPage,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background"><Header />
      <div className="mx-auto max-w-md p-10 text-center"><h1 className="text-2xl font-bold">Moto não encontrada</h1>
        <Link to="/" className="mt-4 inline-block text-link underline">Ver todos os modelos</Link></div></div>
  ),
  errorComponent: ({ reset }: ErrorComponentProps) => (
    <div className="p-10 text-center"><p>Não conseguimos carregar esta moto.</p><button className="mt-3 text-link underline" onClick={reset}>Tentar de novo</button></div>
  ),
});

function ProductPage() {
  const { slug } = Route.useLoaderData();
  const products = useProducts();
  const s = useSettings();
  const p = products.find((x) => x.slug === slug) ?? { ...getProduct(slug)!, cardAvailable: false };
  const [qty, setQty] = useState(1);
  const navigate = useNavigate();
  const wa = waLink(s.whatsapp_number, `Olá, Lima! Tenho interesse na ${p.name} (${money(p.price)}).`);
  const buy = () => { setBuyIntent({ slug: p.slug, quantity: qty }); navigate({ to: "/checkout" }); };
  const others = products.filter((o) => o.slug !== p.slug);
  const pm = { pix: s.pix_available, payOnDelivery: s.cod_enabled, card: s.card_enabled && p.cardAvailable };
  const radius = s.free_shipping_radius_km;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Header />
      <section className="relative h-[320px] overflow-hidden bg-ink md:h-[420px]">
        <img src={p.images.hero} alt={`${p.name} estacionada na rua`} width={1920} height={1085} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-center px-4 text-ink-foreground">
          <div><OfferBadge>{p.badge}</OfferBadge></div>
          <h1 className="mt-3 text-4xl font-extrabold md:text-5xl">{p.name}</h1>
          <p className="mt-2 text-4xl font-extrabold">{money(p.price)}</p>
          <p className="mt-2 font-semibold">Frete grátis até {radius} km{s.cod_enabled && " · Pague na entrega"}</p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-0 sm:px-4 sm:py-6">
        <div className="grid gap-6 bg-card p-4 shadow-card sm:rounded-lg md:grid-cols-[1fr_340px] md:p-6">
          <div className="min-w-0">
            <Gallery p={p} />
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">{p.condition} | {p.badge}</p>
              <h2 className="mt-1 text-2xl font-semibold">{p.name}</h2>
            </div>
          </div>
          <aside className="rounded-lg border border-border p-4" aria-label="Comprar">
            <p className="text-4xl font-bold">{money(p.price)}</p>
            {pm.pix && <p className="text-sm text-success-strong">à vista no Pix</p>}
            <p className="mt-4 font-semibold text-success-strong">Frete grátis para Montes Claros e região (até {radius} km)</p>
            <p className="mt-1 flex items-center gap-1 text-sm"><FullBadge /> — chega {s.delivery_estimate_text}</p>
            <p className="mt-4 font-semibold">{p.stock > 0 ? "Estoque disponível" : "Sem estoque no momento"}</p>
            {p.stock > 0 && p.stock <= 3 && <p className="text-sm font-semibold text-primary">Últimas unidades</p>}
            <label className="mt-3 flex items-center gap-2 text-sm">Quantidade:
              <select value={qty} onChange={(e) => setQty(Number(e.target.value))} className="h-11 rounded-md border border-input bg-card px-2 font-semibold">
                {Array.from({ length: p.stock }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} {i ? "unidades" : "unidade"}</option>)}
              </select>
              <span className="text-muted-foreground">({p.stock} disponíveis)</span>
            </label>
            <div className="mt-4 space-y-2">
              <Button variant="buy" size="xl" onClick={buy} disabled={p.stock < 1}>Comprar agora</Button>
              {wa && <Button asChild variant="buyOutline" size="xl"><a href={wa} target="_blank" rel="noreferrer"><WhatsAppIcon />Falar com a Lima no WhatsApp</a></Button>}
            </div>
            <div className="mt-4"><ShippingCalculator /></div>
            <div className="mt-4 rounded-md border border-border p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold"><Store className="h-4 w-4" />Vendido por {store.name}</p>
              <p className="text-muted-foreground">Loja física em {store.city}</p>
              <p className="mt-1 text-muted-foreground">{store.address} — {store.addressReference}</p>
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-link underline">Ver no mapa</a>
            </div>
            <div className="mt-4 rounded-md border border-border p-3 text-sm">
              <p className="mb-2 font-semibold">Meios de pagamento</p>
              <ul className="space-y-1">
                {pm.pix && <li className="flex items-center gap-2"><QrCode className="h-4 w-4 text-primary" />Pix</li>}
                {pm.payOnDelivery && <li className="flex items-center gap-2"><HandCoins className="h-4 w-4 text-primary" />Pagar na entrega</li>}
                {pm.card && <li className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" />Cartão de crédito</li>}
              </ul>
            </div>
          </aside>
        </div>

        <div className="mt-4 space-y-4 bg-card p-4 shadow-card sm:rounded-lg md:p-6">
          <Section title="O que você precisa saber sobre este produto">
            <ul className="space-y-2">{p.highlights.map((h) => <li key={h} className="flex gap-2"><Check className="h-5 w-5 shrink-0 text-success-strong" />{h}</li>)}</ul>
          </Section>
          <Section title="Características">
            <table className="w-full max-w-xl overflow-hidden rounded-md text-sm">
              <tbody>
                {[{ label: "Modelo", value: p.name }, ...p.specs, { label: "Cor", value: p.color }, { label: "Condição", value: p.condition }].map((s, i) => (
                  <tr key={s.label} className={i % 2 ? "bg-card" : "bg-muted"}><th scope="row" className="w-1/2 p-3 text-left font-semibold">{s.label}</th><td className="p-3">{s.value}</td></tr>
                ))}
              </tbody>
            </table>
          </Section>
          <Section title="Como funciona a entrega">
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex gap-2"><Zap className="h-5 w-5 shrink-0 text-success-strong" /><span><strong className="text-foreground">Frete grátis até {radius} km</strong> de Montes Claros, com entrega {s.delivery_estimate_text}.</span></li>
              <li className="flex gap-2"><Store className="h-5 w-5 shrink-0 text-primary" /><span><strong className="text-foreground">Retirada na loja grátis</strong> — {store.address}.</span></li>
              <li className="flex gap-2"><ShieldCheck className="h-5 w-5 shrink-0 text-primary" /><span>Mais longe? O frete é combinado com a loja.</span></li>
            </ul>
          </Section>
          {pm.payOnDelivery && (
            <Section title="Como funciona o pagamento na entrega">
              <p className="text-muted-foreground">Você só paga quando a moto chega. Na hora, escolha: {s.cod_methods.join(", ").toLowerCase()}. Válido para entregas até {s.pay_on_delivery_max_km} km da loja.</p>
            </Section>
          )}
          <Section title="Perguntas frequentes">
            <Accordion type="single" collapsible>
              <Faq q="Como pago?" a={`Você pode pagar ${[pm.pix && "no Pix (aprovação na hora)", pm.payOnDelivery && "na entrega", pm.card && "no cartão de crédito (pelo checkout seguro da Vega)"].filter(Boolean).join(", ")}. Se retirar, pode pagar na loja.`} />
              <Faq q="Posso retirar na loja?" a={`Sim, é grátis. A loja fica na ${store.address}, ${store.addressReference.toLowerCase()}.`} />
              <Faq q="Entregam na minha cidade?" a={`Entregamos com frete grátis até ${radius} km de Montes Claros. Calcule pelo CEP acima; acima disso, o frete é combinado com a loja.`} />
              <Faq q="Posso pagar na entrega?" a={s.cod_enabled ? `Sim, para entregas até ${s.pay_on_delivery_max_km} km da loja. Formas aceitas: ${s.cod_methods.join(", ")}.` : "No momento, não."} />
            </Accordion>
          </Section>
        </div>

        <section className="mt-6 px-4 sm:px-0">
          <h2 className="mb-3 text-xl font-semibold">Outras ofertas da Lima</h2>
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
            {others.map((o) => <div key={o.slug} className="w-64 shrink-0 snap-start sm:w-72"><ProductCard p={o} /></div>)}
          </div>
        </section>
      </main>
      <Footer />

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-border bg-card p-3 shadow-card-hover md:hidden">
        <div className="min-w-0"><p className="text-xl font-bold leading-none">{money(p.price)}</p><p className="text-xs text-success-strong">Frete grátis até {radius} km</p></div>
        <Button variant="buy" className="ml-auto h-12 flex-1" onClick={buy} disabled={p.stock < 1}>Comprar agora</Button>
      </div>
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="border-b border-border pb-6 last:border-0"><h2 className="mb-3 text-xl font-semibold">{title}</h2>{children}</section>
);
const Faq = ({ q, a }: { q: string; a: string }) => (
  <AccordionItem value={q}><AccordionTrigger className="text-base">{q}</AccordionTrigger><AccordionContent className="text-muted-foreground">{a}</AccordionContent></AccordionItem>
);

function Gallery({ p }: { p: Product }) {
  const imgs = [
    { src: p.images.studio, alt: `${p.name} na cor ${p.color.toLowerCase()}, foto de estúdio`, w: 1920, h: 1920 },
    { src: p.images.hero, alt: `${p.name} estacionada na rua`, w: 1920, h: 1085 },
  ];
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const track = useRef<HTMLDivElement>(null);
  return (
    <>
      <div className="hidden gap-3 md:flex">
        <div className="flex flex-col gap-2">
          {imgs.map((im, i) => (
            <button key={i} onMouseEnter={() => setActive(i)} onClick={() => setActive(i)} aria-label={`Ver imagem ${i + 1}`}
              className={`h-16 w-16 overflow-hidden rounded-md border-2 ${active === i ? "border-primary" : "border-border"}`}>
              <img src={im.src} alt="" width={64} height={64} loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
        <div className="relative aspect-square flex-1 cursor-zoom-in overflow-hidden rounded-md bg-muted"
          onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }}
          onMouseLeave={() => setZoom(null)}>
          <img src={(imgs[active] ?? imgs[0]!).src} alt={(imgs[active] ?? imgs[0]!).alt} width={1920} height={1920}
            className="h-full w-full object-contain transition-transform duration-100"
            style={zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} />
        </div>
      </div>
      <div className="md:hidden">
        <div ref={track} className="flex snap-x snap-mandatory overflow-x-auto" aria-label="Galeria de fotos"
          onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
          {imgs.map((im, i) => (
            <img key={i} src={im.src} alt={im.alt} width={im.w} height={im.h} loading={i ? "lazy" : "eager"} className="aspect-square w-full shrink-0 snap-center bg-muted object-contain" />
          ))}
        </div>
        <div className="mt-2 flex justify-center gap-1">
          {imgs.map((_, i) => (
            <button key={i} aria-label={`Ir para imagem ${i + 1}`} onClick={() => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: "smooth" })}
              className="flex h-11 w-11 items-center justify-center"><span className={`h-2.5 w-2.5 rounded-full ${active === i ? "bg-primary" : "bg-input"}`} /></button>
          ))}
        </div>
      </div>
    </>
  );
}
