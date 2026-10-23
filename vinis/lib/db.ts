"use client";

import { createStore, del, entries, get, set, setMany, clear, type UseStore } from "idb-keyval";
import { useCallback, useEffect, useState } from "react";
import type { Turntable, VinylRecord } from "./types";

// Cada coleção vive no seu próprio banco IndexedDB, no aparelho.
let recordStore: UseStore | null = null;
let turntableStore: UseStore | null = null;

function records() {
  return (recordStore ??= createStore("vinis-records", "records"));
}
function turntables() {
  return (turntableStore ??= createStore("vinis-turntables", "turntables"));
}

const CHANGE_EVENT = "vinis:change";

function notify() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function newId() {
  return crypto.randomUUID();
}

export async function listRecords(): Promise<VinylRecord[]> {
  const all = await entries<string, VinylRecord>(records());
  return all.map(([, value]) => value);
}

export async function getRecord(id: string) {
  return get<VinylRecord>(id, records());
}

export async function saveRecord(record: VinylRecord) {
  await set(record.id, record, records());
  notify();
}

export async function updateRecord(id: string, patch: Partial<VinylRecord>) {
  const current = await getRecord(id);
  if (!current) return;
  await saveRecord({ ...current, ...patch });
}

export async function saveRecords(list: VinylRecord[]) {
  await setMany(list.map((r) => [r.id, r]), records());
  notify();
}

export async function deleteRecord(id: string) {
  await del(id, records());
  notify();
}

export async function listTurntables(): Promise<Turntable[]> {
  const all = await entries<string, Turntable>(turntables());
  return all.map(([, value]) => value).sort((a, b) => a.addedAt - b.addedAt);
}

export async function saveTurntable(t: Turntable) {
  await set(t.id, t, turntables());
  notify();
}

export async function deleteTurntable(id: string) {
  await del(id, turntables());
  notify();
}

export type Backup = {
  app: "vinis";
  version: 1;
  exportedAt: string;
  records: VinylRecord[];
  turntables: Turntable[];
};

export async function exportBackup(): Promise<Backup> {
  return {
    app: "vinis",
    version: 1,
    exportedAt: new Date().toISOString(),
    records: await listRecords(),
    turntables: await listTurntables(),
  };
}

export async function importBackup(data: Backup, mode: "merge" | "replace") {
  if (data?.app !== "vinis" || !Array.isArray(data.records)) {
    throw new Error("Esse arquivo não é um backup do Vinis.");
  }
  if (mode === "replace") {
    await clear(records());
    await clear(turntables());
  }
  await setMany(data.records.map((r) => [r.id, r]), records());
  await setMany((data.turntables ?? []).map((t) => [t.id, t]), turntables());
  notify();
}

/** Lê dados do IndexedDB e recarrega sempre que algo muda. */
function useLive<T>(loader: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const load = useCallback(loader, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let alive = true;
    const run = () =>
      load().then((value) => {
        if (!alive) return;
        setData(value);
        setReady(true);
      });
    run();
    window.addEventListener(CHANGE_EVENT, run);
    return () => {
      alive = false;
      window.removeEventListener(CHANGE_EVENT, run);
    };
  }, [load]);

  return { data, ready };
}

export function useRecords() {
  return useLive(listRecords, [] as VinylRecord[]);
}

export function useTurntables() {
  return useLive(listTurntables, [] as Turntable[]);
}

export function useRecord(id: string) {
  const [record, setRecord] = useState<VinylRecord | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    const run = () => getRecord(id).then((r) => alive && setRecord(r ?? null));
    run();
    window.addEventListener(CHANGE_EVENT, run);
    return () => {
      alive = false;
      window.removeEventListener(CHANGE_EVENT, run);
    };
  }, [id]);
  return record;
}
