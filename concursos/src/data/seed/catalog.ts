import type { Career, Position, Sphere } from '@/domain/types'

export const SEED_CAREERS: Career[] = [
  { id: 'tribunais', slug: 'tribunais', name: 'Tribunais', description: 'Analistas, técnicos e oficiais de justiça do Judiciário.', icon: 'gavel' },
  { id: 'fiscal', slug: 'fiscal', name: 'Área Fiscal', description: 'Auditores e fiscais de tributos da União, estados e municípios.', icon: 'receipt' },
  { id: 'controle', slug: 'controle', name: 'Controle', description: 'Tribunais de Contas e órgãos de controle interno.', icon: 'eye' },
  { id: 'policial', slug: 'policial', name: 'Policial', description: 'Polícias Federal, Civil, Militar e Penal.', icon: 'shield' },
  { id: 'administrativa', slug: 'administrativa', name: 'Administrativa', description: 'Cargos administrativos em órgãos de todas as esferas.', icon: 'briefcase' },
  { id: 'bancaria', slug: 'bancaria', name: 'Bancária', description: 'Bancos públicos e instituições financeiras.', icon: 'banknote' },
  { id: 'legislativa', slug: 'legislativa', name: 'Legislativa', description: 'Câmaras, assembleias e Congresso Nacional.', icon: 'landmark' },
  { id: 'ministerio-publico', slug: 'ministerio-publico', name: 'Ministério Público', description: 'Promotorias e procuradorias do MP.', icon: 'scale' },
  { id: 'procuradorias', slug: 'procuradorias', name: 'Procuradorias', description: 'Advocacia pública da União, estados e municípios.', icon: 'book-marked' },
  { id: 'defensorias', slug: 'defensorias', name: 'Defensorias', description: 'Defensorias Públicas da União e dos estados.', icon: 'hand-heart' },
  { id: 'educacao', slug: 'educacao', name: 'Educação', description: 'Professores e profissionais da educação.', icon: 'graduation-cap' },
  { id: 'saude', slug: 'saude', name: 'Saúde', description: 'Profissionais de saúde da rede pública.', icon: 'heart-pulse' },
  { id: 'tecnologia', slug: 'tecnologia', name: 'Tecnologia', description: 'Analistas e técnicos de TI.', icon: 'monitor' },
  { id: 'regulacao', slug: 'regulacao', name: 'Regulação', description: 'Agências reguladoras federais e estaduais.', icon: 'sliders-horizontal' },
  { id: 'diplomacia', slug: 'diplomacia', name: 'Diplomacia', description: 'Carreira diplomática e oficial de chancelaria.', icon: 'globe' },
  { id: 'outras', slug: 'outras', name: 'Outras', description: 'Demais carreiras públicas.', icon: 'layers' },
]

const p = (id: string, careerId: string, name: string, description: string, spheres: Sphere[]): Position => ({
  id,
  careerId,
  name,
  description,
  spheres,
})

export const SEED_POSITIONS: Position[] = [
  p('auditor-fiscal-estadual', 'fiscal', 'Auditor Fiscal', 'Auditor fiscal da receita estadual (SEFAZ).', ['estadual']),
  p('agente-fiscal-rendas', 'fiscal', 'Agente Fiscal de Rendas', 'Fiscalização e arrecadação de tributos estaduais.', ['estadual']),
  p('auditor-fiscal-rfb', 'fiscal', 'Auditor Fiscal da Receita Federal', 'Auditoria e fiscalização de tributos federais.', ['federal']),
  p('analista-tributario-rfb', 'fiscal', 'Analista Tributário', 'Apoio técnico às atividades da Receita Federal.', ['federal']),
  p('fiscal-tributos-municipal', 'fiscal', 'Fiscal de Tributos', 'Fiscalização de tributos municipais (ISS, IPTU, ITBI).', ['municipal']),

  p('analista-judiciario', 'tribunais', 'Analista Judiciário — Área Judiciária', 'Atividades jurídicas nos tribunais.', ['federal', 'estadual']),
  p('tecnico-judiciario', 'tribunais', 'Técnico Judiciário — Área Administrativa', 'Apoio administrativo nos tribunais.', ['federal', 'estadual']),
  p('oficial-de-justica', 'tribunais', 'Oficial de Justiça', 'Cumprimento de mandados e diligências.', ['federal', 'estadual']),

  p('auditor-controle-externo', 'controle', 'Auditor de Controle Externo', 'Fiscalização de contas públicas nos Tribunais de Contas.', ['estadual']),

  p('agente-policia-federal', 'policial', 'Agente de Polícia Federal', 'Investigação e operações da Polícia Federal.', ['federal']),
  p('escrivao-policia-civil', 'policial', 'Escrivão de Polícia Civil', 'Formalização de procedimentos de polícia judiciária.', ['estadual']),
  p('delegado-policia-civil', 'policial', 'Delegado de Polícia Civil', 'Direção da polícia judiciária estadual.', ['estadual']),

  p('assistente-administrativo', 'administrativa', 'Assistente Administrativo', 'Rotinas administrativas em órgãos públicos.', ['federal', 'estadual', 'municipal']),

  p('escriturario', 'bancaria', 'Escriturário / Técnico Bancário', 'Atendimento e operações em bancos públicos.', ['federal']),

  p('analista-ti', 'tecnologia', 'Analista de Tecnologia da Informação', 'Desenvolvimento, dados e infraestrutura em órgãos federais.', ['federal']),
]
