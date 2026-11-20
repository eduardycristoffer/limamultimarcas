import { Link, useNavigate } from "@tanstack/react-router";
import { MapPin, Search } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo-lima.png.asset.json";
import { whatsappLink } from "@/config/store";
import { WhatsAppIcon } from "./WhatsAppIcon";

export function Header({ initialQuery = "" }: { initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery);
  const navigate = useNavigate();
  const wa = whatsappLink("Olá, Lima! Vim pelo site.");
  return (
    <header className="bg-ink text-ink-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Lima Multimarcas — início">
          <img src={logo.url} alt="Logo Lima Multimarcas" width={44} height={44} className="h-11 w-11 object-contain" />
          <span className="hidden text-lg font-extrabold leading-tight sm:block">Lima<br /><span className="text-xs font-medium text-ink-muted">Multimarcas</span></span>
        </Link>
        <form
          role="search"
          className="order-3 flex w-full min-w-0 sm:order-none sm:flex-1"
          onSubmit={(e) => { e.preventDefault(); navigate({ to: "/", search: { q: q.trim() || undefined }, hash: "produtos" }); }}
        >
          <label htmlFor="busca" className="sr-only">Buscar motos elétricas</label>
          <input id="busca" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar motos elétricas..."
            className="h-11 min-w-0 flex-1 rounded-l-md bg-card px-4 text-foreground placeholder:text-muted-foreground" />
          <button type="submit" aria-label="Buscar" className="flex h-11 w-12 items-center justify-center rounded-r-md bg-primary text-primary-foreground hover:bg-primary-hover">
            <Search className="h-5 w-5" />
          </button>
        </form>
        <div className="ml-auto flex items-center gap-4 sm:ml-0">
          <span className="hidden items-center gap-1 text-sm text-ink-muted md:flex"><MapPin className="h-4 w-4" />Entregamos em Montes Claros e região</span>
          {wa && <a href={wa} target="_blank" rel="noreferrer" aria-label="Falar no WhatsApp" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-ink-foreground/10"><WhatsAppIcon className="h-6 w-6" /></a>}
        </div>
      </div>
      <p className="flex items-center gap-1 px-4 pb-2 text-xs text-ink-muted md:hidden"><MapPin className="h-3.5 w-3.5" />Entregamos em Montes Claros e região</p>
    </header>
  );
}
