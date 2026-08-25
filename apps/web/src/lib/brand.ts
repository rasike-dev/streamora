/** Static brand assets live in `apps/web/public/logos/`. */
export const brand = {
  name: "SLPoliNet",
  domain: "slpolinet.com",
  tagline: "Political data • Media library • Insights",
} as const;

export const logoAssets = {
  /** Horizontal lockup — icon + wordmark + tagline (1672×941) */
  horizontal: {
    src: "/logos/1.png",
    width: 1672,
    height: 941,
  },
  /** Stacked lockup for narrow viewports (1254×1254) */
  stacked: {
    src: "/logos/2.png",
    width: 1254,
    height: 1254,
  },
  /** Primary icon mark (1254×1254) */
  mark: {
    src: "/logos/3.png",
    width: 1254,
    height: 1254,
  },
  /** Alternate icon mark (1254×1254) */
  markAlt: {
    src: "/logos/4.png",
    width: 1254,
    height: 1254,
  },
  /** Gold horizontal lockup on dark background (1672×941) */
  horizontalGold: {
    src: "/logos/5.png",
    width: 1672,
    height: 941,
  },
} as const;

/** @deprecated Use logoAssets.horizontal.src */
export const logos = {
  horizontal: logoAssets.horizontal.src,
  stacked: logoAssets.stacked.src,
  mark: logoAssets.mark.src,
  markAlt: logoAssets.markAlt.src,
  horizontalGold: logoAssets.horizontalGold.src,
} as const;
