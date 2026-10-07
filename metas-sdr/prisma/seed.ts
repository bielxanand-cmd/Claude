/**
 * Gera ~3 meses de lançamentos fictícios para visualizar os dashboards.
 *
 *   npm run seed            -> só roda se o banco não tiver lançamentos
 *   npm run seed -- --force -> APAGA lançamentos, metas e dias sem meta e recria tudo
 */
import { PrismaClient, type TipoRegistro } from "@prisma/client";
import { garantirUsuarioPadrao } from "../src/server/bootstrap";
import { diaDe, hoje, instanteLocal, mesDe, minutosDoDia, somarDias, somarMeses } from "../src/lib/datas";
import { ehDiaUtil } from "../src/lib/metas/regras";

const db = new PrismaClient();

// PRNG determinístico para o seed ser reproduzível.
let semente = 20261007;
function aleatorio() {
  semente = (semente * 1664525 + 1013904223) % 4294967296;
  return semente / 4294967296;
}
const inteiro = (min: number, max: number) => Math.floor(aleatorio() * (max - min + 1)) + min;

function horaAleatoria(dia: string, deMin: number, ateMin: number): Date {
  const m = inteiro(deMin, ateMin);
  return instanteLocal(dia, `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
}

async function main() {
  const forcar = process.argv.includes("--force");
  const userId = await garantirUsuarioPadrao(db);
  const existentes = await db.registro.count({ where: { userId } });
  if (existentes > 0 && !forcar) {
    console.log(`O banco já tem ${existentes} lançamentos. Para apagar tudo e gerar os dados fictícios, rode:\n  npm run seed -- --force`);
    return;
  }

  console.log("Limpando dados do usuário...");
  await db.$transaction([
    db.registro.deleteMany({ where: { userId } }),
    db.meta.deleteMany({ where: { userId } }),
    db.diaSemMeta.deleteMany({ where: { userId } }),
    db.jornadaDia.deleteMany({ where: { userId } }),
  ]);

  const agora = new Date();
  const diaHoje = hoje(agora);
  const mesInicio = somarMeses(mesDe(diaHoje), -3);
  const inicio = `${mesInicio}-01`;

  // Histórico de metas: começou com 4/dia, subiu para 5/dia dois meses depois.
  await db.meta.createMany({
    data: [
      { userId, tipo: "DIARIA", valor: 4, vigenteDesde: inicio },
      { userId, tipo: "DIARIA", valor: 5, vigenteDesde: `${somarMeses(mesInicio, 2)}-01` },
    ],
  });

  // Um feriado ou folga por mês, aproximadamente.
  const semMeta: { data: string; motivo: "FERIADO" | "FOLGA"; descricao: string }[] = [];
  for (let m = 0; m < 4; m++) {
    let d = `${somarMeses(mesInicio, m)}-${String(inteiro(5, 25)).padStart(2, "0")}`;
    while (!ehDiaUtil(d)) d = somarDias(d, 1);
    semMeta.push({ data: d, motivo: m % 2 ? "FOLGA" : "FERIADO", descricao: m % 2 ? "Folga" : "Feriado fictício" });
  }
  await db.diaSemMeta.createMany({ data: semMeta.map((s) => ({ ...s, userId })) });
  const diasSemMeta = new Set(semMeta.map((s) => s.data));

  const registros: { userId: string; tipo: TipoRegistro; quantidade: number; em: Date; dia: string }[] = [];
  const add = (tipo: TipoRegistro, quantidade: number, em: Date, dia = diaDe(em)) =>
    registros.push({ userId, tipo, quantidade, em, dia });

  for (let dia = inicio; dia <= diaHoje; dia = somarDias(dia, 1)) {
    if (!ehDiaUtil(dia) || diasSemMeta.has(dia)) continue;
    const ehHoje = dia === diaHoje;
    const limite = ehHoje ? Math.min(minutosDoDia(agora) - 1, 17 * 60 + 50) : 17 * 60 + 50;
    if (limite <= 8 * 60 + 10) continue;
    const fator = ehHoje ? (limite - 480) / 600 : 1;

    // "Dias bons" e "dias ruins" para o gráfico ficar interessante.
    const fase = aleatorio();
    const nAgend = Math.round((fase < 0.25 ? inteiro(1, 3) : fase < 0.75 ? inteiro(4, 5) : inteiro(5, 8)) * fator);
    let nLig = Math.round(inteiro(18, 38) * fator);
    while (nLig > 0) {
      const q = Math.min(nLig, inteiro(3, 10));
      nLig -= q;
      add("LIGACAO", q, horaAleatoria(dia, 490, limite));
    }
    for (let i = 0; i < nAgend; i++) add("AGENDAMENTO", 1, horaAleatoria(dia, 490, limite));
    // Às vezes um agendamento é cancelado depois (lançado até 3 dias mais tarde).
    if (nAgend && aleatorio() < 0.2) {
      let quando = somarDias(dia, inteiro(0, 3));
      if (quando > diaHoje) quando = diaHoje;
      const ate = quando === diaHoje ? Math.max(541, limite) : 1070;
      add("CANCELAMENTO", 1, horaAleatoria(quando, 540, ate), dia);
    }
  }
  await db.registro.createMany({ data: registros });

  const soma = (t: TipoRegistro) => registros.filter((r) => r.tipo === t).reduce((s, r) => s + r.quantidade, 0);
  console.log(
    `Pronto! ${soma("LIGACAO")} ligações, ${soma("AGENDAMENTO")} agendamentos e ${soma("CANCELAMENTO")} cancelamentos desde ${inicio.split("-").reverse().join("/")}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
