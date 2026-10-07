"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatarMes, somarMeses, type Mes } from "@/lib/datas";

export function SeletorMes({ mes, atual, base }: { mes: Mes; atual: Mes; base: string }) {
  const router = useRouter();
  const proximo = somarMeses(mes, 1);
  return (
    <div className="flex items-center gap-1">
      <Button asChild variant="outline" size="icon" aria-label="Mês anterior">
        <Link href={`${base}?m=${somarMeses(mes, -1)}`}>
          <ChevronLeft />
        </Link>
      </Button>
      <label className="relative">
        <span className="sr-only">Escolher mês</span>
        <span className="pointer-events-none flex h-9 min-w-40 items-center justify-center rounded-lg border bg-card px-3 text-sm font-medium">
          {formatarMes(mes)}
        </span>
        <input
          type="month"
          value={mes}
          max={atual}
          onChange={(e) => e.target.value && router.push(`${base}?m=${e.target.value}`)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <Button asChild variant="outline" size="icon" aria-label="Próximo mês" disabled={proximo > atual}>
        {proximo > atual ? (
          <span aria-disabled className="pointer-events-none opacity-40"><ChevronRight /></span>
        ) : (
          <Link href={`${base}?m=${proximo}`}>
            <ChevronRight />
          </Link>
        )}
      </Button>
    </div>
  );
}
