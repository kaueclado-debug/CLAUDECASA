"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Cover, { fallbackColor } from "@/components/Cover";
import { IconBack, IconCamera, IconSpotify, IconStar } from "@/components/Icons";
import { toggleFavorite } from "@/components/Shelf";
import { coverOf, enrich, fetchSpotify, fetchWiki, resizeImage, spotifySearchUrl } from "@/lib/client";
import { deleteRecord, updateRecord, useRecord, useRecords } from "@/lib/db";
import { GRADES, type Grade, type Track, type VinylRecord } from "@/lib/types";

/** Agrupa faixas por lado do vinil: A1, A2… B1, B2… */
function bySide(tracks: Track[]) {
  const sides: { side: string | null; tracks: Track[] }[] = [];
  for (const t of tracks) {
    const side = t.position.match(/^([A-Z]+)\d*/i)?.[1]?.toUpperCase() ?? null;
    const last = sides[sides.length - 1];
    if (last && last.side === side) last.tracks.push(t);
    else sides.push({ side, tracks: [t] });
  }
  return sides;
}

/** Cor média da capa para pintar o selo do vinil. */
function useLabelColor(record: VinylRecord | null | undefined) {
  const [color, setColor] = useState<string | null>(null);
  const src = record ? coverOf(record) : undefined;
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = c.height = 12;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0, 12, 12);
        const d = ctx.getImageData(0, 0, 12, 12).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) {
          r += d[i];
          g += d[i + 1];
          b += d[i + 2];
        }
        const n = d.length / 4;
        setColor(`rgb(${Math.round(r / n)} ${Math.round(g / n)} ${Math.round(b / n)})`);
      } catch {
        // Imagem sem CORS: fica com a cor gerada.
      }
    };
    img.src = src;
  }, [src]);
  return color;
}

function GradePicker({ label, value, onChange }: { label: string; value?: Grade; onChange: (g?: Grade) => void }) {
  const hint = GRADES.find((g) => g.value === value);
  return (
    <div>
      <span className="label">{label}</span>
      <div className="grade-grid" role="group" aria-label={label}>
        {GRADES.map((g) => (
          <button
            key={g.value}
            type="button"
            aria-pressed={value === g.value}
            title={`${g.label}: ${g.hint}`}
            onClick={() => onChange(value === g.value ? undefined : g.value)}
          >
            {g.value}
          </button>
        ))}
      </div>
      <div className="grade-hint">{hint ? `${hint.label}: ${hint.hint}` : "Toque para avaliar"}</div>
    </div>
  );
}

function RecordView({ record }: { record: VinylRecord }) {
  const router = useRouter();
  const params = useSearchParams();
  const { data: all } = useRecords();
  const labelColor = useLabelColor(record);
  const [notes, setNotes] = useState(record.notes ?? "");
  const [toast, setToast] = useState<string | null>(params.get("novo") ? "Disco adicionado" : null);
  const [retrying, setRetrying] = useState(false);
  const enriched = useRef(false);

  useEffect(() => {
    if (enriched.current) return;
    enriched.current = true;
    void enrich(record.id);
  }, [record.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const sides = useMemo(() => bySide(record.tracks), [record.tracks]);
  const loadingExtras = record.spotifyUrl === undefined || record.wiki === undefined;

  const facts = [
    ["Ano", record.year],
    ["Gravadora", record.label],
    ["País", record.country],
    ["Gênero", [...record.genres, ...record.styles].slice(0, 4).join(", ")],
  ].filter(([, v]) => v) as [string, string | number][];

  const changeCover = async (file?: File) => {
    if (!file) return;
    const customCover = await resizeImage(file, 1000, 0.85);
    await updateRecord(record.id, { customCover });
    setToast("Capa trocada");
  };

  const retryExtras = async () => {
    setRetrying(true);
    const [spotify, wiki] = await Promise.all([
      fetchSpotify(record.artist, record.title).catch(() => null),
      fetchWiki(record.artist, record.title).catch(() => undefined),
    ]);
    await updateRecord(record.id, {
      ...(spotify?.configured ? { spotifyUrl: spotify.url, spotifyId: spotify.id } : {}),
      ...(wiki !== undefined ? { wiki } : {}),
    });
    setRetrying(false);
  };

  const remove = async () => {
    if (!confirm(`Remover “${record.title}” da ${record.status === "collection" ? "coleção" : "lista de desejos"}?`)) return;
    await deleteRecord(record.id);
    router.replace(record.status === "collection" ? "/" : "/desejos");
  };

  const move = async () => {
    const status = record.status === "collection" ? "wishlist" : "collection";
    await updateRecord(record.id, { status });
    setToast(status === "collection" ? "Movido para a coleção" : "Movido para os desejos");
  };

  return (
    <div className="page">
      <Link href={record.status === "collection" ? "/" : "/desejos"} className="back-link">
        <IconBack size={18} /> {record.status === "collection" ? "Coleção" : "Desejos"}
      </Link>

      <section className="record-hero">
        <div className="sleeve-stage">
          <div className="sleeve-wrap">
            <div className="sleeve">
              <Cover record={record} eager />
            </div>
            <div className="disc" aria-hidden="true">
              <div className="disc-sheen" />
              <div className="disc-label" style={{ ["--label" as string]: labelColor ?? fallbackColor(record) }} />
            </div>
          </div>
        </div>

        <div className="record-info">
          <p className="record-artist">{record.artist}</p>
          <h1 className="display record-title">{record.title}</h1>

          {facts.length > 0 && (
            <dl className="facts">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="record-actions">
            {record.spotifyUrl ? (
              <a className="btn btn-spotify" href={record.spotifyUrl} target="_blank" rel="noopener noreferrer">
                <IconSpotify /> Abrir no Spotify
              </a>
            ) : record.spotifyUrl === undefined ? (
              <span className="btn" aria-live="polite">
                <IconSpotify /> Procurando no Spotify…
              </span>
            ) : (
              <a className="btn" href={spotifySearchUrl(record)} target="_blank" rel="noopener noreferrer">
                <IconSpotify /> Procurar no Spotify
              </a>
            )}
            <button
              type="button"
              className="btn"
              aria-pressed={record.favorite}
              onClick={() => toggleFavorite(record, all)}
            >
              <IconStar size={18} filled={record.favorite} />
              {record.favorite ? "Favorito" : "Favoritar"}
            </button>
            {record.status === "wishlist" && (
              <button type="button" className="btn btn-primary" onClick={move}>
                Comprei, mover para a coleção
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="record-body">
        <div>
          <h2 className="section-title">Faixas</h2>
          {record.tracks.length === 0 && <p className="muted">O Discogs não tem a lista de faixas deste disco.</p>}
          {sides.map((s, i) => (
            <div className="side" key={i}>
              {s.side && sides.length > 1 && <h3 className="side-name">Lado {s.side}</h3>}
              <ol className="tracklist">
                {s.tracks.map((t, j) => (
                  <li key={j}>
                    <span className="track-pos">{t.position}</span>
                    <span className="track-title">{t.title}</span>
                    <span className="track-dur">{t.duration}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <div>
          <h2 className="section-title">História</h2>
          {record.wiki ? (
            <div className="story">
              {record.wiki.text.split(/\n+/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              <p className="story-source">
                Da Wikipedia{record.wiki.lang === "en" ? " em inglês" : ""}:{" "}
                <a href={record.wiki.url} target="_blank" rel="noopener noreferrer">
                  ler o artigo completo
                </a>
              </p>
            </div>
          ) : record.wiki === undefined ? (
            <p className="muted">Procurando a história deste disco…</p>
          ) : (
            <p className="muted">
              A Wikipedia ainda não tem um artigo sobre este disco.
              {record.discogsUrl && (
                <>
                  {" "}
                  Veja as edições e notas no{" "}
                  <a href={record.discogsUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
                    Discogs
                  </a>
                  .
                </>
              )}
            </p>
          )}

          {record.spotifyId && (
            <iframe
              className="spotify-embed"
              title={`Ouvir ${record.title} no Spotify`}
              src={`https://open.spotify.com/embed/album/${record.spotifyId}?utm_source=generator`}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          )}

          {!loadingExtras && (record.wiki === null || record.spotifyUrl === null) && (
            <button type="button" className="btn btn-ghost btn-small" style={{ marginTop: 16 }} onClick={retryExtras} disabled={retrying}>
              {retrying ? "Procurando de novo…" : "Procurar história e Spotify de novo"}
            </button>
          )}
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">Meu exemplar</h2>
        <div className="stack">
          <div className="two-col">
            <GradePicker
              label="Estado do vinil"
              value={record.mediaGrade}
              onChange={(mediaGrade) => updateRecord(record.id, { mediaGrade })}
            />
            <GradePicker
              label="Estado da capa"
              value={record.sleeveGrade}
              onChange={(sleeveGrade) => updateRecord(record.id, { sleeveGrade })}
            />
          </div>
          <div>
            <label className="label" htmlFor="notes">
              Notas
            </label>
            <textarea
              id="notes"
              className="field"
              placeholder="Onde comprou, quanto pagou, prensagem, autógrafo…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => notes !== (record.notes ?? "") && updateRecord(record.id, { notes })}
            />
          </div>
          <div className="row">
            <label className="btn btn-small" style={{ position: "relative" }}>
              <IconCamera size={16} /> Usar minha foto como capa
              <input
                type="file"
                accept="image/*"
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                onChange={(e) => {
                  void changeCover(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {record.customCover && record.coverUrl && (
              <button type="button" className="btn btn-small" onClick={() => updateRecord(record.id, { customCover: undefined })}>
                Voltar para a capa original
              </button>
            )}
            {record.status === "collection" && (
              <button type="button" className="btn btn-small" onClick={move}>
                Mover para desejos
              </button>
            )}
            <button type="button" className="btn btn-small btn-ghost btn-danger" onClick={remove}>
              Remover disco
            </button>
          </div>
        </div>
      </section>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function RecordPage() {
  const { id } = useParams<{ id: string }>();
  const record = useRecord(id);

  if (record === undefined) return <div className="page" />;
  if (record === null) {
    return (
      <div className="page">
        <div className="empty">
          <h1 className="display">Esse disco não está aqui.</h1>
          <p>Ele pode ter sido removido, ou foi adicionado em outro aparelho.</p>
          <Link href="/" className="btn btn-primary">
            Voltar para a coleção
          </Link>
        </div>
      </div>
    );
  }
  return <RecordView record={record} />;
}

export default function Page() {
  return (
    <Suspense>
      <RecordPage />
    </Suspense>
  );
}
