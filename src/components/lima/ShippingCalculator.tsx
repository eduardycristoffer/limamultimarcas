import { useState } from "react";
import { Truck } from "lucide-react";
import { quoteShipping, useSettings, waLink } from "@/lib/api";
import type { ShippingQuote } from "@/lib/shipping";
import { maskCep, money } from "@/lib/format";

export function ShippingCalculator() {
  const s = useSettings();
  const [cep, setCep] = useState("");
  const [state, setState] = useState<{ status: "idle" | "loading" | "ok" | "error"; quote?: ShippingQuote; error?: string }>({ status: "idle" });
  const wa = waLink(s.whatsapp_number, "Olá! Quero saber o frete para o CEP " + cep);
  async function run(e: React.FormEvent) {
    e.preventDefault();
    setState({ status: "loading" });
    try {
      const r = await quoteShipping(cep);
      setState(r.ok ? { status: "ok", quote: r.quote } : { status: "error", error: r.error });
    } catch { setState({ status: "error", error: "Não conseguimos calcular o frete agora." }); }
  }
  const q = state.quote;
  return (
    <div className="rounded-md border border-border p-3">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Truck className="h-4 w-4" />Calcular frete e prazo</p>
      <form onSubmit={run} className="flex gap-2">
        <label htmlFor="cep-calc" className="sr-only">CEP</label>
        <input id="cep-calc" inputMode="numeric" placeholder="Seu CEP" value={cep} onChange={(e) => setCep(maskCep(e.target.value))}
          className="h-11 min-w-0 flex-1 rounded-md border border-input bg-card px-3" />
        <button type="submit" disabled={cep.length < 9 || state.status === "loading"} className="h-11 rounded-md px-4 text-sm font-semibold text-link hover:bg-muted disabled:opacity-50">
          {state.status === "loading" ? "Calculando..." : "Calcular"}
        </button>
      </form>
      <div aria-live="polite" className="mt-2 text-sm">
        {state.status === "error" && (
          <p className="text-muted-foreground">{state.error} Você pode <strong>retirar na loja</strong> grátis.{wa && <> Ou <a className="text-link underline" href={wa} target="_blank" rel="noreferrer">fale no WhatsApp</a>.</>}</p>
        )}
        {state.status === "ok" && q && (
          <div className="space-y-1">
            <p className="text-muted-foreground">{q.address.city}/{q.address.uf}{q.distanceKm != null && <> — a ~{q.distanceKm} km da loja</>}</p>
            {q.mode === "free" ? <p className="font-semibold text-success-strong">Frete grátis · chega {s.delivery_estimate_text}</p>
              : q.mode === "paid" && q.freightCents != null ? <p className="font-semibold">Frete: {money(q.freightCents)}</p>
              : q.mode === "arrange" ? <p className="font-semibold">Frete a combinar com a loja</p>
              : <p className="text-muted-foreground">Não conseguimos calcular a distância agora.</p>}
            <p className="text-muted-foreground">Retirar na loja: grátis</p>
          </div>
        )}
      </div>
    </div>
  );
}
