import Link from "next/link";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { usuarioAtualId } from "@/server/usuario";
import { listarLeads, type FiltrosLeads } from "@/server/queries/leads";
import { formatarDataHora } from "@/lib/datas";
import { ORIGENS, STATUS_LEAD, rotuloOrigem, rotuloStatusLead, tomStatusLead, type Origem, type StatusLead } from "@/lib/rotulos";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<FiltrosLeads> }) {
  const f = await searchParams;
  const userId = await usuarioAtualId();
  const { leads, total, pagina, paginas } = await listarLeads(userId, f);
  const link = (p: number) => `/leads?${new URLSearchParams({ ...f, pagina: String(p) } as Record<string, string>)}`;
  const filtrado = !!(f.q || f.status || f.origem || f.de || f.ate);

  return (
    <div className="grid gap-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <span className="text-sm text-muted-foreground">{total} {total === 1 ? "lead" : "leads"}</span>
      </div>

      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto_auto_auto]" action="/leads">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={f.q} placeholder="Buscar por nome, empresa, telefone ou e-mail" className="pl-9" />
        </div>
        <Select name="status" defaultValue={f.status ?? ""} aria-label="Status">
          <option value="">Todos os status</option>
          {STATUS_LEAD.map((s) => (
            <option key={s} value={s}>{rotuloStatusLead[s]}</option>
          ))}
        </Select>
        <Select name="origem" defaultValue={f.origem ?? ""} aria-label="Origem">
          <option value="">Todas as origens</option>
          {ORIGENS.map((o) => (
            <option key={o} value={o}>{rotuloOrigem[o]}</option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          De <Input type="date" name="de" defaultValue={f.de} className="w-auto" />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          até <Input type="date" name="ate" defaultValue={f.ate} className="w-auto" />
        </label>
        <div className="flex gap-2">
          <Button type="submit">Filtrar</Button>
          {filtrado && (
            <Button asChild variant="ghost">
              <Link href="/leads">Limpar</Link>
            </Button>
          )}
        </div>
      </form>

      <Card className="overflow-hidden">
        {leads.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">Nenhum lead encontrado.</p>
        ) : (
          <ul className="divide-y">
            {leads.map((l) => (
              <li key={l.id}>
                <Link href={`/leads/${l.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{l.nome}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {[l.empresa, formatarDataHora(l.entradaEm)].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="hidden text-right text-xs text-muted-foreground sm:block">
                    {l._count.ligacoes} lig. · {l._count.agendamentos} agend.
                  </div>
                  <Badge className="hidden sm:inline-flex">{rotuloOrigem[l.origem as Origem]}</Badge>
                  <Badge tom={tomStatusLead[l.status as StatusLead]}>{rotuloStatusLead[l.status as StatusLead]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {paginas > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          {pagina > 1 ? (
            <Button asChild variant="outline" size="sm"><Link href={link(pagina - 1)}>Anterior</Link></Button>
          ) : null}
          <span className="text-muted-foreground">Página {pagina} de {paginas}</span>
          {pagina < paginas ? (
            <Button asChild variant="outline" size="sm"><Link href={link(pagina + 1)}>Próxima</Link></Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
