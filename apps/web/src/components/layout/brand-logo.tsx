import Image from "next/image";
import { brand, logoAssets } from "@/lib/brand";

export type BrandLogoVariant = "header" | "hero" | "footer" | "auth" | "mark";

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  className?: string;
  priority?: boolean;
};

function wrapClass(extra?: string, prominent?: boolean) {
  return [prominent ? "logo-wrap-prominent" : "logo-wrap", extra]
    .filter(Boolean)
    .join(" ");
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

type LogoImageProps = {
  asset: LogoAsset;
  priority?: boolean;
  sizes: string;
  className: string;
  crisp?: boolean;
};

function LogoImage({ asset, priority, sizes, className, crisp }: LogoImageProps) {
  return (
    <Image
      src={asset.src}
      alt={brand.name}
      width={asset.width}
      height={asset.height}
      sizes={sizes}
      priority={priority}
      quality={crisp ? 100 : undefined}
      unoptimized={crisp}
      className={className}
    />
  );
}

function HorizontalImage({
  asset,
  heightClass,
  maxWidthClass,
  priority,
  sizes,
  widthFirst = false,
  crisp = false,
}: {
  asset: LogoAsset;
  heightClass?: string;
  maxWidthClass: string;
  priority?: boolean;
  sizes: string;
  widthFirst?: boolean;
  crisp?: boolean;
}) {
  const className = widthFirst
    ? `${maxWidthClass} h-auto w-full object-contain`
    : `${heightClass ?? ""} ${maxWidthClass} w-auto object-contain object-left`;

  return (
    <LogoImage
      asset={asset}
      priority={priority}
      sizes={sizes}
      crisp={crisp}
      className={className}
    />
  );
}

function StackedImage({
  maxWidthClass,
  priority,
  sizes,
  crisp = false,
}: {
  maxWidthClass: string;
  priority?: boolean;
  sizes: string;
  crisp?: boolean;
}) {
  return (
    <LogoImage
      asset={logoAssets.stacked}
      priority={priority}
      sizes={sizes}
      crisp={crisp}
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
      <span className={wrapClass(`inline-flex shrink-0 ${className ?? ""}`)}>
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
        <span className={wrapClass("inline-flex sm:hidden")}>
          <MarkImage sizeClass="h-9 w-9" priority={priority} sizes="36px" />
        </span>

        {/* Tablet: icon + wordmark (crisp text scales better than shrinking PNG) */}
        <span className="hidden items-center gap-2.5 sm:inline-flex lg:hidden">
          <span className={wrapClass("inline-flex")}>
            <MarkImage sizeClass="h-10 w-10" priority={priority} sizes="40px" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            {brand.name}
          </span>
        </span>

        {/* Desktop: full horizontal lockup */}
        <span className={wrapClass("hidden px-1.5 lg:inline-flex")}>
          <HorizontalImage
            asset={logoAssets.horizontal}
            heightClass="h-12 xl:h-14"
            maxWidthClass="max-w-[13rem] xl:max-w-[15rem]"
            priority={priority}
            sizes="(min-width: 1280px) 240px, 208px"
          />
        </span>
      </span>
    );
  }

  if (variant === "hero") {
    return (
      <div
        className={`mx-auto flex w-full max-w-5xl justify-center ${className ?? ""}`}
      >
        {/* Phone: stacked lockup, width-driven */}
        <div
          className={wrapClass(
            "w-full max-w-[min(100%,20rem)] sm:hidden",
            true,
          )}
        >
          <StackedImage
            maxWidthClass="w-full"
            priority={priority}
            sizes="320px"
            crisp
          />
        </div>

        {/* sm+: horizontal lockup spans most of the hero row */}
        <div className={wrapClass("hidden w-full sm:block", true)}>
          <HorizontalImage
            asset={logoAssets.horizontal}
            maxWidthClass="w-full"
            widthFirst
            priority={priority}
            sizes="(min-width: 1280px) 960px, (min-width: 768px) 768px, 640px"
            crisp
          />
        </div>
      </div>
    );
  }

  if (variant === "footer") {
    return (
      <div className={`flex flex-col gap-3 ${className ?? ""}`}>
        <span className="inline-flex sm:hidden">
          <span className={wrapClass("inline-flex items-center gap-2 p-0.5")}>
            <MarkImage sizeClass="h-9 w-9" sizes="36px" />
            <span className="text-base font-semibold tracking-tight">
              {brand.name}
            </span>
          </span>
        </span>

        <span className={wrapClass("hidden px-1 sm:inline-flex")}>
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
  if (variant === "auth") {
    return (
      <div className={`mx-auto flex justify-center ${className ?? ""}`}>
        <div className={wrapClass("w-full max-w-[15rem] p-3 sm:max-w-[17rem]")}>
          <StackedImage
            maxWidthClass="max-w-full"
            priority={priority}
            sizes="(max-width: 639px) 240px, 272px"
          />
        </div>
      </div>
    );
  }

  return null;
}
