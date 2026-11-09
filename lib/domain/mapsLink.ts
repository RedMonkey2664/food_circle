// "See on Google Maps": Google's documented Maps URL (https://developers.google.com/maps/
// documentation/urls/get-started). Free, no key, no data copied into SKOOP: it simply opens
// Google Maps (app or web) searching for the place, so people can compare in one tap.

export function googleMapsUrl(place: {
  name: string;
  areaName?: string | null;
  city?: string | null;
}): string {
  const where = [place.areaName, place.city]
    .filter((x): x is string => Boolean(x && x.trim()))
    // area names outside Mumbai already end with the city ("Hauz Khas, Delhi NCR")
    .filter((x, i, xs) => i === 0 || !(xs[0] ?? '').toLowerCase().includes(x.toLowerCase()));
  const query = [place.name, ...where].join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
