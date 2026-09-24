import { FileUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { EmptyState } from './feedback'

export function EmptyPlan() {
  return (
    <EmptyState
      icon={FileUp}
      title="Nenhum edital cadastrado para este cargo"
      description="Importe o conteúdo programático de um edital anterior. As disciplinas e os assuntos serão gerados automaticamente, com a fonte registrada."
      action={
        <Button asChild>
          <Link to="/concursos?importar=1">
            <FileUp /> Importar edital
          </Link>
        </Button>
      }
    />
  )
}
