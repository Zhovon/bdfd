"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addPost, type PostFormState } from "@/app/admin/actions";

const categories = [
  { value: "travel", label: "Travel & Tourism" },
  { value: "welfare", label: "Welfare & Donation" },
  { value: "condolence", label: "Condolence & Support" },
  { value: "association", label: "Association Information" },
];

const fileInput =
  "mt-2 block w-full text-sm text-stone file:mr-3 file:rounded-full file:border-0 file:bg-field file:px-4 file:py-2 file:text-sm file:font-semibold file:text-husk";
const textInput =
  "mt-2 w-full rounded-lg border border-line bg-husk px-3 py-2.5 text-field outline-none focus:border-brand";

export default function PostEditor() {
  const [state, formAction, pending] = useActionState<PostFormState, FormData>(addPost, null);
  // Each section is tracked by a stable key; names use the render index (0..n-1).
  const [sections, setSections] = useState<number[]>([]);
  const nextKey = useRef(1);
  const formRef = useRef<HTMLFormElement>(null);

  const addSection = () => setSections((s) => [...s, nextKey.current++]);
  const removeSection = (key: number) => setSections((s) => s.filter((k) => k !== key));

  // Reset the whole form after a successful publish.
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setSections([]);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-5">
      <input type="hidden" name="blockCount" value={sections.length} />

      <label>
        <span className="log-label text-field">Board</span>
        <select name="category" required defaultValue="travel" className={textInput}>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="log-label text-field">Title</span>
        <input name="title" required placeholder="Cox's Bazar tour — 3 days" className={textInput} />
      </label>

      <label>
        <span className="log-label flex items-center gap-2 text-field">
          Summary <span className="text-stone">· shown on the card</span>
        </span>
        <textarea
          name="excerpt"
          rows={2}
          placeholder="A short line that appears in the notice list."
          className={textInput}
        />
      </label>

      <label>
        <span className="log-label flex items-center gap-2 text-field">
          Cover photos <span className="text-stone">· optional</span>
        </span>
        <input name="cover" type="file" accept="image/*" multiple className={fileInput} />
      </label>

      {/* Sections */}
      <div className="grid gap-4">
        {sections.map((key, i) => (
          <fieldset key={key} className="rounded-lg border border-line p-4">
            <legend className="log-label px-2 text-brand">Section {i + 1}</legend>
            <label className="block">
              <span className="log-label text-field">Heading</span>
              <input
                name={`block-heading-${i}`}
                placeholder="Day 1 — Arrival & beach"
                className={textInput}
              />
            </label>
            <label className="mt-3 block">
              <span className="log-label text-field">Text</span>
              <textarea name={`block-body-${i}`} rows={4} className={textInput} />
            </label>
            <label className="mt-3 block">
              <span className="log-label flex items-center gap-2 text-field">
                Photos <span className="text-stone">· optional</span>
              </span>
              <input name={`block-images-${i}`} type="file" accept="image/*" multiple className={fileInput} />
            </label>
            <button
              type="button"
              onClick={() => removeSection(key)}
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
          {pending ? "Publishing…" : "Publish notice"}
        </button>
        {state && (
          <span className={`text-sm ${state.ok ? "text-brand" : "text-grain"}`}>{state.message}</span>
        )}
      </div>
    </form>
  );
}
