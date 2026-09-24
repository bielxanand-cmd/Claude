import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-[0_1px_0_rgb(255_255_255/0.15)_inset,0_4px_14px_-4px_rgb(124_58_237/0.55)] hover:bg-[#6d28d9] dark:hover:bg-[#7c3aed]',
        dark: 'bg-foreground text-background hover:opacity-90',
        secondary: 'bg-primary-tint text-primary-strong hover:bg-[#ebe2ff] dark:text-primary-soft dark:hover:bg-[rgb(139_92_246/0.22)]',
        outline: 'border border-border bg-surface text-foreground shadow-soft hover:border-border-strong hover:bg-surface-2',
        ghost: 'text-muted hover:bg-foreground/5 hover:text-foreground',
        success: 'bg-success text-white shadow-[0_4px_14px_-4px_rgb(34_197_94/0.55)] hover:bg-[#16a34a]',
        danger: 'bg-danger text-white hover:bg-[#dc2626]',
        link: 'h-auto px-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-[13px] rounded-lg',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-[15px]',
        icon: 'size-10',
        'icon-sm': 'size-8 rounded-lg',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="animate-spin" aria-hidden />}
            {children}
          </>
        )}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

export { buttonVariants }
