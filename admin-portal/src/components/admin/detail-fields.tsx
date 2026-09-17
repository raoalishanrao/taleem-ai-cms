import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function DetailField({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm font-medium leading-relaxed break-words text-foreground">
        {value || "—"}
      </dd>
    </div>
  )
}

export function DetailFieldGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <dl className={cn("grid gap-x-8 gap-y-6 sm:grid-cols-2", className)}>
      {children}
    </dl>
  )
}

export function DetailRecordCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  children?: ReactNode
}) {
  return (
    <article className="rounded-2xl border border-border bg-muted/25 p-5">
      <header className="flex items-start gap-3">
        {icon ? (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold tracking-tight">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </header>
      {children ? <div className="mt-5">{children}</div> : null}
    </article>
  )
}

export function DetailEmpty({
  icon,
  children,
}: {
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  )
}

export function DetailRow({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="grid gap-1 border-b border-border/80 py-3.5 last:border-b-0 sm:grid-cols-[10.5rem_1fr] sm:items-start sm:gap-6">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-sm font-medium break-words whitespace-pre-wrap">
        {value || "—"}
      </dd>
    </div>
  )
}
