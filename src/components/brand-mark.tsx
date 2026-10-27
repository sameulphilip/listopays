import { BRAND } from "@/lib/brand";

export function BrandMark({
  inverted = false,
  subtitle,
  lockup = false,
}: {
  inverted?: boolean;
  subtitle?: string;
  lockup?: boolean;
}) {
  if (lockup) {
    return (
      <img
        src="/brand/leez-lockup.png"
        alt={BRAND.name}
        className="h-12 w-auto max-w-[260px] object-contain object-left"
      />
    );
  }

  return (
    <div className="flex items-center gap-3">
      <BrandGlyph />
      <div className="min-w-0">
        <p
          className={`text-[15px] font-semibold tracking-[-0.02em] ${
            inverted ? "text-sidebar-fg" : "text-ink"
          }`}
        >
          {inverted ? (
            BRAND.name
          ) : (
            <>
              <span className="text-[#163a5f]">Leez</span>{" "}
              <span className="text-[#2bb8a3]">Pay</span>
            </>
          )}
        </p>
        <p
          className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
            inverted ? "text-sidebar-muted" : "text-ink-soft"
          }`}
        >
          {subtitle ?? BRAND.product}
        </p>
      </div>
    </div>
  );
}

export function BrandGlyph() {
  return (
    <img
      src="/brand/leez-mark.png"
      alt=""
      className="h-10 w-auto max-h-10 shrink-0 object-contain"
    />
  );
}
