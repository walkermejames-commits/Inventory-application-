"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { brand } from "@door-in-four/ui";
import { useForm, type UseFormRegister, type UseFormSetValue, type UseFormWatch } from "react-hook-form";
import { z } from "zod";

type AddressSuggestion = {
  line1?: string;
  town?: string;
  county?: string;
  postcode: string;
  formatted: string;
};

type AddressPrefix = "pickup" | "delivery";

const itemSizes = ["small", "medium", "large", "furniture", "van_load"] as const;

const quoteFormSchema = z.object({
  pickupAddressLine: z.string().trim().min(4, "Add a pickup address"),
  pickupPostcode: z.string().trim().min(5, "Add a pickup postcode"),
  pickupTown: z.string().trim().min(2, "Add a pickup town"),
  deliveryAddressLine: z.string().trim().min(4, "Add a delivery address"),
  deliveryPostcode: z.string().trim().min(5, "Add a delivery postcode"),
  deliveryTown: z.string().trim().min(2, "Add a delivery town"),
  itemTitle: z.string().trim().min(2, "Tell us what is being moved"),
  itemSize: z.enum(itemSizes),
  approximateWeightKg: z.coerce.number().min(0, "Weight cannot be negative").max(500, "Please contact us for items over 500kg"),
  contactName: z.string().trim().min(2, "Add a contact name"),
  contactPhone: z.string().trim().min(7, "Add a contact phone number"),
  urgency: z.enum(["scheduled", "same_day", "asap"]).default("scheduled"),
  preferredPickupWindow: z.string().trim().optional(),
  fragile: z.boolean().default(false),
  requiresTwoPeople: z.boolean().default(false),
  requiresVan: z.boolean().default(false),
});

type QuoteFormValues = z.infer<typeof quoteFormSchema>;

const inputClassName =
  "min-h-14 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-300/70 focus:ring-4 focus:ring-emerald-400/10";

const labelClassName = "block text-sm font-semibold text-slate-200";
const helperClassName = "mt-2 text-xs leading-5 text-slate-400";

function fieldName(prefix: AddressPrefix, key: "AddressLine" | "Postcode" | "Town") {
  return `${prefix}${key}` as keyof QuoteFormValues;
}

function formatMoney(value: number) {
  return `£${value.toFixed(2)}`;
}

function Toggle({
  label,
  description,
  name,
  register,
}: {
  label: string;
  description: string;
  name: "fragile" | "requiresTwoPeople" | "requiresVan";
  register: UseFormRegister<QuoteFormValues>;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 transition hover:border-emerald-300/40">
      <input type="checkbox" className="mt-1 h-5 w-5 accent-emerald-400" {...register(name)} />
      <span>
        <span className="block text-sm font-black text-white">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-400">{description}</span>
      </span>
    </label>
  );
}

function SmartAddressField({
  prefix,
  title,
  description,
  register,
  setValue,
  watch,
  error,
}: {
  prefix: AddressPrefix;
  title: string;
  description: string;
  register: UseFormRegister<QuoteFormValues>;
  setValue: UseFormSetValue<QuoteFormValues>;
  watch: UseFormWatch<QuoteFormValues>;
  error?: string;
}) {
  const postcodeName = fieldName(prefix, "Postcode");
  const townName = fieldName(prefix, "Town");
  const addressName = fieldName(prefix, "AddressLine");
  const postcode = watch(postcodeName) as string;
  const addressLine = watch(addressName) as string;
  const [postcodeSuggestions, setPostcodeSuggestions] = useState<string[]>([]);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [loadingPostcodes, setLoadingPostcodes] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const query = (postcode || "").trim();

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

        if (!response.ok) throw new Error(data?.error || "Postcode lookup failed");

        const suggestions = Array.isArray(data.suggestions) ? data.suggestions : [];
        setPostcodeSuggestions(suggestions);
        setPostcodeOpen(suggestions.length > 0);
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

  async function lookupAddress(nextPostcode = postcode) {
    const clean = (nextPostcode || "").trim();
    if (clean.length < 5) return;

    try {
      setLoadingAddresses(true);
      const response = await fetch(`/api/address/search?postcode=${encodeURIComponent(clean)}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data?.error || "Address lookup failed");

      const suggestions = Array.isArray(data.addresses) ? data.addresses : [];
      setAddressSuggestions(suggestions);
      setAddressOpen(suggestions.length > 0);
    } catch {
      setAddressSuggestions([]);
      setAddressOpen(false);
    } finally {
      setLoadingAddresses(false);
    }
  }

  function choosePostcode(nextPostcode: string) {
    setValue(postcodeName, nextPostcode, { shouldDirty: true, shouldValidate: true });
    setPostcodeSuggestions([]);
    setPostcodeOpen(false);
    lookupAddress(nextPostcode);
  }

  function chooseAddress(option: AddressSuggestion) {
    setValue(postcodeName, option.postcode, { shouldDirty: true, shouldValidate: true });
    setValue(townName, option.town || "", { shouldDirty: true, shouldValidate: true });

    if (!addressLine) {
      setValue(addressName, option.line1 || option.formatted, { shouldDirty: true, shouldValidate: true });
    }

    setAddressOpen(false);
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-slate-950/20 sm:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-black text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
      </div>

      <div className="grid gap-4">
        <div>
          <label htmlFor={`${prefix}-address`} className={labelClassName}>
            Address
          </label>
          <input
            id={`${prefix}-address`}
            type="text"
            autoComplete={prefix === "pickup" ? "street-address" : "shipping street-address"}
            placeholder="House number and street, e.g. 12 High Street"
            className={inputClassName}
            {...register(addressName)}
          />
          <p className={helperClassName}>Add the first line. Use postcode lookup below to fill town and postcode.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <label htmlFor={`${prefix}-postcode`} className={labelClassName}>
              Postcode
            </label>
            <input
              id={`${prefix}-postcode`}
              type="text"
              autoComplete={prefix === "pickup" ? "postal-code" : "shipping postal-code"}
              placeholder="e.g. TN1 1AA"
              className={`${inputClassName} pr-24 uppercase`}
              {...register(postcodeName, {
                onChange: (event) => {
                  event.target.value = event.target.value.toUpperCase();
                },
              })}
              onFocus={() => postcodeSuggestions.length > 0 && setPostcodeOpen(true)}
              onBlur={() => {
                blurTimer.current = setTimeout(() => setPostcodeOpen(false), 150);
              }}
            />
            {loadingPostcodes ? <span className="absolute right-4 top-10 text-xs text-slate-400">Searching</span> : null}
            {postcodeOpen ? (
              <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-64 overflow-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                {postcodeSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choosePostcode(suggestion)}
                    className="block w-full px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-emerald-400 hover:text-slate-950 focus:bg-emerald-400 focus:text-slate-950 focus:outline-none"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => lookupAddress()}
            disabled={loadingAddresses}
            className="mt-7 min-h-14 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-5 text-sm font-black text-emerald-200 transition hover:bg-emerald-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={`Find ${title.toLowerCase()} town from postcode`}
          >
            {loadingAddresses ? "Finding" : "Lookup"}
          </button>
        </div>

        <div className="relative">
          <label htmlFor={`${prefix}-town`} className={labelClassName}>
            Town
          </label>
          <input id={`${prefix}-town`} type="text" placeholder="Town or district" className={inputClassName} {...register(townName)} />
          {addressOpen ? (
            <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
              {addressSuggestions.map((option) => (
                <button
                  key={`${option.postcode}-${option.formatted}`}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseAddress(option)}
                  className="block w-full px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-emerald-400 hover:text-slate-950 focus:bg-emerald-400 focus:text-slate-950 focus:outline-none"
                >
                  {option.formatted}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {error ? <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
      </div>
    </section>
  );
}

export default function BuyerJourneyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    mode: "onChange",
    defaultValues: {
      pickupAddressLine: "",
      pickupPostcode: "",
      pickupTown: "",
      deliveryAddressLine: "",
      deliveryPostcode: "",
      deliveryTown: "",
      itemTitle: "",
      itemSize: "medium",
      approximateWeightKg: 20,
      contactName: "",
      contactPhone: "",
      urgency: "scheduled",
      preferredPickupWindow: "",
      fragile: false,
      requiresTwoPeople: false,
      requiresVan: false,
    },
  });

  const watched = watch();
  const routeReady = Boolean(watched.pickupPostcode && watched.deliveryPostcode);
  const estimatedBase = watched.itemSize === "van_load" ? 58 : watched.itemSize === "furniture" ? 44 : watched.itemSize === "large" ? 34 : 24;
  const weightSurcharge = Math.max(0, Number(watched.approximateWeightKg || 0) - 20) * 0.35;
  const requirementSurcharge = (watched.requiresVan ? 10 : 0) + (watched.requiresTwoPeople ? 18 : 0) + (watched.fragile ? 4 : 0);
  const previewPrice = estimatedBase + weightSurcharge + requirementSurcharge;

  async function onSubmit(values: QuoteFormValues) {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        pickupTown: values.pickupTown,
        pickupPostcode: values.pickupPostcode,
        pickupAddress: values.pickupAddressLine,
        deliveryTown: values.deliveryTown,
        deliveryPostcode: values.deliveryPostcode,
        deliveryAddress: values.deliveryAddressLine,
        sellerName: values.contactName,
        sellerPhone: values.contactPhone,
        buyerName: values.contactName,
        buyerPhone: values.contactPhone,
        itemTitle: values.itemTitle,
        itemSize: values.itemSize,
        approximateWeightKg: values.approximateWeightKg,
        urgency: values.urgency,
        preferredPickupWindow: values.preferredPickupWindow,
        fragile: values.fragile,
        requiresTwoPeople: values.requiresTwoPeople,
        requiresVan: values.requiresVan,
      };

      const response = await fetch("/api/buy/create-quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Could not create quote");
      }

      router.push(data.redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create quote");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="mb-8 rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(6,78,59,0.55),rgba(15,23,42,0.98))] p-6 shadow-2xl shadow-slate-950/40 sm:p-8">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
              Instant delivery quote
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{brand.promise}</h1>
            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
              Enter the route, item, and one contact number. We will calculate the delivery quote and create your booking flow.
            </p>
          </div>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-6">
            <section className="rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-3 text-sm font-black text-emerald-100">
                <span className="rounded-full bg-emerald-300 px-3 py-1 text-xs text-slate-950">Step 1</span>
                <span>Where from -&gt; Where to</span>
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <SmartAddressField
                prefix="pickup"
                title="Pickup address"
                description="Where the item is now."
                register={register}
                setValue={setValue}
                watch={watch}
                error={errors.pickupAddressLine?.message || errors.pickupPostcode?.message || errors.pickupTown?.message}
              />

              <SmartAddressField
                prefix="delivery"
                title="Delivery address"
                description="Where the item needs to go."
                register={register}
                setValue={setValue}
                watch={watch}
                error={errors.deliveryAddressLine?.message || errors.deliveryPostcode?.message || errors.deliveryTown?.message}
              />
            </div>

            <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-slate-950/20 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950">Step 2</span>
                <h2 className="text-xl font-black text-white">Item details</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label htmlFor="itemTitle" className={labelClassName}>
                    What are we moving?
                  </label>
                  <input id="itemTitle" type="text" placeholder="e.g. Oak dining table" className={inputClassName} {...register("itemTitle")} />
                  {errors.itemTitle?.message ? <p className={helperClassName}>{errors.itemTitle.message}</p> : null}
                </div>

                <div>
                  <label htmlFor="itemSize" className={labelClassName}>
                    Size category
                  </label>
                  <select id="itemSize" className={inputClassName} {...register("itemSize")}>
                    <option value="small">Small - box or bag</option>
                    <option value="medium">Medium - chair or small unit</option>
                    <option value="large">Large - appliance or large unit</option>
                    <option value="furniture">Furniture</option>
                    <option value="van_load">Van load</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="approximateWeightKg" className={labelClassName}>
                    Approximate weight
                  </label>
                  <div className="relative">
                    <input id="approximateWeightKg" type="number" min="0" max="500" inputMode="decimal" className={`${inputClassName} pr-12`} {...register("approximateWeightKg")} />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">kg</span>
                  </div>
                  {errors.approximateWeightKg?.message ? <p className={helperClassName}>{errors.approximateWeightKg.message}</p> : null}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-slate-950/20 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-950">Step 3</span>
                <h2 className="text-xl font-black text-white">Contact and options</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="contactName" className={labelClassName}>
                    Contact name
                  </label>
                  <input id="contactName" type="text" autoComplete="name" placeholder="Name for collection and delivery updates" className={inputClassName} {...register("contactName")} />
                  {errors.contactName?.message ? <p className={helperClassName}>{errors.contactName.message}</p> : null}
                </div>

                <div>
                  <label htmlFor="contactPhone" className={labelClassName}>
                    Contact phone
                  </label>
                  <input id="contactPhone" type="tel" autoComplete="tel" placeholder="e.g. 07123 456789" className={inputClassName} {...register("contactPhone")} />
                  {errors.contactPhone?.message ? <p className={helperClassName}>{errors.contactPhone.message}</p> : null}
                </div>

                <div>
                  <label htmlFor="urgency" className={labelClassName}>
                    Timing
                  </label>
                  <select id="urgency" className={inputClassName} {...register("urgency")}>
                    <option value="scheduled">Scheduled</option>
                    <option value="same_day">Same day</option>
                    <option value="asap">ASAP</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="preferredPickupWindow" className={labelClassName}>
                    Preferred pickup window
                  </label>
                  <input id="preferredPickupWindow" type="text" placeholder="Optional, e.g. tomorrow 2-5pm" className={inputClassName} {...register("preferredPickupWindow")} />
                </div>
              </div>

              <details className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <summary className="cursor-pointer text-sm font-black text-white">Additional requirements</summary>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Toggle label="Fragile" description="Glass, mirrors, artwork, or delicate surfaces." name="fragile" register={register} />
                  <Toggle label="Two people" description="Heavy or awkward items that need a second handler." name="requiresTwoPeople" register={register} />
                  <Toggle label="Van required" description="Large items that cannot fit in a car." name="requiresVan" register={register} />
                </div>
              </details>
            </section>
          </div>

          <aside className="lg:sticky lg:top-6 lg:h-fit">
            <div className="rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl shadow-slate-950/30 sm:p-6">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Quote preview</p>
              <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950 p-5">
                <p className="text-sm text-slate-400">{routeReady ? "Indicative starting point" : "Add both postcodes"}</p>
                <p className="mt-2 text-4xl font-black text-white">{routeReady ? formatMoney(previewPrice) : "--"}</p>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Final price is calculated from postcode route distance, timing, weight, and requirements when you submit.
                </p>
              </div>

              {error ? (
                <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading || !isValid}
                className="mt-5 min-h-16 w-full rounded-2xl bg-emerald-400 px-6 text-lg font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Getting quote..." : "Get Instant Quote"}
              </button>

              <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                No payment is taken here. You will review the quote before checkout.
              </p>
            </div>

            <p className="mt-4 text-center text-[11px] font-medium text-slate-700">Buyer quote flow v2</p>
          </aside>
        </form>
      </div>
    </main>
  );
}
