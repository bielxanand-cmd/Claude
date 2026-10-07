"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Campo, Input, Select } from "@/components/ui/input";
import { Confirmar } from "@/components/comum/confirmar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MOTIVOS, rotuloMotivo } from "@/lib/rotulos";
import {
  adicionarDiasSemMeta,
  excluirDiaSemMeta,
  excluirMeta,
  salvarJornadaPadrao,
  salvarMetaDiaria,
  salvarMetaMensal,
} from "@/server/actions/config";
import type { Resultado } from "@/server/actions/registros";

function useAcao() {
  const [pendente, iniciar] = useTransition();
  const executar = (acao: () => Promise<Resultado<unknown>>, msg: string, depois?: () => void) =>
    iniciar(async () => {
      const r = await acao();
      if (r.ok) {
        toast.success(msg);
        depois?.();
      } else toast.error(r.erro);
    });
  return { pendente, executar };
}

export function FormMetaDiaria({ atual, hoje }: { atual: number; hoje: string }) {
  const [valor, setValor] = useState(String(atual));
  const [desde, setDesde] = useState(hoje);
  const { pendente, executar } = useAcao();
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        executar(() => salvarMetaDiaria(Number(valor), desde), "Meta diária salva");
      }}
    >
      <Campo label="Agendamentos por dia">
        <Input type="number" min={0} max={1000} inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} required />
      </Campo>
      <Campo label="Vale a partir de">
        <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} required />
      </Campo>
      <Button type="submit" disabled={pendente}>Salvar meta diária</Button>
    </form>
  );
}

export function FormMetaMensal({ fixaAtual, mesAtual }: { fixaAtual: number | null; mesAtual: string }) {
  const [modo, setModo] = useState<"calculada" | "fixa">(fixaAtual != null ? "fixa" : "calculada");
  const [valor, setValor] = useState(fixaAtual != null ? String(fixaAtual) : "");
  const [mes, setMes] = useState(mesAtual);
  const { pendente, executar } = useAcao();
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        executar(() => salvarMetaMensal(modo === "fixa" ? Number(valor) : null, mes), "Meta mensal salva");
      }}
    >
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" name="modo" checked={modo === "calculada"} onChange={() => setModo("calculada")} />
          Calcular (meta diária × dias úteis)
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="modo" checked={modo === "fixa"} onChange={() => setModo("fixa")} />
          Valor fixo
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Campo label="Agendamentos no mês">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            disabled={modo === "calculada"}
            required={modo === "fixa"}
            placeholder={modo === "calculada" ? "calculado" : ""}
          />
        </Campo>
        <Campo label="A partir do mês">
          <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} required />
        </Campo>
        <Button type="submit" disabled={pendente}>Salvar meta mensal</Button>
      </div>
    </form>
  );
}

export function BotaoExcluirMeta({ id }: { id: string }) {
  return (
    <Confirmar
      titulo="Excluir esta meta do histórico?"
      descricao="Os dias do período dela passarão a ser avaliados pela meta anterior."
      acao={() => excluirMeta(id)}
      sucesso="Meta excluída"
    >
      {(a) => (
        <Button variant="ghost" size="icon" aria-label="Excluir meta" onClick={a}>
          <Trash2 />
        </Button>
      )}
    </Confirmar>
  );
}

export function FormJornada({ inicio, fim }: { inicio: string; fim: string }) {
  const [ini, setIni] = useState(inicio);
  const [fi, setFi] = useState(fim);
  const { pendente, executar } = useAcao();
  return (
    <form
      className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        executar(() => salvarJornadaPadrao(ini, fi), "Jornada padrão salva");
      }}
    >
      <Campo label="Início">
        <Input type="time" value={ini} onChange={(e) => setIni(e.target.value)} required />
      </Campo>
      <Campo label="Fim">
        <Input type="time" value={fi} onChange={(e) => setFi(e.target.value)} required />
      </Campo>
      <Button type="submit" disabled={pendente} className="col-span-2 sm:col-span-1">Salvar jornada</Button>
    </form>
  );
}

export function FormDiaSemMeta({ hoje }: { hoje: string }) {
  const [de, setDe] = useState(hoje);
  const [ate, setAte] = useState("");
  const [motivo, setMotivo] = useState<string>("FERIADO");
  const [descricao, setDescricao] = useState("");
  const { pendente, executar } = useAcao();
  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.5fr_auto] lg:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        executar(() => adicionarDiasSemMeta(de, ate || null, motivo, descricao), "Dia(s) sem meta cadastrado(s)", () => {
          setAte("");
          setDescricao("");
        });
      }}
    >
      <Campo label="Data">
        <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} required />
      </Campo>
      <Campo label="Até (opcional)">
        <Input type="date" value={ate} min={de} onChange={(e) => setAte(e.target.value)} />
      </Campo>
      <Campo label="Motivo">
        <Select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
          {MOTIVOS.map((m) => (
            <option key={m} value={m}>{rotuloMotivo[m]}</option>
          ))}
        </Select>
      </Campo>
      <Campo label="Descrição (opcional)">
        <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Proclamação da República" />
      </Campo>
      <Button type="submit" disabled={pendente}>Adicionar</Button>
    </form>
  );
}

export function BotaoExcluirDiaSemMeta({ id }: { id: string }) {
  const { pendente, executar } = useAcao();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Remover dia sem meta"
      disabled={pendente}
      onClick={() => executar(() => excluirDiaSemMeta(id), "Dia removido")}
    >
      <Trash2 />
    </Button>
  );
}

export function Restaurar() {
  const ref = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          setArquivo(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      <Button variant="outline" onClick={() => ref.current?.click()}>
        <Upload /> Restaurar backup
      </Button>
      <Dialog open={!!arquivo} onOpenChange={(o) => !o && setArquivo(null)}>
        <DialogContent
          titulo="Restaurar backup?"
          descricao={`Todos os dados atuais serão substituídos pelos do arquivo "${arquivo?.name}". Faça um backup antes, se precisar.`}
        >
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setArquivo(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  try {
                    const texto = await arquivo!.text();
                    const resp = await fetch("/api/backup", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: texto,
                    });
                    const r = (await resp.json()) as { ok: boolean; erro?: string; resumo?: string };
                    if (r.ok) {
                      toast.success(r.resumo ?? "Backup restaurado");
                      setArquivo(null);
                      router.refresh();
                    } else toast.error(r.erro ?? "Falha ao restaurar");
                  } catch {
                    toast.error("Não foi possível ler o arquivo.");
                  }
                })
              }
            >
              {pendente ? "Restaurando..." : "Substituir dados"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function LinkDownload({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button asChild variant="outline">
      <a href={href} download>
        <Download /> {children}
      </a>
    </Button>
  );
}
