"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconCamera, IconClose, IconPlus, IconSearch } from "@/components/Icons";
import { api, resizeImage } from "@/lib/client";
import { deleteTurntable, newId, saveTurntable, useTurntables } from "@/lib/db";
import { TURNTABLE_CATALOG } from "@/lib/turntables";
import type { Turntable } from "@/lib/types";

/** Desenho usado enquanto não há foto. */
function DeckIllustration() {
  return (
    <svg viewBox="0 0 400 300" role="img" aria-label="Ilustração de toca-discos">
      <rect x="30" y="40" width="340" height="220" rx="14" fill="var(--bg-raised)" stroke="var(--line)" strokeWidth="2" />
      <circle cx="160" cy="150" r="92" fill="var(--vinyl)" />
      <circle cx="160" cy="150" r="80" fill="none" stroke="var(--vinyl-groove)" strokeWidth="14" />
      <circle cx="160" cy="150" r="30" fill="var(--accent)" />
      <circle cx="160" cy="150" r="4" fill="var(--bg)" />
      <circle cx="320" cy="78" r="16" fill="var(--bg-sunken)" stroke="var(--line)" strokeWidth="2" />
      <path d="M320 78 L320 190 L268 222" fill="none" stroke="var(--ink-soft)" strokeWidth="5" strokeLinecap="round" />
      <rect x="254" y="214" width="26" height="14" rx="3" transform="rotate(-32 267 221)" fill="var(--ink-soft)" />
      <circle cx="68" cy="232" r="7" fill="var(--line)" />
      <circle cx="92" cy="232" r="7" fill="var(--line)" />
    </svg>
  );
}

function AddDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [drive, setDrive] = useState<string | undefined>();
  const [photo, setPhoto] = useState<string | undefined>();
  const [credit, setCredit] = useState<string | undefined>();
  const [looking, setLooking] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const reset = () => {
    setQuery("");
    setBrand("");
    setModel("");
    setDrive(undefined);
    setPhoto(undefined);
    setCredit(undefined);
  };

  const matches = useMemo(() => {
    const q = query.toLowerCase().replace(/[^a-z0-9]/g, "");
    return TURNTABLE_CATALOG.filter((t) => (t.brand + t.model).toLowerCase().replace(/[^a-z0-9]/g, "").includes(q));
  }, [query]);

  const lookupPhoto = async (b: string, m: string) => {
    if (!b || !m) return;
    setLooking(true);
    try {
      const data = await api<{ photo: string | null; credit?: string }>(
        `/api/turntable-photo?${new URLSearchParams({ brand: b, model: m })}`,
      );
      if (data.photo) {
        setPhoto(data.photo);
        setCredit(data.credit);
      }
    } catch {
      // Sem foto de referência: fica a ilustração.
    } finally {
      setLooking(false);
    }
  };

  const pick = (b: string, m: string, d?: string) => {
    setBrand(b);
    setModel(m);
    setDrive(d);
    setPhoto(undefined);
    setCredit(undefined);
    void lookupPhoto(b, m);
  };

  const ownPhoto = async (file?: File) => {
    if (!file) return;
    setPhoto(await resizeImage(file, 1200, 0.85));
    setCredit(undefined);
  };

  const save = async () => {
    const t: Turntable = { id: newId(), brand: brand.trim(), model: model.trim(), drive, photo, photoCredit: credit, addedAt: Date.now() };
    await saveTurntable(t);
    reset();
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className="sheet"
      onClose={() => {
        reset();
        onClose();
      }}
      aria-labelledby="deck-dialog-title"
    >
      <div className="sheet-inner">
        <div className="sheet-head">
          <h2 id="deck-dialog-title">Adicionar toca-discos</h2>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={() => ref.current?.close()}>
            <IconClose />
          </button>
        </div>

        <label className="search-field" style={{ maxWidth: "none" }}>
          <span className="visually-hidden">Procurar modelo</span>
          <IconSearch size={18} />
          <input
            className="field"
            type="search"
            placeholder="Technics, LP120, Pro-Ject…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        <ul className="catalog-list">
          {matches.map((t) => (
            <li key={t.brand + t.model}>
              <button
                type="button"
                aria-pressed={brand === t.brand && model === t.model}
                onClick={() => pick(t.brand, t.model, t.drive)}
              >
                <span>
                  <strong>{t.brand}</strong> {t.model}
                </span>
                <small>Tração {t.drive.toLowerCase()}</small>
              </button>
            </li>
          ))}
          {!matches.length && (
            <li style={{ padding: "12px 16px" }} className="muted">
              Não está na lista. Preencha marca e modelo abaixo.
            </li>
          )}
        </ul>

        <div className="two-col" style={{ gap: 12 }}>
          <div>
            <label className="label" htmlFor="deck-brand">
              Marca
            </label>
            <input
              id="deck-brand"
              className="field"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              onBlur={() => !photo && lookupPhoto(brand, model)}
            />
          </div>
          <div>
            <label className="label" htmlFor="deck-model">
              Modelo
            </label>
            <input
              id="deck-model"
              className="field"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              onBlur={() => !photo && lookupPhoto(brand, model)}
            />
          </div>
        </div>

        {(brand || model) && (
          <div>
            <div className="deck-photo">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt={`${brand} ${model}`} referrerPolicy="no-referrer" />
              ) : (
                <DeckIllustration />
              )}
              {credit && <span className="photo-credit">{credit}</span>}
            </div>
            <p className="muted" style={{ fontSize: "0.85rem", margin: "8px 0 0" }}>
              {looking
                ? "Procurando uma foto deste modelo…"
                : photo && credit
                  ? "Foto de referência. Você pode trocar pela sua."
                  : photo
                    ? "Sua foto."
                    : "Sem foto de referência para este modelo. Que tal tirar uma?"}
            </p>
          </div>
        )}

        <div className="row" style={{ justifyContent: "space-between" }}>
          <label className="btn btn-small" style={{ position: "relative" }}>
            <IconCamera size={16} /> Usar minha foto
            <input
              type="file"
              accept="image/*"
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
              onChange={(e) => {
                void ownPhoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <button type="button" className="btn btn-primary" disabled={!brand.trim() || !model.trim()} onClick={save}>
            Salvar toca-discos
          </button>
        </div>
      </div>
    </dialog>
  );
}

function DeckCard({ deck }: { deck: Turntable }) {
  const changePhoto = async (file?: File) => {
    if (!file) return;
    await saveTurntable({ ...deck, photo: await resizeImage(file, 1200, 0.85), photoCredit: undefined });
  };

  return (
    <article>
      <div className="deck-photo">
        {deck.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={deck.photo} alt={`${deck.brand} ${deck.model}`} referrerPolicy="no-referrer" />
        ) : (
          <DeckIllustration />
        )}
        {deck.photoCredit && <span className="photo-credit">{deck.photoCredit}</span>}
      </div>
      <p className="deck-brand">{deck.brand}</p>
      <h2 className="display deck-model">{deck.model}</h2>
      {deck.drive && <p className="deck-meta">Tração {deck.drive.toLowerCase()}</p>}
      <div className="deck-actions">
        <label className="btn btn-small" style={{ position: "relative" }}>
          <IconCamera size={16} /> Trocar foto
          <input
            type="file"
            accept="image/*"
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
            onChange={(e) => {
              void changePhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          className="btn btn-small btn-ghost btn-danger"
          onClick={() => confirm(`Remover ${deck.brand} ${deck.model}?`) && deleteTurntable(deck.id)}
        >
          Remover
        </button>
      </div>
    </article>
  );
}

export default function TurntablesPage() {
  const { data, ready } = useTurntables();
  const [open, setOpen] = useState(false);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="display page-title">Toca-discos</h1>
          <p className="page-sub">Os aparelhos onde seus discos tocam.</p>
        </div>
        {data.length > 0 && (
          <button type="button" className="btn" onClick={() => setOpen(true)}>
            <IconPlus size={18} /> Adicionar toca-discos
          </button>
        )}
      </header>

      {ready && !data.length && (
        <div className="empty">
          <h2 className="display">Nenhum toca-discos cadastrado.</h2>
          <p>Escolha a marca e o modelo do seu. O app procura uma foto de referência, ou você usa a sua.</p>
          <div className="empty-actions">
            <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
              <IconPlus size={18} /> Adicionar toca-discos
            </button>
          </div>
        </div>
      )}

      <div className="deck-grid">
        {data.map((d) => (
          <DeckCard key={d.id} deck={d} />
        ))}
      </div>

      <AddDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
