import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { MyContests } from '@/components/study/my-contests'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

/** "Trocar concurso": volta a um concurso já aberto ou começa outro. */
export function SwitchContestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogTitle>Trocar concurso</DialogTitle>
        <DialogDescription>Volte para um concurso que você já abriu — seu progresso, resumos e editais importados continuam lá.</DialogDescription>
        <div className="mt-5 max-h-[55dvh] overflow-y-auto pr-1">
          <MyContests onSwitched={() => onOpenChange(false)} />
        </div>
        <Button asChild variant="outline" className="mt-5 w-full">
          <Link to="/onboarding" onClick={() => onOpenChange(false)}>
            <Plus /> Escolher outro concurso
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  )
}
