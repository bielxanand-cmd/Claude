"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, History, Home, Phone, Settings, Target, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRegistroRapido } from "@/components/registro/registro-rapido";
import { BotaoTema } from "./tema";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", rotulo: "Hoje", icone: Home },
  { href: "/mes", rotulo: "Mês", icone: CalendarDays },
  { href: "/historico", rotulo: "Histórico", icone: History },
  { href: "/leads", rotulo: "Leads", icone: Users },
  { href: "/configuracoes", rotulo: "Config.", icone: Settings },
];

function ativo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function BotoesRegistro({ className, compacto }: { className?: string; compacto?: boolean }) {
  const { abrir } = useRegistroRapido();
  const botoes = [
    { tipo: "lead" as const, rotulo: "Lead", icone: UserPlus, tecla: "L" },
    { tipo: "ligacao" as const, rotulo: "Ligação", icone: Phone, tecla: "C" },
    { tipo: "agendamento" as const, rotulo: "Agendamento", icone: Target, tecla: "A" },
  ];
  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {botoes.map((b) => (
        <Button
          key={b.tipo}
          variant={b.tipo === "agendamento" ? "default" : "secondary"}
          size={compacto ? "default" : "lg"}
          onClick={() => abrir({ tipo: b.tipo })}
          title={`Atalho: ${b.tecla}`}
          className="px-2 max-sm:gap-1.5 max-sm:text-[13px]"
        >
          <b.icone />
          <span className="truncate">
            <span className="hidden sm:inline">+ </span>
            {b.rotulo}
          </span>
          {!compacto && (
            <kbd className="ml-1 hidden rounded border border-current/30 px-1 text-[10px] opacity-70 lg:inline">{b.tecla}</kbd>
          )}
        </Button>
      ))}
    </div>
  );
}

export function Navegacao() {
  const pathname = usePathname();
  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Target className="size-4" />
            </span>
            Metas SDR
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                  ativo(pathname, l.href) && "bg-muted text-foreground",
                )}
              >
                {l.rotulo}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <BotoesRegistro compacto className="hidden w-[30rem] xl:grid" />
            <BotaoTema />
          </div>
        </div>
      </header>

      {/* Celular: registro rápido + navegação fixos no rodapé */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <BotoesRegistro compacto className="px-3 pt-2" />
        <nav className="grid grid-cols-5">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground",
                ativo(pathname, l.href) && "text-primary",
              )}
            >
              <l.icone className="size-5" />
              {l.rotulo}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
