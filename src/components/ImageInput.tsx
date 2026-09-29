"use client";

import { useState } from "react";
import { shrinkImages } from "@/lib/client-image";
import { useI18n } from "./I18nProvider";

type Props = Omit<React.ComponentPropsWithoutRef<"input">, "type" | "onChange">;

/**
 * A photo file input that shrinks the chosen photos in the browser before the
 * form is submitted. While that runs, the input reports itself invalid, so the
 * browser holds a submit until the smaller files are in place.
 */
export default function ImageInput(props: Props) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const files = input.files;
    // DataTransfer is how a script replaces an input's files; very old browsers
    // lack it — they simply upload the originals.
    if (!files?.length || typeof DataTransfer === "undefined") return;

    setBusy(true);
    input.setCustomValidity(t.common.preparingPhotos);
    try {
      const shrunk = await shrinkImages(files);
      const dt = new DataTransfer();
      shrunk.forEach((f) => dt.items.add(f));
      input.files = dt.files;
    } catch {
      // Keep the originals; the server resizes them anyway.
    } finally {
      input.setCustomValidity("");
      setBusy(false);
    }
  }

  return (
    <>
      <input {...props} type="file" onChange={onChange} aria-busy={busy} />
      {busy && (
        <span role="status" className="mt-1 block text-xs text-stone">
          {t.common.preparingPhotos}
        </span>
      )}
    </>
  );
}
