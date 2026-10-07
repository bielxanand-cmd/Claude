import "server-only";
import { cache } from "react";
import { db } from "./db";
import { garantirUsuarioPadrao } from "./bootstrap";

/**
 * Usuário da requisição atual. Hoje o app é de uso individual e sempre retorna o
 * usuário padrão; ao adicionar autenticação, basta ler o usuário da sessão aqui.
 */
export const usuarioAtualId = cache(async (): Promise<string> => {
  return garantirUsuarioPadrao(db);
});
