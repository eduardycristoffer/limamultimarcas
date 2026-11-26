import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, MapPin, Search, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import logo from "@/assets/logo-lima.png.asset.json";
import { WhatsAppIcon } from "@/components/lima/WhatsAppIcon";
import { mapsUrl } from "@/config/store";
import { useSettings, waLink } from "@/lib/api";
import { placeLabel, useDeliveryLocation } from "@/lib/location";
import { openLocationSheet } from "./LocationSheet";

const iconBtn = "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary-foreground hover:bg-white/10";
/** Logo horizontal branca (ícone + "LIMA MULTIMARCAS") para o cabeçalho vermelho no computador. */
const WORDMARK = "/brand/lima-logo-branca.png";

/**
 * Cabeçalho no padrão do app Mercado Livre, em vermelho Lima.
 * `home`: logo + busca. `page`: voltar + ícones (busca, WhatsApp, compartilhar).
 */
export function TopBar({ variant = "home", initialQuery = "", shareTitle }: { variant?: "home" | "page"; initialQuery?: string; shareTitle?: string }) {
  const s = useSettings();
  const wa = waLink(s.whatsapp_number, "Olá, Lima! Vim pelo site.");
  const router = useRouter();
  const navigate = useNavigate();
  const [q, setQ] = useState(initialQuery);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: shareTitle ?? document.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copiado!"); }
    } catch { /* cancelado */ }
  }
  const search = (
    <form role="search" className="flex min-w-0 flex-1" onSubmit={(e) => { e.preventDefault(); navigate({ to: "/", search: { q: q.trim() || undefined }, hash: "ofertas" }); }}>
      <label htmlFor="busca" className="sr-only">Buscar na Lima</label>
      <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-card px-3 shadow-sm md:h-11 md:rounded-md">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <input id="busca" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar na Lima" enterKeyHint="search"
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none" />
      </div>
    </form>
  );

  return (
    <header className="sticky top-0 z-30 bg-primary text-primary-foreground">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-2 md:h-16 md:gap-4 md:px-4">
        {variant === "page" ? (
          <>
            <button type="button" aria-label="Voltar" className={`${iconBtn} md:hidden`} onClick={() => (window.history.length > 1 ? router.history.back() : navigate({ to: "/" }))}>
              <ArrowLeft className="h-6 w-6" />
            </button>
            <Link to="/" className="hidden shrink-0 items-center md:flex" aria-label="Lima Multimarcas — início">
              <img src={WORDMARK} alt="Lima Multimarcas" width={130} height={40} className="h-10 w-auto" />
            </Link>
            <div className="hidden min-w-0 flex-1 md:flex">{search}</div>
            <div className="ml-auto flex items-center md:ml-0">
              <Link to="/" hash="busca" aria-label="Buscar" className={`${iconBtn} md:hidden`}><Search className="h-6 w-6" /></Link>
              {wa && <a href={wa} target="_blank" rel="noreferrer" aria-label="Falar no WhatsApp" className={iconBtn}><WhatsAppIcon className="h-6 w-6" /></a>}
              <button type="button" aria-label="Compartilhar" className={iconBtn} onClick={share}><Share2 className="h-6 w-6" /></button>
            </div>
          </>
        ) : (
          <>
            <Link to="/" className="flex shrink-0 items-center gap-2 pl-1" aria-label="Lima Multimarcas — início">
              <img src={logo.url} alt="" width={36} height={36} className="h-9 w-9 rounded-full bg-white object-contain p-0.5 md:hidden" />
              <img src={WORDMARK} alt="Lima Multimarcas" width={130} height={40} className="hidden h-10 w-auto md:block" />
            </Link>
            <div className="mx-1 flex min-w-0 flex-1">{search}</div>
            {wa && <a href={wa} target="_blank" rel="noreferrer" aria-label="Falar no WhatsApp" className={iconBtn}><WhatsAppIcon className="h-6 w-6" /></a>}
          </>
        )}
      </div>
    </header>
  );
}

/**
 * Faixa "📍 Enviar para Montes Claros - MG ›" logo abaixo do cabeçalho.
 * No computador, como no Mercado Livre, ganha os atalhos do lado direito.
 */
export function LocationBar() {
  const loc = useDeliveryLocation();
  const s = useSettings();
  const wa = waLink(s.whatsapp_number, "Olá, Lima! Vim pelo site.");
  const link = "whitespace-nowrap opacity-90 hover:opacity-100 hover:underline";
  return (
    <div className="bg-primary text-[13px] text-primary-foreground md:bg-[oklch(0.52_0.21_28.11)]">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-3 pb-2.5 md:px-4 md:py-2">
        <button type="button" onClick={openLocationSheet} className="flex min-w-0 items-center gap-1.5 text-left">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{loc ? <>Enviar para <strong className="font-semibold">{loc.street ? `${loc.street} · ` : ""}{placeLabel(loc)}</strong></> : "Informe seu CEP para ver o frete"}</span>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
        </button>
        <nav aria-label="Atalhos da loja" className="ml-auto hidden items-center gap-5 md:flex">
          <Link to="/" hash="ofertas" className={link}>Motos elétricas</Link>
          <Link to="/" hash="como-comprar" className={link}>Como comprar</Link>
          <a href={mapsUrl} target="_blank" rel="noreferrer" className={link}>Loja física</a>
          {wa && <a href={wa} target="_blank" rel="noreferrer" className={link}>Atendimento</a>}
        </nav>
      </div>
    </div>
  );
}
