import * as React from 'react'
import { cn } from '@/lib/utils'

export const inputClass =
  'w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground shadow-soft outline-none transition placeholder:text-subtle hover:border-border-strong focus:border-primary focus:ring-4 focus:ring-ring/25 disabled:opacity-60'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(inputClass, 'h-11', className)} {...props} />
))
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(inputClass, 'min-h-28 py-3 leading-6', className)} {...props} />,
)
Textarea.displayName = 'Textarea'

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-sm font-semibold text-foreground', className)} {...props} />
}
