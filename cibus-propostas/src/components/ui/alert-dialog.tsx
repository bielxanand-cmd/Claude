import * as AD from '@radix-ui/react-alert-dialog'
import { buttonVariants } from './button'

interface ConfirmProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Confirmar', destructive, onConfirm }: ConfirmProps) {
  return (
    <AD.Root open={open} onOpenChange={onOpenChange}>
      <AD.Portal>
        <AD.Overlay className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <AD.Content className="fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-white p-6 shadow-lift data-[state=open]:animate-in data-[state=open]:zoom-in-95">
          <AD.Title className="text-lg font-bold text-ink">{title}</AD.Title>
          {description && <AD.Description className="text-sm text-muted-foreground">{description}</AD.Description>}
          <div className="flex justify-end gap-2">
            <AD.Cancel className={buttonVariants({ variant: 'outline' })}>Cancelar</AD.Cancel>
            <AD.Action className={buttonVariants({ variant: destructive ? 'destructive' : 'default' })} onClick={onConfirm}>
              {confirmLabel}
            </AD.Action>
          </div>
        </AD.Content>
      </AD.Portal>
    </AD.Root>
  )
}
