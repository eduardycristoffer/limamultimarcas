import { createFileRoute, Link, notFound, useNavigate, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, CreditCard, HandCoins, QrCode, ShieldCheck, Store, Truck } from "lucide-react";
import { TopBar } from "@/components/ml/TopBar";
import { BottomNav, Full, HotBadge, OfficialStore, SiteFooter } from "@/components/ml/Chrome";
import { MediaGallery } from "@/components/ml/MediaGallery";
import { PaymentSheet } from "@/components/ml/PaymentSheet";
import { Price, moneyCents } from "@/components/ml/Price";
import { ProductTile } from "@/components/ml/ProductTile";
import { openLocationSheet } from "@/components/ml/LocationSheet";
import { WhatsAppIcon } from "@/components/lima/WhatsAppIcon";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import logo from "@/assets/logo-lima.png.asset.json";
import { getProduct } from "@/data/products";
import { mapsUrl, store } from "@/config/store";
import { cardPlan, catalogQuery, mergeCatalog, settingsQuery, useProducts, useSettings, waLink, type LiveProduct } from "@/lib/api";
import { depositFor } from "@/lib/order-rules";
import { placeLabel, useDeliveryLocation } from "@/lib/location";
import { setBuyIntent } from "@/lib/checkout-store";
import { track } from "@/lib/meta-pixel";
import { money, orList } from "@/lib/format";

export const Route = createFileRoute("/moto/$slug")({
  loader: async ({ params, context }) => {
    const [cat, s] = await Promise.all([context.queryClient.ensureQueryData(catalogQuery), context.queryClient.ensureQueryData(settingsQuery)]);
    const p = mergeCatalog(cat).find((x) => x.slug === params.slug);
    if (!p) throw notFound();
    return { slug: p.slug, price: p.price, stock: p.stock, radius: s.free_shipping_radius_km, site: s.site_url };
  },
  head: ({ loaderData }) => {
    const base = loaderData ? getProduct(loaderData.slug) : undefined;
    if (!base || !loaderData) return { meta: [{ title: "Moto não encontrada — Lima Multimarcas" }, { name: "robots", content: "noindex" }] };
    const p = { ...base, price: loaderData.price, stock: loaderData.stock };
    const title = `${p.title} | Lima Multimarcas`;
    const desc = `${p.name} por ${money(p.price)} à vista. ${p.highlights.join(", ")}. Frete grátis até ${loaderData.radius} km de Montes Claros e pague na entrega.`;
    const abs = (path: string) => (loaderData.site ? `${loaderData.site}${path}` : path);
    return {
      meta: [
        { title }, { name: "description", content: desc },
        { property: "og:title", content: title }, { property: "og:description", content: desc },
        { property: "og:type", content: "product" }, { property: "og:url", content: abs(`/moto/${p.slug}`) },
        ...(loaderData.site ? [{ property: "og:image", content: abs(p.images.street) }, { name: "twitter:image", content: abs(p.images.street) }] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: abs(`/moto/${p.slug}`) }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org", "@type": "Product", name: p.title, color: p.color, description: desc,
          image: [abs(p.images.white), abs(p.images.street), abs(p.images.studio)], brand: { "@type": "Brand", name: store.name },
          offers: { "@type": "Offer", price: (p.price / 100).toFixed(2), priceCurrency: "BRL", itemCondition: "https://schema.org/NewCondition",
            availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: abs(`/moto/${p.slug}`) },
        }),
      }],
    };
  },
  component: ProductPage,
  notFoundComponent: () => (
    <div className="min-h-screen bg-background"><TopBar variant="page" />
      <div className="mx-auto max-w-md p-10 text-center"><h1 className="text-xl">Moto não encontrada</h1>
        <Link to="/" className="mt-4 inline-block text-link">Ver todos os modelos</Link></div></div>
  ),
  errorComponent: ({ reset }: ErrorComponentProps) => (
    <div className="p-10 text-center"><p>Não conseguimos carregar esta moto.</p><button className="mt-3 text-link" onClick={reset}>Tentar de novo</button></div>
  ),
});

const Sep = () => <div className="h-2 bg-background md:hidden" aria-hidden />;
const Section = ({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) => (
  <section className={`bg-card px-4 py-5 md:mt-3 md:rounded-md md:px-6 ${className}`}><h2 className="mb-3 text-[20px] font-normal">{title}</h2>{children}</section>
);

function ProductPage() {
  const { slug } = Route.useLoaderData();
  const products = useProducts();
  const s = useSettings();
  const p: LiveProduct = products.find((x) => x.slug === slug) ?? { ...getProduct(slug)!, cardAvailable: false };
  const others = products.filter((o) => o.slug !== p.slug);
  useEffect(() => { track("ViewContent", { content_ids: [p.slug], content_type: "product", content_name: p.name, value: p.price / 100, currency: "BRL" }); }, [p.slug, p.name, p.price]);

  return (
    <div className="min-h-screen bg-background">
      <TopBar variant="page" shareTitle={p.title} />
      <nav aria-label="Você está em" className="mx-auto hidden max-w-6xl px-4 py-3 text-[13px] text-muted-foreground md:block">
        <Link to="/" className="text-link">Início</Link> › <Link to="/" hash="ofertas" className="text-link">{p.category}</Link> › {p.name}
      </nav>
      <main className="mx-auto max-w-6xl md:px-4">
        <div className="bg-card md:grid md:grid-cols-[1fr_380px] md:gap-8 md:rounded-md md:p-6">
          <div className="min-w-0"><MediaGallery p={p} /></div>
          <BuyColumn p={p} />
        </div>

        <Sep />
        {others.length > 0 && (
          <section className="bg-card py-5 md:mt-3 md:rounded-md">
            <h2 className="mb-3 px-4 text-[20px] font-normal md:px-6">Outras ofertas da Lima</h2>
            <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:px-6">{others.map((o) => <ProductTile key={o.slug} p={o} rail />)}</div>
          </section>
        )}

        <Sep />
        <Section title="Detalhes do produto">
          <ul className="space-y-3">{p.highlights.map((h) => <li key={h} className="flex gap-2 text-[15px]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" aria-hidden />{h}</li>)}</ul>
          <p className="mt-4 text-[15px] uppercase">{p.title}</p>
          <Accordion type="single" collapsible className="mt-1">
            <AccordionItem value="c" className="border-0">
              <AccordionTrigger className="py-3 text-[15px] font-normal text-link hover:no-underline">Ver características</AccordionTrigger>
              <AccordionContent>
                <table className="w-full overflow-hidden rounded-md text-sm">
                  <tbody>
                    {[{ label: "Modelo", value: p.name }, ...p.specs, { label: "Cor", value: p.color }, { label: "Condição", value: p.condition }].map((r, i) => (
                      <tr key={r.label} className={i % 2 ? "bg-card" : "bg-surface"}><th scope="row" className="w-1/2 p-3 text-left font-semibold">{r.label}</th><td className="p-3">{r.value}</td></tr>
                    ))}
                  </tbody>
                </table>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Section>

        <Sep />
        <HowToBuy p={p} />

        <Sep />
        <Section title="Perguntas frequentes">
          <Faqs p={p} />
        </Section>

        <Sep />
        <section className="bg-card px-4 py-5 md:mt-3 md:rounded-md md:px-6">
          <div className="flex items-center gap-3">
            <img src={logo.url} alt="" width={56} height={56} loading="lazy" className="h-14 w-14 rounded-full border border-border object-contain p-1" />
            <div><p className="text-[18px]">{store.name}</p><OfficialStore className="text-muted-foreground" /></div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Loja física · {store.address} · {store.addressReference}</p>
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center text-sm text-link">Como chegar na loja<ChevronRight className="h-4 w-4" /></a>
        </section>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}

function BuyColumn({ p }: { p: LiveProduct }) {
  const s = useSettings();
  const loc = useDeliveryLocation();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const plan = cardPlan(p, s);
  const max = plan[plan.length - 1];
  const deposit = depositFor(p.price, s.deposit_cents);
  const codOn = s.cod_enabled && (deposit === 0 || s.deposit_available);
  const wa = waLink(s.whatsapp_number, `Olá, Lima! Tenho interesse na ${p.name} (${money(p.price)}).`);
  const buy = () => { setBuyIntent({ slug: p.slug, quantity: qty }); navigate({ to: "/checkout" }); };

  return (
    <div className="px-4 pt-4 md:px-0 md:pt-0">
      <p className="text-[13px] text-muted-foreground">{p.condition}  |  Loja em Montes Claros/MG</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <HotBadge>{p.badge}</HotBadge>
        <Link to="/" hash="ofertas" className="text-[13px] text-link">{p.category}</Link>
      </div>
      <h1 className="mt-2 text-[18px] font-normal leading-snug md:text-[22px]">{p.title}</h1>

      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Price cents={p.price} size="xl" />
          <span className="rounded-[3px] bg-success px-1.5 py-1 text-[12px] font-bold uppercase leading-none text-success-foreground">À vista</span>
        </div>
        {max && max.n > 1 && <p className="mt-2 text-[16px]">ou {max.n}x {moneyCents(max.perCents)} <span className="text-[13px] text-muted-foreground">com acréscimo</span></p>}
        <PaymentSheet p={p}>
          <button type="button" className="mt-2 flex items-center gap-2 text-[15px] text-link">
            Meios de pagamento
            <span className="flex -space-x-1" aria-hidden>
              {[QrCode, ...(plan.length ? [CreditCard] : []), ...(codOn ? [HandCoins] : [])].map((I, i) => (
                <span key={i} className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card"><I className="h-3.5 w-3.5 text-foreground" /></span>
              ))}
            </span>
          </button>
        </PaymentSheet>
      </div>

      {codOn && (
        <PaymentSheet p={p}>
          <button type="button" className="mt-4 flex w-full items-center gap-3 rounded-md bg-primary-soft p-3 text-left">
            <HandCoins className="h-6 w-6 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1 text-[14px] leading-snug">
              <strong className="text-primary">Pague na entrega</strong>
              {deposit > 0 ? <> · reserve com <strong>{moneyCents(deposit)} no Pix</strong> e pague {moneyCents(p.price - deposit)} quando receber</> : <> · você paga quando a moto chegar</>}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          </button>
        </PaymentSheet>
      )}

      <p className="mt-4 text-[15px]">Cor: <strong className="font-semibold">{p.color}</strong></p>

      <div className="mt-4 space-y-1 text-[15px]">
        {!loc ? (
          <>
            <p><span className="font-semibold text-success-strong">Frete grátis</span> até {s.free_shipping_radius_km} km de Montes Claros <Full /></p>
            <button type="button" onClick={openLocationSheet} className="text-link">Calcular frete pelo CEP</button>
          </>
        ) : loc.mode === "free" ? (
          <>
            <p><span className="font-semibold text-success-strong">Chegará grátis</span> {s.delivery_estimate_text} <Full /></p>
            <p className="text-[14px] text-muted-foreground">{loc.source === "cep" && loc.street ? `${loc.street}, ` : ""}{placeLabel(loc)}{loc.source === "ip" ? " (aproximado)" : ""}</p>
            <button type="button" onClick={openLocationSheet} className="text-link">{loc.source === "ip" ? "Confirmar pelo CEP" : "Alterar endereço"}</button>
          </>
        ) : loc.mode === "paid" ? (
          <>
            <p>Frete para {placeLabel(loc)}: <strong>{moneyCents(Math.max(0, Math.round(((loc.distanceKm ?? 0) - s.free_shipping_radius_km) * (s.extra_km_price_cents ?? 0))))}</strong></p>
            <button type="button" onClick={openLocationSheet} className="text-link">Alterar endereço</button>
          </>
        ) : (
          <>
            <p>Entrega a combinar com a loja</p>
            <p className="text-[14px] text-muted-foreground">{placeLabel(loc)}{loc.source === "ip" ? " (aproximado)" : ""}</p>
            <button type="button" onClick={openLocationSheet} className="text-link">Ver formas de entrega</button>
          </>
        )}
        <p className="flex items-center gap-1.5 pt-1 text-[14px]"><Store className="h-4 w-4 text-success-strong" aria-hidden /><span><span className="font-semibold text-success-strong">Retire grátis</span> na loja, {store.address.split(" — ")[0]}</span></p>
      </div>

      <p className="mt-5 text-[15px] font-semibold">{p.stock > 0 ? "Estoque disponível" : "Sem estoque no momento"}</p>
      {p.stock > 0 && p.stock <= 3 && <p className="text-[13px] font-semibold text-primary">Últimas unidades</p>}
      {p.stock > 0 && (
        <label className="relative mt-3 flex h-14 items-center rounded-md bg-surface px-4 text-[15px]">
          <span>Quantidade: <strong className="font-semibold">{qty}</strong> <span className="text-muted-foreground">({p.stock > 1 ? `+${p.stock} disponíveis` : "1 disponível"})</span></span>
          <ChevronDown className="ml-auto h-5 w-5 text-link" aria-hidden />
          <select aria-label="Quantidade" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="absolute inset-0 cursor-pointer opacity-0">
            {Array.from({ length: Math.min(p.stock, 10) }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} {i ? "unidades" : "unidade"}</option>)}
          </select>
        </label>
      )}

      <div className="mt-4 space-y-2">
        <button type="button" onClick={buy} disabled={p.stock < 1} className="h-12 w-full rounded-md bg-primary text-[16px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50">Comprar agora</button>
        {wa && <a href={wa} target="_blank" rel="noreferrer" className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary-soft text-[16px] font-semibold text-primary"><WhatsAppIcon />Tirar dúvidas no WhatsApp</a>}
      </div>

      <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
        <img src={logo.url} alt="" width={48} height={48} loading="lazy" className="h-12 w-12 rounded-full border border-border object-contain p-1" />
        <div className="text-[15px]"><OfficialStore /><p className="text-[13px] text-muted-foreground">Loja física em {store.city}</p></div>
      </div>
      <ul className="mt-4 space-y-3 pb-5 text-[14px] text-muted-foreground">
        {s.pix_available && <li className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0" aria-hidden /><span><span className="text-link">Compra segura.</span> O Pix é gerado pela Vega Checkout em nome da loja.</span></li>}
        {codOn && <li className="flex gap-3"><HandCoins className="h-5 w-5 shrink-0" aria-hidden /><span><span className="text-link">Pague na entrega.</span> {deposit > 0 ? `Só ${moneyCents(deposit)} de sinal agora, o resto quando receber.` : "Você só paga quando receber."}</span></li>}
        <li className="flex gap-3"><Truck className="h-5 w-5 shrink-0" aria-hidden /><span><span className="text-link">Entrega.</span> Frete grátis até {s.free_shipping_radius_km} km de Montes Claros.</span></li>
      </ul>
    </div>
  );
}

function HowToBuy({ p }: { p: LiveProduct }) {
  const s = useSettings();
  const deposit = depositFor(p.price, s.deposit_cents);
  const codOn = s.cod_enabled && (deposit === 0 || s.deposit_available);
  const plan = cardPlan(p, s);
  const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
    <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground">{n}</span><span className="text-[15px]">{children}</span></li>
  );
  return (
    <Section title="Como funciona a compra">
      <div className="space-y-5">
        {codOn && (
          <div>
            <h3 className="mb-2 flex items-center gap-2 font-semibold"><HandCoins className="h-5 w-5 text-primary" />Pague na entrega</h3>
            <ol className="space-y-2">
              <Step n={1}>Toque em <strong>Comprar agora</strong>, informe seu CEP e escolha <strong>Pague na entrega</strong>.</Step>
              {deposit > 0 ? <Step n={2}>Pague o sinal de <strong>{moneyCents(deposit)} no Pix</strong>. Sua moto fica reservada na hora.</Step> : <Step n={2}>Confirme o pedido. Sua moto fica reservada.</Step>}
              <Step n={3}>A Lima entra em contato para combinar o dia da entrega.</Step>
              <Step n={4}>Receba a moto e pague o restante{deposit > 0 ? <> (<strong>{moneyCents(p.price - deposit)}</strong>)</> : null} em {orList(s.cod_methods)}.</Step>
            </ol>
            <p className="mt-2 text-[13px] text-muted-foreground">Válido para entregas até {s.pay_on_delivery_max_km} km de Montes Claros. Retirando na loja, funciona do mesmo jeito.</p>
          </div>
        )}
        {s.pix_available && (
          <div>
            <h3 className="mb-2 flex items-center gap-2 font-semibold"><QrCode className="h-5 w-5 text-primary" />Pix à vista</h3>
            <p className="text-[15px]">Pague {moneyCents(p.price)} pelo QR Code ou copia-e-cola. A aprovação é na hora e a página do pedido atualiza sozinha.</p>
          </div>
        )}
        {plan.length > 0 && (
          <div>
            <h3 className="mb-2 flex items-center gap-2 font-semibold"><CreditCard className="h-5 w-5 text-primary" />Cartão em até {plan[plan.length - 1]!.n}x</h3>
            <p className="text-[15px]">Você conclui no checkout seguro da Vega. Parcelado tem acréscimo: veja a tabela em <em>Meios de pagamento</em>.</p>
          </div>
        )}
      </div>
    </Section>
  );
}

function Faqs({ p }: { p: LiveProduct }) {
  const s = useSettings();
  const deposit = depositFor(p.price, s.deposit_cents);
  const items = [
    { q: "Entregam na minha cidade?", a: `Entregamos com frete grátis até ${s.free_shipping_radius_km} km de Montes Claros. Mais longe, o frete é combinado com a loja. Informe seu CEP para conferir.` },
    { q: "Como funciona o pague na entrega?", a: deposit > 0 ? `Você paga ${moneyCents(deposit)} de sinal no Pix para reservar e o restante quando a moto chegar. O sinal é descontado do total.` : "Você paga quando a moto chegar." },
    { q: "Posso retirar na loja?", a: `Sim, sem custo. A loja fica na ${store.address}, ${store.addressReference.toLowerCase()}.` },
    { q: "O preço anunciado é à vista?", a: `Sim. ${moneyCents(p.price)} é o valor à vista. No cartão parcelado há acréscimo, mostrado em Meios de pagamento.` },
  ];
  return (
    <Accordion type="single" collapsible>
      {items.map((f) => (
        <AccordionItem key={f.q} value={f.q}><AccordionTrigger className="text-left text-[15px] font-normal">{f.q}</AccordionTrigger><AccordionContent className="text-[15px] text-muted-foreground">{f.a}</AccordionContent></AccordionItem>
      ))}
    </Accordion>
  );
}
