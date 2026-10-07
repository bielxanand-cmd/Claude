import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-base sm:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-20 w-full rounded-lg border border-input bg-card px-3 py-2 text-base sm:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-lg border border-input bg-card px-3 text-base sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium", className)} {...props} />;
}

/**
 * Rótulo + campo. Por padrão usa <label> (associa o texto ao input). Para grupos de
 * botões (contador, chips) use `grupo`, que vira um role="group" rotulado.
 */
export function Campo({
  label,
  children,
  className,
  grupo,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  grupo?: boolean;
}) {
  const classes = cn("grid gap-1.5", className);
  const titulo = <span className="text-sm font-medium">{label}</span>;
  if (grupo) {
    return (
      <div role="group" aria-label={label} className={classes}>
        {titulo}
        {children}
      </div>
    );
  }
  return (
    <label className={classes}>
      {titulo}
      {children}
    </label>
  );
}
