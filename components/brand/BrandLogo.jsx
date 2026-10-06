'use client'

/**
 * RKT Fabrics Manufactured logo
 * @param {'sm'|'md'|'lg'|'hero'} size
 */
export default function BrandLogo({
  size = 'md',
  showText = true,
  className = '',
  textClassName = '',
}) {
  const sizes = {
    sm: { box: 'h-10 w-10', title: 'text-base', sub: 'text-[11px]' },
    md: { box: 'h-12 w-12', title: 'text-lg', sub: 'text-xs' },
    lg: { box: 'h-16 w-16', title: 'text-xl', sub: 'text-sm' },
    hero: { box: 'h-24 w-24 sm:h-32 sm:w-32', title: 'text-2xl', sub: 'text-sm' },
  }
  const s = sizes[size] || sizes.md

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`relative shrink-0 overflow-hidden rounded-xl bg-black ring-1 ring-gold-500/50 shadow-lg shadow-black/40 ${s.box}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo.jpeg"
          alt="RKT Fabrics Manufactured"
          className="h-full w-full object-cover"
        />
      </div>
      {showText && (
        <div className={`min-w-0 ${textClassName}`}>
          <p className={`font-display font-semibold tracking-tight leading-tight ${s.title}`}>
            RKT Fabrics
          </p>
          <p className={`uppercase tracking-[0.18em] text-gold-500 ${s.sub}`}>
            Manufactured
          </p>
        </div>
      )}
    </div>
  )
}
