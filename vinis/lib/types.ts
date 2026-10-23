export type Grade = "M" | "NM" | "VG+" | "VG" | "G+" | "G" | "F" | "P";

export const GRADES: { value: Grade; label: string; hint: string }[] = [
  { value: "M", label: "Mint", hint: "Lacrado, nunca tocado" },
  { value: "NM", label: "Near Mint", hint: "Parece novo" },
  { value: "VG+", label: "Very Good+", hint: "Sinais leves de uso" },
  { value: "VG", label: "Very Good", hint: "Chiado em trechos baixos" },
  { value: "G+", label: "Good+", hint: "Ruído perceptível, toca inteiro" },
  { value: "G", label: "Good", hint: "Muito ruído" },
  { value: "F", label: "Fair", hint: "Pula ou distorce" },
  { value: "P", label: "Poor", hint: "Só pela capa" },
];

export type Track = {
  position: string;
  title: string;
  duration?: string;
};

export type WikiStory = {
  title: string;
  text: string;
  url: string;
  lang: "pt" | "en";
};

export type RecordStatus = "collection" | "wishlist";

export type VinylRecord = {
  id: string;
  status: RecordStatus;
  artist: string;
  title: string;
  year?: number;
  coverUrl?: string;
  /** Foto tirada pela pessoa (data URL), usada no lugar da capa do Discogs. */
  customCover?: string;
  genres: string[];
  styles: string[];
  label?: string;
  country?: string;
  tracks: Track[];
  discogsId?: number;
  discogsType?: "master" | "release";
  discogsUrl?: string;
  spotifyUrl?: string | null;
  spotifyId?: string | null;
  wiki?: WikiStory | null;
  favorite: boolean;
  favOrder: number;
  mediaGrade?: Grade;
  sleeveGrade?: Grade;
  notes?: string;
  addedAt: number;
};

export type Turntable = {
  id: string;
  brand: string;
  model: string;
  drive?: string;
  photo?: string;
  photoCredit?: string;
  notes?: string;
  addedAt: number;
};

/** Resultado de busca no Discogs, antes de virar um disco na coleção. */
export type SearchHit = {
  id: number;
  type: "master" | "release";
  artist: string;
  title: string;
  year?: number;
  thumb?: string;
  cover?: string;
  format?: string;
  country?: string;
  label?: string;
};

export type RecordDetails = {
  artist: string;
  title: string;
  year?: number;
  coverUrl?: string;
  genres: string[];
  styles: string[];
  label?: string;
  country?: string;
  tracks: Track[];
  discogsUrl?: string;
};
