import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, CreditCard, HandCoins, Info, Lock, QrCode, Store, Zap } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo-lima.png.asset.json";
import { getProduct, type Product } from "@/data/products";
import { getBuyIntent, getTracking } from "@/lib/checkout-store";
import { isValidCpf, maskCep, maskCpf, maskPhone, money, onlyDigits } from "@/lib/format";
import { quoteShipping, lookupCep, type ShippingQuote } from "@/lib/shipping";
import { createOrder, IS_DEMO, type DeliveryMethod, type PaymentMethod } from "@/lib/api";
import { paymentConfig, shippingConfig, store } from "@/config/store";
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
  component: Checkout,
});

const schema = z.object({
  name: z.string().trim().min(5, "Informe seu nome completo").max(100, "Nome muito longo").refine((v) => v.includes(" "), "Informe nome e sobrenome"),
  cpf: z.string().refine(isValidCpf, "CPF inválido"),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().refine((v) => onlyDigits(v).length >= 10, "Celular com DDD inválido"),
  cep: z.string().optional(),
  street: z.string().max(150).optional(),
  number: z.string().max(20).optional(),
  complement: z.string().max(80).optional(),
  district: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  uf: z.string().max(2).optional(),
});
type Form = z.infer<typeof schema>;

function Checkout() {
  const [intent, setIntent] = useState<{ p: Product; qty: number } | null | undefined>(undefined);
  useEffect(() => {
    const b = getBuyIntent(); const p = b && getProduct(b.slug);
    setIntent(p ? { p, qty: Math.min(Math.max(1, b!.quantity), p.stock) } : null);
  }, []);
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
      {IS_DEMO && <p className="bg-accent px-4 py-2 text-center text-sm text-accent-foreground"><Info className="mr-1 inline h-4 w-4" />Modo demonstração — pagamentos ainda não conectados</p>}
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

const field = "h-11 w-full rounded-md border border-input bg-card px-3";

function CheckoutForm({ p, qty }: { p: Product; qty: number }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [delivery, setDelivery] = useState<DeliveryMethod>("full");
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [cepState, setCepState] = useState<"idle" | "loading" | "error">("idle");
  const [cepError, setCepError] = useState("");
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [podMethod, setPodMethod] = useState(paymentConfig.payOnDeliveryMethods[0]);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, trigger, setValue, getValues, watch, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema), mode: "onBlur" });

  const subtotal = p.price * qty;
  const shipping = delivery === "pickup" ? 0 : quote ? quote.price : null;
  const fullAvailable = !!quote;
  const podAllowed = delivery === "full" && !!quote?.withinPayOnDelivery;

  async function onCep(v: string) {
    const m = maskCep(v); setValue("cep", m);
    if (onlyDigits(m).length !== 8) return;
    setCepState("loading"); setQuote(null); setCepError("");
    try {
      const a = await lookupCep(m);
      setValue("street", a.street); setValue("district", a.district); setValue("city", a.city); setValue("uf", a.uf);
      try { setQuote(await quoteShipping(m)); setCepState("idle"); }
      catch (e) { setCepError((e as Error).message); setCepState("error"); setDelivery("pickup"); }
    } catch (e) { setCepError((e as Error).message); setCepState("error"); }
  }

  async function next1() { if (await trigger(["name", "cpf", "email", "phone"])) setStep(2); }
  function next2() {
    if (delivery === "full") {
      const v = getValues();
      if (!quote) return void toast.error("Informe um CEP válido para entrega ou escolha retirar na loja.");
      if (!v.number?.trim()) return void toast.error("Informe o número do endereço.");
      if (!v.street?.trim()) return void toast.error("Informe a rua.");
    }
    setPayment(null); setStep(3);
  }

  const onSubmit = handleSubmit(async (v) => {
    if (!payment) return void toast.error("Escolha a forma de pagamento.");
    setSubmitting(true);
    try {
      const order = await createOrder({
        productSlug: p.slug, quantity: qty,
        customer: { name: v.name.trim(), cpf: onlyDigits(v.cpf), email: v.email.trim(), phone: onlyDigits(v.phone) },
        delivery: delivery === "full"
          ? { method: "full", cep: onlyDigits(v.cep ?? ""), street: v.street, number: v.number, complement: v.complement, district: v.district, city: v.city, uf: v.uf, distanceKm: quote?.distanceKm, shippingPrice: quote?.price ?? null }
          : { method: "pickup", shippingPrice: 0 },
        payment: { method: payment, onDeliveryMethod: payment === "payOnDelivery" ? podMethod : undefined },
        tracking: getTracking(),
      });
      navigate({ to: "/pedido/$id", params: { id: order.id } });
    } catch (e) { toast.error((e as Error).message || "Não foi possível finalizar. Tente de novo."); setSubmitting(false); }
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
              <L label="CEP" id="cep" className="sm:col-span-2"><input id="cep" inputMode="numeric" autoComplete="postal-code" className={field} {...register("cep", { onChange: (e) => onCep(e.target.value) })} /></L>
              <div className="self-end pb-3 text-sm sm:col-span-4" aria-live="polite">
                {cepState === "loading" && <span className="text-muted-foreground">Buscando endereço e calculando frete...</span>}
                {cepState === "error" && <span className="text-destructive">{cepError}</span>}
                {quote && <span className="text-muted-foreground">{quote.address.city}/{quote.address.uf} — a ~{quote.distanceKm} km da loja</span>}
              </div>
              <L label="Rua" id="street" className="sm:col-span-4"><input id="street" className={field} {...register("street")} /></L>
              <L label="Número" id="number" className="sm:col-span-2"><input id="number" className={field} {...register("number")} /></L>
              <L label="Complemento (opcional)" id="complement" className="sm:col-span-3"><input id="complement" className={field} {...register("complement")} /></L>
              <L label="Bairro" id="district" className="sm:col-span-3"><input id="district" className={field} {...register("district")} /></L>
              <L label="Cidade" id="city" className="sm:col-span-4"><input id="city" className={field} {...register("city")} readOnly /></L>
              <L label="UF" id="uf" className="sm:col-span-2"><input id="uf" className={field} {...register("uf")} readOnly /></L>
            </div>
            <div role="radiogroup" aria-label="Forma de entrega" className="mt-4 grid gap-3">
              <Radio checked={delivery === "full"} disabled={!fullAvailable} onSelect={() => setDelivery("full")}
                icon={<Zap className="h-5 w-5 text-success-strong" />} title="⚡ Entrega FULL Lima"
                desc={!quote ? "Informe o CEP para calcular" : quote.free ? `Chega ${shippingConfig.deliveryEstimateText}` : "Fora do raio de frete grátis"}
                right={quote ? (quote.free ? <span className="font-semibold text-success-strong">Grátis</span> : quote.price != null ? money(quote.price) : <span className="text-sm">A combinar</span>) : null} />
              <Radio checked={delivery === "pickup"} onSelect={() => setDelivery("pickup")} icon={<Store className="h-5 w-5 text-primary" />}
                title="Retirar na loja — grátis" desc={`${store.address} (${store.addressReference})`} right={<span className="font-semibold text-success-strong">Grátis</span>} />
            </div>
            <Button type="button" variant="buy" className="mt-4 h-12 px-8" onClick={next2}>Continuar</Button>
          </Step>

          <Step n={3} title="Pagamento" step={step} onEdit={() => setStep(3)} summary="">
            <div role="radiogroup" aria-label="Forma de pagamento" className="grid gap-3">
              {paymentConfig.payments.pix && <Radio checked={payment === "pix"} onSelect={() => setPayment("pix")} icon={<QrCode className="h-5 w-5 text-primary" />} title="Pix" desc="Aprovação na hora" />}
              {paymentConfig.payments.payOnDelivery && (delivery === "pickup"
                ? <Radio checked={payment === "payInStore"} onSelect={() => setPayment("payInStore")} icon={<Store className="h-5 w-5 text-primary" />} title="Pague na loja" desc="Pague quando retirar a moto" />
                : <Radio checked={payment === "payOnDelivery"} disabled={!podAllowed} onSelect={() => setPayment("payOnDelivery")} icon={<HandCoins className="h-5 w-5 text-primary" />}
                    title="Pagar na entrega" desc={podAllowed ? "Você só paga quando a moto chegar" : `Disponível só para entregas até ${shippingConfig.payOnDeliveryMaxKm} km da loja`} />)}
              {paymentConfig.payments.card && <Radio checked={payment === "card"} onSelect={() => setPayment("card")} icon={<CreditCard className="h-5 w-5 text-primary" />} title="Cartão de crédito" desc="Em breve" />}
            </div>
            {(payment === "payOnDelivery" || payment === "payInStore") && (
              <fieldset className="mt-4"><legend className="mb-2 text-sm font-semibold">Como você vai pagar?</legend>
                <div className="flex flex-wrap gap-2">{paymentConfig.payOnDeliveryMethods.map((m) => (
                  <button type="button" key={m} onClick={() => setPodMethod(m)} aria-pressed={podMethod === m}
                    className={`h-11 rounded-md border-2 px-4 text-sm ${podMethod === m ? "border-primary bg-accent font-semibold" : "border-border bg-card"}`}>{m}</button>
                ))}</div>
              </fieldset>
            )}
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
            <div className="flex justify-between"><dt>Frete</dt><dd>{shipping === 0 ? <span className="text-success-strong">Grátis</span> : shipping == null ? (delivery === "full" && quote ? "A combinar" : "—") : money(shipping)}</dd></div>
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
