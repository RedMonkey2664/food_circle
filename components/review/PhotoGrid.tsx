'use client';

import { useRef, useState, useTransition } from 'react';
import { CloseIcon } from '@/components/ui/icons';
import { addPhoto, removePhoto } from '@/lib/actions/review';
import { copy } from '@/lib/copy';
import { MAX_PHOTOS } from '@/lib/domain/review';
import { compressPhoto } from '@/lib/images/compress';
import { createClient } from '@/lib/supabase/client';

export type GridPhoto = { path: string; url: string };

/**
 * Photo picker + grid for a visit. Compresses in the browser (WebP, <= 1280 px, < 300 KB,
 * metadata stripped), uploads into the author's own folder, then records the row.
 * `kind`: review photos follow the verdict's audience; memory photos follow the memory's.
 */
export function PhotoGrid({
  visitId,
  userId,
  kind,
  initial,
  max = MAX_PHOTOS,
}: {
  visitId: string;
  userId: string;
  kind: 'review' | 'memory';
  initial: GridPhoto[];
  max?: number;
}) {
  const t = copy.review;
  const [photos, setPhotos] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setUploading(true);
    const supabase = createClient();
    try {
      for (const file of [...files].slice(0, max - photos.length)) {
        const { blob, width, height } = await compressPhoto(file);
        const path = `${userId}/${visitId}/${crypto.randomUUID()}.webp`;
        const up = await supabase.storage
          .from('review-photos')
          .upload(path, blob, { contentType: 'image/webp', upsert: false });
        if (up.error) throw up.error;
        const r = await addPhoto({ visitId, path, width, height, kind });
        if (!r.ok) throw new Error(r.message);
        setPhotos((p) => [...p, { path, url: URL.createObjectURL(blob) }]);
      }
    } catch {
      setError(t.photoFailed);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function onRemove(path: string) {
    start(async () => {
      const r = await removePhoto({ visitId, path });
      if (r.ok) setPhotos((p) => p.filter((x) => x.path !== path));
      else setError(r.message);
    });
  }

  return (
    <div>
      <ul className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-4">
        {photos.map((p) => (
          <li
            key={p.path}
            className="relative aspect-square overflow-hidden rounded-[var(--radius-button)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URLs */}
            <img
              src={p.url}
              alt=""
              className="bg-line/60 size-full object-cover"
              loading="lazy"
              decoding="async"
            />
            <button
              type="button"
              onClick={() => onRemove(p.path)}
              aria-label={t.removePhoto}
              className="bg-ink/70 text-bg absolute top-1 right-1 flex size-9 items-center justify-center rounded-full"
            >
              <CloseIcon size={16} />
            </button>
          </li>
        ))}
        {photos.length < max ? (
          <li>
            <label className="border-line text-muted hover:border-primary flex aspect-square cursor-pointer flex-col items-center justify-center rounded-[var(--radius-button)] border-2 border-dashed text-sm font-medium">
              <span aria-hidden className="text-2xl">
                +
              </span>
              {uploading ? t.uploading : t.addPhoto}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={uploading}
                onChange={(e) => void onFiles(e.target.files)}
              />
            </label>
          </li>
        ) : null}
      </ul>
      {error ? (
        <p role="alert" className="text-skip mt-2 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
