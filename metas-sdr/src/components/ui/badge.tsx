import * as React from "react";
import { cn } from "@/lib/utils";

const tons = {
  neutro: "bg-muted text-muted-foreground",
  ok: "bg-ok-soft text-ok",
  aviso: "bg-warn-soft text-foreground",
  ruim: "bg-bad-soft text-bad",
  primario: "bg-accent text-accent-foreground",
};

export function Badge({
  tom = "neutro",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tom?: keyof typeof tons }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tons[tom], className)}
      {...props}
    />
  );
}
