import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Clock, Copy, MapPin, Store, XCircle } from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/ml/TopBar";
import { BottomNav, SiteFooter } from "@/components/ml/Chrome";
import { moneyCents } from "@/components/ml/Price";
import { WhatsAppIcon } from "@/components/lima/WhatsAppIcon";
import { catalogQuery, getOrderPublic, settingsQuery, useSettings, waLink, type PublicOrder } from "@/lib/api";
import { getProduct } from "@/data/products";
import { mapsUrl, store } from "@/config/store";
import { track } from "@/lib/meta-pixel";
import { cn } from "@/lib/utils";

const AWAITING = new Set(["aguardando_pagamento", "aguardando_sinal"]);

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
        if (o && AWAITING.has(o.status)) timer = setTimeout(tick, 5000);
      } catch { if (!stop) { setOrder((prev) => prev ?? null); timer = setTimeout(tick, 10000); } }
    };
    tick();
    return () => { stop = true; clearTimeout(timer); };
  }, [id, t]);

  // Purchase no Pixel com o mesmo event_id do servidor (a Meta descarta a duplicata).
  useEffect(() => {
    if (!order || !order.trackingConsent || !order.metaEventId) return;
    const converted = order.status === "pago" || (!!order.depositPaidAt && order.depositCents > 0);
    const key = `lima:px:${order.orderNumber}`;
    if (!converted || sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    track("Purchase", { value: order.totalCents / 100, currency: "BRL", content_ids: [order.productSlug], content_type: "product", num_items: order.quantity }, order.metaEventId);
  }, [order]);

  return (
    <div className="min-h-screen bg-background">
      <TopBar variant="page" />
      <main className="mx-auto max-w-2xl space-y-3 p-3 md:py-6">
        {order === undefined && <div className="h-72 animate-pulse rounded-md bg-card" aria-label="Carregando pedido" />}
        {order === null && <div className="rounded-md bg-card p-8 text-center"><p className="text-[17px]">Pedido não encontrado.</p><p className="mt-1 text-sm text-muted-foreground">Use o link completo que apareceu ao finalizar a compra.</p><Link to="/" className="mt-3 inline-block text-link">Voltar à loja</Link></div>}
        {order && <OrderView o={order} />}
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <section className={cn("rounded-md bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)] md:p-6", className)}>{children}</section>
);

function Status({ o }: { o: PublicOrder }) {
  const ok = (text: string) => <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success px-3 py-1 text-[13px] font-semibold text-success-foreground" aria-live="polite"><CheckCircle2 className="h-4 w-4" />{text}</p>;
  const bad = (text: string) => <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-[13px] font-semibold" aria-live="polite"><XCircle className="h-4 w-4" />{text}</p>;
  switch (o.status) {
    case "pago": return ok("Pagamento aprovado");
    case "entregue": return ok("Entregue");
    case "aguardando_entrega": return ok(o.depositPaidAt ? "Sinal pago · moto reservada" : "Pedido confirmado");
    case "aguardando_retirada": return ok(o.depositPaidAt ? "Sinal pago · moto reservada" : "Pedido confirmado");
    case "recusado": return bad("Pagamento recusado");
    case "expirado": return bad("Pix expirado");
    case "estornado": return bad("Pagamento estornado");
    case "cancelado": return bad("Pedido cancelado");
    default: return <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-[13px] font-semibold" aria-live="polite"><Clock className="h-4 w-4" />{o.status === "aguardando_sinal" ? "Aguardando o sinal" : "Aguardando pagamento"}</p>;
  }
}

function PixBox({ o, amount }: { o: PublicOrder; amount: number }) {
  if (!o.pixCopyPaste) return null;
  const copy = () => navigator.clipboard.writeText(o.pixCopyPaste!).then(() => toast.success("Código Pix copiado!"), () => toast.error("Não foi possível copiar."));
  return (
    <div className="mt-5">
      <div className="mx-auto w-fit rounded-md border border-border bg-card p-3"><QRCodeSVG value={o.pixCopyPaste} size={196} aria-label="QR Code Pix" /></div>
      <button type="button" onClick={copy} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-[16px] font-semibold text-primary-foreground hover:bg-primary-hover"><Copy className="h-5 w-5" />Copiar código Pix</button>
      <p className="mt-2 break-all rounded-md bg-surface p-2 text-[11px] text-muted-foreground">{o.pixCopyPaste}</p>
      <ol className="mt-4 space-y-2 text-[14px]">
        {["Abra o app do seu banco e escolha pagar com Pix.", "Escaneie o QR Code ou cole o código copiado.", `Confira o valor de ${moneyCents(amount)} e confirme.`].map((s, i) => (
          <li key={s} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[12px] font-bold text-primary">{i + 1}</span>{s}</li>
        ))}
      </ol>
      <p className="mt-3 text-[12px] text-muted-foreground">Esta página atualiza sozinha quando o pagamento for aprovado.</p>
    </div>
  );
}

function OrderView({ o }: { o: PublicOrder }) {
  const s = useSettings();
  const p = getProduct(o.productSlug);
  const a = o.address;
  const isCod = o.paymentMethod === "pagar_na_entrega" || o.paymentMethod === "pagar_na_loja";
  const where = o.deliveryMethod === "pickup" ? "na retirada" : "na entrega";
  const wa = waLink(s.whatsapp_number, `Olá, Lima! Fiz o pedido ${o.orderNumber}: ${o.quantity}x ${o.productName}, total ${moneyCents(o.totalCents)}.`);

  return (
    <>
      <Card>
        <p className="text-[13px] text-muted-foreground">Pedido nº <strong className="text-foreground">{o.orderNumber}</strong></p>
        {o.status === "aguardando_sinal" ? (
          <>
            <h1 className="mt-1 text-[22px] font-normal leading-tight">Pague {moneyCents(o.depositCents)} de sinal via Pix para reservar sua moto</h1>
            <Status o={o} />
            <p className="mt-3 text-[14px] text-muted-foreground">O restante, {moneyCents(o.balanceCents)}, você paga {where}{o.codMethod ? ` (${o.codMethod.toLowerCase()})` : ""}.</p>
            <PixBox o={o} amount={o.depositCents} />
          </>
        ) : o.status === "aguardando_pagamento" && o.paymentMethod === "pix" ? (
          <>
            <h1 className="mt-1 text-[22px] font-normal leading-tight">Pague {moneyCents(o.totalCents)} via Pix para concluir sua compra</h1>
            <Status o={o} />
            <PixBox o={o} amount={o.totalCents} />
          </>
        ) : o.paymentMethod === "cartao_vega" && o.status === "aguardando_pagamento" ? (
          <>
            <h1 className="mt-1 text-[22px] font-normal leading-tight">Pagamento com cartão</h1>
            <Status o={o} />
            <p className="mt-2 text-[14px] text-muted-foreground">O pagamento é feito no checkout seguro da Vega. Assim que for aprovado, a Lima confirma seu pedido.</p>
          </>
        ) : isCod && (o.status === "aguardando_entrega" || o.status === "aguardando_retirada") ? (
          <>
            <h1 className="mt-1 text-[22px] font-normal leading-tight">{o.depositPaidAt ? `Pronto, ${o.customerName}! Sua moto está reservada` : `Pedido recebido, ${o.customerName}!`}</h1>
            <Status o={o} />
            <div className="mt-4 rounded-md bg-surface p-3 text-[15px]">
              {o.depositCents > 0 && <p className="flex justify-between"><span>Sinal pago</span><span>{moneyCents(o.depositCents)}</span></p>}
              <p className="mt-1 flex justify-between font-semibold"><span>Falta pagar {where}</span><span>{moneyCents(o.balanceCents)}</span></p>
              {o.codMethod && <p className="text-[13px] text-muted-foreground">Forma escolhida: {o.codMethod.toLowerCase()}</p>}
            </div>
            <p className="mt-3 text-[14px] text-muted-foreground">{o.deliveryMethod === "pickup" ? "A Lima vai combinar com você o melhor horário para retirar." : "A Lima vai entrar em contato para combinar o dia da entrega."}</p>
          </>
        ) : (
          <>
            <h1 className="mt-1 text-[22px] font-normal leading-tight">{o.status === "pago" ? `Obrigado, ${o.customerName}! Pagamento confirmado` : o.status === "entregue" ? "Pedido entregue" : "Situação do pedido"}</h1>
            <Status o={o} />
            {o.status === "pago" && <p className="mt-3 text-[14px] text-muted-foreground">{o.deliveryMethod === "pickup" ? "A Lima vai combinar com você o horário para retirar." : "A Lima vai entrar em contato para combinar a entrega."}</p>}
          </>
        )}
        {wa && <a href={wa} target="_blank" rel="noreferrer" className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary-soft text-[16px] font-semibold text-primary"><WhatsAppIcon />Falar com a Lima no WhatsApp</a>}
      </Card>

      <Card>
        <h2 className="mb-3 text-[18px] font-normal">Resumo</h2>
        <div className="flex gap-3">
          {p && <img src={p.images.white} alt="" width={64} height={64} loading="lazy" className="h-16 w-16 rounded-md border border-line object-contain" />}
          <div className="min-w-0"><p className="line-clamp-2 text-[15px]">{p?.title ?? o.productName}</p><p className="text-[13px] text-muted-foreground">Quantidade: {o.quantity}</p></div>
        </div>
        <dl className="mt-4 space-y-1.5 text-[15px]">
          <div className="flex justify-between"><dt>Produto</dt><dd>{moneyCents(o.subtotalCents)}</dd></div>
          <div className="flex justify-between"><dt>Frete</dt><dd>{o.freightMode === "arrange" ? "A combinar" : o.freightCents === 0 ? <span className="text-success-strong">Grátis</span> : moneyCents(o.freightCents)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-[17px]"><dt>Total</dt><dd>{moneyCents(o.totalCents)}</dd></div>
        </dl>
        <div className="mt-4 border-t border-line pt-3 text-[14px]">
          <p className="flex items-center gap-1.5 font-semibold">{o.deliveryMethod === "pickup" ? <Store className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}{o.deliveryMethod === "pickup" ? "Retirada na loja" : "Endereço de entrega"}</p>
          <p className="text-muted-foreground">{o.deliveryMethod === "pickup" ? `${store.address} · ${store.addressReference}` : `${a.street}, ${a.number}${a.complement ? ` — ${a.complement}` : ""} · ${a.district ?? ""} · ${a.city} - ${a.uf}`}</p>
          {o.deliveryMethod === "pickup" && <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-link">Ver no mapa</a>}
          <p className="mt-2 text-[12px] text-muted-foreground">CPF {o.customerCpf}</p>
        </div>
      </Card>
    </>
  );
}
