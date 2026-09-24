import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold [&_svg]:size-3',
  {
    variants: {
      variant: {
        neutral: 'bg-foreground/[0.06] text-muted',
        primary: 'bg-primary-tint text-primary-strong dark:text-primary-soft',
        success: 'bg-success-tint text-success-strong',
        warning: 'bg-warning-tint text-[#b45309] dark:text-warning',
        danger: 'bg-danger-tint text-danger',
        outline: 'border border-border text-muted',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
