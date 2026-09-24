import type { AppSettings, CaseDef, Executive, ModuleDef } from '@/lib/types'

let order = 0
const mod = (
  id: string,
  name: string,
  category: ModuleDef['category'],
  defaultPrice: number,
  description: string,
): ModuleDef => ({ id, name, category, defaultPrice, description, active: true, sortOrder: order++ })

/** Biblioteca inicial. Módulos com preço entram automaticamente na tabela de investimento. */
export const SEED_MODULES: ModuleDef[] = [
  mod('mod-pontos', 'Pontos Cibus', 'Fidelidade', 249, 'Programa de pontos com regras flexíveis por produto e forma de pagamento.'),
  mod('mod-desconto', 'Desconto', 'Fidelidade', 249, 'Descontos exclusivos para clientes identificados.'),
  mod('mod-cashback', 'Cashback', 'Fidelidade', 249, 'Parte do valor da compra volta como saldo para a próxima visita.'),
  mod('mod-roleta', 'Roleta Premiada', 'Engajamento', 249, 'Roleta da sorte com prêmios configuráveis a cada compra.'),
  mod('mod-whatsapp', 'Comunicação WhatsApp', 'Comunicação', 149.9, 'Disparos segmentados e jornadas automáticas via WhatsApp.'),
  mod('mod-sorteio', 'Sorteio', 'Engajamento', 79.9, 'Sorteios com números da sorte gerados automaticamente.'),
  mod('mod-campanhas', 'Plataforma de Campanhas', 'Marketing', 79.9, 'Criação e gestão de campanhas promocionais.'),
  mod('mod-inteligencia', 'Inteligência Cibus', 'Inteligência', 39.9, 'Indicadores e insights sobre o comportamento dos clientes.'),
  mod('mod-regras', 'Regras de fidelidade', 'Fidelidade', 0, 'Regras por produto, dia, horário e perfil de cliente.'),
  mod('mod-raspadinha', 'Raspadinha', 'Engajamento', 0, 'Raspadinha digital com prêmios instantâneos.'),
  mod('mod-gamificacao', 'Gamificação', 'Engajamento', 0, 'Missões, níveis e conquistas para aumentar a recorrência.'),
  mod('mod-sms', 'SMS', 'Comunicação', 0, 'Mensagens SMS transacionais e promocionais.'),
  mod('mod-push', 'Push Notifications', 'Comunicação', 0, 'Notificações no aplicativo do cliente.'),
  mod('mod-segmentacao', 'Segmentação', 'Marketing', 0, 'Públicos por frequência, ticket e comportamento.'),
  mod('mod-promocoes', 'Promoções', 'Marketing', 0, 'Ofertas por produto, horário e público.'),
  mod('mod-dashboard', 'Dashboard', 'Inteligência', 0, 'Painel com os principais indicadores da operação.'),
  mod('mod-insights', 'Insights', 'Inteligência', 0, 'Recomendações automáticas de ações.'),
  mod('mod-ia', 'Inteligência Artificial', 'Inteligência', 0, 'Modelos que antecipam churn e sugerem ofertas.'),
  mod('mod-ranking', 'Ranking de frentistas', 'Operação', 0, 'Engajamento da equipe com metas e ranking.'),
  mod('mod-metas', 'Gestão de metas', 'Operação', 0, 'Metas por posto, equipe e produto.'),
  mod('mod-vouchers', 'Vouchers', 'Operação', 0, 'Emissão e validação de vouchers.'),
  mod('mod-paineis', 'Painéis gerenciais', 'Operação', 0, 'Visão consolidada da rede para a gestão.'),
]

export const SEED_CASES: CaseDef[] = [
  {
    id: 'case-tucuma',
    name: 'Posto Tucumã',
    company: 'Posto Tucumã',
    segment: 'Posto de combustível',
    location: 'Tucumã — PA',
    headline: 'Mais resultado com uma operação de fidelidade mais eficiente.',
    description:
      '<p>Com o programa de fidelidade Cibus, o posto passou a identificar seus clientes, criar campanhas segmentadas e incentivar a volta com recompensas a cada abastecimento.</p>',
    logo: '',
    image: '',
    metrics: [
      { name: 'Ticket médio', value: 'R$ 58,50 → R$ 85,40' },
      { name: 'Aumento', value: '+45,98%' },
    ],
    active: true,
  },
  {
    id: 'case-rpb',
    name: 'Rede RPB',
    company: 'Rede RPB',
    segment: 'Rede de postos',
    location: '',
    headline: 'Fidelidade padronizada em toda a rede.',
    description: '',
    logo: '',
    image: '',
    metrics: [],
    active: true,
  },
  {
    id: 'case-baratao',
    name: 'Baratão da Construção',
    company: 'Baratão da Construção',
    segment: 'MATCON',
    location: '',
    headline: 'Recorrência no varejo de materiais de construção.',
    description: '',
    logo: '',
    image: '',
    metrics: [],
    active: true,
  },
]

export const SEED_EXECUTIVES: Executive[] = [
  {
    id: 'exec-default',
    name: 'Executivo Cibus',
    email: 'comercial@cibus.com.br',
    phone: '',
    whatsapp: '',
    role: 'Executivo de Contas',
    photo: '',
    active: true,
  },
]

export const DEFAULT_SETTINGS: AppSettings = {
  logo: '',
  logoDark: '',
  brandColor: '#FF5C00',
  inkColor: '#101828',
  roiUrl: 'https://cibus.com.br/calculadora-roi',
  site: 'cibus.com.br',
  contactEmail: 'comercial@cibus.com.br',
  contactPhone: '',
  defaults: {
    coverTitle: 'Transforme cada compra em um *novo motivo para voltar*',
    coverSubtitle: 'Proposta Comercial Cibus',
    proposalTitle: 'Proposta Comercial Cibus Fuel',
    validity: 'Proposta válida por 15 dias',
    implementationPrice: 6000,
    note: 'Sem taxa por transação.',
    closingTitle: 'Vamos transformar cada compra em um *novo motivo para voltar?*',
  },
}
