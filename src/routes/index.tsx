import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Truck, HandCoins, QrCode } from "lucide-react";
import { Header } from "@/components/lima/Header";
import { Footer } from "@/components/lima/Footer";
import { ProductCard } from "@/components/lima/ProductCard";
import { OfferBadge } from "@/components/lima/Badges";
import { mapsUrl, store } from "@/config/store";
import { catalogQuery, settingsQuery, useProducts, useSettings } from "@/lib/api";
import { money } from "@/lib/format";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { q?: string | undefined } => ({ q: typeof s["q"] === "string" && s["q"] ? s["q"].slice(0, 80) : undefined }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(catalogQuery), context.queryClient.ensureQueryData(settingsQuery)]),
  errorComponent: () => <div className="p-10 text-center">Não conseguimos carregar a loja agora. Atualize a página.</div>,
  notFoundComponent: () => <div className="p-10 text-center">Página não encontrada.</div>,
  head: () => ({
    meta: [
      { title: "Lima Multimarcas — Motos elétricas em Montes Claros/MG" },
      { name: "description", content: "Scooter 500 W, Cappuccino e Foston GT6X com frete grátis até 100 km de Montes Claros, Pix e pagamento na entrega." },
      { property: "og:title", content: "Lima Multimarcas — Motos elétricas em Montes Claros" },
      { property: "og:description", content: "Frete grátis até 100 km, Pix e pague na entrega. Oferta de inauguração." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function Home() {
  const { q } = Route.useSearch();
  const products = useProducts();
  const settings = useSettings();
  const list = q ? products.filter((p) => norm(`${p.name} ${p.color} ${p.highlights.join(" ")}`).includes(norm(q))) : products;
  const featured = products.find((p) => p.slug === "cappuccino") ?? products[0];
  return (
    <div className="min-h-screen bg-background">
      <Header key={q} initialQuery={q ?? ""} />
      <div className="border-b border-border bg-card">
        <ul className="mx-auto grid max-w-6xl grid-cols-1 gap-2 px-4 py-3 text-sm sm:grid-cols-3">
          <li className="flex items-center gap-2"><Truck className="h-5 w-5 shrink-0 text-success-strong" />Frete grátis até {settings.free_shipping_radius_km} km de Montes Claros</li>
          <li className="flex items-center gap-2"><HandCoins className="h-5 w-5 shrink-0 text-primary" />Pague na entrega</li>
          {settings.pix_available && <li className="flex items-center gap-2"><QrCode className="h-5 w-5 shrink-0 text-primary" />Pix</li>}
        </ul>
      </div>

      {featured && <section className="bg-hero-gradient text-ink-foreground">
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 py-10 md:grid-cols-2 md:py-14">
          <div>
            <OfferBadge>Oferta de inauguração</OfferBadge>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-5xl">Motos elétricas da Lima, agora online</h1>
            <p className="mt-3 text-lg text-ink-muted">Zero gasolina, entrega rápida em Montes Claros e região.</p>
            <p className="mt-6 text-sm text-ink-muted">{featured.name} por</p>
            <p className="text-4xl font-extrabold">{money(featured.price)}</p>
            <Link to="/moto/$slug" params={{ slug: featured.slug }} className="mt-6 inline-flex h-12 items-center rounded-md bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary-hover">Ver a {featured.name}</Link>
          </div>
          <img src={featured.images.cut} alt={`${featured.name} verde-menta com baú traseiro`} width={720} height={720} className="mx-auto max-h-96 w-full object-contain" />
        </div>
      </section>}

      <main id="produtos" className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="mb-4 text-xl font-semibold">{q ? `Resultados para “${q}”` : "Ofertas da Lima"}</h2>
        {list.length === 0 ? (
          <div className="rounded-lg bg-card p-8 text-center shadow-card">
            <p className="font-semibold">Nenhuma moto encontrada.</p>
            <Link to="/" search={{ q: undefined }} className="mt-2 inline-block text-link underline">Ver todos os modelos</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
        )}

        <section className="mt-10 grid gap-6 rounded-lg bg-ink p-6 text-ink-foreground md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-2xl font-bold">Visite nossa loja</h2>
            <p className="mt-2 flex items-start gap-2 text-ink-muted"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />{store.address} — {store.addressReference}</p>
          </div>
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary-hover">Abrir no Google Maps</a>
        </section>
      </main>
      <Footer />
    </div>
  );
}
