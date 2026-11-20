import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { AdminShell, METHOD_LABEL, StatusBadge } from "@/components/admin/AdminShell";
import { WhatsAppIcon } from "@/components/lima/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { adminGetOrder, adminSaveNotes, adminSetStatus } from "@/lib/admin.functions";
import { canTransition, type OrderStatus } from "@/lib/order-rules";
import { maskCpf, maskPhone, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/pedido/$numero")({
  head: ({ params }) => ({ meta: [{ title: `Pedido ${params.numero} — Painel Lima` }, { name: "description", content: "Detalhe do pedido." }, { property: "og:title", content: "Pedido" }, { property: "og:description", content: "Painel" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: OrderDetail,
});

function OrderDetail() {
  const { numero } = Route.useParams();
  const get = useServerFn(adminGetOrder); const setStatus = useServerFn(adminSetStatus); const saveNotes = useServerFn(adminSaveNotes);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "order", numero], queryFn: () => get({ data: { orderNumber: numero } }) });
  const [notes, setNotes] = useState<string | null>(null);

  async function act(status: "pago" | "entregue" | "cancelado") {
    const r = await setStatus({ data: { orderNumber: numero, status, note: status === "pago" ? "Marcado como pago manualmente no painel." : undefined } });
    if (r.ok) { toast.success("Status atualizado."); qc.invalidateQueries({ queryKey: ["admin"] }); } else toast.error(r.error ?? "Não foi possível.");
  }

  return (
    <AdminShell title={`Pedido ${numero}`}>
      <Link to="/admin/pedidos" className="mb-3 inline-flex h-11 items-center gap-1 text-sm text-link"><ArrowLeft className="h-4 w-4" />Voltar aos pedidos</Link>
      {q.isPending ? <div className="h-60 animate-pulse rounded-lg bg-card" /> : q.isError || !q.data ? <p className="rounded-lg bg-card p-6 shadow-card">Pedido não encontrado.</p> : (() => {
        const o = q.data.order; const st = o.status as OrderStatus;
        const timeline = [
          { at: o.created_at, label: "Pedido criado" },
          o.deposit_paid_at && { at: o.deposit_paid_at, label: `Sinal de ${money(o.deposit_cents)} pago` },
          o.paid_at && { at: o.paid_at, label: "Pagamento confirmado" },
          o.delivered_at && { at: o.delivered_at, label: "Entregue" },
          o.canceled_at && { at: o.canceled_at, label: "Cancelado" },
          ...q.data.events.map((e) => ({ at: e.created_at, label: `Aviso da Vega (${e.result})` })),
        ].filter(Boolean).sort((a, b) => (a as { at: string }).at.localeCompare((b as { at: string }).at)) as { at: string; label: string }[];
        return (
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <Card title="Situação">
                <div className="flex flex-wrap items-center gap-2"><StatusBadge status={o.status} /><span className="text-sm text-muted-foreground">{METHOD_LABEL[o.payment_method]}{o.cod_method ? ` · ${o.cod_method}` : ""}</span></div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {canTransition(st, "pago") && <Button variant="buy" className="h-11" onClick={() => act("pago")}>{st === "aguardando_entrega" || st === "aguardando_retirada" ? "Recebi o restante" : "Marcar como pago"}</Button>}
                  {st === "aguardando_sinal" && <Button variant="buy" className="h-11" onClick={() => act("pago")}>Sinal recebido</Button>}
                  {canTransition(st, "entregue") && <Button variant="ink" className="h-11" onClick={() => act("entregue")}>Entregue</Button>}
                  {canTransition(st, "cancelado") && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="outline" className="h-11">Cancelar pedido</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Cancelar o pedido {o.order_number}?</AlertDialogTitle><AlertDialogDescription>Se o estoque já foi baixado, ele volta para o produto. Isso não estorna pagamentos na Vega.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={() => act("cancelado")}>Cancelar pedido</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </Card>
              <Card title="Cliente">
                <p className="font-semibold">{o.customer_name}</p>
                <p className="text-sm">CPF {maskCpf(o.customer_cpf)} · {o.customer_email}</p>
                <p className="text-sm">{maskPhone(o.customer_phone)}</p>
                <Button asChild variant="buyOutline" className="mt-3 h-11"><a href={`https://wa.me/55${o.customer_phone}?text=${encodeURIComponent(`Olá, ${o.customer_name.split(" ")[0]}! Aqui é da Lima Multimarcas, sobre o pedido ${o.order_number}.`)}`} target="_blank" rel="noreferrer"><WhatsAppIcon />Chamar no WhatsApp</a></Button>
              </Card>
              <Card title="Entrega">
                <p className="text-sm font-semibold">{o.delivery_method === "full" ? "Entrega FULL Lima" : "Retirar na loja"}{o.distance_km != null && ` · ~${o.distance_km} km`}</p>
                <p className="text-sm text-muted-foreground">{o.street}, {o.number}{o.complement ? ` — ${o.complement}` : ""} · {o.district} · {o.city}/{o.uf} · CEP {o.cep}</p>
              </Card>
              <Card title="Produto e valores">
                <p className="text-sm">{o.quantity}× {o.product_name} — {money(o.unit_price_cents)} cada</p>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(o.subtotal_cents)}</dd></div>
                  <div className="flex justify-between"><dt>Frete</dt><dd>{o.freight_mode === "arrange" ? "A combinar" : money(o.freight_cents)}</dd></div>
                  <div className="flex justify-between font-bold"><dt>Total</dt><dd>{money(o.total_cents)}</dd></div>
                  {o.deposit_cents > 0 && <>
                    <div className="flex justify-between"><dt>Sinal no Pix {o.deposit_paid_at ? "(pago)" : "(pendente)"}</dt><dd>{money(o.deposit_cents)}</dd></div>
                    <div className="flex justify-between font-semibold text-primary"><dt>Receber na entrega/retirada</dt><dd>{money(o.balance_cents)}</dd></div>
                  </>}
                </dl>
                {o.vega_transaction_token && <p className="mt-2 break-all text-xs text-muted-foreground">Vega: {o.vega_transaction_token} ({o.vega_status ?? "—"})</p>}
                {(o.utm_source || o.src) && <p className="mt-1 text-xs text-muted-foreground">Origem: {[o.utm_source, o.utm_medium, o.utm_campaign, o.utm_content, o.utm_term, o.src].filter(Boolean).join(" / ")}</p>}
              </Card>
            </div>
            <div className="space-y-4">
              <Card title="Linha do tempo">
                <ol className="space-y-2 text-sm">{timeline.map((t, i) => <li key={i}><span className="font-semibold">{t.label}</span><br /><span className="text-muted-foreground">{new Date(t.at).toLocaleString("pt-BR")}</span></li>)}</ol>
              </Card>
              <Card title="Anotações internas">
                <label htmlFor="notes" className="sr-only">Anotações</label>
                <textarea id="notes" rows={5} className="w-full rounded-md border border-input bg-card p-2 text-sm" value={notes ?? o.admin_notes ?? ""} onChange={(e) => setNotes(e.target.value)} />
                <Button variant="ink" className="mt-2 h-11" disabled={notes == null} onClick={async () => { const r = await saveNotes({ data: { orderNumber: numero, notes: notes ?? "" } }); r.ok ? toast.success("Salvo.") : toast.error("Não foi possível salvar."); }}>Salvar anotações</Button>
              </Card>
            </div>
          </div>
        );
      })()}
    </AdminShell>
  );
}

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-lg bg-card p-4 shadow-card"><h2 className="mb-2 font-semibold">{title}</h2>{children}</section>
);
