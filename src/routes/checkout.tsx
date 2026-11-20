import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, CreditCard, HandCoins, Lock, QrCode, Store, Zap } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo-lima.png.asset.json";
import { getBuyIntent, getTracking } from "@/lib/checkout-store";
import { isValidCpf, maskCep, maskCpf, maskPhone, money, onlyDigits } from "@/lib/format";
import type { ShippingQuote } from "@/lib/shipping";
import { catalogQuery, createOrder, quoteShipping, settingsQuery, useProducts, useSettings, type LiveProduct } from "@/lib/api";
import { paymentAvailability, type PaymentMethod } from "@/lib/order-rules";
import { store } from "@/config/store";
type DeliveryMethod = "full" | "pickup";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Finalizar compra — Lima Multimarcas" },
      { name: "description", content: "Finalize a compra da sua moto elétrica na Lima Multimarcas." },
      { property: "og:title", content: "Finalizar compra — Lima Multimarcas" },
      { property: "og:description", content: "Checkout seguro da Lima Multimarcas." },
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
  if (intent === undefined) return <Shell><div className="h-64 animate-pulse rounded-lg bg-card" /></Shell>;
  if (intent === null) return (
    <Shell><div className="rounded-lg bg-card p-10 text-center shadow-card">
      <p className="text-lg font-semibold">Você ainda não escolheu uma moto.</p>
      <Link to="/" className="mt-4 inline-flex h-12 items-center rounded-md bg-primary px-6 font-semibold text-primary-foreground">Ver as motos</Link>
    </div></Shell>
  );
  return <CheckoutForm p={intent.p} qty={intent.qty} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-ink text-ink-foreground"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2"><img src={logo.url} alt="Logo Lima Multimarcas" width={40} height={40} className="h-10 w-10 object-contain" /><span className="font-bold">Lima Multimarcas</span></Link>
        <span className="flex items-center gap-1 text-sm text-ink-muted"><Lock className="h-4 w-4" />Compra segura</span>
      </div></header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

const field = "h-11 w-full rounded-md border border-input bg-card px-3";

function CheckoutForm({ p, qty }: { p: LiveProduct; qty: number }) {
  const settings = useSettings();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [delivery, setDelivery] = useState<DeliveryMethod>("full");
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [cepState, setCepState] = useState<"idle" | "loading" | "error">("idle");
  const [cepError, setCepError] = useState("");
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [podMethod, setPodMethod] = useState(settings.cod_methods[0] ?? "");
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, trigger, setValue, watch, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema), mode: "onBlur" });

  const subtotal = p.price * qty;
  const fullAvailable = !!quote && quote.mode !== "unknown";
  const shipping = delivery === "pickup" ? 0 : fullAvailable ? quote!.freightCents : null;
  const avail = paymentAvailability({
    pixEnabled: settings.pix_available, vegaConfigured: settings.pix_available, cardEnabled: settings.card_enabled, codEnabled: settings.cod_enabled,
    productCardUrl: p.cardAvailable ? "yes" : null, delivery, distanceKm: quote?.distanceKm ?? null, payOnDeliveryMaxKm: settings.pay_on_delivery_max_km,
  });

  async function onCep(v: string) {
    const m = maskCep(v); setValue("cep", m);
    if (onlyDigits(m).length !== 8) return;
    setCepState("loading"); setQuote(null); setCepError("");
    try {
      const r = await quoteShipping(m);
      if (!r.ok) { setCepError(r.error); setCepState("error"); return; }
      const a = r.quote.address;
      setValue("street", a.street); setValue("district", a.district); setValue("city", a.city); setValue("uf", a.uf);
      setQuote(r.quote); setCepState("idle");
      if (r.quote.mode === "unknown") { setDelivery("pickup"); setCepError("Não conseguimos calcular a distância agora. Você pode retirar na loja."); setCepState("error"); }
    } catch { setCepError("Não conseguimos consultar o CEP agora."); setCepState("error"); }
  }

  async function next1() { if (await trigger(["name", "cpf", "email", "phone"])) setStep(2); }
  async function next2() {
    if (!(await trigger(["cep", "street", "number"]))) return;
    if (delivery === "full" && !fullAvailable) return void toast.error("Informe um CEP válido para entrega ou escolha retirar na loja.");
    setPayment(null); setStep(3);
  }

  const onSubmit = handleSubmit(async (v) => {
    if (!payment) return void toast.error("Escolha a forma de pagamento.");
    setSubmitting(true);
    try {
      const r = await createOrder({
        productSlug: p.slug, quantity: qty,
        customer: { name: v.name.trim(), cpf: v.cpf, email: v.email.trim(), phone: v.phone },
        delivery: { method: delivery, cep: v.cep, street: v.street, number: v.number, complement: v.complement || undefined, district: v.district || undefined, city: v.city || undefined, uf: v.uf || undefined },
        payment: { method: payment, codMethod: payment === "pagar_na_entrega" || payment === "pagar_na_loja" ? podMethod : undefined },
        tracking: getTracking(),
        website: v.website || undefined,
      });
      if (!r.ok) { toast.error(r.error); setSubmitting(false); return; }
      sessionStorage.removeItem("lima:buy");
      if (r.next === "redirect" && r.redirectUrl) {
        sessionStorage.setItem("lima:last-order", JSON.stringify({ n: r.orderNumber, t: r.token }));
        window.location.assign(r.redirectUrl); return;
      }
      navigate({ to: "/pedido/$id", params: { id: r.orderNumber }, search: { t: r.token } });
    } catch { toast.error("Não foi possível finalizar. Confira os dados e tente de novo."); setSubmitting(false); }
  });

  const Err = ({ k }: { k: keyof Form }) => errors[k] ? <p className="mt-1 text-sm text-destructive">{errors[k]?.message as string}</p> : null;
  const v = watch();

  return (
    <Shell>
      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]" noValidate>
        <div className="space-y-3">
          <Step n={1} title="Seus dados" step={step} onEdit={() => setStep(1)} summary={`${v.name ?? ""} · ${v.email ?? ""}`}>
            <div className="grid gap-4 sm:grid-cols-2">
              <L label="Nome completo" id="name" className="sm:col-span-2"><input id="name" autoComplete="name" className={field} {...register("name")} /><Err k="name" /></L>
              <L label="CPF" id="cpf"><input id="cpf" inputMode="numeric" className={field} {...register("cpf", { onChange: (e) => setValue("cpf", maskCpf(e.target.value)) })} /><Err k="cpf" /></L>
              <L label="Celular com DDD" id="phone"><input id="phone" inputMode="tel" autoComplete="tel" className={field} {...register("phone", { onChange: (e) => setValue("phone", maskPhone(e.target.value)) })} /><Err k="phone" /></L>
              <L label="E-mail" id="email" className="sm:col-span-2"><input id="email" type="email" autoComplete="email" className={field} {...register("email")} /><Err k="email" /></L>
            </div>
            <Button type="button" variant="buy" className="mt-4 h-12 px-8" onClick={next1}>Continuar</Button>
          </Step>

          <Step n={2} title="Entrega" step={step} onEdit={() => setStep(2)} summary={delivery === "pickup" ? "Retirar na loja" : `${v.street ?? ""}, ${v.number ?? ""} — ${v.city ?? ""}/${v.uf ?? ""}`}>
            <div className="grid gap-4 sm:grid-cols-6">
              <L label="CEP" id="cep" className="sm:col-span-2"><input id="cep" inputMode="numeric" autoComplete="postal-code" className={field} {...register("cep", { onChange: (e) => onCep(e.target.value) })} /><Err k="cep" /></L>
              <div className="self-end pb-3 text-sm sm:col-span-4" aria-live="polite">
                {cepState === "loading" && <span className="text-muted-foreground">Buscando endereço e calculando frete...</span>}
                {cepState === "error" && <span className="text-destructive">{cepError}</span>}
                {quote && <span className="text-muted-foreground">{quote.address.city}/{quote.address.uf} — a ~{quote.distanceKm} km da loja</span>}
              </div>
              <L label="Rua" id="street" className="sm:col-span-4"><input id="street" className={field} {...register("street")} /><Err k="street" /></L>
              <L label="Número" id="number" className="sm:col-span-2"><input id="number" className={field} {...register("number")} /><Err k="number" /></L>
              <L label="Complemento (opcional)" id="complement" className="sm:col-span-3"><input id="complement" className={field} {...register("complement")} /></L>
              <L label="Bairro" id="district" className="sm:col-span-3"><input id="district" className={field} {...register("district")} /></L>
              <L label="Cidade" id="city" className="sm:col-span-4"><input id="city" className={field} {...register("city")} readOnly /></L>
              <L label="UF" id="uf" className="sm:col-span-2"><input id="uf" className={field} {...register("uf")} readOnly /></L>
            </div>
            <div role="radiogroup" aria-label="Forma de entrega" className="mt-4 grid gap-3">
              <Radio checked={delivery === "full"} disabled={!fullAvailable} onSelect={() => setDelivery("full")}
                icon={<Zap className="h-5 w-5 text-success-strong" />} title="⚡ Entrega FULL Lima"
                desc={!fullAvailable ? "Informe o CEP para calcular" : quote!.mode === "free" ? `Chega ${settings.delivery_estimate_text}` : quote!.mode === "paid" ? "Fora do raio de frete grátis" : "Fora do raio — frete a combinar com a loja"}
                right={fullAvailable ? (quote!.mode === "free" ? <span className="font-semibold text-success-strong">Grátis</span> : quote!.freightCents != null ? money(quote!.freightCents) : <span className="text-sm">A combinar</span>) : null} />
              <Radio checked={delivery === "pickup"} onSelect={() => setDelivery("pickup")} icon={<Store className="h-5 w-5 text-primary" />}
                title="Retirar na loja — grátis" desc={`${store.address} (${store.addressReference})`} right={<span className="font-semibold text-success-strong">Grátis</span>} />
            </div>
            <Button type="button" variant="buy" className="mt-4 h-12 px-8" onClick={next2}>Continuar</Button>
          </Step>

          <Step n={3} title="Pagamento" step={step} onEdit={() => setStep(3)} summary="">
            <div role="radiogroup" aria-label="Forma de pagamento" className="grid gap-3">
              <Radio checked={payment === "pix"} disabled={!avail.pix.ok} onSelect={() => setPayment("pix")} icon={<QrCode className="h-5 w-5 text-primary" />} title="Pix" desc={avail.pix.ok ? "Aprovação na hora" : "Pix indisponível no momento"} />
              {avail.cartao_vega.ok && <Radio checked={payment === "cartao_vega"} onSelect={() => setPayment("cartao_vega")} icon={<CreditCard className="h-5 w-5 text-primary" />} title="Cartão de crédito" desc="Você será levado ao checkout seguro da Vega para pagar" />}
              {settings.cod_enabled && (delivery === "pickup"
                ? <Radio checked={payment === "pagar_na_loja"} disabled={!avail.pagar_na_loja.ok} onSelect={() => setPayment("pagar_na_loja")} icon={<Store className="h-5 w-5 text-primary" />} title="Pague na loja" desc="Pague quando retirar a moto" />
                : <Radio checked={payment === "pagar_na_entrega"} disabled={!avail.pagar_na_entrega.ok} onSelect={() => setPayment("pagar_na_entrega")} icon={<HandCoins className="h-5 w-5 text-primary" />}
                    title="Pagar na entrega" desc={avail.pagar_na_entrega.ok ? "Você só paga quando a moto chegar" : avail.pagar_na_entrega.reason ?? ""} />)}
            </div>
            {(payment === "pagar_na_entrega" || payment === "pagar_na_loja") && settings.cod_methods.length > 0 && (
              <fieldset className="mt-4"><legend className="mb-2 text-sm font-semibold">Como você vai pagar?</legend>
                <div className="flex flex-wrap gap-2">{settings.cod_methods.map((m) => (
                  <button type="button" key={m} onClick={() => setPodMethod(m)} aria-pressed={podMethod === m}
                    className={`h-11 rounded-md border-2 px-4 text-sm ${podMethod === m ? "border-primary bg-accent font-semibold" : "border-border bg-card"}`}>{m}</button>
                ))}</div>
              </fieldset>
            )}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Não preencha<input tabIndex={-1} autoComplete="off" {...register("website")} /></label></div>
            <Button type="submit" variant="buy" className="mt-6 h-12 w-full sm:w-auto sm:px-10" disabled={submitting || !payment}>{submitting ? "Enviando..." : "Finalizar pedido"}</Button>
          </Step>
        </div>

        <aside className="h-fit rounded-lg bg-card p-5 shadow-card lg:sticky lg:top-4">
          <h2 className="border-b border-border pb-3 text-lg font-semibold">Resumo da compra</h2>
          <div className="flex gap-3 py-4">
            <img src={p.images.studio} alt={p.name} width={72} height={72} className="h-18 w-18 rounded-md bg-muted object-cover" />
            <div><p className="font-semibold">{p.name}</p><p className="text-sm text-muted-foreground">Quantidade: {qty}</p></div>
          </div>
          <dl className="space-y-2 border-t border-border pt-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Frete</dt><dd>{shipping === 0 ? <span className="text-success-strong">Grátis</span> : shipping == null ? (delivery === "full" && fullAvailable ? "A combinar" : "—") : money(shipping)}</dd></div>
            <div className="flex justify-between border-t border-border pt-3 text-lg font-bold"><dt>Total</dt><dd>{money(subtotal + (shipping ?? 0))}</dd></div>
          </dl>
        </aside>
      </form>
    </Shell>
  );
}

function Step({ n, title, step, onEdit, summary, children }: { n: number; title: string; step: number; onEdit: () => void; summary: string; children: React.ReactNode }) {
  const open = step === n, done = step > n;
  return (
    <section className="rounded-lg bg-card shadow-card">
      <div className="flex items-center gap-3 p-4">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? "bg-success text-success-foreground" : open ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{done ? <CheckCircle2 className="h-5 w-5" /> : n}</span>
        <div className="min-w-0 flex-1"><h2 className="font-semibold">{title}</h2>{done && summary && <p className="truncate text-sm text-muted-foreground">{summary}</p>}</div>
        {done && <button type="button" onClick={onEdit} className="h-11 px-2 text-sm text-link">Alterar</button>}
      </div>
      {open && <div className="border-t border-border p-4">{children}</div>}
    </section>
  );
}
const L = ({ label, id, className = "", children }: { label: string; id: string; className?: string; children: React.ReactNode }) => (
  <div className={className}><label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>{children}</div>
);
function Radio({ checked, disabled, onSelect, icon, title, desc, right }: { checked: boolean; disabled?: boolean; onSelect: () => void; icon: React.ReactNode; title: string; desc: string; right?: React.ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={checked} disabled={disabled} onClick={onSelect}
      className={`flex min-h-16 w-full items-center gap-3 rounded-md border-2 p-3 text-left ${checked ? "border-primary bg-accent" : "border-border bg-card"} disabled:cursor-not-allowed disabled:opacity-55`}>
      <span className={`h-5 w-5 shrink-0 rounded-full border-2 ${checked ? "border-[6px] border-primary" : "border-input"}`} aria-hidden />
      {icon}
      <span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span><span className="block text-sm text-muted-foreground">{desc}</span></span>
      {right && <span className="shrink-0">{right}</span>}
    </button>
  );
}
