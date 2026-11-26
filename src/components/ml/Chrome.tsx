import { Link } from "@tanstack/react-router";
import { BadgeCheck, Bike, Home, MapPin, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { mapsUrl, store } from "@/config/store";
import { useSettings, waLink } from "@/lib/api";
import { products } from "@/data/products";
import { cn } from "@/lib/utils";

/** Barra inferior do app (só no celular): Início, Motos, Atendimento, Loja. */
export function BottomNav({ active }: { active?: "inicio" | "motos" }) {
  const s = useSettings();
  const wa = waLink(s.whatsapp_number, "Olá, Lima! Vim pelo site.");
  const item = "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] text-foreground/80";
  const on = "text-primary font-semibold";
  return (
    <nav aria-label="Navegação principal" className="pb-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-card md:hidden">
      <Link to="/" className={cn(item, active === "inicio" && on)}><Home className="h-6 w-6" />Início</Link>
      <Link to="/" hash="ofertas" className={cn(item, active === "motos" && on)}><Bike className="h-6 w-6" />Motos</Link>
      {wa ? <a href={wa} target="_blank" rel="noreferrer" className={item}><MessageCircle className="h-6 w-6" />Atendimento</a>
        : <a href={mapsUrl} target="_blank" rel="noreferrer" className={item}><MessageCircle className="h-6 w-6" />Atendimento</a>}
      <a href={mapsUrl} target="_blank" rel="noreferrer" className={item}><MapPin className="h-6 w-6" />Loja</a>
    </nav>
  );
}

/** Selo "Loja oficial Lima ✓". */
export function OfficialStore({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[13px]", className)}>
      Loja oficial <span className="text-link">Lima Multimarcas</span><BadgeCheck className="h-4 w-4 fill-link text-card" aria-label="verificada" />
    </span>
  );
}

/** Selo laranja (no lugar de "MAIS VENDIDO"). */
export const HotBadge = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={cn("inline-block rounded-[3px] bg-hot px-1.5 py-[3px] text-[11px] font-bold uppercase leading-none tracking-wide text-hot-foreground", className)}>{children}</span>
);

/** "⚡FULL" verde. */
export const Full = ({ className }: { className?: string }) => (
  <span className={cn("inline-flex items-center text-[13px] font-extrabold italic tracking-tight text-success-strong", className)} aria-label="Envio FULL">
    <svg viewBox="0 0 12 16" className="mr-0.5 h-3.5 w-2.5 fill-current" aria-hidden><path d="M7.5 0 0 9h4.5L3 16l9-10H7.2L7.5 0Z" /></svg>FULL
  </span>
);

export function SiteFooter() {
  return (
    <footer className="mt-6 border-t border-border bg-card pb-20 text-[13px] text-muted-foreground md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:grid-cols-3">
        <div>
          <img src="/brand/lima-logo.png" alt="Lima Multimarcas" width={156} height={48} loading="lazy" className="h-12 w-auto" />
          <p className="mt-2">Motos elétricas em {store.city}</p>
        </div>
        <div>
          <p className="mb-1 font-semibold text-foreground">Loja física</p>
          <p>{store.address}</p><p>{store.addressReference}</p>
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-link">Como chegar</a>
        </div>
        <nav aria-label="Modelos">
          <p className="mb-1 font-semibold text-foreground">Modelos</p>
          <ul className="space-y-1">{products.map((p) => <li key={p.slug}><Link to="/moto/$slug" params={{ slug: p.slug }} className="hover:text-link">{p.name}</Link></li>)}</ul>
        </nav>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-3">© {new Date().getFullYear()} {store.name} · <Link to="/privacidade" className="hover:text-link">Privacidade</Link></p>
      </div>
    </footer>
  );
}
