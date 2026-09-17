import type { ReactNode } from "react"

type PageHeroProps = {
  eyebrow: string
  title: string
  description?: string
  badge?: ReactNode
}

export function PageHero({ eyebrow, title, description, badge }: PageHeroProps) {
  return (
    <header className="portal-hero relative overflow-hidden rounded-3xl p-8 text-white shadow-[var(--portal-shadow)] sm:p-10">
      <div
        aria-hidden
        className="absolute -top-16 -right-10 size-56 rounded-full border border-white/10"
      />
      <div
        aria-hidden
        className="absolute -bottom-20 left-1/3 size-64 rounded-full bg-[#36babc]/15 blur-2xl"
      />
      <p className="relative text-[11px] font-semibold tracking-[0.18em] text-[#7fe2de] uppercase">
        {eyebrow}
      </p>
      <div className="relative mt-3.5 min-w-0 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-[2.15rem] leading-[1.12] font-semibold tracking-tight sm:text-[2.5rem]">
            {title}
          </h1>
          {badge}
        </div>
        {description ? (
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#c8d5ed]">
            {description}
          </p>
        ) : null}
      </div>
    </header>
  )
}
