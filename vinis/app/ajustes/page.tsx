"use client";

import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { exportBackup, importBackup, useRecords, useTurntables, type Backup } from "@/lib/db";

type Status = { discogs: boolean; anthropic: boolean; spotify: boolean };

const SERVICES: { key: keyof Status; name: string; what: string }[] = [
  { key: "discogs", name: "Discogs", what: "busca, faixas e capas" },
  { key: "anthropic", name: "Reconhecimento por foto", what: "identifica o disco pela capa" },
  { key: "spotify", name: "Spotify", what: "link direto para o álbum" },
];

export default function SettingsPage() {
  const { data: records } = useRecords();
  const { data: decks } = useTurntables();
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => undefined);
  }, []);

  const download = async () => {
    const backup = await exportBackup();
    const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vinis-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMessage({ text: `Backup baixado com ${backup.records.length} discos e ${backup.turntables.length} toca-discos.` });
  };

  const restore = async (file?: File) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as Backup;
      const replace =
        records.length > 0 &&
        confirm("Substituir tudo o que está neste aparelho pelo backup? Cancelar junta os dois.");
      await importBackup(data, replace ? "replace" : "merge");
      setMessage({ text: `Backup restaurado: ${data.records.length} discos.` });
    } catch (err) {
      setMessage({ text: (err as Error).message || "Não deu para ler esse arquivo.", error: true });
    }
  };

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <header className="page-head">
        <h1 className="display page-title">Ajustes</h1>
      </header>

      <div className="stack" style={{ gap: 40 }}>
        <section>
          <h2 className="section-title">Tema</h2>
          <ThemeToggle />
          <p className="muted" style={{ marginTop: 10 }}>
            Sala é escuro, para a noite. Galeria é claro, com as capas em destaque como numa exposição.
          </p>
        </section>

        <section>
          <h2 className="section-title">Backup</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Sua coleção fica guardada só neste aparelho ({records.length} discos, {decks.length} toca-discos). Baixe um
            backup de vez em quando, e use-o para passar a coleção para outro celular ou computador.
          </p>
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={download}>
              Baixar backup
            </button>
            <label className="btn" style={{ position: "relative" }}>
              Restaurar backup
              <input
                type="file"
                accept="application/json,.json"
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                onChange={(e) => {
                  void restore(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {message && (
            <p className={`notice ${message.error ? "notice-error" : ""}`} style={{ marginTop: 14 }} role="status">
              {message.text}
            </p>
          )}
        </section>

        <section>
          <h2 className="section-title">Serviços</h2>
          <ul className="results">
            {SERVICES.map((s) => (
              <li key={s.key} className="result" style={{ gridTemplateColumns: "1fr auto" }}>
                <div>
                  <div className="result-title">{s.name}</div>
                  <div className="result-meta">{s.what}</div>
                </div>
                <span className={status?.[s.key] ? "" : "muted"} style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                  {status == null ? "…" : status[s.key] ? "Configurado" : "Falta configurar"}
                </span>
              </li>
            ))}
          </ul>
          <p className="muted" style={{ fontSize: "0.9rem" }}>
            As chaves ficam nas variáveis de ambiente do projeto na Vercel. O passo a passo está no README.
          </p>
        </section>

        <section>
          <h2 className="section-title">Instalar no celular</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            No iPhone, toque em Compartilhar e depois em “Adicionar à Tela de Início”. No Android, abra o menu do Chrome e
            toque em “Instalar app”.
          </p>
        </section>
      </div>
    </div>
  );
}
