import { Link } from "@tanstack/react-router";
import { useSettings, type LiveProduct } from "@/lib/api";
import { money } from "@/lib/format";
import { FreeShippingBadge, FullBadge } from "./Badges";

export function ProductCard({ p }: { p: LiveProduct }) {
  const s = useSettings();
  return (
    <Link to="/moto/$slug" params={{ slug: p.slug }}
      className="group flex flex-col overflow-hidden rounded-lg bg-card shadow-card transition-shadow hover:shadow-card-hover">
      <div className="aspect-square bg-muted">
        <img src={p.images.studio} alt={`${p.name} na cor ${p.color.toLowerCase()}, foto de estúdio`} width={600} height={600} loading="lazy" className="h-full w-full object-cover" />
      </div>
      <div className="flex flex-1 flex-col gap-1 border-t border-border p-4">
        <span className="text-xs font-semibold text-primary">{p.badge}</span>
        <h3 className="text-base text-foreground group-hover:text-link">{p.name}</h3>
        <p className="text-2xl font-bold text-foreground">{money(p.price)}</p>
        {s.pix_available && <p className="-mt-1 text-sm text-success-strong">no Pix</p>}
        <div className="mt-1 flex items-center gap-2"><FreeShippingBadge text={`Frete grátis até ${s.free_shipping_radius_km} km`} /><FullBadge /></div>
        {p.stock < 1 && <p className="text-sm font-semibold text-muted-foreground">Esgotado</p>}
        {s.cod_enabled && <p className="text-sm text-muted-foreground">Pague na entrega</p>}
        {p.stock <= 3 && p.stock > 0 && <p className="text-sm font-semibold text-primary">Últimas unidades</p>}
      </div>
    </Link>
  );
}
