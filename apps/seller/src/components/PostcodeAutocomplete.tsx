"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  name: string;
  placeholder: string;
  required?: boolean;
  className?: string;
};

export default function PostcodeAutocomplete({ name, placeholder, required, className }: Props) {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const query = value.trim();

    if (query.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/postcodes/suggest?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data?.error || "Could not load suggestions");

        setSuggestions(data.suggestions || []);
        setOpen((data.suggestions || []).length > 0);
      } catch (error) {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  const choose = (postcode: string) => {
    setValue(postcode);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value.toUpperCase())}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => {
          hideTimer.current = setTimeout(() => setOpen(false), 150);
        }}
        placeholder={placeholder}
        required={required}
        autoComplete="postal-code"
        className={className}
      />

      {open ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
          {suggestions.map((postcode) => (
            <button
              key={postcode}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(postcode)}
              className="block w-full px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-emerald-400 hover:text-slate-950"
            >
              {postcode}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          Searching…
        </div>
      ) : null}
    </div>
  );
}
