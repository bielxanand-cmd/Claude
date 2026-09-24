import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      'flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-[0_1px_2px_rgba(16,24,40,.04)] transition-colors placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/10 disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium',
      className,
    )}
    ref={ref}
    {...props}
  />
))
Input.displayName = 'Input'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      'flex min-h-[88px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-[0_1px_2px_rgba(16,24,40,.04)] placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/10 disabled:opacity-50',
      className,
    )}
    ref={ref}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export { Input, Textarea }
