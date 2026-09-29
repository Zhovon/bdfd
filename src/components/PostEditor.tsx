"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addPost, editPost, type PostFormState } from "@/app/admin/actions";

const categories = [
  { value: "travel", label: "Travel & Tourism" },
  { value: "welfare", label: "Welfare" },
  { value: "condolence", label: "Condolence & Support" },
  { value: "association", label: "Association Information" },
];

const paymentModes = [
  { value: "none", label: "No payment — informational notice" },
  { value: "participation", label: "Participation — a fixed fee to join (e.g. a tour)" },
  { value: "donation", label: "Donation — open amount, payer chooses" },
];

const fileInput =
  "mt-2 block w-full text-sm text-stone file:mr-3 file:rounded-full file:border-0 file:bg-field file:px-4 file:py-2 file:text-sm file:font-semibold file:text-husk";
const textInput =
  "mt-2 w-full rounded-lg border border-line bg-husk px-3 py-2.5 text-field outline-none focus:border-brand";

type Photo = { id: number; url: string };

export type EditInitial = {
  id: number;
  category: string;
  title: string;
  excerpt: string;
  videos: string[];
  paymentMode: string;
  feeAmount: number | null;
  pdfUrl: string | null;
  cover: Photo[];
  blocks: { id: number; heading: string; body: string; images: Photo[] }[];
};

// key = React list key; id = existing block id (null for a section not yet saved).
type Section = { key: number; id: number | null; heading: string; body: string; images: Photo[] };

export default function PostEditor({ initial }: { initial?: EditInitial }) {
  const editing = Boolean(initial);
  const [state, formAction, pending] = useActionState<PostFormState, FormData>(
    editing ? editPost : addPost,
    null,
  );
  const [category, setCategory] = useState(initial?.category ?? "travel");
  const [paymentMode, setPaymentMode] = useState(initial?.paymentMode ?? "none");
  const [sections, setSections] = useState<Section[]>(
    initial?.blocks.map((b, i) => ({
      key: i + 1,
      id: b.id,
      heading: b.heading,
      body: b.body,
      images: b.images,
    })) ?? [],
  );
  const nextKey = useRef((initial?.blocks.length ?? 0) + 1);
  const formRef = useRef<HTMLFormElement>(null);

  const addSection = () =>
    setSections((s) => [...s, { key: nextKey.current++, id: null, heading: "", body: "", images: [] }]);
  const removeSection = (key: number) => setSections((s) => s.filter((x) => x.key !== key));

  // Reset a fresh post after a successful publish (but keep an edited one).
  useEffect(() => {
    if (state?.ok && !editing) {
      formRef.current?.reset();
      setSections([]);
      setPaymentMode("none");
      setCategory("travel");
    }
  }, [state, editing]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-5">
      <input type="hidden" name="blockCount" value={sections.length} />
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <label>
        <span className="log-label text-field">Board</span>
        <select
          name="category"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={textInput}
        >
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="log-label text-field">Title</span>
        <input
          name="title"
          required
          defaultValue={initial?.title}
          placeholder="Cox's Bazar tour — 3 days"
          className={textInput}
        />
      </label>

      <label>
        <span className="log-label flex items-center gap-2 text-field">
          Summary <span className="text-stone">· shown on the card</span>
        </span>
        <textarea
          name="excerpt"
          rows={2}
          defaultValue={initial?.excerpt}
          placeholder="A short line that appears in the notice list."
          className={textInput}
        />
      </label>

      {/* Existing cover photos (edit) — tick to remove */}
      {editing && initial!.cover.length > 0 && (
        <div>
          <span className="log-label flex items-center gap-2 text-field">
            Current cover photos <span className="text-stone">· tick to remove</span>
          </span>
          <PhotoGrid photos={initial!.cover} />
        </div>
      )}

      <label>
        <span className="log-label flex items-center gap-2 text-field">
          {editing ? "Add cover photos" : "Cover photos"}{" "}
          <span className="text-stone">· optional · first one is the main image</span>
        </span>
        <input name="cover" type="file" accept="image/*" multiple className={fileInput} />
      </label>

      <label>
        <span className="log-label flex items-center gap-2 text-field">
          Video links <span className="text-stone">· optional · one per line (YouTube, Vimeo, Facebook)</span>
        </span>
        <textarea
          name="videos"
          rows={2}
          defaultValue={initial?.videos.join("\n")}
          placeholder="https://www.youtube.com/watch?v=…"
          className={textInput}
        />
      </label>

      <label>
        <span className="log-label flex items-center gap-2 text-field">
          Programme PDF <span className="text-stone">· optional · shown after the text</span>
        </span>
        <input name="pdf" type="file" accept="application/pdf" className={fileInput} />
      </label>

      {editing && initial!.pdfUrl && (
        <div className="rounded-lg border border-line p-3">
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={initial!.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-brand underline"
            >
              View current PDF
            </a>
            <label className="flex items-center gap-2 text-sm text-stone">
              <input type="checkbox" name="removePdf" className="h-4 w-4 accent-[var(--grain)]" />
              Remove it
            </label>
            <span className="text-xs text-stone">Upload a new PDF above to replace it.</span>
          </div>
        </div>
      )}

      {/* Payment intent — only Travel & Tourism posts can carry a payment */}
      {category === "travel" && (
      <fieldset className="rounded-lg border border-line p-4">
        <legend className="log-label px-2 text-brand">Payment</legend>
        <label className="block">
          <span className="log-label text-field">Mode</span>
          <select
            name="paymentMode"
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className={textInput}
          >
            {paymentModes.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        {paymentMode === "participation" && (
          <label className="mt-3 block">
            <span className="log-label flex items-center gap-2 text-field">
              Fee per person <span className="text-stone">· BDT</span>
            </span>
            <input
              name="feeAmount"
              type="number"
              min={1}
              step="0.01"
              required
              defaultValue={initial?.feeAmount ?? undefined}
              placeholder="3000"
              className={textInput}
            />
          </label>
        )}
        {paymentMode === "donation" && (
          <p className="mt-3 text-sm text-stone">
            Members will choose their own amount when they contribute.
          </p>
        )}
      </fieldset>
      )}

      {/* Text sections */}
      <div className="grid gap-4">
        {sections.map((s, i) => (
          <fieldset key={s.key} className="rounded-lg border border-line p-4">
            <legend className="log-label px-2 text-brand">Section {i + 1}</legend>
            {s.id !== null && <input type="hidden" name={`block-id-${i}`} value={s.id} />}
            <label className="block">
              <span className="log-label text-field">Heading</span>
              <input
                name={`block-heading-${i}`}
                defaultValue={s.heading}
                placeholder="Day 1 — Arrival & beach"
                className={textInput}
              />
            </label>
            <label className="mt-3 block">
              <span className="log-label text-field">Text</span>
              <textarea
                name={`block-body-${i}`}
                defaultValue={s.body}
                rows={4}
                className={textInput}
              />
            </label>
            {s.images.length > 0 && (
              <div className="mt-3">
                <span className="log-label flex items-center gap-2 text-field">
                  Section photos <span className="text-stone">· tick to remove</span>
                </span>
                <PhotoGrid photos={s.images} />
              </div>
            )}
            <label className="mt-3 block">
              <span className="log-label flex items-center gap-2 text-field">
                Add section photos <span className="text-stone">· optional · shown with this section</span>
              </span>
              <input name={`block-images-${i}`} type="file" accept="image/*" multiple className={fileInput} />
            </label>
            <button
              type="button"
              onClick={() => removeSection(s.key)}
              className="log-label mt-3 text-stone hover:text-grain hover:underline"
            >
              Remove section
            </button>
          </fieldset>
        ))}
      </div>

      <button
        type="button"
        onClick={addSection}
        className="justify-self-start rounded-full border border-field/30 px-5 py-2.5 text-sm font-semibold text-field transition-colors hover:bg-field hover:text-husk"
      >
        + Add section
      </button>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand px-7 py-3 font-semibold text-husk transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {pending ? "Saving…" : editing ? "Save changes" : "Publish notice"}
        </button>
        {state && (
          <span className={`text-sm ${state.ok ? "text-brand" : "text-grain"}`}>{state.message}</span>
        )}
      </div>
    </form>
  );
}

/** Existing photos, each with a tick-to-remove overlay (posts by image id). */
function PhotoGrid({ photos }: { photos: Photo[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-3">
      {photos.map((img) => (
        <label key={img.id} className="relative block cursor-pointer">
          <input type="checkbox" name="removeImage" value={img.id} className="peer sr-only" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.url}
            alt=""
            className="h-20 w-28 rounded-md border border-line object-cover peer-checked:opacity-30"
          />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-md bg-grain/90 py-0.5 text-center text-[0.6rem] font-bold text-husk opacity-0 peer-checked:opacity-100">
            REMOVE
          </span>
        </label>
      ))}
    </div>
  );
}
