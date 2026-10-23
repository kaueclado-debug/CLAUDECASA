"use client";

import { useState } from "react";
import { coverOf } from "@/lib/client";
import type { VinylRecord } from "@/lib/types";

/** Cor estável por disco, usada quando não há capa e no selo do vinil. */
export function hueFor(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360;
  return h;
}

export function fallbackColor(record: Pick<VinylRecord, "artist" | "title">) {
  return `hsl(${hueFor(record.artist + record.title)} 42% 38%)`;
}

type Props = {
  record: Pick<VinylRecord, "artist" | "title" | "coverUrl" | "customCover">;
  eager?: boolean;
};

export default function Cover({ record, eager }: Props) {
  const src = coverOf(record);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="cover-fallback" style={{ background: fallbackColor(record) }} aria-hidden="true">
        <strong>{record.title}</strong>
        <span>{record.artist}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Capa de ${record.title}, ${record.artist}`}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
