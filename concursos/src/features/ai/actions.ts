import { BrainCircuit, FileQuestion, Layers3, Lightbulb, Wand2, type LucideIcon } from 'lucide-react'

/**
 * Registro das ações de IA planejadas. A UI já renderiza os botões a partir
 * deste registro; para ativar uma ação basta implementar um `AiProvider` e
 * marcar `available: true`.
 */
export type AiActionId = 'summarize' | 'questions' | 'flashcards' | 'explain' | 'mind_map'

export interface AiAction {
  id: AiActionId
  label: string
  description: string
  icon: LucideIcon
  available: boolean
}

export const AI_ACTIONS: AiAction[] = [
  { id: 'summarize', label: 'Resumir conteúdo', description: 'Gera um resumo a partir do assunto e das suas anotações.', icon: Wand2, available: false },
  { id: 'questions', label: 'Criar questões', description: 'Questões no estilo das bancas para o assunto.', icon: FileQuestion, available: false },
  { id: 'flashcards', label: 'Criar flashcards', description: 'Cartões para revisão espaçada.', icon: Layers3, available: false },
  { id: 'explain', label: 'Explicar assunto', description: 'Explicação didática com exemplos.', icon: Lightbulb, available: false },
  { id: 'mind_map', label: 'Criar mapa mental', description: 'Estrutura visual dos principais conceitos.', icon: BrainCircuit, available: false },
]

/** Contexto enviado ao provedor de IA: tudo que ele precisa sobre o assunto. */
export interface AiTopicContext {
  positionName: string
  subjectName: string
  topicName: string
  /** Seções do resumo do usuário, em texto plano */
  userNotes: string
  /** Editais em que o assunto apareceu (para contextualizar a cobrança) */
  sources: string[]
}

export interface AiProvider {
  run(action: AiActionId, context: AiTopicContext): Promise<{ html: string } | { items: unknown[] }>
}
