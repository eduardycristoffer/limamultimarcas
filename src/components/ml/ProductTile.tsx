import { Link } from "@tanstack/react-router";
import { cardPlan, useSettings, type LiveProduct } from "@/lib/api";
import { useDeliveryLocation } from "@/lib/location";
import { cn } from "@/lib/utils";
import { Full, HotBadge } from "./Chrome";
import { Price, moneyCents } from "./Price";

/** Card de produto no padrão Mercado Livre (grade ou trilho horizontal). */
export function ProductTile({ p, rail = false }: { p: LiveProduct; rail?: boolean }) {
  const s = useSettings();
  const loc = useDeliveryLocation();
  const plan = cardPlan(p, s);
  const max = plan[plan.length - 1];
  const freeHere = !loc || loc.mode === "free";
  return (
    <Link to="/moto/$slug" params={{ slug: p.slug }}
      className={cn("group flex flex-col overflow-hidden rounded-md bg-card shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition-shadow hover:shadow-[0_6px_16px_rgba(0,0,0,0.14)]", rail ? "w-[164px] shrink-0 snap-start sm:w-[200px]" : "")}>
      <div className="relative aspect-square border-b border-line bg-card">
        <img src={p.images.white} alt={`${p.title}`} width={600} height={600} loading="lazy" className="h-full w-full object-contain p-2" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div><HotBadge className="whitespace-nowrap">Inauguração</HotBadge></div>
        <h3 className="line-clamp-2 text-[14px] leading-snug text-foreground group-hover:text-link">{p.title}</h3>
        {p.reviews && (
          <p className="flex items-center gap-1 text-[12px] text-muted-foreground" aria-label={`Nota ${p.reviews.rating} no ${p.reviews.source}, ${p.reviews.total} avaliações`}>
            <span className="text-foreground">{p.reviews.rating.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}</span>
            <span className="text-link" aria-hidden>★</span>({p.reviews.total})
          </p>
        )}
        <Price cents={p.price} size={rail ? "sm" : "md"} className="mt-1" />
        <p className="text-[12px] text-muted-foreground">à vista</p>
        {max && max.n > 1 && <p className="text-[13px] text-foreground">ou {max.n}x {moneyCents(max.perCents)}</p>}
        {p.stock < 1 ? <p className="text-[13px] font-semibold text-muted-foreground">Esgotado</p> : (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px]">
            {freeHere ? <span className="font-semibold text-success-strong">Frete grátis</span> : <span className="text-muted-foreground">Frete a combinar</span>}
            <Full />
          </p>
        )}
      </div>
    </Link>
  );
}
