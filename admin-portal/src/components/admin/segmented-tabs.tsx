import { cn } from "@/lib/utils"

type SegmentedTabItem<T extends string> = {
  label: string
  value: T
}

export function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: ReadonlyArray<SegmentedTabItem<T>>
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex w-fit max-w-full flex-wrap rounded-2xl border border-border bg-card p-1.5 shadow-[var(--portal-shadow)]",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value || item.label}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "rounded-xl px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(8,27,69,0.18)]"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
