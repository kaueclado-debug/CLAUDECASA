"use client";

import { getRecord, newId, saveRecord, updateRecord } from "./db";
import type { RecordDetails, RecordStatus, SearchHit, VinylRecord, WikiStory } from "./types";

/** Reduz a foto antes de guardar ou enviar: celular tira fotos de 4–12 MB. */
export function resizeImage(file: File | Blob, maxSide = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não deu para abrir essa imagem."));
    };
    img.src = url;
  });
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Algo deu errado. Tente de novo.");
  return data as T;
}

export type SpotifyLookup = { url: string | null; id: string | null; searchUrl: string; configured: boolean };

export function fetchSpotify(artist: string, album: string) {
  return api<SpotifyLookup>(`/api/spotify?${new URLSearchParams({ artist, album })}`);
}

export async function fetchWiki(artist: string, album: string) {
  const data = await api<{ story: WikiStory | null }>(`/api/wiki?${new URLSearchParams({ artist, album })}`);
  return data.story;
}

/**
 * Cria o disco com os dados do Discogs e já salva. Spotify e Wikipedia
 * chegam logo depois, sem segurar a tela.
 */
export async function addFromHit(hit: SearchHit, status: RecordStatus, customCover?: string) {
  const details = await api<RecordDetails>(`/api/discogs/details?type=${hit.type}&id=${hit.id}`);
  const record: VinylRecord = {
    id: newId(),
    status,
    artist: details.artist || hit.artist,
    title: details.title || hit.title,
    year: details.year ?? hit.year,
    coverUrl: details.coverUrl ?? hit.cover,
    customCover,
    genres: details.genres,
    styles: details.styles,
    label: details.label ?? hit.label,
    country: details.country ?? hit.country,
    tracks: details.tracks,
    discogsId: hit.id,
    discogsType: hit.type,
    discogsUrl: details.discogsUrl,
    favorite: false,
    favOrder: 0,
    addedAt: Date.now(),
  };
  await saveRecord(record);
  void enrich(record.id);
  return record;
}

/** Busca Spotify e história para um disco que ainda não tem. */
export async function enrich(id: string) {
  const record = await getRecord(id);
  if (!record) return;
  const tasks: Promise<void>[] = [];

  if (record.spotifyUrl === undefined) {
    tasks.push(
      fetchSpotify(record.artist, record.title)
        .then((s) => (s.configured ? updateRecord(id, { spotifyUrl: s.url, spotifyId: s.id }) : undefined))
        .catch(() => undefined),
    );
  }
  if (record.wiki === undefined) {
    tasks.push(
      fetchWiki(record.artist, record.title)
        .then((wiki) => updateRecord(id, { wiki }))
        .catch(() => undefined),
    );
  }
  await Promise.all(tasks);
}

export function coverOf(record: Pick<VinylRecord, "customCover" | "coverUrl">) {
  return record.customCover || record.coverUrl;
}

export function spotifySearchUrl(record: VinylRecord) {
  return `https://open.spotify.com/search/${encodeURIComponent(`${record.artist} ${record.title}`)}`;
}
