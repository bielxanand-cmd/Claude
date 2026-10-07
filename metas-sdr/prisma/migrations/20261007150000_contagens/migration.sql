-- A plataforma deixa de cadastrar leads: ligações e agendamentos viram contagens.

-- CreateTable
CREATE TABLE "Registro" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dia" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Registro_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Registro_userId_dia_idx" ON "Registro"("userId", "dia");

-- CreateIndex
CREATE INDEX "Registro_userId_em_idx" ON "Registro"("userId", "em");

-- Migra os dados existentes. Datas ficam em milissegundos; o dia é o de São Paulo
-- (UTC-3, sem horário de verão desde 2019).
INSERT INTO "Registro" ("id", "userId", "tipo", "quantidade", "em", "dia", "createdAt")
SELECT "id", "userId", 'LIGACAO', 1, "realizadaEm",
       strftime('%Y-%m-%d', "realizadaEm" / 1000, 'unixepoch', '-3 hours'), "realizadaEm"
FROM "Ligacao";

INSERT INTO "Registro" ("id", "userId", "tipo", "quantidade", "em", "dia", "createdAt")
SELECT "id", "userId", 'AGENDAMENTO', 1, "feitoEm",
       strftime('%Y-%m-%d', "feitoEm" / 1000, 'unixepoch', '-3 hours'), "feitoEm"
FROM "Agendamento";

-- Agendamento cancelado: entra como feito e como cancelado no mesmo dia (não conta para a meta).
INSERT INTO "Registro" ("id", "userId", "tipo", "quantidade", "em", "dia", "createdAt")
SELECT "id" || '-c', "userId", 'CANCELAMENTO', 1, "feitoEm",
       strftime('%Y-%m-%d', "feitoEm" / 1000, 'unixepoch', '-3 hours'), "feitoEm"
FROM "Agendamento" WHERE "status" = 'CANCELADO';

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Agendamento";
DROP TABLE "Ligacao";
DROP TABLE "Lead";
PRAGMA foreign_keys=on;
