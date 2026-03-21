'use client';

import { useState, useEffect, useCallback } from 'react';

// QA-003: Accept string | null, check res.ok, use AbortController for cleanup
export function useFetch<T>(url: string | null, interval = 0) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    if (!url) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text || 'Request failed'}`);
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    const ac = new AbortController();
    fetchData(ac.signal);
    let id: ReturnType<typeof setInterval> | undefined;
    if (interval > 0) {
      id = setInterval(() => fetchData(), interval);
    }
    return () => {
      ac.abort();
      if (id) clearInterval(id);
    };
  }, [fetchData, interval]);

  return { data, loading, error, refetch: () => fetchData() };
}
