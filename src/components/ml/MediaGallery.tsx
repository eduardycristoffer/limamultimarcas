import { useRef, useState } from "react";
import { Armchair, BatteryCharging, Box, CircleDot, Flashlight, Leaf, Play, ShoppingBasket, Sparkles, Zap } from "lucide-react";
import type { Product } from "@/data/products";
import { cn } from "@/lib/utils";
import { OfficialStore } from "./Chrome";

const ICONS = { zap: Zap, battery: BatteryCharging, basket: ShoppingBasket, seat: Armchair, leaf: Leaf, retro: Sparkles, box: Box, light: Flashlight, disc: CircleDot } as const;

type Slide = { kind: "white" | "badges" | "studio" | "video"; thumb: string; alt: string };

export function slidesFor(p: Product): Slide[] {
  return [
    { kind: "white", thumb: p.images.white, alt: `${p.title}, foto de frente em fundo branco` },
    { kind: "badges", thumb: p.images.street, alt: `${p.name} estacionada na rua, com os principais destaques` },
    { kind: "studio", thumb: p.images.studio, alt: `${p.name} na cor ${p.color.toLowerCase()}, foto de estúdio` },
    ...(p.video ? [{ kind: "video" as const, thumb: p.video.poster, alt: `Vídeo da ${p.name}` }] : []),
  ];
}

/** Foto da rua com os destaques empilhados à direita (como as artes de anúncio do ML). */
function BadgesSlide({ p }: { p: Product }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-ink">
      {/* Nas fotos de rua a moto fica à direita: alinhamos a imagem pela direita e os destaques vão à esquerda. */}
      <img src={p.images.street} alt="" className="absolute inset-0 h-full w-full object-cover object-right" loading="lazy" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.6)_0%,rgba(0,0,0,0.2)_40%,transparent_60%)]" />
      <p className="absolute left-4 top-4 max-w-[70%] text-[26px] font-black uppercase italic leading-none text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] sm:text-[34px]">{p.name}</p>
      <ul className="absolute left-3 top-[52px] flex flex-col gap-2 sm:top-16">
        {p.badges.map((b) => {
          const I = ICONS[b.icon];
          return (
            <li key={b.label} className="flex w-[72px] flex-col items-center gap-0.5 text-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-black/55 backdrop-blur-sm"><I className="h-[18px] w-[18px] text-white" aria-hidden /></span>
              <span className="text-[11px] font-bold leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{b.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SlideBody({ p, s, active }: { p: Product; s: Slide; active: boolean }) {
  if (s.kind === "badges") return <BadgesSlide p={p} />;
  if (s.kind === "video" && p.video) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black">
        {active ? <video src={p.video.src} poster={p.video.poster} controls playsInline preload="metadata" className="h-full w-full object-contain" aria-label={s.alt} />
          : <img src={p.video.poster} alt="" loading="lazy" className="h-full w-full object-contain opacity-90" />}
        {!active && <span className="pointer-events-none absolute flex h-16 w-16 items-center justify-center rounded-full bg-black/60"><Play className="ml-1 h-8 w-8 fill-white text-white" /></span>}
      </div>
    );
  }
  const src = s.kind === "white" ? p.images.white : p.images.studio;
  return <img src={src} alt={s.alt} width={1200} height={1200} loading={s.kind === "white" ? "eager" : "lazy"} fetchPriority={s.kind === "white" ? "high" : undefined} className="h-full w-full object-contain" />;
}

export function MediaGallery({ p }: { p: Product }) {
  const slides = slidesFor(p);
  const [active, setActive] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const go = (i: number) => { setActive(i); track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: "smooth" }); };
  const cur = slides[active] ?? slides[0]!;

  return (
    <>
      {/* Celular: carrossel em tela cheia */}
      <div className="relative md:hidden">
        <div ref={track} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto bg-card" aria-label="Fotos e vídeo do produto"
          onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
          {slides.map((s, i) => (
            <div key={s.kind} className="relative aspect-square w-full shrink-0 snap-center" aria-roledescription="slide" aria-label={`${i + 1} de ${slides.length}`}>
              <SlideBody p={p} s={s} active={active === i} />
            </div>
          ))}
        </div>
        <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-card/95 px-3 py-1.5 shadow-sm"><OfficialStore /></span>
        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-semibold text-white" aria-live="polite">{active + 1} / {slides.length}</span>
      </div>

      {/* Computador: miniaturas + imagem com zoom */}
      <div className="hidden gap-3 md:flex">
        <div className="flex flex-col gap-2">
          {slides.map((s, i) => (
            <button key={s.kind} type="button" onMouseEnter={() => setActive(i)} onClick={() => setActive(i)} aria-label={s.alt}
              className={cn("relative h-14 w-14 overflow-hidden rounded-md border bg-card", active === i ? "border-2 border-link" : "border-border")}>
              <img src={s.thumb} alt="" width={56} height={56} loading="lazy" className="h-full w-full object-cover" />
              {s.kind === "video" && <span className="absolute inset-0 flex items-center justify-center bg-black/30"><Play className="h-5 w-5 fill-white text-white" /></span>}
            </button>
          ))}
        </div>
        <div className="relative aspect-square flex-1 overflow-hidden rounded-md bg-card"
          onMouseMove={(e) => { if (cur.kind !== "white" && cur.kind !== "studio") return; const r = e.currentTarget.getBoundingClientRect(); setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }}
          onMouseLeave={() => setZoom(null)}>
          <div className={cn("h-full w-full transition-transform duration-100", zoom && "cursor-zoom-in")} style={zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}>
            <SlideBody p={p} s={cur} active />
          </div>
        </div>
      </div>
      <div className="sr-only">
        {slides.map((s, i) => <button key={s.kind} type="button" onClick={() => go(i)}>Ir para {s.alt}</button>)}
      </div>
    </>
  );
}
