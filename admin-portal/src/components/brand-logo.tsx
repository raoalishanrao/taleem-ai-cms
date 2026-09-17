import { cn } from "@/lib/utils"

export const BRAND_LOGO_SRC = "/logo.png"
export const BRAND_LOGO_ALT =
  "Iqra University, Chak Shahzad Campus, Islamabad"

type BrandLogoProps = {
  className?: string
  /** White plate behind the mark for navy/dark backgrounds */
  onDark?: boolean
  plateClassName?: string
}

export function BrandLogo({
  className,
  onDark = false,
  plateClassName,
}: BrandLogoProps) {
  const image = (
    <img
      src={BRAND_LOGO_SRC}
      alt={BRAND_LOGO_ALT}
      className={cn("h-10 w-auto object-contain object-left", className)}
    />
  )

  if (!onDark) return image

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center bg-white px-2.5 py-1.5 shadow-sm",
        plateClassName,
      )}
    >
      {image}
    </div>
  )
}
