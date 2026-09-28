// Valores iniciais. Tudo aqui é editável na tela /config.

export const DEFAULT_SETTINGS = {
  id: 1,
  produto:
    "Consultoria que ajuda empresas a organizar e acelerar o processo comercial.",
  nomeSdr: "Seu nome",
  empresa: "Sua empresa",
  horaInicio: "08:00",
  horaFim: "17:00",
  diasUteis: "1,2,3,4,5",
  metaReunioes: 10,
  slaMinutos: 5,
  duracaoReuniao: 30,
  scriptAbertura:
    "Oi {nome}, tudo bem? Aqui é {sdr}, da {empresa}. Vi que você acabou de se inscrever sobre {interesse} — tem 2 minutinhos agora?",
  pergunta1: "Qual é hoje o principal desafio que te fez buscar isso?",
  pergunta2: "Qual o tamanho da empresa / da equipe envolvida?",
  pergunta3: "Para quando vocês querem resolver isso?",
  scriptFechamento:
    "Faz sentido a gente conversar com calma com um especialista. Tenho {horario1} ou {horario2} — qual fica melhor pra você?",
  metaContato: 0.5,
  metaAgendamento: 0.35,
  metaNoShow: 0.2,
  webhookToken: null as string | null,
};

export const DEFAULT_TEMPLATES = [
  {
    key: "wa_d0",
    canal: "WHATSAPP",
    nome: "D0 - WhatsApp após ligação",
    corpo:
      "Oi {nome}, tudo bem? Aqui é {sdr}, da {empresa} 👋\nAcabei de te ligar sobre sua inscrição em {interesse}. Queria entender rapidinho seu cenário e te mostrar como podemos ajudar.\nTenho {horario1} ou {horario2}, qual fica melhor?",
  },
  {
    key: "email_d0",
    canal: "EMAIL",
    nome: "D0 - E-mail de apresentação",
    assunto: "{nome}, sobre sua inscrição em {interesse}",
    corpo:
      "Olá {nome},\n\nSou {sdr}, da {empresa}. Recebi sua inscrição sobre {interesse} e tentei te ligar agora há pouco.\n\n{produto}\n\nQue tal uma conversa rápida de 30 minutos? Tenho {horario1} ou {horario2}.\n\nAbraço,\n{sdr}",
  },
  {
    key: "wa_d1",
    canal: "WHATSAPP",
    nome: "D1 - WhatsApp follow-up",
    corpo:
      "Oi {nome}! Tentei falar com você de novo agora. Ainda tem interesse em {interesse}? Se preferir, me diz o melhor horário que eu te ligo 🙂",
  },
  {
    key: "email_d4",
    canal: "EMAIL",
    nome: "D4 - E-mail de follow-up",
    assunto: "Ainda faz sentido conversarmos, {nome}?",
    corpo:
      "Oi {nome},\n\nTentei contato algumas vezes nos últimos dias sobre {interesse}. Sei que a rotina é corrida!\n\nSe fizer sentido, tenho {horario1} ou {horario2} para uma conversa rápida.\n\nAbraço,\n{sdr}",
  },
  {
    key: "wa_d7",
    canal: "WHATSAPP",
    nome: "D7 - Encerramento",
    corpo:
      "Oi {nome}, tentei falar com você algumas vezes sobre {interesse}. Como não consegui retorno, vou fechar seu cadastro por aqui. Ainda faz sentido pra você? Se sim, é só me responder que a gente marca 🙂",
  },
  {
    key: "wa_confirma",
    canal: "WHATSAPP",
    nome: "Confirmação de reunião",
    corpo:
      "Oi {nome}! Passando para confirmar nossa conversa {reuniao}. Está de pé? Qualquer imprevisto me avisa que a gente remarca 🙂",
  },
];

export const DEFAULT_CADENCE: {
  ordem: number;
  dia: number;
  canal: string;
  titulo: string;
  template?: string;
}[] = [
  { ordem: 1, dia: 0, canal: "LIGACAO", titulo: "Ligação imediata" },
  { ordem: 2, dia: 0, canal: "WHATSAPP", titulo: "WhatsApp imediato", template: "wa_d0" },
  { ordem: 3, dia: 0, canal: "EMAIL", titulo: "E-mail de apresentação", template: "email_d0" },
  { ordem: 4, dia: 1, canal: "LIGACAO", titulo: "Ligação D1" },
  { ordem: 5, dia: 1, canal: "WHATSAPP", titulo: "WhatsApp D1", template: "wa_d1" },
  { ordem: 6, dia: 2, canal: "LIGACAO", titulo: "Ligação D2" },
  { ordem: 7, dia: 4, canal: "LIGACAO", titulo: "Ligação D4" },
  { ordem: 8, dia: 4, canal: "EMAIL", titulo: "E-mail D4", template: "email_d4" },
  { ordem: 9, dia: 7, canal: "WHATSAPP", titulo: "Mensagem de encerramento", template: "wa_d7" },
];
