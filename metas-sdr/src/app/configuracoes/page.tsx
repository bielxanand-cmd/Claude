import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BotaoExcluirDiaSemMeta,
  BotaoExcluirMeta,
  FormDiaSemMeta,
  FormJornada,
  FormMetaDiaria,
  FormMetaMensal,
  LinkDownload,
  Restaurar,
} from "@/components/config/formularios";
import { usuarioAtualId } from "@/server/usuario";
import { db } from "@/server/db";
import { carregarRegras } from "@/server/queries/regras-usuario";
import { formatarDia, formatarMes, hoje as hojeDia, mesDe, diaDaSemana } from "@/lib/datas";
import { metaDiariaVigente, metaVigente } from "@/lib/metas/regras";
import { rotuloMotivo, type Motivo } from "@/lib/rotulos";

const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export default async function ConfiguracoesPage() {
  const userId = await usuarioAtualId();
  const hoje = hojeDia();
  const mesAtual = mesDe(hoje);
  const [regras, metas] = await Promise.all([
    carregarRegras(userId),
    db.meta.findMany({ where: { userId }, orderBy: [{ tipo: "asc" }, { vigenteDesde: "desc" }] }),
  ]);
  const diariaAtual = metaDiariaVigente(regras.metas, hoje);
  const mensalAtual = metaVigente(regras.metas, "MENSAL", `${mesAtual}-01`);
  const vigenteDiaria = metaVigente(regras.metas, "DIARIA", hoje);
  const diasSemMeta = [...regras.diasSemMetaLista].reverse();
  const proximos = diasSemMeta.filter((d) => d.data >= hoje).reverse();
  const passados = diasSemMeta.filter((d) => d.data < hoje).slice(0, 30);

  return (
    <div className="grid grid-cols-1 gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">Metas</CardTitle>
          <p className="text-sm text-muted-foreground">
            Mudar a meta não altera dias passados: cada dia é avaliado com a meta vigente naquela data.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6">
          <div className="grid gap-3">
            <div className="flex items-baseline justify-between">
              <h4 className="font-medium">Meta diária</h4>
              <span className="text-sm text-muted-foreground">
                Hoje: <strong className="text-foreground">{diariaAtual}</strong> agendamentos
              </span>
            </div>
            <FormMetaDiaria atual={diariaAtual} hoje={hoje} />
          </div>
          <div className="grid gap-3 border-t pt-5">
            <div className="flex items-baseline justify-between">
              <h4 className="font-medium">Meta mensal</h4>
              <span className="text-sm text-muted-foreground">
                {formatarMes(mesAtual)}:{" "}
                <strong className="text-foreground">
                  {mensalAtual?.valor != null ? `${mensalAtual.valor} (fixa)` : "calculada"}
                </strong>
              </span>
            </div>
            <FormMetaMensal fixaAtual={mensalAtual?.valor ?? null} mesAtual={mesAtual} />
          </div>
          <div className="grid gap-2 border-t pt-5">
            <h4 className="font-medium">Histórico de metas</h4>
            <ul className="divide-y text-sm">
              {metas.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="flex items-center gap-2">
                    <Badge tom={m.tipo === "DIARIA" ? "primario" : "neutro"}>{m.tipo === "DIARIA" ? "Diária" : "Mensal"}</Badge>
                    <span>
                      <strong>{m.valor ?? "calculada"}</strong>{" "}
                      {m.tipo === "DIARIA" ? `desde ${formatarDia(m.vigenteDesde)}` : `a partir de ${formatarMes(m.vigenteDesde.slice(0, 7))}`}
                    </span>
                    {m.id === metas.find((x) => x.tipo === "DIARIA" && x.vigenteDesde === vigenteDiaria?.vigenteDesde)?.id && (
                      <Badge tom="ok">vigente</Badge>
                    )}
                    {m.vigenteDesde > hoje && <Badge tom="aviso">futura</Badge>}
                  </div>
                  <BotaoExcluirMeta id={m.id} />
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">Jornada padrão</CardTitle>
          <p className="text-sm text-muted-foreground">
            Usada no indicador de ritmo. Você pode ajustar a jornada de cada dia direto na tela Hoje.
          </p>
        </CardHeader>
        <CardContent>
          <FormJornada inicio={regras.jornadaPadrao.inicio} fim={regras.jornadaPadrao.fim} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">Dias sem meta</CardTitle>
          <p className="text-sm text-muted-foreground">
            Feriados, folgas e férias não contam como dia útil. Para férias, informe a data final.
          </p>
        </CardHeader>
        <CardContent className="grid gap-5">
          <FormDiaSemMeta hoje={hoje} />
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { titulo: "Próximos", itens: proximos },
              { titulo: "Anteriores", itens: passados },
            ].map((g) => (
              <div key={g.titulo}>
                <h4 className="mb-1 text-sm font-medium text-muted-foreground">{g.titulo}</h4>
                {g.itens.length === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">Nenhum.</p>
                ) : (
                  <ul className="divide-y text-sm">
                    {g.itens.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-2 py-1.5">
                        <span>
                          {formatarDia(d.data)} <span className="text-muted-foreground">({SEMANA[diaDaSemana(d.data)]})</span> ·{" "}
                          {rotuloMotivo[d.motivo as Motivo]}
                          {d.descricao && <span className="text-muted-foreground"> — {d.descricao}</span>}
                        </span>
                        <BotaoExcluirDiaSemMeta id={d.id} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">Exportar e backup</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <h4 className="mb-2 text-sm font-medium">Exportar CSV (abre no Excel)</h4>
            <div className="flex flex-wrap gap-2">
              <LinkDownload href="/api/exportar/leads">Leads</LinkDownload>
              <LinkDownload href="/api/exportar/ligacoes">Ligações</LinkDownload>
              <LinkDownload href="/api/exportar/agendamentos">Agendamentos</LinkDownload>
            </div>
          </div>
          <div className="border-t pt-4">
            <h4 className="mb-2 text-sm font-medium">Backup completo (JSON)</h4>
            <div className="flex flex-wrap gap-2">
              <LinkDownload href="/api/backup">Baixar backup</LinkDownload>
              <Restaurar />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
