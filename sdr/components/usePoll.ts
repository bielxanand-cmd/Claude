"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** Busca `url` e repete a cada `ms`. Também recarrega quando a aba volta ao foco. */
export function usePoll<T>(url: string | null, ms = 5000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef(url);
  urlRef.current = url;

  const reload = useCallback(async () => {
    const u = urlRef.current;
    if (!u) return;
    try {
      const res = await fetch(u, { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? `Erro ${res.status}`);
      if (urlRef.current === u) {
        setData(j);
        setError(null);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    reload();
    if (!ms) return;
    const id = setInterval(reload, ms);
    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);
    window.addEventListener("sdr:refresh", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("sdr:refresh", onFocus);
    };
  }, [url, ms, reload]);

  return { data, error, reload };
}

/** Pede para todas as telas recarregarem (após registrar uma ação). */
export function refreshAll() {
  window.dispatchEvent(new Event("sdr:refresh"));
}

/** Relógio que atualiza a cada segundo (para os cronômetros). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
