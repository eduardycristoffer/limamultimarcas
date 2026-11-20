import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Clock, Copy, Store } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/lima/Header";
import { Footer } from "@/components/lima/Footer";
import { WhatsAppIcon } from "@/components/lima/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { getOrder, getPaymentStatus, IS_DEMO, type Order } from "@/lib/api";
import { getProduct } from "@/data/products";
import { money } from "@/lib/format";
import { mapsUrl, store, whatsappLink } from "@/config/store";

export const Route = createFileRoute("/pedido/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Pedido ${params.id} — Lima Multimarcas` },
      { name: "description", content: "Acompanhe seu pedido na Lima Multimarcas." },
      { property: "og:title", content: "Seu pedido — Lima Multimarcas" },
      { property: "og:description", content: "Confirmação do pedido." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  useEffect(() => { getOrder(id).then(setOrder).catch(() => setOrder(null)); }, [id]);
  useEffect(() => {
    if (order?.status !== "awaiting_payment") return;
    const t = setInterval(async () => { const s = await getPaymentStatus(id); if (s && s !== order.status) setOrder({ ...order, status: s }); }, 3000);
    return () => clearInterval(t);
  }, [order, id]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6">
        {order === undefined && <div className="h-64 animate-pulse rounded-lg bg-card" />}
        {order === null && <div className="rounded-lg bg-card p-10 text-center shadow-card"><p className="font-semibold">Pedido não encontrado.</p><Link to="/" className="mt-3 inline-block text-link underline">Voltar à loja</Link></div>}
        {order && <OrderView o={order} />}
      </main>
      <Footer />
    </div>
  );
}

function OrderView({ o }: { o: Order }) {
  const p = getProduct(o.productSlug);
  const d = o.delivery;
  const wa = whatsappLink(`Olá, Lima! Fiz o pedido ${o.id}: ${o.quantity}x ${p?.name} — total ${money(o.total)}. Nome: ${o.customer.name}.`);
  return (
    <div className="space-y-4">
      {IS_DEMO && <p className="rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground">Modo demonstração — pagamentos ainda não conectados</p>}
      <section className="rounded-lg bg-card p-6 shadow-card">
        <p className="text-sm text-muted-foreground">Pedido nº <strong className="text-foreground">{o.id}</strong></p>
        {o.payment.method === "pix" ? (
          <>
            <h1 className="mt-2 text-2xl font-bold">Pague com Pix para confirmar</h1>
            <p className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${o.status === "paid" ? "bg-success text-success-foreground" : "bg-muted"}`} aria-live="polite">
              {o.status === "paid" ? <><CheckCircle2 className="h-4 w-4" />Pagamento aprovado</> : <><Clock className="h-4 w-4" />Aguardando pagamento</>}
            </p>
            <div className="mt-5 grid gap-6 sm:grid-cols-[auto_1fr]">
              <div className="mx-auto rounded-md border border-border bg-card p-3"><QRCodeSVG value={o.pix!.copyPaste} size={200} aria-label="QR Code Pix" /></div>
              <div>
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  <li>Abra o app do seu banco e escolha Pix.</li>
                  <li>Escaneie o QR Code ou use o código copia-e-cola.</li>
                  <li>Confira o valor de <strong>{money(o.total)}</strong> e confirme.</li>
                </ol>
                <Button variant="buy" className="mt-4 h-12 w-full" onClick={() => navigator.clipboard.writeText(o.pix!.copyPaste).then(() => toast.success("Código Pix copiado!"), () => toast.error("Não foi possível copiar."))}>
                  <Copy />Copiar código Pix
                </Button>
                <p className="mt-2 break-all rounded bg-muted p-2 text-xs text-muted-foreground">{o.pix!.copyPaste}</p>
              </div>
            </div>
          </>
        ) : d.method === "pickup" ? (
          <>
            <h1 className="mt-2 text-2xl font-bold">Pedido recebido! Sua moto espera por você</h1>
            <p className="mt-2 flex gap-2 text-muted-foreground"><Store className="h-5 w-5 shrink-0 text-primary" />Retire na {store.address} — {store.addressReference}. O horário será combinado com a loja.</p>
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-link underline">Ver no Google Maps</a>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-bold">Pedido recebido!</h1>
            <p className="mt-2 text-muted-foreground">A Lima entrará em contato para combinar a entrega. Você paga na chegada{o.payment.onDeliveryMethod ? ` com ${o.payment.onDeliveryMethod.toLowerCase()}` : ""}.</p>
          </>
        )}
        {wa && o.payment.method !== "pix" && <Button asChild variant="buyOutline" className="mt-4 h-12"><a href={wa} target="_blank" rel="noreferrer"><WhatsAppIcon />Enviar pedido pelo WhatsApp</a></Button>}
      </section>

      <section className="rounded-lg bg-card p-6 shadow-card">
        <h2 className="mb-3 text-lg font-semibold">Resumo</h2>
        {p && <div className="flex gap-3"><img src={p.images.studio} alt={p.name} width={64} height={64} loading="lazy" className="h-16 w-16 rounded bg-muted object-cover" /><div><p className="font-semibold">{p.name}</p><p className="text-sm text-muted-foreground">Quantidade: {o.quantity}</p></div></div>}
        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(o.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Frete</dt><dd>{d.shippingPrice === 0 ? "Grátis" : d.shippingPrice == null ? "A combinar" : money(d.shippingPrice)}</dd></div>
          <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{money(o.total)}</dd></div>
        </dl>
        <h3 className="mt-4 font-semibold">{d.method === "pickup" ? "Retirada" : "Endereço de entrega"}</h3>
        <p className="text-sm text-muted-foreground">{d.method === "pickup" ? store.address : `${d.street}, ${d.number}${d.complement ? ` — ${d.complement}` : ""} · ${d.district} · ${d.city}/${d.uf}`}</p>
      </section>
    </div>
  );
}
