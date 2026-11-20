import { CreditCard, HandCoins, QrCode } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { cardPlan, useSettings, type LiveProduct } from "@/lib/api";
import { depositFor } from "@/lib/order-rules";
import { orList } from "@/lib/format";
import { moneyCents } from "./Price";

const pct = (n: number) => `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

/** "Meios de pagamento" do anúncio: à vista, sinal do pague na entrega e tabela do cartão com o total de cada parcela. */
export function PaymentSheet({ p, children }: { p: LiveProduct; children: React.ReactNode }) {
  const s = useSettings();
  const plan = cardPlan(p, s);
  const deposit = depositFor(p.price, s.deposit_cents);
  const codOn = s.cod_enabled && (deposit === 0 || s.deposit_available);
  return (
    <Drawer shouldScaleBackground={false}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="mx-auto max-h-[88vh] max-w-lg">
        <div className="overflow-y-auto px-4 pb-8">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="text-[20px] font-normal">Meios de pagamento</DrawerTitle>
            <DrawerDescription>{p.title}</DrawerDescription>
          </DrawerHeader>

          <section className="border-b border-line py-3">
            <h3 className="flex items-center gap-2 font-semibold"><QrCode className="h-5 w-5 text-primary" />À vista</h3>
            <p className="mt-1 text-[22px] font-light">{moneyCents(p.price)}</p>
            {s.pix_available && <p className="text-sm text-muted-foreground">No Pix, com aprovação na hora.</p>}
          </section>

          {codOn && (
            <section className="border-b border-line py-3">
              <h3 className="flex items-center gap-2 font-semibold"><HandCoins className="h-5 w-5 text-primary" />Pague na entrega</h3>
              {deposit > 0 ? (
                <p className="mt-1 text-sm">Reserve com <strong>{moneyCents(deposit)} no Pix</strong> e pague o restante, <strong>{moneyCents(p.price - deposit)}</strong>, quando a moto chegar, em {orList(s.cod_methods)}. O sinal é descontado do total.</p>
              ) : <p className="mt-1 text-sm">Você paga quando a moto chegar, em {orList(s.cod_methods)}.</p>}
              <p className="mt-1 text-xs text-muted-foreground">Para entregas até {s.pay_on_delivery_max_km} km de Montes Claros. Retirando na loja, vale a mesma regra.</p>
            </section>
          )}

          {plan.length > 0 && (
            <section className="py-3">
              <h3 className="flex items-center gap-2 font-semibold"><CreditCard className="h-5 w-5 text-primary" />Cartão de crédito</h3>
              <p className="mt-1 text-sm text-muted-foreground">Parcelado com acréscimo. Você conclui no checkout seguro da Vega.</p>
              <table className="mt-2 w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 font-normal">Parcelas</th><th className="py-1 font-normal">Total</th><th className="py-1 text-right font-normal">Acréscimo</th></tr></thead>
                <tbody>
                  {plan.map((i) => (
                    <tr key={i.n} className="border-t border-line">
                      <td className="py-2">{i.n}x {moneyCents(i.perCents)}</td>
                      <td className="py-2 text-muted-foreground">{moneyCents(i.totalCents)}</td>
                      <td className="py-2 text-right text-muted-foreground">{i.ratePct === 0 ? "à vista" : `+${pct(i.ratePct)}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
