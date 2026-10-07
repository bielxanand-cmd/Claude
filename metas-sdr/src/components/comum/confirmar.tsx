"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Resultado } from "@/server/actions/registros";

/** Envolve um gatilho e pede confirmação antes de executar uma ação destrutiva. */
export function Confirmar({
  titulo,
  descricao,
  rotulo = "Excluir",
  acao,
  sucesso,
  children,
}: {
  titulo: string;
  descricao?: string;
  rotulo?: string;
  acao: () => Promise<Resultado<unknown>>;
  sucesso?: string;
  children: (abrir: () => void) => React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();
  return (
    <>
      {children(() => setAberto(true))}
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent titulo={titulo} descricao={descricao}>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  const r = await acao();
                  if (r.ok) {
                    if (sucesso) toast.success(sucesso);
                    setAberto(false);
                  } else toast.error(r.erro);
                })
              }
            >
              {pendente ? "Aguarde..." : rotulo}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
