'use server';

export interface ReverseGeocodeResult {
  address: string;
  country: string;
  countryCode: string;
  state: string;
  city: string;
}

export async function reverseGeocodeAction(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> {
  // Prefer a server-side key (no referrer restrictions) over the browser key
  const apiKey = process.env.GOOGLE_MAPS_GEOCODING_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=es`
    );
    const data = await res.json();

    if (data.status !== 'OK' || !data.results?.length) {
      console.error('[reverseGeocodeAction] API status:', data.status, data.error_message ?? '');
      return null;
    }

    const result = data.results[0];
    const components: { long_name: string; short_name: string; types: string[] }[] =
      result.address_components ?? [];

    let country = '';
    let countryCode = '';
    let state = '';
    let city = '';

    for (const comp of components) {
      if (comp.types.includes('country')) {
        country = comp.long_name;
        countryCode = comp.short_name;
      }
      if (comp.types.includes('administrative_area_level_1')) {
        state = comp.long_name;
      }
      if (comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')) {
        if (!city) city = comp.long_name;
      }
    }

    return {
      address: result.formatted_address ?? '',
      country,
      countryCode,
      state,
      city,
    };
  } catch (error) {
    console.error('[reverseGeocodeAction]', error);
    return null;
  }
}
