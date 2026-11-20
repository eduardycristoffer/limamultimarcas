import { Link } from "@tanstack/react-router";
import type { Product } from "@/data/products";
import { money } from "@/lib/format";
import { FreeShippingBadge, FullBadge } from "./Badges";
import { paymentConfig } from "@/config/store";

export function ProductCard({ p }: { p: Product }) {
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
        {paymentConfig.payments.pix && <p className="-mt-1 text-sm text-success-strong">no Pix</p>}
        <div className="mt-1 flex items-center gap-2"><FreeShippingBadge /><FullBadge /></div>
        {paymentConfig.payments.payOnDelivery && <p className="text-sm text-muted-foreground">Pague na entrega</p>}
        {p.stock <= 3 && p.stock > 0 && <p className="text-sm font-semibold text-primary">Últimas unidades</p>}
      </div>
    </Link>
  );
}
