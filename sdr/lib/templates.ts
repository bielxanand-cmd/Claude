export type TemplateVars = Record<string, string | null | undefined>;

/** Substitui {variavel} pelos valores; variáveis desconhecidas ficam como estão. */
export function render(text: string, vars: TemplateVars) {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => {
    const v = vars[k];
    return v == null || v === "" ? m : v;
  });
}

export function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

/** Normaliza para o formato do wa.me (só dígitos, com DDI 55 quando faltar). */
export function waPhone(tel: string | null | undefined) {
  if (!tel) return null;
  let d = tel.replace(/\D/g, "");
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d.length >= 12 ? d : null;
}

export function waLink(tel: string | null | undefined, text: string) {
  const p = waPhone(tel);
  if (!p) return null;
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

export function mailtoLink(email: string | null | undefined, assunto: string, corpo: string) {
  if (!email) return null;
  return `mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}
