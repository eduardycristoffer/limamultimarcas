import { useState, useSyncExternalStore } from "react";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { maskCep } from "@/lib/format";
import { quoteShipping, useSettings } from "@/lib/api";
import { locationFromQuote, placeLabel, setDeliveryLocation, useDeliveryLocation } from "@/lib/location";

let open = false;
const subs = new Set<() => void>();
const setOpen = (v: boolean) => { open = v; subs.forEach((f) => f()); };
/** Abre a folha "Onde você quer receber?" de qualquer lugar da loja. */
export const openLocationSheet = () => setOpen(true);
const useOpen = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => open, () => false);

/** Montado uma vez no layout. */
export function LocationSheetHost() {
  const isOpen = useOpen();
  return (
    <Drawer open={isOpen} onOpenChange={setOpen} shouldScaleBackground={false}>
      <DrawerContent className="mx-auto max-w-lg">
        {isOpen && <LocationForm onDone={() => setOpen(false)} />}
      </DrawerContent>
    </Drawer>
  );
}

function LocationForm({ onDone }: { onDone: () => void }) {
  const loc = useDeliveryLocation();
  const s = useSettings();
  const [cep, setCep] = useState(loc?.cep ? maskCep(loc.cep) : "");
  const [state, setState] = useState<{ status: "idle" | "loading" | "error"; error?: string }>({ status: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState({ status: "loading" });
    try {
      const r = await quoteShipping(cep);
      if (!r.ok) return setState({ status: "error", error: r.error });
      if (r.quote.mode === "unknown") return setState({ status: "error", error: "Não conseguimos calcular a distância para esse CEP agora." });
      setDeliveryLocation(locationFromQuote(r.quote));
      onDone();
    } catch { setState({ status: "error", error: "Não conseguimos consultar o CEP agora. Tente de novo." }); }
  }

  return (
    <div className="px-4 pb-6">
      <DrawerHeader className="px-0 text-left">
        <DrawerTitle className="text-[20px] font-normal">Onde você quer receber?</DrawerTitle>
        <DrawerDescription>Informe seu CEP para ver o frete e o prazo de entrega.</DrawerDescription>
      </DrawerHeader>
      {loc && (
        <p className="mb-3 flex items-start gap-2 rounded-md bg-surface p-3 text-sm">
          {loc.source === "ip" ? <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-link" /> : <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-link" />}
          <span>{loc.source === "ip" ? <>Pelo seu acesso, parece que você está em <strong>{placeLabel(loc)}</strong>. Confirme com o CEP.</> : <>Enviando para <strong>{loc.street ? `${loc.street}, ` : ""}{placeLabel(loc)}</strong></>}</span>
        </p>
      )}
      <form onSubmit={submit} className="flex gap-2">
        <label htmlFor="cep-sheet" className="sr-only">CEP</label>
        <input id="cep-sheet" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={cep} onChange={(e) => setCep(maskCep(e.target.value))} autoFocus
          className="h-12 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-[16px] focus:border-link focus:outline-none" />
        <button type="submit" disabled={cep.length < 9 || state.status === "loading"}
          className="flex h-12 min-w-28 items-center justify-center rounded-md bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-50">
          {state.status === "loading" ? <Loader2 className="h-5 w-5 animate-spin" /> : "Usar"}
        </button>
      </form>
      {state.status === "error" && <p className="mt-2 text-sm text-destructive" role="alert">{state.error}</p>}
      <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-link">Não sei meu CEP</a>
      <p className="mt-4 text-xs text-muted-foreground">Frete grátis até {s.free_shipping_radius_km} km de Montes Claros. Mais longe, o frete é combinado com a loja.</p>
    </div>
  );
}
