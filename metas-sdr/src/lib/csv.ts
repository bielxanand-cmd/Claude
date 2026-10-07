/** Gera CSV no padrão do Excel em pt-BR: separador ";" e BOM para acentos. */
export function paraCsv(cabecalho: string[], linhas: (string | number | null | undefined)[][]): string {
  const cel = (v: string | number | null | undefined) => {
    if (v == null) return "";
    const s = String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [cabecalho, ...linhas].map((l) => l.map(cel).join(";")).join("\r\n");
}
