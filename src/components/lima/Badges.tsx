import { Zap } from "lucide-react";
export const FreeShippingBadge = ({ text = "Frete grátis" }: { text?: string }) => (
  <span className="text-sm font-semibold text-success-strong">{text}</span>
);
export const FullBadge = () => (
  <span className="inline-flex items-center gap-0.5 text-xs font-extrabold italic text-success-strong">
    <Zap className="h-3.5 w-3.5 fill-current" aria-hidden /> FULL
  </span>
);
export const OfferBadge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block rounded bg-primary px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-primary-foreground">{children}</span>
);
