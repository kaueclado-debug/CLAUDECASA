import type { RecordDetails, SearchHit, Track } from "./types";

const API = "https://api.discogs.com";
const UA = "VinisColecao/1.0 +https://vercel.com";

export class MissingConfigError extends Error {}

async function discogs<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const token = process.env.DISCOGS_TOKEN;
  if (!token) throw new MissingConfigError("DISCOGS_TOKEN não configurado.");
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Authorization: `Discogs token=${token}` },
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) throw new Error(`Discogs respondeu ${res.status}`);
  return res.json() as Promise<T>;
}

type RawResult = {
  id: number;
  type: "master" | "release";
  title: string;
  year?: string;
  thumb?: string;
  cover_image?: string;
  format?: string[];
  country?: string;
  label?: string[];
};

/** Discogs devolve "Artista - Título" no campo title. */
function splitTitle(raw: string) {
  const idx = raw.indexOf(" - ");
  if (idx === -1) return { artist: "", title: raw };
  return { artist: cleanArtist(raw.slice(0, idx)), title: raw.slice(idx + 3) };
}

/** Remove o sufixo numérico de homônimos: "Nirvana (2)" → "Nirvana". */
export function cleanArtist(name: string) {
  return name.replace(/\s*\(\d+\)$/, "").replace(/\*$/, "").trim();
}

function toHit(r: RawResult): SearchHit {
  const { artist, title } = splitTitle(r.title);
  const placeholder = (u?: string) => (u && !u.includes("spacer.gif") ? u : undefined);
  return {
    id: r.id,
    type: r.type,
    artist,
    title,
    year: r.year ? Number(r.year) || undefined : undefined,
    thumb: placeholder(r.thumb),
    cover: placeholder(r.cover_image),
    format: r.format?.slice(0, 3).join(", "),
    country: r.country,
    label: r.label?.[0],
  };
}

export async function searchDiscogs(opts: { q?: string; barcode?: string; artist?: string; album?: string }) {
  if (opts.barcode) {
    const data = await discogs<{ results: RawResult[] }>("/database/search", {
      barcode: opts.barcode.replace(/\D/g, ""),
      type: "release",
      per_page: "12",
    });
    return data.results.map(toHit);
  }

  const base: Record<string, string> = opts.artist || opts.album
    ? { artist: opts.artist ?? "", release_title: opts.album ?? "" }
    : { q: opts.q ?? "" };

  // Primeiro o "master" (o álbum em si); se não houver, edições em vinil.
  const masters = await discogs<{ results: RawResult[] }>("/database/search", {
    ...base,
    type: "master",
    per_page: "12",
  });
  if (masters.results.length >= 3) return masters.results.map(toHit);

  const releases = await discogs<{ results: RawResult[] }>("/database/search", {
    ...base,
    type: "release",
    format: "Vinyl",
    per_page: "12",
  });
  const seen = new Set(masters.results.map((r) => r.title.toLowerCase()));
  const extra = releases.results.filter((r) => !seen.has(r.title.toLowerCase()));
  return [...masters.results, ...extra].slice(0, 12).map(toHit);
}

type RawTrack = { position: string; title: string; duration?: string; type_?: string };
type RawImage = { type: "primary" | "secondary"; uri: string };
type RawArtist = { name: string; anv?: string; join?: string };
type RawEntity = {
  title: string;
  year?: number;
  artists?: RawArtist[];
  images?: RawImage[];
  genres?: string[];
  styles?: string[];
  tracklist?: RawTrack[];
  labels?: { name: string }[];
  country?: string;
  uri?: string;
  main_release?: number;
  released?: string;
};

function joinArtists(list: RawArtist[] = []) {
  return list
    .map((a, i) => cleanArtist(a.anv || a.name) + (i < list.length - 1 ? ` ${a.join || "&"} ` : ""))
    .join("")
    .replace(/\s+,/g, ",")
    .trim();
}

function tracks(list: RawTrack[] = []): Track[] {
  return list
    .filter((t) => (t.type_ ?? "track") === "track")
    .map((t) => ({ position: t.position, title: t.title, duration: t.duration || undefined }));
}

export async function discogsDetails(type: "master" | "release", id: number): Promise<RecordDetails> {
  const entity = await discogs<RawEntity>(`/${type}s/${id}`);
  let label = entity.labels?.[0]?.name;
  let country = entity.country;

  // O master não tem gravadora; busca na edição principal.
  if (type === "master" && entity.main_release) {
    try {
      const main = await discogs<RawEntity>(`/releases/${entity.main_release}`);
      label = main.labels?.[0]?.name;
      country = main.country;
    } catch {
      // Sem problema: segue sem gravadora.
    }
  }

  const cover = entity.images?.find((i) => i.type === "primary") ?? entity.images?.[0];
  const year = entity.year || (entity.released ? Number(entity.released.slice(0, 4)) : undefined);

  return {
    artist: joinArtists(entity.artists),
    title: entity.title,
    year: year || undefined,
    coverUrl: cover?.uri,
    genres: entity.genres ?? [],
    styles: entity.styles ?? [],
    label: label ? cleanArtist(label) : undefined,
    country,
    tracks: tracks(entity.tracklist),
    discogsUrl: entity.uri,
  };
}
