/**
 * Gera ~3 meses de dados fictícios para visualizar os dashboards.
 *
 *   npm run seed            -> só roda se o banco não tiver registros
 *   npm run seed -- --force -> APAGA leads, ligações, agendamentos, metas e dias sem meta e recria tudo
 */
import { PrismaClient, type OrigemLead, type ResultadoLigacao, type StatusAgendamento } from "@prisma/client";
import { garantirUsuarioPadrao } from "../src/server/bootstrap";
import { hoje, instanteLocal, mesDe, minutosDoDia, somarDias, somarMeses } from "../src/lib/datas";
import { ehDiaUtil } from "../src/lib/metas/regras";

const db = new PrismaClient();

// PRNG determinístico para o seed ser reproduzível.
let semente = 20261007;
function aleatorio() {
  semente = (semente * 1664525 + 1013904223) % 4294967296;
  return semente / 4294967296;
}
const inteiro = (min: number, max: number) => Math.floor(aleatorio() * (max - min + 1)) + min;
const escolher = <T,>(lista: readonly T[]) => lista[Math.floor(aleatorio() * lista.length)];
function ponderado<T>(opcoes: [T, number][]): T {
  const total = opcoes.reduce((s, [, p]) => s + p, 0);
  let r = aleatorio() * total;
  for (const [v, p] of opcoes) if ((r -= p) < 0) return v;
  return opcoes[0][0];
}

const NOMES = ["Ana", "Bruno", "Carla", "Diego", "Elisa", "Fábio", "Gabriela", "Henrique", "Isabela", "João", "Karina", "Lucas", "Mariana", "Nicolas", "Olívia", "Pedro", "Rafaela", "Samuel", "Tatiane", "Vinícius"];
const SOBRENOMES = ["Silva", "Souza", "Oliveira", "Santos", "Lima", "Costa", "Pereira", "Almeida", "Ferreira", "Rodrigues", "Gomes", "Martins"];
const EMPRESAS = ["Acme Ltda", "Grupo Horizonte", "TechNova", "Construtora Alfa", "Varejo Mais", "LogPrime", "Clínica Vida", "AgroSul", "EducaBem", "FinPlus", null, null];

function horaAleatoria(dia: string, deMin = 8 * 60 + 10, ateMin = 17 * 60 + 50): Date {
  const m = inteiro(deMin, ateMin);
  return instanteLocal(dia, `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
}

async function main() {
  const forcar = process.argv.includes("--force");
  const userId = await garantirUsuarioPadrao(db);
  const existentes = (await db.lead.count({ where: { userId } })) + (await db.ligacao.count({ where: { userId } }));
  if (existentes > 0 && !forcar) {
    console.log(
      `O banco já tem ${existentes} registros. Para apagar tudo e gerar os dados fictícios, rode:\n  npm run seed -- --force`,
    );
    return;
  }

  console.log("Limpando dados do usuário...");
  await db.$transaction([
    db.agendamento.deleteMany({ where: { userId } }),
    db.ligacao.deleteMany({ where: { userId } }),
    db.lead.deleteMany({ where: { userId } }),
    db.meta.deleteMany({ where: { userId } }),
    db.diaSemMeta.deleteMany({ where: { userId } }),
    db.jornadaDia.deleteMany({ where: { userId } }),
  ]);

  const agora = new Date();
  const diaHoje = hoje(agora);
  const mesInicio = somarMeses(mesDe(diaHoje), -3);
  const inicio = `${mesInicio}-01`;
  const mesMeio = somarMeses(mesInicio, 2);

  // Histórico de metas: começou com 4/dia, subiu para 5/dia dois meses depois.
  await db.meta.createMany({
    data: [
      { userId, tipo: "DIARIA", valor: 4, vigenteDesde: inicio },
      { userId, tipo: "DIARIA", valor: 5, vigenteDesde: `${mesMeio}-01` },
    ],
  });

  // Alguns dias sem meta (um feriado e uma folga em cada mês, aproximadamente).
  const semMeta: { data: string; motivo: "FERIADO" | "FOLGA" | "FERIAS"; descricao?: string }[] = [];
  for (let m = 0; m < 4; m++) {
    const mes = somarMeses(mesInicio, m);
    let d = `${mes}-${String(inteiro(5, 25)).padStart(2, "0")}`;
    while (!ehDiaUtil(d)) d = somarDias(d, 1);
    semMeta.push({ data: d, motivo: m % 2 ? "FOLGA" : "FERIADO", descricao: m % 2 ? "Folga" : "Feriado fictício" });
  }
  await db.diaSemMeta.createMany({ data: semMeta.map((s) => ({ ...s, userId })) });
  const diasSemMeta = new Set(semMeta.map((s) => s.data));

  let totalLeads = 0;
  let totalLigacoes = 0;
  let totalAgendamentos = 0;

  for (let dia = inicio; dia <= diaHoje; dia = somarDias(dia, 1)) {
    if (!ehDiaUtil(dia) || diasSemMeta.has(dia)) continue;
    const ehHoje = dia === diaHoje;
    const limite = ehHoje ? Math.min(minutosDoDia(agora) - 1, 17 * 60 + 50) : 17 * 60 + 50;
    if (limite <= 8 * 60 + 10) continue;
    const quando = () => horaAleatoria(dia, 8 * 60 + 10, limite);

    // "Dias bons" e "dias ruins" para o gráfico ficar interessante.
    const fase = aleatorio();
    const fator = ehHoje ? (limite - 480) / 600 : 1;
    const nLeads = Math.round(inteiro(5, 12) * fator);
    const nAgend = Math.round((fase < 0.25 ? inteiro(1, 3) : fase < 0.75 ? inteiro(4, 5) : inteiro(5, 8)) * fator);
    const nLig = Math.round(inteiro(18, 38) * fator);

    const leadsDoDia: string[] = [];
    for (let i = 0; i < nLeads; i++) {
      const lead = await db.lead.create({
        data: {
          userId,
          nome: `${escolher(NOMES)} ${escolher(SOBRENOMES)}`,
          empresa: escolher(EMPRESAS),
          telefone: aleatorio() < 0.7 ? `(11) 9${inteiro(1000, 9999)}-${inteiro(1000, 9999)}` : null,
          origem: ponderado<OrigemLead>([["OUTBOUND", 5], ["INBOUND", 3], ["INDICACAO", 1.5], ["OUTRO", 0.5]]),
          entradaEm: quando(),
          status: "NOVO",
        },
      });
      leadsDoDia.push(lead.id);
    }
    totalLeads += nLeads;

    // Ligações para leads recentes (do dia ou anteriores).
    const recentes = (
      await db.lead.findMany({ where: { userId }, orderBy: { entradaEm: "desc" }, take: 40, select: { id: true } })
    ).map((l) => l.id);
    const ligacoes = Array.from({ length: nLig }, () => ({
      userId,
      leadId: recentes.length && aleatorio() < 0.85 ? escolher(recentes) : null,
      realizadaEm: quando(),
      resultado: ponderado<ResultadoLigacao>([["ATENDEU", 4], ["NAO_ATENDEU", 3], ["CAIXA_POSTAL", 2], ["RETORNAR", 1]]),
      duracaoSeg: aleatorio() < 0.6 ? inteiro(30, 900) : null,
    }));
    await db.ligacao.createMany({ data: ligacoes });
    totalLigacoes += nLig;
    const contatados = [...new Set(ligacoes.map((l) => l.leadId).filter((x): x is string => !!x))];
    await db.lead.updateMany({ where: { id: { in: contatados }, status: "NOVO" }, data: { status: "EM_CONTATO" } });

    // Agendamentos: alguns cancelados (não contam para a meta).
    const candidatos = [...contatados, ...leadsDoDia];
    for (let i = 0; i < nAgend && candidatos.length; i++) {
      const leadId = candidatos.splice(inteiro(0, candidatos.length - 1), 1)[0];
      const feitoEm = quando();
      let diaReuniao = somarDias(dia, inteiro(1, 6));
      while (!ehDiaUtil(diaReuniao)) diaReuniao = somarDias(diaReuniao, 1);
      const reuniaoEm = horaAleatoria(diaReuniao, 9 * 60, 17 * 60);
      const passou = reuniaoEm < agora;
      const status = ponderado<StatusAgendamento>(
        passou
          ? [["REALIZADO", 70], ["NO_SHOW", 15], ["CANCELADO", 10], ["MARCADO", 5]]
          : [["MARCADO", 92], ["CANCELADO", 8]],
      );
      await db.agendamento.create({ data: { userId, leadId, feitoEm, reuniaoEm, status } });
      await db.lead.update({ where: { id: leadId }, data: { status: "AGENDADO" } });
      totalAgendamentos++;
    }

    // Alguns leads antigos dados como perdidos.
    if (aleatorio() < 0.5 && recentes.length > 10) {
      await db.lead.updateMany({ where: { id: escolher(recentes.slice(10)), status: "EM_CONTATO" }, data: { status: "PERDIDO" } });
    }
  }

  console.log(
    `Pronto! ${totalLeads} leads, ${totalLigacoes} ligações e ${totalAgendamentos} agendamentos desde ${inicio.split("-").reverse().join("/")}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
