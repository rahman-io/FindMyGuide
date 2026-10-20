// Firebase migration fixture for guide-created trip listings.
// Pure, serializable transforms — no bundler assets imported here. A guide
// trip maps onto the `experiences/{experienceId}` contract from
// docs/firebase-data-contract.md: draft by default, integer-cents pricing
// with an explicit currency, stable IDs, and a `media.storagePath` that stays
// null until licensed media is uploaded. The four travel methods
// (solo / private / shared / group) become package documents; dated
// departures belong in `experiences/{id}/slots/{slotId}`, created later by a
// trusted booking service, so slots start empty.

export const GUIDE_TRIP_DOC_SCHEMA_VERSION = 1;

const methodLabels = {
  solo: 'Solo with a guide',
  private: 'Private trip',
  shared: 'Shared departure',
  group: 'Private group',
};

export function toGuideTripDocument(trip, organizationId = 'demo-operator') {
  return {
    id: trip.id,
    schemaVersion: GUIDE_TRIP_DOC_SCHEMA_VERSION,
    organizationId,
    guideIds: [trip.guideId],
    source: 'guide_created',
    status: 'draft',
    title: trip.title,
    city: trip.city,
    durationLabel: trip.duration,
    days: trip.days ?? null,
    nights: trip.nights ?? null,
    linkedExperienceIds: [...(trip.experienceIds || [])],
    summary: trip.description,
    content: {
      fullDescription: trip.description,
      highlights: [...(trip.highlights || [])],
      includes: [...(trip.includes || [])],
      itinerary: (trip.itinerary || []).map((text, index) => ({ step: index + 1, text })),
    },
    methods: (trip.methods || []).map((method) => ({
      mode: method.mode,
      label: methodLabels[method.mode] || 'Guided trip',
      minGuests: method.minGuests,
      maxGuests: method.maxGuests,
      pricing: {
        currency: method.currency || 'IDR',
        amountCents: Math.round(Number(method.price) * 100),
        unit: method.pricingUnit === 'group' ? 'per_group' : 'per_person',
      },
    })),
    media: {
      coverId: `${trip.id}-cover`,
      storagePath: null,
      licenseStatus: 'unverified',
      status: 'draft',
      note: 'Guide-uploaded preview image is a local demo data URL, not a Storage path. Upload licensed media and assign a Storage path before publishing.',
    },
    slots: [],
    availabilityStatus: 'pending_admin_review',
    createdAt: trip.createdAt,
  };
}

export function toGuideTripsFirebaseFixture(trips = []) {
  return {
    schemaVersion: GUIDE_TRIP_DOC_SCHEMA_VERSION,
    experiences: trips.map((trip) => toGuideTripDocument(trip)),
  };
}
