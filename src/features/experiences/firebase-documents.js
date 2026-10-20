// Plain, serializable demo documents. Local asset URLs are preview-only and are never stored as Storage paths.
export const DATA_SCHEMA_VERSION = 1;

const meetingPointPresets = {
  'beach-3257784': { name: 'Tanjung Aan Beach main entrance', address: 'Tanjung Aan Beach, Kuta, Central Lombok', latitude: -8.8954, longitude: 116.3823 },
  'beach-6894350': { name: 'Selong Belanak Beach public entrance', address: 'Selong Belanak Beach, West Lombok', latitude: -8.8673, longitude: 116.1589 },
  'beach-3268159': { name: 'Senggigi Beach public access', address: 'Senggigi Beach, West Lombok', latitude: -8.4886, longitude: 116.0424 },
  'beach-3801497': { name: 'Mawun Beach main entrance', address: 'Mawun Beach, Central Lombok', latitude: -8.9107, longitude: 116.2248 },
  'beach-4010189': { name: 'Pink Beach public entrance', address: 'Pink Beach, Sekaroh, East Lombok', latitude: -8.8866, longitude: 116.5338 },
  'beach-5113207': { name: 'Gili Meno harbour arrival point', address: 'Gili Meno, North Lombok', latitude: -8.3507, longitude: 116.0554 },
  'waterfall-1723009': { name: 'Sendang Gile visitor entrance', address: 'Senaru, North Lombok', latitude: -8.3024, longitude: 116.4013 },
  'waterfall-2314079': { name: 'Benang Stokel visitor entrance', address: 'Aik Berik, Central Lombok', latitude: -8.5473, longitude: 116.3382 },
  'waterfall-3228954': { name: 'Tetebatu village meeting area', address: 'Tetebatu, East Lombok', latitude: -8.5287, longitude: 116.4302 },
  'waterfall-12199913': { name: 'Mangku Sakti public entrance', address: 'Sajang, East Lombok', latitude: -8.3358, longitude: 116.5267 },
  'volcano-386938': { name: 'Rinjani National Park Sembalun gate', address: 'Sembalun Lawang, East Lombok', latitude: -8.3045, longitude: 116.5338 },
  'volcano-27997429': { name: 'Senaru Trek Centre', address: 'Senaru, North Lombok', latitude: -8.3011, longitude: 116.4028 },
  'bukit-selong': { name: 'Bukit Selong public entrance', address: 'Sembalun Lawang, East Lombok', latitude: -8.3702, longitude: 116.5287 },
  'desa-sade': { name: 'Sade Traditional Village entrance', address: 'Rembitan, Central Lombok', latitude: -8.8331, longitude: 116.2935 },
  'desa-sembalun-lawang': { name: 'Sembalun Lawang village meeting area', address: 'Sembalun Lawang, East Lombok', latitude: -8.3695, longitude: 116.5301 },
  'desa-sesaot': { name: 'Sesaot Tourism Village entrance', address: 'Sesaot, West Lombok', latitude: -8.5757, longitude: 116.1882 },
  'desa-bonjeruk': { name: 'Bonjeruk Tourism Village entrance', address: 'Bonjeruk, Central Lombok', latitude: -8.6754, longitude: 116.2481 },
  'pulau-kenawa': { name: 'Poto Tano Harbour public meeting area', address: 'Poto Tano, West Sumbawa', latitude: -8.4941, longitude: 117.4343 },
  'pulau-moyo': { name: 'Labuan Aji harbour arrival point', address: 'Labuan Aji, Pulau Moyo, Sumbawa', latitude: -8.2187, longitude: 117.5946 },
  'mata-jitu-waterfall': { name: 'Labuan Aji village meeting area', address: 'Labuan Aji, Pulau Moyo, Sumbawa', latitude: -8.2187, longitude: 117.5946 },
  'sumbawa-whale-shark': { name: 'Public harbour meeting area', address: 'Sumbawa, West Nusa Tenggara', latitude: -8.4939, longitude: 117.4301 },
  'sumbawa-open-trip-3d2n': { name: 'Lombok International Airport arrivals', address: 'Lombok International Airport, Central Lombok', latitude: -8.7573, longitude: 116.2761 },
};

function createMapLinks(point) {
  const delta = 0.006;
  const bbox = [point.longitude - delta, point.latitude - delta, point.longitude + delta, point.latitude + delta].map((value) => value.toFixed(6)).join('%2C');
  return {
    embedUrl: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${point.latitude}%2C${point.longitude}`,
    mapUrl: `https://www.openstreetmap.org/?mlat=${point.latitude}&mlon=${point.longitude}#map=16/${point.latitude}/${point.longitude}`,
    googleMapUrl: `https://www.google.com/maps/search/?api=1&query=${point.latitude}%2C${point.longitude}`,
  };
}

function matchMeetingPreset(item) {
  const title = String(item.title || '').toLowerCase();
  return meetingPointPresets[item.id]
    || (title.includes('tanjung aan') ? meetingPointPresets['beach-3257784'] : null)
    || (title.includes('selong belanak') ? meetingPointPresets['beach-6894350'] : null)
    || (title.includes('senggigi') ? meetingPointPresets['beach-3268159'] : null)
    || (title.includes('mawun') ? meetingPointPresets['beach-3801497'] : null)
    || (title.includes('pink beach') ? meetingPointPresets['beach-4010189'] : null)
    || (title.includes('gili meno') ? meetingPointPresets['beach-5113207'] : null)
    || null;
}
export function experienceMapCoordinates(item) {
  const preset = matchMeetingPreset(item);
  return preset ? [preset.latitude, preset.longitude] : null;
}
function suggestedMeetingPoint(item) {
  const preset = matchMeetingPreset(item)
    || (item.category === 'Waterfall' ? meetingPointPresets['waterfall-1723009'] : null)
    || (item.category === 'Volcano' ? meetingPointPresets['volcano-386938'] : null)
    || (item.category === 'Culture' ? meetingPointPresets['desa-sade'] : null)
    || meetingPointPresets['desa-sesaot'];
  return { ...preset, ...createMapLinks(preset) };
}

export function toExperienceDocument(item, booking, organizationId = 'demo-operator') {
  const gallery = item.gallery?.length ? item.gallery : [item.image];
  const suggestedPoint = suggestedMeetingPoint(item);
  return {
    id: item.id,
    schemaVersion: DATA_SCHEMA_VERSION,
    organizationId,
    guideIds: [],
    status: 'draft',
    title: item.title,
    city: item.city,
    durationLabel: item.duration,
    summary: item.description,
    content: {
      fullDescription: item.description,
      highlights: [...item.highlights],
      includes: [...(item.packageIncludes || item.includes || [])],
      ...(item.packageExcludes?.length ? { excludes: [...item.packageExcludes] } : {}),
      whatToBring: [...(item.whatToBring || (item.pricePending ? [] : ['Comfortable shoes', 'Passport or ID card']))],
      notAllowed: item.pricePending ? [] : ['Large bags or luggage'],
      knowBeforeYouGo: item.sourceNote || 'Please check the activity details and arrival instructions before your visit.',
    },
    cancellation: item.pricePending ? null : item.cancellation || { title: 'Free cancellation', text: 'Cancel up to 24 hours in advance for a full refund' },
    meetingPoint: { ...suggestedPoint, status: 'suggested_public_area', description: item.pricePending ? 'A suggested public meeting area is shown for planning. The final meeting point is confirmed after booking.' : 'A suggested public meeting area is shown near the destination for planning. The guide confirms the official meeting point after booking, and you can request a suitable change in chat.' },
    pricing: item.pricePending ? {
      currency: item.listedPriceCurrency || 'IDR',
      adultBaseCents: null,
      childBaseCents: null,
      status: 'pending_operator_confirmation',
    } : {
      currency: 'USD',
      adultBaseCents: Math.round(item.price * 100),
      childBaseCents: Math.round((booking?.childPrice ?? item.price) * 100),
      ...(item.listedPrice != null ? { listedCurrency: item.listedPriceCurrency || 'IDR', listedAmount: item.listedPrice, listedNote: item.priceNote || null } : {}),
      weekdayMultiplierBasisPoints: Object.fromEntries(Object.entries(booking?.weekdayMultipliers || {}).map(([day, multiplier]) => [day, Math.round(multiplier * 10000)])),
    },
    ...(item.packageOptions?.length ? { packageType: item.packageType || 'Package', packages: item.packageOptions.map((option) => ({ id: option.id, name: option.name, durationLabel: option.duration, days: option.days || null, nights: option.nights || null, demoOnly: Boolean(option.demoOnly), pricing: { currency: option.currency || 'IDR', amount: option.price, unit: option.pricingUnit || 'per person' }, includes: [...(option.includes || [])] })) } : {}),
    ...(item.packageItinerary?.length ? { itinerary: item.packageItinerary.map((day) => ({ day: day.day, title: day.title, items: day.items.map((entry) => ({ time: entry.time, text: entry.text })) })), itineraryStatus: 'source_transcribed_operator_confirmation_required' } : {}),
    ...(item.packageExcludes?.length ? { exclusions: [...item.packageExcludes] } : {}),
    ...(item.availabilityNote ? { availabilityStatus: item.demoBookingNotice ? 'demo_departure_available' : 'not_bookable_pending_operator_confirmation', availabilityNote: item.availabilityNote, ...(item.demoBookingNotice ? { demoBookingNotice: item.demoBookingNotice } : {}) } : {}),
    ...((item.imageCredit || item.imageCredits?.length) ? { mediaAttributions: [...(item.imageCredits || []), ...(item.imageCredit ? [item.imageCredit] : [])].map((credit) => ({ label: credit.label, sourceUrl: credit.url })) } : {}),
    popularDays: [...(booking?.popularDays || [])],
    demoTimeOptions: [...(booking?.timeOptions || [])],
    rating: item.rating == null ? null : { average: Number(item.rating), count: Number(String(item.reviews).replaceAll(',', '')) },
    media: {
      coverId: `${item.id}-cover`,
      cardId: `${item.id}-card`,
      galleryIds: gallery.map((_, index) => `${item.id}-gallery-${index}`),
    },
    labels: { badge: item.badge || '', category: item.label || '' },
    featured: Boolean(item.featured),
    popularSearch: Boolean(item.popularSearch),
  };
}

export function toMediaDocuments(item) {
  const gallery = item.gallery?.length ? item.gallery : [item.image];
  const sources = [
    [`${item.id}-cover`, item.image],
    [`${item.id}-card`, item.cardImage || item.image],
    ...gallery.map((url, index) => [`${item.id}-gallery-${index}`, url]),
  ];
  return sources.map(([id, previewUrl], order) => ({
    id,
    schemaVersion: DATA_SCHEMA_VERSION,
    experienceId: item.id,
    organizationId: 'demo-operator',
    status: 'draft',
    order,
    previewUrl,
    storagePath: null,
    altText: item.title,
    licenseStatus: 'unverified',
  }));
}

export function toDestinationDocument(item, kind = 'destination') {
  return {
    id: item.name.toLowerCase().replaceAll(' ', '-'),
    schemaVersion: DATA_SCHEMA_VERSION,
    name: item.name,
    city: item.city || item.name,
    activityCount: Number(String(item.count).replace(/[^\d]/g, '')),
    mediaId: `${kind}-${item.name.toLowerCase().replaceAll(' ', '-')}`,
  };
}

export function toTileMediaDocument(item, kind) {
  const id = `${kind}-${item.name.toLowerCase().replaceAll(' ', '-')}`;
  return {
    id,
    schemaVersion: DATA_SCHEMA_VERSION,
    organizationId: 'demo-operator',
    status: 'draft',
    previewUrl: item.image,
    storagePath: null,
    altText: item.name,
    licenseStatus: 'unverified',
  };
}
