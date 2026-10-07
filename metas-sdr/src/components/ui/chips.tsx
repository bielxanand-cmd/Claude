"use client";

import { cn } from "@/lib/utils";

/** Grupo de opções em formato de "chips" — um toque para escolher. */
export function Chips<T extends string>({
  opcoes,
  valor,
  onChange,
  rotulos,
  className,
}: {
  opcoes: readonly T[];
  valor: T;
  onChange: (v: T) => void;
  rotulos: Record<T, string>;
  className?: string;
}) {
  return (
    <div role="radiogroup" className={cn("flex flex-wrap gap-2", className)}>
      {opcoes.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={valor === o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
            valor === o
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-card hover:bg-muted",
          )}
        >
          {rotulos[o]}
        </button>
      ))}
    </div>
  );
}
