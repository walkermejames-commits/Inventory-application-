"use client";

import { useEffect, useState } from "react";

type AddressSuggestion = {
  line1: string;
  line2?: string;
  town?: string;
  county?: string;
  postcode: string;
  formatted: string;
};

type Props = {
  postcodeName: string;
  addressName: string;
  townName?: string;
  postcodePlaceholder?: string;
  addressPlaceholder?: string;
  townPlaceholder?: string;
  required?: boolean;
  inputClassName: string;
  labelClassName?: string;
  postcodeLabel?: string;
  addressLabel?: string;
  townLabel?: string;
};

export default function AddressLookup({
  postcodeName,
  addressName,
  townName,
  postcodePlaceholder = "Postcode",
  addressPlaceholder = "Address line",
  townPlaceholder = "Town",
  required,
  inputClassName,
  labelClassName = "block text-sm mb-2 text-zinc-400",
  postcodeLabel = "Postcode",
  addressLabel = "Address",
  townLabel = "Town",
}: Props) {
  const [postcode, setPostcode] = useState("");
  const [address, setAddress] = useState("");
  const [town, setTown] = useState("");
  const [postcodeSuggestions, setPostcodeSuggestions] = useState<string[]>([]);
  const [addresses, setAddresses] = useState<AddressSuggestion[]>([]);
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [loadingPostcodes, setLoadingPostcodes] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  useEffect(() => {
    const query = postcode.trim();

    if (query.length < 2) {
      setPostcodeSuggestions([]);
      setPostcodeOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoadingPostcodes(true);
        const response = await fetch(`/api/postcodes/suggest?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) throw new Error(data?.error || "Could not load postcodes");

        setPostcodeSuggestions(data.suggestions || []);
        setPostcodeOpen((data.suggestions || []).length > 0);
      } catch {
        if (!controller.signal.aborted) {
          setPostcodeSuggestions([]);
          setPostcodeOpen(false);
        }
      } finally {
        if (!controller.signal.aborted) setLoadingPostcodes(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [postcode]);

  async function lookupAddresses(nextPostcode = postcode) {
    const clean = nextPostcode.trim();
    if (clean.length < 5) return;

    try {
      setLoadingAddresses(true);
      const response = await fetch(`/api/address/search?postcode=${encodeURIComponent(clean)}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data?.error || "Could not load addresses");

      setAddresses(data.addresses || []);
      setAddressOpen((data.addresses || []).length > 0);
    } catch {
      setAddresses([]);
      setAddressOpen(false);
    } finally {
      setLoadingAddresses(false);
    }
  }

  function choosePostcode(nextPostcode: string) {
    setPostcode(nextPostcode);
    setPostcodeSuggestions([]);
    setPostcodeOpen(false);
    lookupAddresses(nextPostcode);
  }

  function chooseAddress(option: AddressSuggestion) {
    setAddress(option.line1 || option.formatted);
    setTown(option.town || town);
    setPostcode(option.postcode || postcode);
    setAddressOpen(false);
  }

  return (
    <div className="space-y-4">
      {townName ? (
        <div>
          <label className={labelClassName}>{townLabel}</label>
          <input
            name={townName}
            value={town}
            onChange={(event) => setTown(event.target.value)}
            placeholder={townPlaceholder}
            required={required}
            className={inputClassName}
          />
        </div>
      ) : null}

      <div className="relative">
        <label className={labelClassName}>{postcodeLabel}</label>
        <input
          name={postcodeName}
          value={postcode}
          onChange={(event) => setPostcode(event.target.value.toUpperCase())}
          onFocus={() => postcodeSuggestions.length > 0 && setPostcodeOpen(true)}
          onBlur={() => setTimeout(() => setPostcodeOpen(false), 150)}
          placeholder={postcodePlaceholder}
          required={required}
          autoComplete="postal-code"
          className={inputClassName}
        />
        {loadingPostcodes ? <span className="absolute right-4 top-10 text-xs text-slate-400">Searching…</span> : null}
        {postcodeOpen ? (
          <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            {postcodeSuggestions.map((item) => (
              <button
                key={item}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choosePostcode(item)}
                className="block w-full px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-emerald-400 hover:text-slate-950"
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative">
        <label className={labelClassName}>{addressLabel}</label>
        <input
          name={addressName}
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          onFocus={() => addresses.length > 0 && setAddressOpen(true)}
          onBlur={() => setTimeout(() => setAddressOpen(false), 150)}
          placeholder={addressPlaceholder}
          className={inputClassName}
        />
        <button
          type="button"
          onClick={() => lookupAddresses()}
          className="mt-2 text-xs font-bold text-emerald-300 hover:text-emerald-200"
        >
          {loadingAddresses ? "Finding addresses…" : "Find addresses for this postcode"}
        </button>

        {addressOpen ? (
          <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            {addresses.map((option) => (
              <button
                key={`${option.postcode}-${option.formatted}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseAddress(option)}
                className="block w-full px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-emerald-400 hover:text-slate-950"
              >
                {option.formatted}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
