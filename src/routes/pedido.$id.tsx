import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Clock, Copy, Store, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/lima/Header";
import { Footer } from "@/components/lima/Footer";
import { WhatsAppIcon } from "@/components/lima/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { catalogQuery, getOrderPublic, settingsQuery, useSettings, waLink, type PublicOrder } from "@/lib/api";
import { getProduct } from "@/data/products";
import { money } from "@/lib/format";
import { mapsUrl, store } from "@/config/store";

const FINAL = new Set(["pago", "recusado", "expirado", "estornado", "entregue", "cancelado"]);

export const Route = createFileRoute("/pedido/$id")({
  validateSearch: (s: Record<string, unknown>): { t?: string | undefined } => ({ t: typeof s["t"] === "string" ? s["t"].slice(0, 64) : undefined }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(catalogQuery), context.queryClient.ensureQueryData(settingsQuery)]),
  errorComponent: () => <div className="p-10 text-center">Não conseguimos carregar o pedido. Atualize a página.</div>,
  notFoundComponent: () => <div className="p-10 text-center">Pedido não encontrado.</div>,
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
  const { t } = Route.useSearch();
  const [order, setOrder] = useState<PublicOrder | null | undefined>(undefined);
  useEffect(() => {
    if (!t) { setOrder(null); return; }
    let stop = false; let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const o = await getOrderPublic(id, t);
        if (stop) return;
        setOrder(o);
        if (o && o.status === "aguardando_pagamento") timer = setTimeout(tick, 5000);
      } catch { if (!stop) { setOrder((prev) => prev ?? null); timer = setTimeout(tick, 10000); } }
    };
    tick();
    return () => { stop = true; clearTimeout(timer); };
  }, [id, t]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6">
        {order === undefined && <div className="h-64 animate-pulse rounded-lg bg-card" aria-label="Carregando pedido" />}
        {order === null && <div className="rounded-lg bg-card p-10 text-center shadow-card"><p className="font-semibold">Pedido não encontrado.</p><p className="mt-1 text-sm text-muted-foreground">Use o link completo que apareceu ao finalizar a compra.</p><Link to="/" className="mt-3 inline-block text-link underline">Voltar à loja</Link></div>}
        {order && <OrderView o={order} />}
      </main>
      <Footer />
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "pago" || status === "entregue") return <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-success px-3 py-1 text-sm font-semibold text-success-foreground" aria-live="polite"><CheckCircle2 className="h-4 w-4" />{status === "pago" ? "Pagamento aprovado" : "Entregue"}</p>;
  if (FINAL.has(status)) return <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground" aria-live="polite"><XCircle className="h-4 w-4" />{{ recusado: "Pagamento recusado", expirado: "Pix expirado", estornado: "Pagamento estornado", cancelado: "Pedido cancelado" }[status] ?? status}</p>;
  return <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm font-semibold" aria-live="polite"><Clock className="h-4 w-4" />Aguardando pagamento</p>;
}

function OrderView({ o }: { o: PublicOrder }) {
  const s = useSettings();
  const p = getProduct(o.productSlug);
  const a = o.address;
  const wa = waLink(s.whatsapp_number, `Olá, Lima! Fiz o pedido ${o.orderNumber}: ${o.quantity}x ${o.productName} — total ${money(o.totalCents)}.`);
  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-card p-6 shadow-card">
        <p className="text-sm text-muted-foreground">Pedido nº <strong className="text-foreground">{o.orderNumber}</strong></p>
        {o.paymentMethod === "pix" ? (
          <>
            <h1 className="mt-2 text-2xl font-bold">{o.status === "pago" ? `Obrigado, ${o.customerName}! Pagamento confirmado` : "Pague com Pix para confirmar"}</h1>
            <StatusPill status={o.status} />
            {o.status === "aguardando_pagamento" && o.pixCopyPaste && (
              <div className="mt-5 grid gap-6 sm:grid-cols-[auto_1fr]">
                <div className="mx-auto rounded-md border border-border bg-card p-3"><QRCodeSVG value={o.pixCopyPaste} size={200} aria-label="QR Code Pix" /></div>
                <div>
                  <ol className="list-decimal space-y-1 pl-5 text-sm">
                    <li>Abra o app do seu banco e escolha Pix.</li>
                    <li>Escaneie o QR Code ou use o código copia-e-cola.</li>
                    <li>Confira o valor de <strong>{money(o.totalCents)}</strong> e confirme.</li>
                  </ol>
                  <Button variant="buy" className="mt-4 h-12 w-full" onClick={() => navigator.clipboard.writeText(o.pixCopyPaste!).then(() => toast.success("Código Pix copiado!"), () => toast.error("Não foi possível copiar."))}>
                    <Copy />Copiar código Pix
                  </Button>
                  <p className="mt-2 break-all rounded bg-muted p-2 text-xs text-muted-foreground">{o.pixCopyPaste}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Esta página atualiza sozinha quando o pagamento for aprovado.</p>
                </div>
              </div>
            )}
          </>
        ) : o.paymentMethod === "cartao_vega" ? (
          <>
            <h1 className="mt-2 text-2xl font-bold">Pagamento com cartão</h1>
            <StatusPill status={o.status} />
            <p className="mt-2 text-muted-foreground">O pagamento é feito no checkout seguro da Vega. Assim que for aprovado, a Lima confirma seu pedido.</p>
          </>
        ) : o.deliveryMethod === "pickup" ? (
          <>
            <h1 className="mt-2 text-2xl font-bold">Pedido recebido! Sua moto espera por você</h1>
            <p className="mt-2 flex gap-2 text-muted-foreground"><Store className="h-5 w-5 shrink-0 text-primary" />Retire na {store.address} — {store.addressReference}. O horário será combinado com a loja.{o.codMethod ? ` Pagamento na loja: ${o.codMethod.toLowerCase()}.` : ""}</p>
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-link underline">Ver no Google Maps</a>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-bold">Pedido recebido!</h1>
            <p className="mt-2 text-muted-foreground">A Lima entrará em contato para combinar a entrega. Você paga na chegada{o.codMethod ? ` com ${o.codMethod.toLowerCase()}` : ""}.</p>
          </>
        )}
        {wa && o.paymentMethod !== "pix" && <Button asChild variant="buyOutline" className="mt-4 h-12"><a href={wa} target="_blank" rel="noreferrer"><WhatsAppIcon />Enviar pedido pelo WhatsApp</a></Button>}
      </section>

      <section className="rounded-lg bg-card p-6 shadow-card">
        <h2 className="mb-3 text-lg font-semibold">Resumo</h2>
        <div className="flex gap-3">
          {p && <img src={p.images.studio} alt={o.productName} width={64} height={64} loading="lazy" className="h-16 w-16 rounded bg-muted object-cover" />}
          <div><p className="font-semibold">{o.productName}</p><p className="text-sm text-muted-foreground">Quantidade: {o.quantity}</p></div>
        </div>
        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(o.subtotalCents)}</dd></div>
          <div className="flex justify-between"><dt>Frete</dt><dd>{o.freightMode === "arrange" ? "A combinar" : o.freightCents === 0 ? "Grátis" : money(o.freightCents)}</dd></div>
          <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{money(o.totalCents)}</dd></div>
        </dl>
        <h3 className="mt-4 font-semibold">{o.deliveryMethod === "pickup" ? "Retirada na loja" : "Endereço de entrega"}</h3>
        <p className="text-sm text-muted-foreground">{o.deliveryMethod === "pickup" ? store.address : `${a.street}, ${a.number}${a.complement ? ` — ${a.complement}` : ""} · ${a.district ?? ""} · ${a.city}/${a.uf}`}</p>
        <p className="mt-2 text-xs text-muted-foreground">CPF {o.customerCpf}</p>
      </section>
    </div>
  );
}
