"use client";
import { Modal } from "./Modal";

const GRUPOS: [string, [string, string][]][] = [
  ["Em qualquer tela", [["N", "Novo lead"], ["Q", "Modo Plantão (fila)"], ["L", "Leads"], ["R", "Reuniões"], ["D", "Dashboard"], ["?", "Esta ajuda"]]],
  ["Na fila (Plantão)", [["J / ↓", "Próximo item"], ["K / ↑", "Item anterior"], ["Enter", "Abrir item selecionado"], ["Espaço", "Abrir o 1º item da fila"]]],
  ["No atendimento do lead", [
    ["1", "Não atendeu"], ["2", "Atendeu - agendou"], ["3", "Atendeu - retornar depois"], ["4", "Desqualificado"], ["5", "Número inválido"],
    ["6", "Mensagem enviada"], ["W", "Abrir WhatsApp com a mensagem"], ["C", "Copiar mensagem"], ["E", "Abrir e-mail"], ["Esc", "Voltar para a fila"],
  ]],
];

export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Atalhos de teclado" onClose={onClose} wide>
      <div className="grid gap-5 sm:grid-cols-3">
        {GRUPOS.map(([t, items]) => (
          <div key={t}>
            <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">{t}</h3>
            <ul className="space-y-1 text-sm">
              {items.map(([k, d]) => (
                <li key={k} className="flex items-center gap-2"><span className="kbd min-w-8 text-center text-xs">{k}</span>{d}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  );
}
