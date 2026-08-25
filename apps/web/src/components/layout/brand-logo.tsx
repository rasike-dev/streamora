import Image from "next/image";
import { brand, logoAssets } from "@/lib/brand";

export type BrandLogoVariant = "header" | "hero" | "footer" | "auth" | "mark";

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  className?: string;
  priority?: boolean;
};

function plateClass(extra?: string) {
  return ["logo-plate", extra].filter(Boolean).join(" ");
}

function MarkImage({
  sizeClass,
  priority,
  sizes,
}: {
  sizeClass: string;
  priority?: boolean;
  sizes: string;
}) {
  const asset = logoAssets.mark;
  return (
    <Image
      src={asset.src}
      alt=""
      width={asset.width}
      height={asset.height}
      sizes={sizes}
      priority={priority}
      className={`${sizeClass} object-contain`}
    />
  );
}

type LogoAsset = (typeof logoAssets)[keyof typeof logoAssets];

function HorizontalImage({
  asset,
  heightClass,
  maxWidthClass,
  priority,
  sizes,
}: {
  asset: LogoAsset;
  heightClass: string;
  maxWidthClass: string;
  priority?: boolean;
  sizes: string;
}) {
  return (
    <Image
      src={asset.src}
      alt={brand.name}
      width={asset.width}
      height={asset.height}
      sizes={sizes}
      priority={priority}
      className={`${heightClass} ${maxWidthClass} w-auto object-contain object-left`}
    />
  );
}

function StackedImage({
  maxWidthClass,
  priority,
  sizes,
}: {
  maxWidthClass: string;
  priority?: boolean;
  sizes: string;
}) {
  const asset = logoAssets.stacked;
  return (
    <Image
      src={asset.src}
      alt={brand.name}
      width={asset.width}
      height={asset.height}
      sizes={sizes}
      priority={priority}
      className={`${maxWidthClass} h-auto w-full object-contain`}
    />
  );
}

/** Responsive SLPoliNet logos — pick the variant for header, hero, footer, or auth. */
export function BrandLogo({
  variant = "header",
  className,
  priority = false,
}: BrandLogoProps) {
  if (variant === "mark") {
    return (
      <span className={plateClass(`inline-flex shrink-0 ${className ?? ""}`)}>
        <MarkImage
          sizeClass="h-9 w-9 sm:h-10 sm:w-10"
          priority={priority}
          sizes="40px"
        />
      </span>
    );
  }

  if (variant === "header") {
    return (
      <span
        className={`inline-flex max-w-[min(100%,16rem)] items-center ${className ?? ""}`}
      >
        {/* Phone: icon mark only */}
        <span className={plateClass("inline-flex sm:hidden")}>
          <MarkImage sizeClass="h-8 w-8" priority={priority} sizes="32px" />
        </span>

        {/* Tablet: icon + wordmark (crisp text scales better than shrinking PNG) */}
        <span className="hidden items-center gap-2.5 sm:inline-flex lg:hidden">
          <span className={plateClass("inline-flex")}>
            <MarkImage sizeClass="h-9 w-9" priority={priority} sizes="36px" />
          </span>
          <span className="text-base font-semibold tracking-tight sm:text-lg">
            {brand.name}
          </span>
        </span>

        {/* Desktop: full horizontal lockup */}
        <span className={plateClass("hidden px-1 lg:inline-flex")}>
          <HorizontalImage
            asset={logoAssets.horizontal}
            heightClass="h-10 xl:h-11"
            maxWidthClass="max-w-[11rem] xl:max-w-[12.5rem]"
            priority={priority}
            sizes="(min-width: 1280px) 200px, 176px"
          />
        </span>
      </span>
    );
  }

  if (variant === "hero") {
    return (
      <div
        className={`mx-auto flex w-full justify-center ${className ?? ""}`}
      >
        {/* Narrow: stacked lockup */}
        <div className={plateClass("w-full max-w-[14rem] p-2 sm:hidden")}>
          <StackedImage
            maxWidthClass="max-w-full"
            priority={priority}
            sizes="(max-width: 639px) 224px, 0px"
          />
        </div>

        {/* sm–md: stacked, slightly larger */}
        <div
          className={plateClass("hidden w-full max-w-xs p-2 sm:block md:hidden")}
        >
          <StackedImage
            maxWidthClass="max-w-full"
            priority={priority}
            sizes="(min-width: 640px) 320px, 0px"
          />
        </div>

        {/* md+: horizontal hero lockup */}
        <div className={plateClass("hidden p-2 md:block")}>
          <HorizontalImage
            asset={logoAssets.horizontal}
            heightClass="h-16 md:h-20 lg:h-24"
            maxWidthClass="max-w-[min(100vw-2rem,36rem)]"
            priority={priority}
            sizes="(min-width: 1024px) 576px, (min-width: 768px) 480px, 0px"
          />
        </div>
      </div>
    );
  }

  if (variant === "footer") {
    return (
      <div className={`flex flex-col gap-3 ${className ?? ""}`}>
        <span className="inline-flex sm:hidden">
          <span className={plateClass("inline-flex items-center gap-2 p-0.5")}>
            <MarkImage sizeClass="h-9 w-9" sizes="36px" />
            <span className="text-base font-semibold tracking-tight">
              {brand.name}
            </span>
          </span>
        </span>

        <span className={plateClass("hidden px-1 sm:inline-flex")}>
          <HorizontalImage
            asset={logoAssets.horizontalGold}
            heightClass="h-9 md:h-10"
            maxWidthClass="max-w-[10rem] md:max-w-[12rem]"
            sizes="(min-width: 768px) 192px, 160px"
          />
        </span>

        <p className="max-w-xs text-xs text-muted-foreground sm:text-sm">
          {brand.tagline}
        </p>
      </div>
    );
  }

  // auth — sign-in / sign-up
  return (
    <div className={`mx-auto flex justify-center ${className ?? ""}`}>
      <div className={plateClass("w-full max-w-[13rem] p-2 sm:max-w-[15rem]")}>
        <StackedImage
          maxWidthClass="max-w-full"
          priority={priority}
          sizes="(max-width: 639px) 208px, 240px"
        />
      </div>
    </div>
  );
}
