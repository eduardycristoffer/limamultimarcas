import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo-lima.png.asset.json";
import { mapsUrl, store } from "@/config/store";
import { products } from "@/data/products";

export function Footer() {
  return (
    <footer className="mt-12 bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <img src={logo.url} alt="Logo Lima Multimarcas" width={56} height={56} loading="lazy" className="h-14 w-14 object-contain" />
          <p className="mt-3 font-bold">{store.name}</p>
          <p className="text-sm text-ink-muted">Motos elétricas em {store.city}</p>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-semibold">Endereço</p>
          <p className="text-ink-muted">{store.address}</p>
          <p className="text-ink-muted">{store.addressReference}</p>
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block underline">Ver no Google Maps</a>
        </div>
        <nav className="text-sm" aria-label="Modelos">
          <p className="mb-2 font-semibold">Modelos</p>
          <ul className="space-y-1">
            {products.map((p) => <li key={p.slug}><Link to="/moto/$slug" params={{ slug: p.slug }} className="text-ink-muted hover:text-ink-foreground">{p.name}</Link></li>)}
          </ul>
        </nav>
      </div>
      <p className="border-t border-ink-foreground/10 py-4 text-center text-xs text-ink-muted">© {new Date().getFullYear()} {store.name}</p>
    </footer>
  );
}
