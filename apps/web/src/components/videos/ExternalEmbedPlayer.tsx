"use client";

type Props = {
  embedUrl: string;
  title: string;
  width?: number | null;
  height?: number | null;
  validationStatus?: string;
  canonicalUrl?: string | null;
  unavailableMessage?: string;
};

export function ExternalEmbedPlayer({
  embedUrl,
  title,
  width = 560,
  height = 315,
  validationStatus = "ACTIVE",
  canonicalUrl,
  unavailableMessage = "This video is no longer available at the source.",
}: Props) {
  if (validationStatus === "UNAVAILABLE") {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-black/10 bg-black/[0.03] px-6 text-center dark:border-white/10 dark:bg-white/[0.04]">
        <p className="text-sm text-muted-foreground">{unavailableMessage}</p>
        {canonicalUrl ? (
          <a
            href={canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium underline underline-offset-2"
          >
            View original link
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <iframe
        src={embedUrl}
        title={title}
        width={width ?? 560}
        height={height ?? 315}
        className="h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
