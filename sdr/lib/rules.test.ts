import { test } from "node:test";
import assert from "node:assert/strict";
import { cadenceDueDates } from "./cadence";
import { normalizeLeadPayload } from "./leads";
import { confirmationDue } from "./scheduling";
import { waPhone, render } from "./templates";
import { fmtDateTime, fromLocal, isWorkingTime, nextWorkStart } from "./time";

const cfg = { horaInicio: "08:00", horaFim: "17:00", diasUteis: "1,2,3,4,5" };
// 2026-09-25 é sexta-feira
const sex = (h: number, m = 0) => fromLocal(2026, 9, 25, h, m);

test("expediente e próxima abertura", () => {
  assert.equal(isWorkingTime(cfg, sex(10)), true);
  assert.equal(isWorkingTime(cfg, sex(17)), false);
  assert.equal(fmtDateTime(nextWorkStart(cfg, sex(21))), "seg 28/09 08:00");
  assert.equal(fmtDateTime(nextWorkStart(cfg, fromLocal(2026, 9, 28, 6))), "seg 28/09 08:00");
});

test("cadência pula fim de semana e mantém o horário", () => {
  const due = cadenceDueDates(cfg, [{ dia: 0 }, { dia: 0 }, { dia: 1 }, { dia: 1 }, { dia: 2 }, { dia: 7 }], sex(10, 30));
  assert.deepEqual(due.map(fmtDateTime), [
    "sex 25/09 10:30", "sex 25/09 10:31", "seg 28/09 10:30", "seg 28/09 10:31", "ter 29/09 10:30", "ter 06/10 10:30",
  ]);
});

test("cadência limita o horário ao expediente", () => {
  const [d1] = cadenceDueDates(cfg, [{ dia: 1 }], sex(16, 55));
  assert.equal(fmtDateTime(d1), "seg 28/09 16:30");
});

test("confirmação: fim do dia útil anterior ou 2h antes no mesmo dia", () => {
  assert.equal(fmtDateTime(confirmationDue(cfg, fromLocal(2026, 9, 28, 10), sex(11))), "sex 25/09 16:30");
  assert.equal(fmtDateTime(confirmationDue(cfg, sex(15), sex(9))), "sex 25/09 13:00");
  // Se 2h antes já passou, a confirmação vence agora
  assert.equal(fmtDateTime(confirmationDue(cfg, sex(15), sex(14))), "sex 25/09 14:00");
});

test("webhook aceita campos em PT/EN e estruturas aninhadas", () => {
  assert.deepEqual(normalizeLeadPayload({ data: { first_name: "Ana", last_name: "Lima", phone: "11 9999-0000", utm_source: "ads" } }), {
    nome: "Ana Lima", telefone: "11 9999-0000", email: null, origem: "ads", interesse: null, observacao: null,
  });
  assert.equal(normalizeLeadPayload({ fields: [{ name: "Nome", value: "Bia" }] })?.nome, "Bia");
  assert.equal(normalizeLeadPayload({ foo: "bar" }), null);
});

test("templates e telefone do WhatsApp", () => {
  assert.equal(render("Oi {nome}, {x}", { nome: "Ana" }), "Oi Ana, {x}");
  assert.equal(waPhone("(11) 91234-5678"), "5511912345678");
  assert.equal(waPhone("+55 11 91234-5678"), "5511912345678");
  assert.equal(waPhone("123"), null);
});
