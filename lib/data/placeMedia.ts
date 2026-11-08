import 'server-only';
import { createClient } from '@/lib/supabase/server';

export type PlaceExtras = {
  category: string | null;
  city: string | null;
  info: {
    shortDescription: string | null;
    wikiTitle: string | null;
    wikiUrl: string | null;
    wikiExtract: string | null;
  } | null;
};

export type GalleryPhoto = {
  key: string;
  src: string;
  width: number | null;
  height: number | null;
  /** Wikimedia photos carry their credit; users' photos link to nothing extra. */
  credit: { author: string | null; licence: string | null; licenceUrl: string | null; pageUrl: string } | null;
};

/** Category, city and the Wikimedia description (all readable by any signed-in user). */
export async function getPlaceExtras(placeId: string): Promise<PlaceExtras> {
  const supabase = await createClient();
  const [{ data: p }, { data: info }] = await Promise.all([
    supabase.from('places').select('category, city').eq('id', placeId).maybeSingle(),
    supabase
      .from('place_info')
      .select('short_description, wiki_title, wiki_url, wiki_extract')
      .eq('place_id', placeId)
      .maybeSingle(),
  ]);
  return {
    category: p?.category ?? null,
    city: p?.city ?? null,
    info: info
      ? {
          shortDescription: info.short_description,
          wikiTitle: info.wiki_title,
          wikiUrl: info.wiki_url,
          wikiExtract: info.wiki_extract,
        }
      : null,
  };
}

/**
 * Photos for a place: SKOOP users' review photos the viewer is allowed to see (RLS on
 * visit_photos and visits; memory photos are never shown here), then freely licensed
 * Wikimedia Commons photos with their credit.
 */
export async function getPlaceGallery(placeId: string, limit = 8): Promise<GalleryPhoto[]> {
  const supabase = await createClient();
  const [{ data: own }, { data: wiki }] = await Promise.all([
    supabase
      .from('visit_photos')
      .select('id, storage_path, width, height, visits!inner(place_id)')
      .eq('kind', 'review')
      .eq('visits.place_id', placeId)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('place_media')
      .select('id, thumb_url, width, height, author, licence, licence_url, page_url')
      .eq('place_id', placeId)
      .order('position')
      .limit(3),
  ]);

  const out: GalleryPhoto[] = [];
  const paths = (own ?? []).map((p) => p.storage_path);
  if (paths.length) {
    const { data: signed } = await supabase.storage.from('review-photos').createSignedUrls(paths, 3600);
    (own ?? []).forEach((p, i) => {
      const url = signed?.[i]?.signedUrl;
      if (url) out.push({ key: p.id, src: url, width: p.width, height: p.height, credit: null });
    });
  }
  for (const m of wiki ?? []) {
    out.push({
      key: m.id,
      src: m.thumb_url,
      width: m.width,
      height: m.height,
      credit: {
        author: m.author,
        licence: m.licence,
        licenceUrl: m.licence_url,
        pageUrl: m.page_url,
      },
    });
  }
  return out.slice(0, limit);
}
