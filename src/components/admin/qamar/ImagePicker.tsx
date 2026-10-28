"use client";

import { useEffect, useState } from "react";
import { MAX_FILES } from "@/lib/qamar";

/** Choix des captures d'écran ou photos jointes, avec aperçu. */
export function ImagePicker({ error }: { error?: string }) {
  const [previews, setPreviews] = useState<{ url: string; name: string }[]>([]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  return (
    <div>
      <label htmlFor="q-images" className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-white/70">
        Images (facultatif)
      </label>
      <input
        id="q-images"
        name="images"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        aria-describedby="q-images-aide"
        onChange={(e) => setPreviews([...(e.target.files ?? [])].map((f) => ({ url: URL.createObjectURL(f), name: f.name })))}
        className="block w-full text-sm text-white/80 file:mr-3 file:rounded file:border-0 file:bg-white/15 file:px-3 file:py-2 file:text-sm file:text-[#f4efe2] hover:file:bg-white/25"
      />
      <p id="q-images-aide" className="mt-1 text-xs text-white/55">
        Captures d&apos;écran ou photos : {MAX_FILES} au maximum, JPEG, PNG, WebP ou AVIF, 9 Mo en tout.
      </p>
      {error && <p className="mt-1 text-sm text-[#ffb4a8]">{error}</p>}
      {previews.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {previews.map((p) => (
            <li key={p.url} className="aspect-square overflow-hidden rounded border border-white/15">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
