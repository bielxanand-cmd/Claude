// Executado antes de `npm run dev`/`npm run build`: cria o usuário padrão e a meta inicial.
import { PrismaClient } from "@prisma/client";
import { garantirUsuarioPadrao } from "../src/server/bootstrap";

const db = new PrismaClient();
garantirUsuarioPadrao(db)
  .catch((e) => {
    console.error("Falha ao preparar o banco:", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
