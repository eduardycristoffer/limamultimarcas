import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CreditCard, HandCoins, Loader2, Lock, MapPin, QrCode, Store } from "lucide-react";
import { toast } from "sonner";
import { Full } from "@/components/ml/Chrome";
import { moneyCents } from "@/components/ml/Price";
import { getBuyIntent, getTracking } from "@/lib/checkout-store";
import { isValidCpf, maskCep, maskCpf, maskPhone, onlyDigits } from "@/lib/format";
import type { ShippingQuote } from "@/lib/shipping";
import { cardPlan, catalogQuery, createOrder, quoteShipping, settingsQuery, useProducts, useSettings, type LiveProduct } from "@/lib/api";
import { depositFor, paymentAvailability, type PaymentMethod } from "@/lib/order-rules";
import { locationFromQuote, setDeliveryLocation, useDeliveryLocation } from "@/lib/location";
import { fbIds, getConsent, track } from "@/lib/meta-pixel";
import { store } from "@/config/store";
import { cn } from "@/lib/utils";

type DeliveryMethod = "full" | "pickup";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Finalizar compra — Lima Multimarcas" },
      { name: "description", content: "Finalize a compra da sua scooter elétrica na Lima Multimarcas." },
      { property: "og:title", content: "Finalizar compra — Lima Multimarcas" },
      { property: "og:description", content: "Compra segura na Lima Multimarcas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(catalogQuery), context.queryClient.ensureQueryData(settingsQuery)]),
  errorComponent: () => <div className="p-10 text-center">Não conseguimos carregar o checkout. Atualize a página.</div>,
  notFoundComponent: () => <div className="p-10 text-center">Página não encontrada.</div>,
  component: Checkout,
});

const schema = z.object({
  name: z.string().trim().min(5, "Informe seu nome completo").max(100, "Nome muito longo").refine((v) => v.includes(" "), "Informe nome e sobrenome"),
  cpf: z.string().refine(isValidCpf, "CPF inválido"),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().refine((v) => onlyDigits(v).length >= 10, "Celular com DDD inválido"),
  cep: z.string().regex(/^\d{5}-\d{3}$/, "Informe o CEP"),
  street: z.string().trim().min(1, "Informe a rua").max(150),
  number: z.string().trim().min(1, "Informe o número").max(20),
  complement: z.string().max(80).optional(),
  district: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  uf: z.string().max(2).optional(),
  website: z.string().max(200).optional(),
});
type Form = z.infer<typeof schema>;

function Checkout() {
  const products = useProducts();
  const [intent, setIntent] = useState<{ p: LiveProduct; qty: number } | null | undefined>(undefined);
  useEffect(() => {
    const b = getBuyIntent(); const p = b && products.find((x) => x.slug === b.slug);
    setIntent(p && p.stock > 0 ? { p, qty: Math.min(Math.max(1, b!.quantity), p.stock) } : null);
  }, [products]);
  if (intent === undefined) return <Shell title="Finalizar compra" onBack={null}><div className="m-3 h-64 animate-pulse rounded-md bg-card" /></Shell>;
  if (intent === null) return (
    <Shell title="Finalizar compra" onBack={null}><div className="m-3 rounded-md bg-card p-8 text-center">
      <p className="text-[17px]">Você ainda não escolheu uma moto.</p>
      <Link to="/" className="mt-4 inline-flex h-12 items-center rounded-md bg-primary px-6 font-semibold text-primary-foreground">Ver as motos</Link>
    </div></Shell>
  );
  return <CheckoutFlow p={intent.p} qty={intent.qty} />;
}

function Shell({ title, onBack, children, bottom }: { title: string; onBack: (() => void) | null; children: React.ReactNode; bottom?: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background pb-28 md:pb-10">
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-2">
          <button type="button" aria-label="Voltar" onClick={onBack ?? (() => router.history.back())} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"><ArrowLeft className="h-6 w-6" /></button>
          <h1 className="text-[17px] font-semibold">{title}</h1>
          <span className="ml-auto flex items-center gap-1 pr-2 text-[12px] opacity-95"><Lock className="h-4 w-4" />Compra segura</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl">{children}</main>
      {bottom}
    </div>
  );
}

const input = "h-12 w-full rounded-md border border-input bg-card px-3 text-[16px] focus:border-link focus:outline-none focus:ring-1 focus:ring-link";
const STEPS = ["Seus dados", "Como receber", "Como pagar", "Revise e confirme"] as const;

function CheckoutFlow({ p, qty }: { p: LiveProduct; qty: number }) {
  const s = useSettings();
  const navigate = useNavigate();
  const loc = useDeliveryLocation();
  const [step, setStep] = useState(0);
  const [delivery, setDelivery] = useState<DeliveryMethod>("full");
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [cepState, setCepState] = useState<"idle" | "loading" | "error">("idle");
  const [cepError, setCepError] = useState("");
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [codMethod, setCodMethod] = useState(s.cod_methods[0] ?? "");
  const [simN, setSimN] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, trigger, setValue, watch, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema), mode: "onBlur" });
  const v = watch();

  useEffect(() => { track("InitiateCheckout", { content_ids: [p.slug], content_type: "product", value: (p.price * qty) / 100, currency: "BRL", num_items: qty }); }, [p.slug, p.price, qty]);
  // CEP já escolhido na loja: preenche e calcula.
  useEffect(() => { if (loc?.source === "cep" && loc.cep && !v.cep) void onCep(loc.cep); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);

  const subtotal = p.price * qty;
  const fullOk = !!quote && quote.mode !== "unknown";
  const freight = delivery === "pickup" ? 0 : fullOk ? quote!.freightCents : null;
  const total = subtotal + (freight ?? 0);
  const deposit = depositFor(total, s.deposit_cents);
  const plan = useMemo(() => cardPlan({ ...p, price: total }, s), [p, total, s]);
  const avail = paymentAvailability({
    pixEnabled: s.pix_available, vegaConfigured: s.deposit_available, cardEnabled: s.card_enabled, codEnabled: s.cod_enabled,
    productCardUrl: p.cardAvailable ? "sim" : null, delivery, distanceKm: quote?.distanceKm ?? null, payOnDeliveryMaxKm: s.pay_on_delivery_max_km, depositCents: s.deposit_cents,
  });
  const isCod = payment === "pagar_na_entrega" || payment === "pagar_na_loja";
  const payNow = payment === "pix" ? total : isCod ? deposit : payment === "cartao_vega" ? (plan.find((i) => i.n === simN)?.totalCents ?? total) : total;

  async function onCep(raw: string) {
    const m = maskCep(raw); setValue("cep", m);
    if (onlyDigits(m).length !== 8) { setQuote(null); return; }
    setCepState("loading"); setQuote(null); setCepError("");
    try {
      const r = await quoteShipping(m);
      if (!r.ok) { setCepError(r.error); setCepState("error"); return; }
      const a = r.quote.address;
      setValue("street", a.street, { shouldValidate: !!a.street }); setValue("district", a.district); setValue("city", a.city); setValue("uf", a.uf);
      setQuote(r.quote); setCepState("idle");
      setDeliveryLocation(locationFromQuote(r.quote));
      if (r.quote.mode === "unknown") { setDelivery("pickup"); setCepError("Não conseguimos calcular a distância agora. Você pode retirar na loja."); setCepState("error"); }
    } catch { setCepError("Não conseguimos consultar o CEP agora."); setCepState("error"); }
  }

  async function next() {
    if (step === 0) { if (await trigger(["name", "cpf", "email", "phone"])) setStep(1); return; }
    if (step === 1) {
      if (!(await trigger(["cep", "street", "number"]))) return;
      if (delivery === "full" && !fullOk) return void toast.error("Informe um CEP válido ou escolha retirar na loja.");
      if (payment && !avail[payment].ok) setPayment(null);
      setStep(2); return;
    }
    if (step === 2) {
      if (!payment) return void toast.error("Escolha como pagar.");
      track("AddPaymentInfo", { content_ids: [p.slug], value: total / 100, currency: "BRL" });
      setStep(3); return;
    }
    void submit();
  }

  const submit = handleSubmit(async (f) => {
    if (!payment) return;
    setSubmitting(true);
    try {
      const r = await createOrder({
        productSlug: p.slug, quantity: qty,
        customer: { name: f.name.trim(), cpf: f.cpf, email: f.email.trim(), phone: f.phone },
        delivery: { method: delivery, cep: f.cep, street: f.street, number: f.number, complement: f.complement || undefined, district: f.district || undefined, city: f.city || undefined, uf: f.uf || undefined },
        payment: { method: payment, codMethod: isCod ? codMethod : undefined },
        tracking: getTracking(),
        meta: { consent: getConsent() === "granted", ...fbIds() },
        website: f.website || undefined,
      });
      if (!r.ok) { toast.error(r.error); setSubmitting(false); return; }
      sessionStorage.removeItem("lima:buy");
      if (r.next === "redirect" && r.redirectUrl) { window.location.assign(r.redirectUrl); return; }
      navigate({ to: "/pedido/$id", params: { id: r.orderNumber }, search: { t: r.token } });
    } catch { toast.error("Não foi possível finalizar. Confira os dados e tente de novo."); setSubmitting(false); }
  }, () => { toast.error("Confira seus dados."); setStep(0); });

  const Err = ({ k }: { k: keyof Form }) => errors[k] ? <p className="mt-1 text-[13px] text-destructive">{errors[k]?.message as string}</p> : null;
  const cta = step === 3 ? (submitting ? "Enviando..." : isCod && deposit > 0 ? `Confirmar e pagar ${moneyCents(deposit)}` : payment === "cartao_vega" ? "Ir para o pagamento" : "Confirmar a compra") : "Continuar";

  const bottom = (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card shadow-[0_-2px_8px_rgba(0,0,0,0.06)] md:hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[12px] text-muted-foreground">{step >= 2 && isCod && deposit > 0 ? "Agora, no Pix" : "Você pagará"}</p>
          <p className="text-[20px] font-light leading-none">{moneyCents(step >= 2 && payment ? payNow : total)}</p>
        </div>
        <button type="button" onClick={next} disabled={submitting} className="ml-auto flex h-12 min-w-40 items-center justify-center gap-2 rounded-md bg-primary px-4 text-[15px] font-semibold text-primary-foreground disabled:opacity-60">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}{cta}
        </button>
      </div>
    </div>
  );

  return (
    <Shell title={STEPS[step]!} onBack={step > 0 ? () => setStep(step - 1) : null} bottom={bottom}>
      <form onSubmit={(e) => { e.preventDefault(); void next(); }} noValidate className="md:grid md:grid-cols-[1fr_340px] md:gap-4 md:px-4 md:pt-4">
        <div className="space-y-3 p-3 md:p-0">
          <p className="px-1 text-[13px] text-muted-foreground">Passo {step + 1} de 4</p>

          {step === 0 && (
            <Card>
              <h2 className="mb-4 text-[18px]">Seus dados</h2>
              <div className="grid gap-4">
                <F label="Nome completo" id="name"><input id="name" autoComplete="name" className={input} {...register("name")} /><Err k="name" /></F>
                <F label="CPF" id="cpf"><input id="cpf" inputMode="numeric" className={input} {...register("cpf", { onChange: (e) => setValue("cpf", maskCpf(e.target.value)) })} /><Err k="cpf" /></F>
                <F label="Celular com DDD" id="phone"><input id="phone" inputMode="tel" autoComplete="tel" className={input} {...register("phone", { onChange: (e) => setValue("phone", maskPhone(e.target.value)) })} /><Err k="phone" /></F>
                <F label="E-mail" id="email"><input id="email" type="email" autoComplete="email" className={input} {...register("email")} /><Err k="email" /></F>
              </div>
              <p className="mt-3 text-[12px] text-muted-foreground">Usamos seus dados só para este pedido e para combinar a entrega.</p>
            </Card>
          )}

          {step === 1 && (
            <>
              <Card>
                <h2 className="mb-3 text-[18px]">Onde você quer receber?</h2>
                <F label="CEP" id="cep"><input id="cep" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" className={input} {...register("cep", { onChange: (e) => onCep(e.target.value) })} /><Err k="cep" /></F>
                <div className="mt-2 min-h-5 text-[13px]" aria-live="polite">
                  {cepState === "loading" && <span className="flex items-center gap-1 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Buscando endereço e frete...</span>}
                  {cepState === "error" && <span className="text-destructive">{cepError}</span>}
                </div>
                {quote && (
                  <div className="mt-2 grid grid-cols-6 gap-3">
                    <F label="Rua" id="street" className="col-span-6"><input id="street" autoComplete="address-line1" className={input} {...register("street")} /><Err k="street" /></F>
                    <F label="Número" id="number" className="col-span-2"><input id="number" inputMode="numeric" className={input} {...register("number")} /><Err k="number" /></F>
                    <F label="Complemento (opcional)" id="complement" className="col-span-4"><input id="complement" className={input} {...register("complement")} /></F>
                    <F label="Bairro" id="district" className="col-span-6"><input id="district" className={input} {...register("district")} /></F>
                    <p className="col-span-6 flex items-center gap-1 text-[14px] text-muted-foreground"><MapPin className="h-4 w-4" />{quote.address.city} - {quote.address.uf}{quote.distanceKm != null && ` · a ~${quote.distanceKm} km da loja`}</p>
                  </div>
                )}
              </Card>
              {quote && (
                <Card className="p-0">
                  <div role="radiogroup" aria-label="Forma de entrega">
                    <Option checked={delivery === "full"} disabled={!fullOk} onSelect={() => setDelivery("full")}
                      title="Enviar no meu endereço" desc={`${v.street || quote.address.street}${v.number ? `, ${v.number}` : ""} · ${quote.address.city} - ${quote.address.uf}`}
                      extra={fullOk ? (quote.mode === "free" ? <span className="flex items-center gap-1.5 text-[13px]"><span className="font-semibold text-success-strong">Chega grátis {s.delivery_estimate_text}</span><Full /></span>
                        : quote.mode === "paid" ? <span className="text-[13px]">Fora do raio de frete grátis</span> : <span className="text-[13px] text-muted-foreground">Fora do raio de {s.free_shipping_radius_km} km: frete combinado com a loja</span>) : null}
                      right={fullOk ? (quote.mode === "free" ? <span className="font-semibold text-success-strong">Grátis</span> : quote.freightCents != null ? moneyCents(quote.freightCents) : <span className="text-[13px]">A combinar</span>) : null} />
                    <Option checked={delivery === "pickup"} onSelect={() => setDelivery("pickup")} title="Retirar na Lima"
                      desc={`${store.address.split(" — ")[0]} · ${store.addressReference}`} right={<span className="font-semibold text-success-strong">Grátis</span>} last />
                  </div>
                </Card>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <Card className="p-0">
                <div role="radiogroup" aria-label="Forma de pagamento">
                  <Option checked={payment === "pix"} disabled={!avail.pix.ok} onSelect={() => setPayment("pix")} icon={<QrCode className="h-6 w-6 text-primary" />}
                    title="Pix" desc={avail.pix.ok ? "Aprovação na hora" : avail.pix.reason ?? ""} right={avail.pix.ok ? moneyCents(total) : null} />
                  {s.cod_enabled && (delivery === "full" ? (
                    <Option checked={payment === "pagar_na_entrega"} disabled={!avail.pagar_na_entrega.ok} onSelect={() => setPayment("pagar_na_entrega")} icon={<HandCoins className="h-6 w-6 text-primary" />}
                      title="Pague na entrega" desc={avail.pagar_na_entrega.ok ? (deposit > 0 ? `${moneyCents(deposit)} de sinal no Pix agora + ${moneyCents(total - deposit)} quando a moto chegar` : "Você paga quando a moto chegar") : avail.pagar_na_entrega.reason ?? ""} />
                  ) : (
                    <Option checked={payment === "pagar_na_loja"} disabled={!avail.pagar_na_loja.ok} onSelect={() => setPayment("pagar_na_loja")} icon={<Store className="h-6 w-6 text-primary" />}
                      title="Pague na retirada" desc={avail.pagar_na_loja.ok ? (deposit > 0 ? `${moneyCents(deposit)} de sinal no Pix agora + ${moneyCents(total - deposit)} na loja` : "Você paga quando retirar") : avail.pagar_na_loja.reason ?? ""} />
                  ))}
                  {avail.cartao_vega.ok && plan.length > 0 && (
                    <Option checked={payment === "cartao_vega"} onSelect={() => setPayment("cartao_vega")} icon={<CreditCard className="h-6 w-6 text-primary" />}
                      title="Cartão de crédito" desc={`Em até ${plan.at(-1)!.n}x · você conclui no checkout seguro da Vega`} last />
                  )}
                </div>
              </Card>
              {isCod && s.cod_methods.length > 0 && (
                <Card>
                  <p className="mb-2 text-[15px]">Como você vai pagar {payment === "pagar_na_loja" ? "na loja" : "na entrega"}?</p>
                  <div className="flex flex-wrap gap-2">{s.cod_methods.map((m) => (
                    <button type="button" key={m} onClick={() => setCodMethod(m)} aria-pressed={codMethod === m}
                      className={cn("h-11 rounded-full border px-4 text-[14px]", codMethod === m ? "border-link bg-[oklch(0.95_0.03_258)] font-semibold text-link" : "border-border bg-card")}>{m}</button>
                  ))}</div>
                </Card>
              )}
              {payment === "cartao_vega" && (
                <Card>
                  <label htmlFor="sim" className="mb-2 block text-[15px]">Simule as parcelas</label>
                  <select id="sim" value={simN ?? ""} onChange={(e) => setSimN(e.target.value ? Number(e.target.value) : null)} className={input}>
                    <option value="">Escolha a quantidade de parcelas</option>
                    {plan.map((i) => <option key={i.n} value={i.n}>{i.n}x {moneyCents(i.perCents)} {i.ratePct ? `(total ${moneyCents(i.totalCents)})` : "(à vista)"}</option>)}
                  </select>
                  <p className="mt-2 text-[12px] text-muted-foreground">A escolha final das parcelas é feita no checkout da Vega.</p>
                </Card>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <Card>
                <div className="flex gap-3">
                  <img src={p.images.white} alt="" width={64} height={64} className="h-16 w-16 rounded-md border border-line object-contain" />
                  <div className="min-w-0"><p className="line-clamp-2 text-[15px]">{p.title}</p><p className="text-[13px] text-muted-foreground">Quantidade: {qty}</p><p className="mt-1">{moneyCents(subtotal)}</p></div>
                </div>
              </Card>
              <Card>
                <Row label="Entrega" onEdit={() => setStep(1)}>
                  {delivery === "pickup" ? <>Retirar na Lima · {store.address.split(" — ")[0]}</> : <>{v.street}, {v.number}{v.complement ? ` — ${v.complement}` : ""} · {v.city} - {v.uf}</>}
                  {delivery === "full" && quote?.mode === "free" && <span className="block text-success-strong">Chega grátis {s.delivery_estimate_text}</span>}
                </Row>
                <Row label="Pagamento" onEdit={() => setStep(2)}>
                  {payment === "pix" ? "Pix à vista" : payment === "cartao_vega" ? "Cartão de crédito (checkout da Vega)" : `${payment === "pagar_na_loja" ? "Pague na retirada" : "Pague na entrega"} · ${codMethod}`}
                </Row>
                <Row label="Seus dados" onEdit={() => setStep(0)} last>{v.name} · {v.email}</Row>
              </Card>
              <Totals subtotal={subtotal} freight={freight} delivery={delivery} total={total} deposit={isCod ? deposit : 0} quote={quote} />
              {isCod && deposit > 0 && <p className="px-1 text-[13px] text-muted-foreground">Depois de confirmar, você paga o sinal de {moneyCents(deposit)} no Pix para reservar a moto. O restante ({moneyCents(total - deposit)}) é pago {payment === "pagar_na_loja" ? "na retirada" : "na entrega"}.</p>}
            </>
          )}
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Não preencha<input tabIndex={-1} autoComplete="off" {...register("website")} /></label></div>
          <button type="submit" disabled={submitting} className="hidden h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-[16px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60 md:flex">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}{cta}
          </button>
        </div>

        <aside className="hidden md:block">
          <div className="sticky top-20 space-y-3">
            <Card>
              <h2 className="mb-3 text-[16px]">Resumo da compra</h2>
              <div className="flex gap-3 border-b border-line pb-3">
                <img src={p.images.white} alt="" width={56} height={56} className="h-14 w-14 rounded-md border border-line object-contain" />
                <p className="line-clamp-2 text-[14px]">{p.title}<span className="block text-muted-foreground">Quantidade: {qty}</span></p>
              </div>
              <Totals subtotal={subtotal} freight={freight} delivery={delivery} total={total} deposit={isCod ? deposit : 0} quote={quote} bare />
            </Card>
          </div>
        </aside>
      </form>
    </Shell>
  );
}

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <section className={cn("rounded-md bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.12)]", className)}>{children}</section>
);
const F = ({ label, id, className = "", children }: { label: string; id: string; className?: string; children: React.ReactNode }) => (
  <div className={className}><label htmlFor={id} className="mb-1 block text-[13px] text-foreground/80">{label}</label>{children}</div>
);
function Row({ label, onEdit, children, last }: { label: string; onEdit: () => void; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={cn("flex gap-3 py-3 first:pt-0", !last && "border-b border-line", last && "pb-0")}>
      <div className="min-w-0 flex-1"><p className="text-[13px] text-muted-foreground">{label}</p><p className="text-[15px]">{children}</p></div>
      <button type="button" onClick={onEdit} className="h-8 shrink-0 text-[14px] text-link">Alterar</button>
    </div>
  );
}
function Option({ checked, disabled, onSelect, icon, title, desc, extra, right, last }: { checked: boolean; disabled?: boolean; onSelect: () => void; icon?: React.ReactNode; title: string; desc: string; extra?: React.ReactNode; right?: React.ReactNode; last?: boolean }) {
  return (
    <button type="button" role="radio" aria-checked={checked} disabled={disabled} onClick={onSelect}
      className={cn("flex w-full items-start gap-3 px-4 py-4 text-left disabled:cursor-not-allowed disabled:opacity-50", !last && "border-b border-line", checked && "bg-[oklch(0.985_0.01_258)]")}>
      <span className={cn("mt-0.5 h-5 w-5 shrink-0 rounded-full border-2", checked ? "border-[6px] border-link" : "border-input")} aria-hidden />
      {icon}
      <span className="min-w-0 flex-1"><span className="block text-[15px]">{title}</span><span className="block text-[13px] text-muted-foreground">{desc}</span>{extra && <span className="mt-1 block">{extra}</span>}</span>
      {right && <span className="shrink-0 text-[15px]">{right}</span>}
    </button>
  );
}
function Totals({ subtotal, freight, delivery, total, deposit, quote, bare }: { subtotal: number; freight: number | null; delivery: DeliveryMethod; total: number; deposit: number; quote: ShippingQuote | null; bare?: boolean }) {
  const body = (
    <dl className="space-y-2 pt-3 text-[15px]">
      <div className="flex justify-between"><dt>Produto</dt><dd>{moneyCents(subtotal)}</dd></div>
      <div className="flex justify-between"><dt>Frete</dt><dd>{delivery === "pickup" || freight === 0 ? <span className="text-success-strong">Grátis</span> : freight == null ? (quote ? "A combinar" : "—") : moneyCents(freight)}</dd></div>
      <div className="flex justify-between border-t border-line pt-2 text-[17px]"><dt>Total</dt><dd>{moneyCents(total)}</dd></div>
      {deposit > 0 && (
        <>
          <div className="flex justify-between text-[14px]"><dt>Sinal agora (Pix)</dt><dd className="font-semibold">{moneyCents(deposit)}</dd></div>
          <div className="flex justify-between text-[14px] text-muted-foreground"><dt>Na entrega/retirada</dt><dd>{moneyCents(total - deposit)}</dd></div>
        </>
      )}
    </dl>
  );
  return bare ? body : <Card>{body}</Card>;
}
