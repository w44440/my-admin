import { type HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type BadgeVariant = 'secondary' | 'success'

const variants: Record<BadgeVariant, string> = {
  secondary: 'bg-secondary text-secondary-foreground',
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
}

export function Badge({
  className,
  variant = 'secondary',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn('inline-flex items-center rounded-md px-2 py-1 text-xs font-medium', variants[variant], className)}
      {...props}
    />
  )
}
