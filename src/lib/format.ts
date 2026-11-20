const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlInt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0, minimumFractionDigits: 0 });
/** Formata centavos. Valores inteiros saem sem centavos (R$ 7.990). */
export const money = (cents: number) => (cents % 100 === 0 ? brlInt : brl).format(cents / 100);
export const onlyDigits = (s: string) => s.replace(/\D/g, "");
export const maskCpf = (v: string) => onlyDigits(v).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
export const maskPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
export const maskCep = (v: string) => onlyDigits(v).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
export function isValidCpf(value: string): boolean {
  const c = onlyDigits(value);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  for (const t of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < t; i++) sum += Number(c[i]) * (t + 1 - i);
    const dv = ((sum * 10) % 11) % 10;
    if (dv !== Number(c[t])) return false;
  }
  return true;
}
