import { cn } from "@/lib/utils";
import { money } from "@/lib/format";

const SIZES = { xs: "text-[15px]", sm: "text-[18px]", md: "text-[24px]", lg: "text-[30px]", xl: "text-[36px]" } as const;

/** Preço no padrão Mercado Livre: "R$ 3.394⁰³" (centavos sobrescritos, fonte leve). */
export function Price({ cents, size = "lg", className, strike = false }: { cents: number; size?: keyof typeof SIZES; className?: string; strike?: boolean }) {
  const reais = Math.floor(cents / 100).toLocaleString("pt-BR");
  const c = cents % 100;
  return (
    <span className={cn("inline-flex items-start font-light leading-none tracking-tight", SIZES[size], strike && "text-muted-foreground line-through", className)}>
      <span className="sr-only">{money(cents)}</span>
      <span aria-hidden>R$ {reais}</span>
      {c > 0 && <span aria-hidden className="ml-[0.08em] mt-[0.08em] text-[0.48em] leading-none">{String(c).padStart(2, "0")}</span>}
    </span>
  );
}

/** Texto corrido: "R$ 531,38"; valores redondos sem centavos ("R$ 300"), como no Mercado Livre. */
export const moneyCents = (cents: number) => money(cents);
