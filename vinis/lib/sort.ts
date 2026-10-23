import type { VinylRecord } from "./types";

/** Tira acentos e o "The" do começo, como nas lojas de discos. */
export function sortName(name: string) {
  return name
    .trim()
    .replace(/^the\s+/i, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const collator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

export function compareAlpha(a: VinylRecord, b: VinylRecord) {
  return (
    collator.compare(sortName(a.artist), sortName(b.artist)) ||
    (a.year ?? 9999) - (b.year ?? 9999) ||
    collator.compare(a.title, b.title)
  );
}

/** Letra da divisória: A–Z, ou "#" para números e símbolos. */
export function dividerLetter(record: VinylRecord) {
  const first = sortName(record.artist).charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : "#";
}

export type Shelf = {
  favorites: VinylRecord[];
  sections: { letter: string; records: VinylRecord[] }[];
};

export function arrangeShelf(list: VinylRecord[]): Shelf {
  const favorites = list
    .filter((r) => r.favorite)
    .sort((a, b) => a.favOrder - b.favOrder || compareAlpha(a, b));
  const rest = list.filter((r) => !r.favorite).sort(compareAlpha);

  const sections: Shelf["sections"] = [];
  for (const record of rest) {
    const letter = dividerLetter(record);
    const last = sections[sections.length - 1];
    if (last && last.letter === letter) last.records.push(record);
    else sections.push({ letter, records: [record] });
  }
  // "#" vai para o fim, depois do Z.
  sections.sort((a, b) => (a.letter === "#" ? 1 : b.letter === "#" ? -1 : 0));
  return { favorites, sections };
}

export function matchesQuery(record: VinylRecord, query: string) {
  const q = sortName(query);
  if (!q) return true;
  const hay = sortName(
    [record.artist, record.title, record.label, record.year, ...record.genres, ...record.styles].join(" "),
  );
  return q.split(/\s+/).every((word) => hay.includes(word));
}
