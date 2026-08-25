import type { ReactNode } from "react"

type PageHeroProps = {
  eyebrow: string
  title: string
  description?: string
  badge?: ReactNode
}

export function PageHero({ eyebrow, title, description, badge }: PageHeroProps) {
  return (
    <header className="relative overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#081b45_0%,#173b79_58%,#1e8f97_140%)] px-6 py-8 text-white shadow-[0_18px_50px_rgba(8,27,69,0.16)] sm:px-8 sm:py-10">
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
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
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
