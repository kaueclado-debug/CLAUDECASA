"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BarcodeScanner from "@/components/BarcodeScanner";
import { IconBarcode, IconCamera, IconSearch } from "@/components/Icons";
import { addFromHit, api, resizeImage } from "@/lib/client";
import { useRecords } from "@/lib/db";
import type { RecordStatus, SearchHit } from "@/lib/types";

type Mode = "foto" | "codigo" | "buscar";

type Identified = {
  found: boolean;
  artist: string;
  album: string;
  year: number | null;
  barcode: string | null;
  confidence: "alta" | "media" | "baixa";
  alternatives: { artist: string; album: string }[];
};

function AddRecord() {
  const params = useSearchParams();
  const router = useRouter();
  const { data: owned } = useRecords();

  const [mode, setMode] = useState<Mode>(() => {
    const m = params.get("modo");
    if (m === "buscar" || params.get("q")) return "buscar";
    return m === "codigo" ? "codigo" : "foto";
  });
  const [status, setStatus] = useState<RecordStatus>(params.get("para") === "desejos" ? "wishlist" : "collection");

  const [photo, setPhoto] = useState<string | null>(null);
  const [useAsCover, setUseAsCover] = useState(false);
  const [identified, setIdentified] = useState<Identified | null>(null);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [barcode, setBarcode] = useState("");
  const [scanning, setScanning] = useState(false);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchHit[] | null>(null);
  const [adding, setAdding] = useState<number | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const ownedIds = useMemo(() => new Map(owned.map((r) => [`${r.discogsType}-${r.discogsId}`, r])), [owned]);

  const reset = () => {
    setError(null);
    setResults(null);
  };

  const search = useCallback(async (p: Record<string, string>, label = "Procurando no Discogs…") => {
    setBusy(label);
    setError(null);
    try {
      const data = await api<{ results: SearchHit[] }>(`/api/discogs/search?${new URLSearchParams(p)}`);
      setResults(data.results);
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }, []);

  // Busca vinda de outra tela (?q=)
  useEffect(() => {
    const q = params.get("q");
    if (q) void search({ q });
  }, [params, search]);

  const onPhoto = async (file?: File) => {
    if (!file) return;
    reset();
    setIdentified(null);
    try {
      const image = await resizeImage(file, 1100, 0.85);
      setPhoto(image);
      setBusy("Reconhecendo o disco…");
      const result = await api<Identified>("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      setIdentified(result);
      if (!result.found) {
        setBusy(null);
        setError("Não reconheci esse disco. Tente uma foto mais de frente, ou busque pelo nome.");
        return;
      }
      setQuery(`${result.artist} ${result.album}`);
      if (result.barcode && result.barcode.replace(/\D/g, "").length >= 8) {
        const byCode = await api<{ results: SearchHit[] }>(
          `/api/discogs/search?barcode=${encodeURIComponent(result.barcode)}`,
        ).catch(() => ({ results: [] }));
        if (byCode.results.length) {
          setResults(byCode.results);
          setBusy(null);
          return;
        }
      }
      await search({ artist: result.artist, album: result.album });
    } catch (err) {
      setBusy(null);
      setError((err as Error).message);
    }
  };

  const onBarcode = useCallback(
    (code: string) => {
      setScanning(false);
      setBarcode(code);
      void search({ barcode: code }, "Procurando esse código…");
    },
    [search],
  );

  const add = async (hit: SearchHit) => {
    setAdding(hit.id);
    setError(null);
    try {
      const record = await addFromHit(hit, status, useAsCover && photo ? photo : undefined);
      router.push(`/disco/${record.id}?novo=1`);
    } catch (err) {
      setError((err as Error).message);
      setAdding(null);
    }
  };

  return (
    <div className="page add-layout">
      <header className="page-head">
        <div>
          <h1 className="display page-title">Adicionar</h1>
          <p className="page-sub">Fotografe a capa, leia o código de barras ou busque pelo nome.</p>
        </div>
      </header>

      <div className="stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="segmented" role="group" aria-label="Como adicionar">
            <button type="button" aria-pressed={mode === "foto"} onClick={() => { setMode("foto"); reset(); }}>
              <IconCamera size={16} /> Foto
            </button>
            <button type="button" aria-pressed={mode === "codigo"} onClick={() => { setMode("codigo"); reset(); }}>
              <IconBarcode size={16} /> Código
            </button>
            <button type="button" aria-pressed={mode === "buscar"} onClick={() => { setMode("buscar"); reset(); }}>
              <IconSearch size={16} /> Buscar
            </button>
          </div>
          <div className="row" style={{ gap: 8 }}>
          <span className="muted" style={{ fontSize: "0.9rem" }}>Guardar em</span>
          <div className="segmented" role="group" aria-label="Guardar em">
            <button type="button" aria-pressed={status === "collection"} onClick={() => setStatus("collection")}>
              Coleção
            </button>
            <button type="button" aria-pressed={status === "wishlist"} onClick={() => setStatus("wishlist")}>
              Desejos
            </button>
          </div>
          </div>
        </div>

        {mode === "foto" && (
          <>
            <label className="capture">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="capture-preview" src={photo} alt="Foto enviada" />
              ) : (
                <>
                  <span className="capture-icon">
                    <IconCamera size={32} />
                  </span>
                  <span>
                    <strong>Fotografar a capa</strong>
                    <br />
                    <span className="muted">De frente, com boa luz. Contracapa e selo também funcionam.</span>
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                aria-label="Tirar foto da capa"
                onChange={(e) => {
                  void onPhoto(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {busy && photo && (
                <div className="scanning-overlay" aria-live="polite">
                  <div>
                    <div className="spinner-disc" aria-hidden="true" />
                    {busy}
                  </div>
                </div>
              )}
            </label>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <label className="btn btn-small" style={{ position: "relative" }}>
                Escolher da galeria
                <input
                  type="file"
                  accept="image/*"
                  style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                  onChange={(e) => {
                    void onPhoto(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              {photo && (
                <label className="check">
                  <input type="checkbox" checked={useAsCover} onChange={(e) => setUseAsCover(e.target.checked)} />
                  Usar minha foto como capa
                </label>
              )}
            </div>
            {identified?.found && (
              <div className="notice" aria-live="polite">
                Parece ser <strong>{identified.album}</strong>, de <strong>{identified.artist}</strong>
                {identified.year ? ` (${identified.year})` : ""}.
                {identified.confidence !== "alta" && " Confira nos resultados abaixo."}
                {identified.alternatives.length > 0 && (
                  <div className="chips" style={{ marginTop: 10 }}>
                    {identified.alternatives.map((alt) => (
                      <button
                        key={alt.artist + alt.album}
                        type="button"
                        className="chip"
                        onClick={() => search({ artist: alt.artist, album: alt.album })}
                      >
                        {alt.album}, {alt.artist}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {mode === "codigo" && (
          <>
            {scanning ? (
              <BarcodeScanner onDetect={onBarcode} />
            ) : (
              <button type="button" className="capture" onClick={() => { reset(); setScanning(true); }}>
                <span className="capture-icon">
                  <IconBarcode size={32} />
                </span>
                <span>
                  <strong>Ler código de barras</strong>
                  <br />
                  <span className="muted">Fica na contracapa. Discos antigos, dos anos 80 para trás, costumam não ter.</span>
                </span>
              </button>
            )}
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                if (barcode.trim()) onBarcode(barcode.trim());
              }}
            >
              <input
                className="field"
                style={{ flex: "1 1 200px" }}
                inputMode="numeric"
                placeholder="Ou digite os números"
                aria-label="Número do código de barras"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
              <button className="btn" type="submit" disabled={!barcode.trim()}>
                Procurar código
              </button>
            </form>
          </>
        )}

        {mode === "buscar" && (
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) void search({ q: query.trim() });
            }}
          >
            <label className="search-field" style={{ maxWidth: "none" }}>
              <span className="visually-hidden">Artista ou álbum</span>
              <IconSearch size={18} />
              <input
                className="field"
                type="search"
                autoFocus
                placeholder="Ex.: Clube da Esquina, Milton Nascimento"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={!query.trim() || !!busy}>
              Buscar
            </button>
          </form>
        )}

        {busy && !(mode === "foto" && photo) && (
          <p className="muted" aria-live="polite">
            {busy}
          </p>
        )}
        {error && <p className="notice notice-error">{error}</p>}

        {results && (
          <div ref={resultsRef} style={{ scrollMarginTop: 80 }}>
            <h2 className="section-title">
              {results.length ? "Escolha o disco certo" : "Nenhum disco encontrado"}
            </h2>
            {!results.length && (
              <p className="muted">Tente buscar só pelo nome do álbum, sem o artista.</p>
            )}
            <ul className="results">
              {results.map((hit) => {
                const already = ownedIds.get(`${hit.type}-${hit.id}`);
                return (
                  <li key={`${hit.type}-${hit.id}`} className="result">
                    <div className="result-cover">
                      {hit.thumb && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={hit.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" />
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="result-title">{hit.title}</div>
                      <div className="result-meta">{hit.artist}</div>
                      <div className="result-meta">
                        {[hit.year, hit.type === "master" ? "Álbum" : hit.format, hit.country].filter(Boolean).join(", ")}
                      </div>
                    </div>
                    {already ? (
                      <button type="button" className="btn btn-small" onClick={() => router.push(`/disco/${already.id}`)}>
                        {already.status === "collection" ? "Já na coleção" : "Nos desejos"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary btn-small"
                        disabled={adding !== null}
                        onClick={() => add(hit)}
                      >
                        {adding === hit.id ? "Adicionando…" : status === "collection" ? "Adicionar" : "Desejar"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AddPage() {
  return (
    <Suspense>
      <AddRecord />
    </Suspense>
  );
}
