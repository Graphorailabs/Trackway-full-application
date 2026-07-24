import { useEffect, useState } from "react";

export function useSearch(initial = "") {
  const [search, setSearch] = useState(initial);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 180);
    return () => clearTimeout(t);
  }, [search]);

  const tokenMatch = (target: string, q: string) => {
    const tokens = q
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    if (tokens.length === 0) return true;
    const txt = (target || "").toLowerCase();
    return tokens.every((t) => txt.includes(t));
  };

  return { search, setSearch, debouncedSearch, tokenMatch };
}
