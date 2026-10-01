import { normalize } from '@/lib/text'

/**
 * Vocabulário típico de assuntos frequentes em concursos: palavras e
 * expressões que aparecem nas questões mesmo quando o nome do assunto não
 * aparece (ex.: "habeas corpus" → Remédios constitucionais). Usado pela
 * classificação automática de provas. A chave casa com o nome do assunto
 * (sem acentos); os termos casam com o texto da questão.
 */
const HINTS: [RegExp, string[]][] = [
  // Língua Portuguesa
  [/crase/, ['acento grave', 'crase']],
  [/concordancia/, ['concordancia', 'concorda', 'flexao do verbo', 'singular', 'plural']],
  [/regencia/, ['regencia', 'preposicao', 'transitivo direto', 'transitivo indireto']],
  [/pontuacao/, ['virgula', 'virgulas', 'ponto e virgula', 'dois pontos', 'travessao', 'pontuacao']],
  [/colocacao pronominal/, ['proclise', 'enclise', 'mesoclise', 'pronome obliquo', 'colocacao pronominal']],
  [/acentuacao/, ['acento agudo', 'acento circunflexo', 'acentuacao', 'oxitona', 'paroxitona', 'proparoxitona']],
  [/ortografia/, ['grafia', 'ortografia', 'hifen']],
  [/classes de palavras|morfologia/, ['substantivo', 'adjetivo', 'adverbio', 'conjuncao', 'classe gramatical', 'pronome relativo']],
  [/coesao|coerencia/, ['coesao', 'coerencia', 'referente', 'retoma', 'elemento coesivo', 'conectivo']],
  [/reescrita/, ['reescrita', 'reescrito', 'substituicao', 'preservando o sentido', 'mantendo a correcao']],
  [/interpretacao|compreensao/, ['de acordo com o texto', 'infere se', 'depreende se', 'ideia central', 'o autor', 'no texto']],
  [/tipologia|generos textuais/, ['genero textual', 'tipo textual', 'dissertativo', 'narrativo', 'argumentativo', 'descritivo']],
  // Direito Constitucional
  [/remedios constitucionais/, ['habeas corpus', 'habeas data', 'mandado de seguranca', 'mandado de injuncao', 'acao popular']],
  [/direitos e garantias fundamentais|direitos fundamentais|direitos individuais/, ['direito fundamental', 'direitos fundamentais', 'inviolabilidade do domicilio', 'liberdade de expressao', 'liberdade de reuniao', 'liberdade de associacao', 'direito de propriedade', 'principio da igualdade']],
  [/nacionalidade/, ['nacionalidade', 'brasileiro nato', 'naturalizado', 'naturalizacao']],
  [/direitos politicos/, ['direitos politicos', 'elegibilidade', 'inelegivel', 'alistamento eleitoral', 'sufragio']],
  [/direitos sociais/, ['direitos sociais', 'salario minimo', 'ferias', 'decimo terceiro', 'greve']],
  [/poder legislativo/, ['congresso nacional', 'camara dos deputados', 'senado federal', 'comissao parlamentar de inquerito', 'cpi', 'imunidade parlamentar']],
  [/processo legislativo/, ['emenda constitucional', 'medida provisoria', 'lei complementar', 'sancao', 'veto', 'iniciativa', 'quorum']],
  [/poder executivo/, ['presidente da republica', 'vice presidente', 'ministros de estado', 'crime de responsabilidade']],
  [/poder judiciario/, ['supremo tribunal federal', 'stf', 'superior tribunal de justica', 'stj', 'magistratura', 'sumula vinculante']],
  [/controle de constitucionalidade/, ['acao direta de inconstitucionalidade', 'adi', 'adpf', 'controle difuso', 'controle concentrado', 'inconstitucionalidade']],
  [/organizacao politico administrativa/, ['uniao', 'estados membros', 'municipios', 'distrito federal', 'intervencao federal', 'competencia comum', 'competencia concorrente']],
  [/defesa do estado/, ['estado de defesa', 'estado de sitio', 'forcas armadas', 'seguranca publica', 'policia rodoviaria federal', 'policia federal']],
  [/poder constituinte/, ['poder constituinte', 'clausula petrea', 'clausulas petreas', 'emenda constitucional', 'revisao constitucional']],
  [/funcoes essenciais/, ['ministerio publico', 'defensoria publica', 'advocacia publica', 'advocacia geral da uniao']],
  // Direito Administrativo
  [/principios da administracao/, ['impessoalidade', 'moralidade administrativa', 'principio da legalidade', 'principio da eficiencia', 'limpe']],
  [/organizacao administrativa/, ['autarquia', 'fundacao publica', 'empresa publica', 'sociedade de economia mista', 'administracao indireta', 'desconcentracao', 'descentralizacao']],
  [/poderes administrativos/, ['poder de policia', 'poder hierarquico', 'poder disciplinar', 'poder regulamentar', 'abuso de poder', 'desvio de finalidade']],
  [/atos administrativos/, ['ato administrativo', 'anulacao', 'revogacao', 'convalidacao', 'motivo', 'discricionario', 'vinculado', 'presuncao de legitimidade']],
  [/agentes publicos/, ['servidor publico', 'cargo publico', 'estagio probatorio', 'estabilidade', 'concurso publico', 'lei 8112', 'provimento']],
  [/licitac/, ['licitacao', 'pregao', 'concorrencia', 'dispensa de licitacao', 'inexigibilidade', '14133', 'dialogo competitivo']],
  [/contratos administrativos/, ['contrato administrativo', 'clausulas exorbitantes', 'equilibrio economico financeiro', 'rescisao']],
  [/responsabilidade civil do estado/, ['responsabilidade objetiva', 'responsabilidade civil do estado', 'direito de regresso', 'teoria do risco administrativo']],
  [/improbidade/, ['improbidade', 'enriquecimento ilicito', 'lei 8429']],
  [/processo administrativo/, ['processo administrativo', '9784', 'recurso administrativo']],
  [/servicos publicos/, ['concessao', 'permissao', 'servico publico', 'delegacao']],
  [/bens publicos/, ['bens publicos', 'bens dominicais', 'bens de uso comum', 'imprescritibilidade', 'impenhorabilidade']],
  [/controle da administracao/, ['tribunal de contas', 'controle externo', 'controle interno', 'autotutela']],
  // Penal e Processo Penal
  [/crimes contra a pessoa/, ['homicidio', 'lesao corporal', 'feminicidio', 'infanticidio']],
  [/crimes contra o patrimonio/, ['furto', 'roubo', 'extorsao', 'estelionato', 'receptacao', 'apropriacao indebita']],
  [/crimes contra a administracao publica/, ['peculato', 'concussao', 'corrupcao passiva', 'corrupcao ativa', 'prevaricacao']],
  [/inquerito policial/, ['inquerito policial', 'autoridade policial', 'indiciamento', 'notitia criminis']],
  [/prisao|prisoes/, ['prisao em flagrante', 'prisao preventiva', 'prisao temporaria', 'flagrante']],
  [/acao penal/, ['acao penal', 'denuncia', 'queixa crime', 'representacao do ofendido']],
  [/provas/, ['prova ilicita', 'interceptacao telefonica', 'busca e apreensao', 'cadeia de custodia', 'exame de corpo de delito']],
  [/teoria do crime|fato tipico/, ['dolo', 'culpa', 'ilicitude', 'culpabilidade', 'tentativa', 'consumacao', 'excludente']],
  // Legislação de trânsito
  [/transito|ctb/, ['codigo de transito', 'ctb', 'contran', 'condutor', 'veiculo', 'infracao de transito', 'habilitacao', 'cnh']],
  // Informática / TI
  [/seguranca da informacao/, ['malware', 'virus', 'phishing', 'firewall', 'criptografia', 'backup', 'ransomware', 'antivirus']],
  [/redes de computadores|internet|redes/, ['protocolo', 'tcp', 'ip', 'dns', 'http', 'roteador', 'lan', 'wi fi', 'navegador']],
  [/banco de dados|sql/, ['sql', 'select', 'tabela', 'chave primaria', 'banco de dados', 'join']],
  [/lgpd|protecao de dados/, ['lgpd', 'dados pessoais', 'titular dos dados', 'controlador', 'operador', '13709']],
  // Raciocínio lógico
  [/proposicoes|conectivos|tabelas verdade|equivalencias|negacao/, ['proposicao', 'conectivo', 'tabela verdade', 'equivalente', 'negacao', 'condicional', 'bicondicional', 'tautologia']],
  [/combinatoria/, ['permutacao', 'arranjo', 'combinacao', 'anagrama', 'de quantas maneiras']],
  [/probabilidade/, ['probabilidade', 'chance', 'aleatoriamente', 'ao acaso']],
  [/porcentagem|proporc/, ['porcentagem', 'percentual', 'razao', 'proporcao', 'regra de tres']],
  // Contabilidade e tributário
  [/balanco patrimonial/, ['balanco patrimonial', 'ativo circulante', 'passivo circulante', 'patrimonio liquido']],
  [/demonstracao do resultado/, ['dre', 'receita liquida', 'lucro bruto', 'resultado do exercicio']],
  [/depreciacao|imobilizado/, ['depreciacao', 'imobilizado', 'vida util', 'valor residual']],
  [/estoques/, ['estoque', 'peps', 'custo medio', 'inventario']],
  [/competencia tributaria/, ['competencia tributaria', 'bitributacao', 'competencia residual']],
  [/limitacoes ao poder de tributar/, ['imunidade tributaria', 'anterioridade', 'noventena', 'legalidade tributaria', 'confisco']],
  [/credito tributario/, ['lancamento', 'credito tributario', 'decadencia', 'prescricao']],
  [/suspensao do credito/, ['moratoria', 'parcelamento', 'deposito do montante integral', 'liminar']],
  [/extincao do credito/, ['pagamento', 'compensacao', 'transacao', 'remissao', 'decadencia', 'prescricao']],
  [/exclusao do credito/, ['isencao', 'anistia']],
]

/** Termos extras do vocabulário para um assunto (pelo nome). */
export function hintsFor(topicName: string): string[] {
  const n = normalize(topicName).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ')
  return HINTS.filter(([re]) => re.test(n)).flatMap(([, terms]) => terms)
}
