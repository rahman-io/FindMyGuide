import { experiences, getExperience } from '../experiences/data.js';

const storageKey = 'lombok-guide-demo-v1';
const commissionRate = 0.10;
const paymentRate = 0.03;
const financeSchemaVersion = 1;
const guideDemoSchemaVersion = 6;
export function financeConfig() { return { platformRate: commissionRate, paymentRate, currency: 'IDR' }; }
const initialAgreements = (guide) => Object.fromEntries(guide.experienceIds.flatMap((id) => (getExperience(id)?.packageOptions || []).map((option) => [option.id, { approvedAmount: Number(option.price), approvedAt: null, approvedBy: 'demo-admin', proposal: null }])));
function bookingIdentity(id, createdAt = '') {
  const compact = String(id || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  const suffix = (compact.slice(-6) || 'DEMO01').padStart(6, '0');
  const year = String(new Date(createdAt || Date.now()).getFullYear()).slice(-2);
  let verificationCode;
  do { verificationCode = Array.from(crypto.getRandomValues(new Uint8Array(6)), (value) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[value % 32]).join(''); } while (verificationCode === suffix);
  return { bookingId: `LT-${year}-${suffix}`, verificationCode };
}
export function bookingQrPayload(request) { return request?.bookingId && request?.verificationCode ? `findmyguide://booking/${encodeURIComponent(request.bookingId)}?code=${encodeURIComponent(request.verificationCode)}` : ''; }
const seedGuides = [
  { id: 'guide-adi', name: 'Adi Saputra', initials: 'AS', area: 'Sembalun, East Lombok', languages: 'Indonesian, English', bio: 'Local trekking guide focused on Rinjani and Sembalun routes.', experienceIds: ['arena', 'sumo'], capacity: 6, status: 'verified', blockedDates: [], prices: {} },
  { id: 'guide-nur', name: 'Nur Aisyah', initials: 'NA', area: 'North Lombok & Gili Islands', languages: 'Indonesian, English', bio: 'Island and waterfall guide who loves sharing local stories.', experienceIds: ['pantheon', 'vatican', 'basilica'], capacity: 8, status: 'verified', blockedDates: [], prices: {} },
  { id: 'guide-lalu', name: 'Lalu Pratama', initials: 'LP', area: 'Central Lombok', languages: 'Indonesian, English', bio: 'Cultural guide for village visits and local craft experiences.', experienceIds: ['desa-sade', 'pantheon'], capacity: 6, status: 'verified', blockedDates: [], prices: {} },
  { id: 'guide-dario', name: 'Dario Rossi', initials: 'DR', area: 'Rome, Italy', languages: 'Italian, English', bio: 'Local guide sharing the Rome I love.', experienceIds: ['colosseum', 'pantheon'], capacity: 6, status: 'verified', blockedDates: [], prices: {} },
  { id: 'guide-raka', name: 'Raka Pradana', initials: 'RP', area: 'Sembalun, East Lombok', languages: 'Indonesian, English', bio: 'Rinjani trekking guide for shared and private hikes.', experienceIds: ['arena'], capacity: 8, status: 'verified', blockedDates: [], prices: {} },
  { id: 'guide-siti', name: 'Siti Mariani', initials: 'SM', area: 'Senaru, North Lombok', languages: 'Indonesian, English', bio: 'Rinjani trekking guide experienced with family and group trips.', experienceIds: ['arena'], capacity: 8, status: 'verified', blockedDates: [], prices: {} },
  { id: 'guide-sumbawa-demo', name: 'Sumbawa Local Guide', initials: 'SD', area: 'Sumbawa Besar, West Nusa Tenggara', languages: 'Indonesian, English', bio: 'Local guide account for shared Sumbawa open-trip requests and booking coordination.', experienceIds: ['sumbawa-open-trip-3d2n'], capacity: 14, status: 'verified', demoAccount: true, blockedDates: [], prices: {} },
];

const upcomingDemoDate = (date, offset) => date >= new Date().toISOString().slice(0, 10) ? date : new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
function seedOfferings() {
  const october = upcomingDemoDate('2026-10-26', 10);
  const november = upcomingDemoDate('2026-11-05', 20);
  const make = (id, guideId, experienceId, packageId, date, mode, price, maxGuests, minGuests = 1, teamGuideIds = [guideId]) => ({ id, guideId, experienceId, packageId, date, time: packageStartTimes(getExperience(experienceId), getExperience(experienceId)?.packageOptions?.find((option) => option.id === packageId))[0], mode, price, priceUnit: ['private', 'group'].includes(mode) ? 'group' : 'person', minGuests, maxGuests, teamGuideIds, status: 'published', workStatus: 'not_started', departureDecision: null, sharedMeetingPoint: mode === 'shared' ? { value: '', setBy: '', setAt: null, acknowledgements: {} } : undefined, approvedAt: new Date().toISOString(), approvedBy: 'demo-admin', createdAt: new Date().toISOString() });
  const curated = [
    make('demo-rinjani-solo', 'guide-adi', 'arena', 'rinjani-2d1n', october, 'solo', 2531969, 1),
    make('demo-rinjani-private', 'guide-adi', 'arena', 'rinjani-2d1n', october, 'private', 4200000, 6),
    { ...make('demo-rinjani-shared', 'guide-adi', 'arena', 'rinjani-2d1n', october, 'shared', 950000, 14, 2, ['guide-adi', 'guide-raka']), promotion: { label: 'Early booking deal', originalPrice: 1150000 } },
    make('demo-rinjani-team', 'guide-adi', 'arena', 'rinjani-2d1n', october, 'group', 18000000, 22, 8, ['guide-adi', 'guide-raka', 'guide-siti']),
    make('demo-rinjani-raka', 'guide-raka', 'arena', 'rinjani-2d1n', october, 'shared', 1050000, 8, 2),
    make('demo-rinjani-siti', 'guide-siti', 'arena', 'rinjani-2d1n', october, 'private', 5000000, 8),
    make('demo-rinjani-november', 'guide-adi', 'arena', 'rinjani-3d2n', november, 'group', 16000000, 14, 5, ['guide-adi', 'guide-raka']),
    { ...make('demo-sumbawa-open-trip-3d2n', 'guide-sumbawa-demo', 'sumbawa-open-trip-3d2n', 'sumbawa-open-trip-3d2n', october, 'shared', 3500000, 14, 4), demoOnly: true },
  ];
  const covered = new Set(curated.map((offer) => `${offer.guideId}:${offer.packageId}`));
  return [...curated, ...seedGuides.flatMap((guide) => guide.experienceIds.flatMap((experienceId) => (getExperience(experienceId)?.packageOptions || []).filter((option) => !covered.has(`${guide.id}:${option.id}`)).map((option) => make(`demo-${guide.id}-${option.id}`, guide.id, experienceId, option.id, october, 'private', option.price * Math.min(guide.capacity, 2), guide.capacity))))];
}

const emptyData = () => ({
  schemaVersion: guideDemoSchemaVersion,
  activeGuideId: 'guide-adi',
  guides: seedGuides.map((guide) => ({ ...guide, blockedDates: [...guide.blockedDates], prices: { ...guide.prices }, experienceIds: [...guide.experienceIds], priceAgreements: initialAgreements(guide) })),
  offerings: seedOfferings(),
  requests: [
    { id: 'demo-rinjani-pending', schemaVersion: 2, ...bookingIdentity('demo-rinjani-pending'), verificationStatus: 'unverified', experienceId: 'arena', packageId: 'rinjani-2d1n', guideId: 'guide-adi', date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), time: '5:00 AM', adults: 1, children: 0, travelers: 1, travelerName: 'Maya Putri', travelerEmail: 'maya.demo@example.com', notes: 'I would like a steady pace and an early briefing before the hike.', unitPrice: 2531969, currency: 'IDR', ...priceSplit(2531969), status: 'pending', paymentStatus: 'unpaid', payoutStatus: 'not_due', createdAt: new Date().toISOString(), review: null },
    { id: 'demo-gili-completed', schemaVersion: 2, ...bookingIdentity('demo-gili-completed', new Date(Date.now() - 7 * 86400000).toISOString()), verificationStatus: 'unverified', experienceId: 'pantheon', packageId: 'gili-shared-snorkeling', guideId: 'guide-nur', date: new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10), time: '8:00 AM', adults: 2, children: 0, travelers: 2, travelerName: 'Sophie Walker', travelerEmail: 'sophie.demo@example.com', notes: 'Please recommend a calm snorkeling spot for first-time swimmers.', unitPrice: 164872, currency: 'IDR', ...priceSplit(329744), status: 'completed', paymentStatus: 'paid', payoutStatus: 'paid', paidAt: new Date(Date.now() - 7 * 86400000).toISOString(), payoutReleasedAt: new Date(Date.now() - 2 * 86400000).toISOString(), createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), review: { stars: 5, comment: 'Lovely day around the Gilis.', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() } },
  ],
});
function read() {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (!data || !Array.isArray(data.guides) || !Array.isArray(data.requests)) return emptyData();
    let migrated = data.schemaVersion !== guideDemoSchemaVersion;
    data.schemaVersion = guideDemoSchemaVersion;
    const freshOfferings = seedOfferings();
    if (!Array.isArray(data.offerings)) { data.offerings = freshOfferings; migrated = true; }
    const seededPromotions = new Map(freshOfferings.filter((offer) => offer.promotion).map((offer) => [offer.id, offer.promotion]));
    data.offerings.forEach((offer) => {
      const promotion = seededPromotions.get(offer.id);
      if (promotion && !offer.promotion) { offer.promotion = { ...promotion }; migrated = true; }
      if (!offer.workStatus) { offer.workStatus = 'not_started'; migrated = true; }
      if (!Object.hasOwn(offer, 'departureDecision')) { offer.departureDecision = null; migrated = true; }
      if (offer.mode === 'shared' && !offer.sharedMeetingPoint) { offer.sharedMeetingPoint = { value: '', setBy: '', setAt: null, acknowledgements: {} }; migrated = true; }
      if (offer.mode === 'shared' && offer.sharedMeetingPoint && !offer.sharedMeetingPoint.acknowledgements) { offer.sharedMeetingPoint.acknowledgements = {}; migrated = true; }
    });
    const existingOfferIds = new Set(data.offerings.map((offer) => offer.id));
    const newDemoOffers = freshOfferings.filter((offer) => offer.id === 'demo-sumbawa-open-trip-3d2n' && !existingOfferIds.has(offer.id));
    if (newDemoOffers.length) { data.offerings.push(...newDemoOffers); migrated = true; }
    const existingGuideIds = new Set(data.guides.map((guide) => guide.id));
    data.guides.push(...seedGuides.filter((guide) => !existingGuideIds.has(guide.id)).map((guide) => ({ ...guide, blockedDates: [...guide.blockedDates], prices: { ...guide.prices }, experienceIds: [...guide.experienceIds], priceAgreements: initialAgreements(guide) })));
    if (data.guides.some((guide) => !existingGuideIds.has(guide.id))) migrated = true;
    const sumbawaGuide = data.guides.find((guide) => guide.id === 'guide-sumbawa-demo');
    if (sumbawaGuide && /demo/i.test(`${sumbawaGuide.name} ${sumbawaGuide.bio}`)) { sumbawaGuide.name = 'Sumbawa Local Guide'; sumbawaGuide.bio = 'Local guide account for shared Sumbawa open-trip requests and booking coordination.'; migrated = true; }
    data.guides.forEach((guide) => {
      if (guide.priceAgreements) return;
      guide.priceAgreements = guide.status === 'verified' ? initialAgreements(guide) : {};
      Object.entries(guide.prices || {}).forEach(([packageId, amount]) => {
        if (!guide.priceAgreements[packageId] || Number(amount) === guide.priceAgreements[packageId].approvedAmount) return;
        guide.priceAgreements[packageId].proposal = { amount: Number(amount), status: 'pending', submittedAt: new Date().toISOString() };
      });
    });
    data.requests.forEach((request) => {
      const legacySuffix = String(request.id || '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(-6).padStart(6, '0');
      if (!request.bookingId) { request.bookingId = bookingIdentity(request.id, request.createdAt).bookingId; migrated = true; }
      if (!request.verificationCode || (request.verificationStatus !== 'verified' && request.verificationCode === legacySuffix)) { request.verificationCode = bookingIdentity(request.id, request.createdAt).verificationCode; migrated = true; }
      if (!request.verificationStatus) { request.verificationStatus = 'unverified'; migrated = true; }
      if (!request.finance) { request.finance = financeBreakdown(request.travelerTotal || Number(request.unitPrice) * Number(request.travelers || 1)); migrated = true; }
      if (typeof request.notes !== 'string') { request.notes = ''; migrated = true; }
      if (!request.paymentStatus) { request.paymentStatus = request.status === 'completed' ? 'paid' : 'unpaid'; migrated = true; }
      if (!request.payoutStatus) { request.payoutStatus = request.status === 'completed' && request.paymentStatus === 'paid' ? 'paid' : 'not_due'; migrated = true; }
      if (request.paymentStatus === 'paid' && !request.paidAt) { request.paidAt = request.createdAt || new Date().toISOString(); migrated = true; }
      if (request.payoutStatus === 'paid' && !request.payoutReleasedAt) { request.payoutReleasedAt = request.updatedAt || request.createdAt || new Date().toISOString(); migrated = true; }
      if (request.paymentStatus === 'paid' && request.status === 'accepted' && !request.bookingStatus) { request.bookingStatus = 'confirmed'; migrated = true; }
      if (request.status === 'completed' && !request.bookingStatus) { request.bookingStatus = 'completed'; migrated = true; }
    });
    if (migrated) write(data);
    return data;
  } catch { return emptyData(); }
}
function write(data) { localStorage.setItem(storageKey, JSON.stringify(data)); return data; }
export function guideDemoData() { return read(); }
export function guideById(id) { return read().guides.find((guide) => guide.id === id) || null; }
export function guideRatingSummary(guideId) {
  const reviews = read().requests.filter((request) => request.guideId === guideId && request.review && Number.isInteger(Number(request.review.stars)));
  if (!reviews.length) return { average: 0, count: 0 };
  return { average: reviews.reduce((sum, request) => sum + Number(request.review.stars), 0) / reviews.length, count: reviews.length };
}
export function offeringById(id) { return read().offerings.find((offer) => offer.id === id) || null; }
export function bookingSafety(request) {
  return request.safety || { meetingPoint: '', proposal: null, guideStartedAt: null, travelerStartedAt: null, guideEndedAt: null, travelerEndedAt: null, travelerCheckInAt: null, trustedContact: null, reports: [], events: [] };
}
function editableSafety(request) { request.safety ||= bookingSafety(request); return request.safety; }
function logBookingEvent(request, type, text, actor) {
  editableSafety(request).events.push({ id: crypto.randomUUID(), type, text, actor, at: new Date().toISOString() });
  request.updatedAt = new Date().toISOString();
}
function bookingActor(request, actor) {
  if (actor?.role === 'guide' && actor.id === request.guideId) return 'guide';
  if (actor?.role === 'traveler' && String(actor.email || '').toLowerCase() === request.travelerEmail) return 'traveler';
  return null;
}
const openReport = (request) => bookingSafety(request).reports.some((report) => report.status === 'open');
export function proposeBookingChange(id, actor, field, value) {
  const data = read();
  const request = data.requests.find((entry) => entry.id === id);
  const role = request && bookingActor(request, actor);
  const clean = String(value || '').trim().slice(0, 160);
  if (!role || request.status !== 'accepted' || request.paymentStatus !== 'paid' || bookingSafety(request).guideStartedAt || openReport(request) || bookingSafety(request).proposal || !['meetingPoint', 'time', 'date'].includes(field) || (request.offerId && field !== 'meetingPoint') || (field === 'meetingPoint' && (request.tripMode === 'shared' || role !== 'traveler')) || !clean) return false;
  if (field === 'time' && !/^(?:0?[1-9]|1[0-2]):[0-5]\d\s?(?:AM|PM)$/i.test(clean)) return false;
  if (field === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(clean) || clean < new Date().toISOString().slice(0, 10) || !packageDates(clean, getExperience(request.experienceId)?.packageOptions?.find((option) => option.id === request.packageId)).length)) return false;
  const safety = editableSafety(request);
  safety.proposal = { id: crypto.randomUUID(), field, value: clean, proposedBy: role, at: new Date().toISOString() };
  logBookingEvent(request, 'change_proposed', `${role} proposed a new ${field === 'meetingPoint' ? 'meeting point' : field}: ${clean}.`, role);
  write(data); return true;
}
export function setBookingMeetingPoint(id, actor, value) {
  const data = read();
  const request = data.requests.find((entry) => entry.id === id);
  const role = request && bookingActor(request, actor);
  const clean = String(value || '').trim().slice(0, 160);
  if (!role || role !== 'guide' || request.status !== 'accepted' || request.paymentStatus !== 'paid' || request.tripMode === 'shared' || bookingSafety(request).guideStartedAt || openReport(request) || bookingSafety(request).proposal || !clean) return false;
  editableSafety(request).meetingPoint = clean;
  logBookingEvent(request, 'meeting_point_set', `The guide set the official public meeting point: ${clean}.`, 'guide');
  write(data); return true;
}
export function respondBookingChange(id, actor, accept) {
  const data = read();
  const request = data.requests.find((entry) => entry.id === id);
  const role = request && bookingActor(request, actor);
  const proposal = request && bookingSafety(request).proposal;
  if (!role || !proposal || role === proposal.proposedBy || request.status !== 'accepted' || bookingSafety(request).guideStartedAt || openReport(request)) return false;
  if (accept && proposal.field === 'date') {
    const option = getExperience(request.experienceId)?.packageOptions?.find((entry) => entry.id === request.packageId);
    const guide = data.guides.find((entry) => entry.id === request.guideId);
    const available = packageDates(proposal.value, option).every((day) => guide && !guide.blockedDates.includes(day) && data.requests.filter((entry) => entry.id !== request.id && entry.guideId === request.guideId && entry.status === 'accepted' && requestDates(entry).includes(day)).reduce((total, entry) => total + entry.travelers, 0) + request.travelers <= guide.capacity);
    if (!available) return false;
  }
  if (accept) {
    if (proposal.field === 'meetingPoint') editableSafety(request).meetingPoint = proposal.value;
    else request[proposal.field] = proposal.value;
  }
  editableSafety(request).proposal = null;
  logBookingEvent(request, accept ? 'change_accepted' : 'change_declined', `${role} ${accept ? 'accepted' : 'declined'} the proposed ${proposal.field === 'meetingPoint' ? 'meeting point' : proposal.field}.`, role);
  write(data); return true;
}
export function advanceBookingTrip(id, actor, step) {
  const data = read();
  const request = data.requests.find((entry) => entry.id === id);
  const role = request && bookingActor(request, actor);
  if (!role || request.status !== 'accepted' || request.paymentStatus !== 'paid' || openReport(request)) return false;
  const safety = editableSafety(request);
  const timestamp = new Date().toISOString();
  if (step === 'guide_start' && role === 'guide' && !request.offerId && request.verificationStatus === 'verified' && safety.meetingPoint && !safety.guideStartedAt) safety.guideStartedAt = timestamp;
  else if (step === 'traveler_start' && role === 'traveler' && safety.guideStartedAt && !safety.travelerStartedAt) safety.travelerStartedAt = timestamp;
  else if (step === 'check_in' && role === 'traveler' && request.bookingStatus === 'in_progress') safety.travelerCheckInAt = timestamp;
  else if (step === 'guide_finish' && role === 'guide' && !request.offerId && request.bookingStatus === 'in_progress' && !safety.guideEndedAt) safety.guideEndedAt = timestamp;
  else if (step === 'traveler_finish' && role === 'traveler' && safety.guideEndedAt && !safety.travelerEndedAt) safety.travelerEndedAt = timestamp;
  else return false;
  if (safety.guideStartedAt && safety.travelerStartedAt && request.bookingStatus !== 'in_progress') request.bookingStatus = 'in_progress';
  if (safety.guideEndedAt && safety.travelerEndedAt) {
    request.status = 'completed'; request.bookingStatus = 'completed'; request.payoutStatus = 'pending';
    if (request.offerId) {
      const offer = data.offerings.find((item) => item.id === request.offerId);
      const groupBookings = data.requests.filter((entry) => entry.offerId === request.offerId && entry.status !== 'cancelled' && entry.paymentStatus === 'paid');
      if (offer && groupBookings.every((entry) => entry.status === 'completed' || entry.id === request.id)) offer.workStatus = 'completed';
    }
  }
  logBookingEvent(request, step, { guide_start: 'Guide requested to start the trip.', traveler_start: 'Traveler confirmed meeting the guide. Trip started.', check_in: 'Traveler checked in safely.', guide_finish: 'Guide marked the trip as finished; traveler confirmation is pending.', traveler_finish: 'Traveler confirmed the trip finished.' }[step], role);
  write(data); return true;
}
export function reportBookingIssue(id, actor, category, detail) {
  const data = read();
  const request = data.requests.find((entry) => entry.id === id);
  const role = request && bookingActor(request, actor);
  const clean = String(detail || '').trim().slice(0, 500);
  if (!role || request.paymentStatus !== 'paid' || !['safety', 'no_show', 'payment', 'booking', 'cancellation'].includes(category) || !clean || openReport(request)) return false;
  editableSafety(request).reports.push({ id: crypto.randomUUID(), category, detail: clean, by: role, status: 'open', at: new Date().toISOString() });
  request.bookingStatus = 'needs_review';
  logBookingEvent(request, 'issue_reported', `${role} reported a ${category.replace('_', ' ')} issue.`, role);
  write(data); return true;
}
export function resolveBookingIssue(id, resolution) {
  const data = read();
  const request = data.requests.find((entry) => entry.id === id);
  const report = request && editableSafety(request).reports.find((entry) => entry.status === 'open');
  if (!report || !['resolved', 'dismissed', 'refund'].includes(resolution) || (resolution === 'refund' && request.payoutStatus === 'paid')) return false;
  report.status = resolution; report.resolvedAt = new Date().toISOString();
  if (resolution === 'refund') {
    request.status = 'cancelled'; request.bookingStatus = 'cancelled'; request.paymentStatus = 'refunded'; request.refundedAt = report.resolvedAt; request.payoutStatus = 'not_due';
  } else request.bookingStatus = request.status === 'completed' ? 'completed' : bookingSafety(request).guideStartedAt && bookingSafety(request).travelerStartedAt ? 'in_progress' : 'confirmed';
  logBookingEvent(request, 'issue_reviewed', resolution === 'refund' ? 'Demo admin approved a simulated refund; no real money moved.' : `Demo admin marked the report ${resolution}.`, 'admin');
  write(data); return true;
}
export function saveBookingTrustedContact(id, email, name, phone) {
  const data = read();
  const request = data.requests.find((entry) => entry.id === id && entry.travelerEmail === String(email || '').toLowerCase());
  const cleanName = String(name || '').trim().slice(0, 80);
  const cleanPhone = String(phone || '').trim().slice(0, 32);
  if (!request || request.paymentStatus !== 'paid' || !cleanName || !/^[+\d\s().-]{7,32}$/.test(cleanPhone)) return false;
  editableSafety(request).trustedContact = { name: cleanName, phone: cleanPhone };
  logBookingEvent(request, 'trusted_contact_saved', 'Traveler saved a trusted contact on this device.', 'traveler');
  write(data); return true;
}
export function activeGuide() { const data = read(); return data.guides.find((guide) => guide.id === data.activeGuideId) || data.guides[0]; }
export function switchGuide(id) {
  const data = read();
  if (!data.guides.some((guide) => guide.id === id)) return false;
  data.activeGuideId = id; write(data); return true;
}
export function packagePrice(guide, option) { const amount = guide?.priceAgreements?.[option?.id]?.approvedAmount; return Number.isInteger(amount) && amount >= 1000 ? amount : null; }
export function publicPackagePrice(experienceId, option) { const prices = availableGuides(experienceId, option.id).map((guide) => packagePrice(guide, option)); return prices.length ? Math.min(...prices) : null; }
export function publicStartingPackagePrice(experienceId, option) {
  const offerPrices = publicTripOfferings(experienceId, option.id, '', 1).filter((offer) => offer.priceUnit === 'person').map((offer) => Number(offer.price)).filter((amount) => Number.isFinite(amount));
  return offerPrices.length ? Math.min(...offerPrices) : publicPackagePrice(experienceId, option);
}
export function approvedPackageLabel(experienceId, option) { const amount = publicPackagePrice(experienceId, option); return amount === null ? '-' : `Rp${amount.toLocaleString('id-ID')}`; }
export function approvedExperienceLabel(item) { const prices = (item.packageOptions || []).map((option) => publicPackagePrice(item.id, option)).filter((amount) => amount !== null); return prices.length ? `Rp${Math.min(...prices).toLocaleString('id-ID')}` : '-'; }
export function packageStartTimes(experience, option) { return experience?.id === 'arena' || option?.id === 'pergasingan-sunrise' ? ['5:00 AM', '6:00 AM'] : ['8:00 AM', '9:00 AM']; }
export function priceSplit(amount) {
  const breakdown = financeBreakdown(amount);
  return { travelerTotal: breakdown.travelerTotal, guideShare: breakdown.guideShare, platformShare: breakdown.platformShare };
}
export function financeBreakdown(amount) {
  const travelerTotal = Math.max(0, Math.round(Number(amount) || 0));
  const platformShare = Math.round(travelerTotal * commissionRate);
  const paymentFee = Math.round(travelerTotal * paymentRate);
  return { schemaVersion: financeSchemaVersion, travelerTotal, guideShare: travelerTotal - platformShare, platformShare, paymentFee, platformNet: Math.max(0, platformShare - paymentFee) };
}
export function financeSummary() {
  const requests = guideDemoData().requests;
  const paid = requests.filter((request) => request.paymentStatus === 'paid');
  const refunded = requests.filter((request) => request.paymentStatus === 'refunded');
  const total = (list, key) => list.reduce((sum, request) => sum + Number(request.finance?.[key] || 0), 0);
  return {
    bookings: requests.filter((request) => !['declined', 'cancelled'].includes(request.status)).length,
    paidBookings: paid.length,
    grossSales: total(paid, 'travelerTotal'),
    platformGross: total(paid, 'platformShare'),
    paymentFees: total(paid, 'paymentFee'),
    platformNet: total(paid, 'platformNet'),
    guidePayoutDue: paid.filter((request) => request.status === 'completed' && request.payoutStatus === 'pending' && !openReport(request)).reduce((sum, request) => sum + Number(request.finance?.guideShare || 0), 0),
    guidePayoutPaid: paid.filter((request) => request.payoutStatus === 'paid').reduce((sum, request) => sum + Number(request.finance?.guideShare || 0), 0),
    refunds: total(refunded, 'travelerTotal'),
  };
}
export function packageDates(date, option) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const start = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== date) return [];
  const days = Math.max(1, Math.min(14, Number(option?.duration?.match(/^(\d+)\s+days?/)?.[1]) || 1));
  return Array.from({ length: days }, (_, index) => new Date(start.getTime() + index * 86400000).toISOString().slice(0, 10));
}
export function requestDateRange(request) {
  const dates = requestDates(request);
  return { start: dates[0] || request.date, end: dates[dates.length - 1] || request.date, days: dates.length || 1 };
}
function requestDates(request) {
  const option = getExperience(request.experienceId)?.packageOptions?.find((entry) => entry.id === request.packageId);
  return packageDates(request.date, option);
}
export const tripModeLabel = (mode) => ({ solo: 'Solo with a guide', private: 'Private trip', shared: 'Shared departure', group: 'Private group' }[mode] || 'Guided trip');
export function tripOfferingQuote(offer, travelers) {
  const count = Number(travelers);
  if (!offer || !Number.isInteger(count) || count < 1 || count > offer.maxGuests || (offer.mode !== 'shared' && count < offer.minGuests)) return null;
  return offer.priceUnit === 'group' ? offer.price : offer.price * count;
}
function offeringAvailabilityIn(data, offer, travelers = 1, ignoreRequestId = '', allowLockedDeparture = false) {
  const ignoredRequestIds = new Set(Array.isArray(ignoreRequestId) ? ignoreRequestId : [ignoreRequestId]);
  const option = getExperience(offer.experienceId)?.packageOptions?.find((item) => item.id === offer.packageId);
  const dates = packageDates(offer.date, option);
  const team = offer.teamGuideIds || [offer.guideId];
  const guides = team.map((id) => data.guides.find((guide) => guide.id === id));
  const lockedSharedDeparture = offer.mode === 'shared' && ((offer.workStatus && offer.workStatus !== 'not_started') || ['proposed', 'declined', 'needs_review', 'approved'].includes(offer.departureDecision?.status));
  if (offer.status !== 'published' || lockedSharedDeparture && !allowLockedDeparture || !option || offer.date < new Date().toISOString().slice(0, 10) || !dates.length || guides.some((guide) => !guide || guide.status !== 'verified' || !guide.experienceIds.includes(offer.experienceId) || dates.some((date) => guide.blockedDates.includes(date)))) return { available: false, seatsLeft: 0, booked: 0 };
  const booked = data.requests.filter((request) => !ignoredRequestIds.has(request.id) && request.offerId === offer.id && request.status === 'accepted').reduce((sum, request) => sum + request.travelers, 0);
  const conflicting = data.requests.some((request) => !ignoredRequestIds.has(request.id) && request.offerId !== offer.id && request.status === 'accepted' && requestDates(request).some((date) => dates.includes(date)) && (request.teamGuideIds || [request.guideId]).some((id) => team.includes(id)));
  const seatsLeft = conflicting || (offer.mode !== 'shared' && booked) ? 0 : Math.max(0, offer.maxGuests - booked);
  return { available: seatsLeft >= travelers && tripOfferingQuote(offer, travelers) !== null, seatsLeft, booked };
}
export function tripOfferingAvailability(id, travelers = 1) {
  const data = read();
  const offer = data.offerings.find((item) => item.id === id);
  return offer ? offeringAvailabilityIn(data, offer, travelers) : { available: false, seatsLeft: 0, booked: 0 };
}
export function publicTripOfferings(experienceId, packageId, date = '', travelers = 1) {
  const data = read();
  return data.offerings.filter((offer) => {
    const matchesExp = offer.experienceId === experienceId || (Array.isArray(offer.experienceIds) && offer.experienceIds.includes(experienceId));
    const matchTripExp = (data.guideTrips || []).some(t => t.experienceIds && t.experienceIds.includes(experienceId) && (t.id === offer.tripId || t.id === offer.guideTripId || offer.packageId));
    return (matchesExp || matchTripExp) && (!packageId || offer.packageId === packageId) && (!date || offer.date === date) && offeringAvailabilityIn(data, offer, travelers).available;
  }).sort((a, b) => a.date.localeCompare(b.date) || a.price - b.price);
}
export function tripOfferingPriceDetails(offers, travelers) {
  const count = Number(travelers);
  const details = offers.map((offer) => {
    const total = tripOfferingQuote(offer, count);
    const originalPrice = Number(offer.promotion?.originalPrice || 0);
    const multiplier = offer.priceUnit === 'group' ? 1 : count;
    const originalTotal = originalPrice > Number(offer.price) ? originalPrice * multiplier : null;
    return { offer, total, originalTotal, savings: originalTotal === null || total === null ? 0 : originalTotal - total, isPromo: originalTotal !== null };
  }).filter((entry) => Number.isFinite(entry.total)).sort((a, b) => a.total - b.total || a.offer.time.localeCompare(b.offer.time));
  if (!details.length) return details;
  const minimum = details[0].total;
  const maximum = details[details.length - 1].total;
  return details.map((entry) => {
    const position = maximum === minimum ? 0.5 : (entry.total - minimum) / (maximum - minimum);
    return { ...entry, band: position <= 0.34 ? 'cheap' : position >= 0.67 ? 'premium' : 'mid' };
  });
}
export function filterTripOfferingsByPrice(offers, travelers, filter = 'all') {
  const selected = ['all', 'promo', 'cheap', 'mid', 'premium'].includes(filter) ? filter : 'all';
  return tripOfferingPriceDetails(offers, travelers).filter((entry) => selected === 'all' || (selected === 'promo' ? entry.isPromo : entry.band === selected));
}
export function tripOfferingCalendar(experienceId) {
  const data = read();
  const today = new Date().toISOString().slice(0, 10);
  const calendar = {};
  const priority = { none: 0, completed: 1, available: 2, 'almost-full': 3, 'in-progress': 4 };
  const set = (date, status, label) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || (calendar[date] && priority[calendar[date].status] >= priority[status])) return;
    calendar[date] = { status, label };
  };
  data.requests.filter((request) => request.experienceId === experienceId && request.status === 'completed').forEach((request) => {
    requestDates(request).filter((date) => date <= today).forEach((date) => set(date, 'completed', 'Trip completed'));
  });
  data.requests.filter((request) => request.experienceId === experienceId && request.status === 'accepted' && request.paymentStatus === 'paid').forEach((request) => {
    const safety = bookingSafety(request);
    const underway = (safety.guideStartedAt || safety.travelerStartedAt) && !(safety.guideEndedAt && safety.travelerEndedAt);
    if (underway && requestDates(request).includes(today)) set(today, 'in-progress', 'Trip in progress');
  });
  const departuresByDate = new Map();
  data.offerings.filter((offer) => offer.experienceId === experienceId && offer.status === 'published' && offer.date >= today).forEach((offer) => {
    const departures = departuresByDate.get(offer.date) || [];
    departures.push(offer);
    departuresByDate.set(offer.date, departures);
  });
  departuresByDate.forEach((offers, date) => {
    const availability = offers.map((offer) => ({ offer, ...offeringAvailabilityIn(data, offer, 1) }));
    const bookable = availability.filter((entry) => entry.available);
    if (!bookable.length) { set(date, 'almost-full', 'Fully booked'); return; }
    const bestSeatRatio = Math.max(...bookable.map((entry) => entry.seatsLeft / Math.max(1, entry.offer.maxGuests)));
    const label = bestSeatRatio <= 0.25 ? 'Nearly full' : `${bookable.length} trip${bookable.length === 1 ? '' : 's'} available`;
    set(date, bestSeatRatio <= 0.25 ? 'almost-full' : 'available', label);
  });
  return calendar;
}
export function createTripOffering(guideId, values) {
  const data = read();
  const guide = data.guides.find((item) => item.id === guideId && item.status === 'verified');
  const experience = getExperience(values.experienceId);
  const option = experience?.packageOptions?.find((item) => item.id === values.packageId);
  const mode = String(values.mode || '');
  const date = String(values.date || '');
  const time = String(values.time || '');
  const minGuests = Number(values.minGuests);
  const maxGuests = Number(values.maxGuests);
  const price = Number(values.price);
  const teamGuideIds = [guideId, ...new Set((Array.isArray(values.coGuideIds) ? values.coGuideIds : []).filter((id) => id !== guideId))];
  const team = teamGuideIds.map((id) => data.guides.find((item) => item.id === id && item.status === 'verified' && item.experienceIds.includes(values.experienceId)));
  const capacity = team.reduce((sum, item) => sum + (item?.capacity || 0), 0);
  if (!guide?.experienceIds.includes(values.experienceId) || !option || !['solo', 'private', 'shared', 'group'].includes(mode) || !packageDates(date, option).length || date < new Date().toISOString().slice(0, 10) || !/^(?:0?[1-9]|1[0-2]):[0-5]\d\s?(?:AM|PM)$/i.test(time) || !Number.isInteger(minGuests) || !Number.isInteger(maxGuests) || minGuests < 1 || maxGuests < minGuests || maxGuests > capacity || (mode === 'solo' && (minGuests !== 1 || maxGuests !== 1)) || !Number.isInteger(price) || price < 1000 || team.some((item) => !item)) return null;
  const offer = { id: crypto.randomUUID(), guideId, experienceId: experience.id, packageId: option.id, date, time, mode, minGuests, maxGuests, teamGuideIds, price, meetingPoint: String(values.meetingPoint || '').trim().slice(0, 300), includes: String(values.includes || '').split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 20), itinerary: String(values.itinerary || '').split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 40), priceUnit: ['private', 'group'].includes(mode) ? 'group' : 'person', status: 'pending', ...(mode === 'shared' ? { sharedMeetingPoint: { value: '', setBy: '', setAt: null, acknowledgements: {} } } : {}), createdAt: new Date().toISOString(), approvedAt: null, approvedBy: null };
  data.offerings.unshift(offer); write(data); return offer;
}
export function reviewTripOffering(id, decision) {
  const data = read();
  const offer = data.offerings.find((item) => item.id === id && item.status === 'pending');
  if (!offer || !['published', 'rejected'].includes(decision)) return false;
  if (decision === 'published' && !offeringAvailabilityIn(data, { ...offer, status: 'published' }, offer.minGuests).available) return false;
  offer.status = decision; offer.reviewedAt = new Date().toISOString();
  if (decision === 'published') { offer.approvedAt = offer.reviewedAt; offer.approvedBy = 'demo-admin'; }
  write(data); return true;
}
export function closeTripOffering(id, guideId) {
  const data = read();
  const offer = data.offerings.find((item) => item.id === id && item.guideId === guideId && item.status === 'published');
  if (!offer || data.requests.some((request) => request.offerId === id && ['pending', 'accepted'].includes(request.status))) return false;
  offer.status = 'closed'; write(data); return true;
}
export function createTripOfferRequest({ offerId, adults, children, travelerName, travelerEmail, notes, expectedTotal }) {
  const data = read();
  const offer = data.offerings.find((item) => item.id === offerId);
  const travelers = Number(adults) + Number(children);
  const total = tripOfferingQuote(offer, travelers);
  const email = String(travelerEmail || '').trim().toLowerCase();
  if (!offer || !Number.isInteger(Number(adults)) || !Number.isInteger(Number(children)) || Number(adults) < 1 || Number(children) < 0 || !String(travelerName || '').trim() || !email.includes('@') || total === null || total !== Number(expectedTotal) || !offeringAvailabilityIn(data, offer, travelers).available || data.requests.some((request) => request.travelerEmail === email && request.offerId === offerId && ['pending', 'accepted'].includes(request.status))) return null;
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const option = getExperience(offer.experienceId).packageOptions.find((item) => item.id === offer.packageId);
  const split = priceSplit(total);
  const request = { id, schemaVersion: 3, ...bookingIdentity(id, createdAt), verificationStatus: 'unverified', offerId, tripMode: offer.mode, teamGuideIds: [...offer.teamGuideIds], experienceId: offer.experienceId, packageId: offer.packageId, guideId: offer.guideId, date: offer.date, time: offer.time, adults: Number(adults), children: Number(children), travelers, travelerName: String(travelerName).trim().slice(0, 80), travelerEmail: email, notes: String(notes || '').trim().slice(0, 1000), unitPrice: offer.price, priceUnit: offer.priceUnit, priceApprovedBy: offer.approvedBy, priceApprovedAt: offer.approvedAt, currency: option.currency || 'IDR', ...split, finance: financeBreakdown(total), paymentStatus: 'unpaid', payoutStatus: 'not_due', bookingStatus: 'request_sent', status: 'pending', createdAt, review: null };
  data.requests.unshift(request); write(data); return request;
}
export function sharedTripReady(request) {
  if (!request?.offerId || request.tripMode !== 'shared') return true;
  const data = read();
  const offer = data.offerings.find((item) => item.id === request.offerId);
  return !!offer && data.requests.filter((item) => item.offerId === offer.id && item.status === 'accepted').reduce((sum, item) => sum + item.travelers, 0) >= offer.minGuests;
}
function sharedTripRequests(data, offerId) {
  return data.requests.filter((request) => request.offerId === offerId && request.status === 'accepted' && request.paymentStatus === 'paid');
}
function offerStartTime(offer) {
  const match = String(offer?.time || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match || !/^\d{4}-\d{2}-\d{2}$/.test(offer.date || '')) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hour += 12;
  const start = new Date(`${offer.date}T${String(hour).padStart(2, '0')}:${match[2]}:00`);
  return Number.isNaN(start.getTime()) ? null : start;
}
function sharedGuideCanAct(offer, actor) {
  return actor?.role === 'guide' && (offer.teamGuideIds || [offer.guideId]).includes(actor.id);
}
export function sharedDepartureAlternatives(offerId, guideId) {
  const data = read();
  const source = data.offerings.find((offer) => offer.id === offerId && offer.mode === 'shared');
  if (!source) return [];
  return data.offerings.filter((offer) => offer.id !== source.id && offer.status === 'published' && offer.mode === 'shared' && offer.experienceId === source.experienceId && offer.guideId === guideId && offer.date >= new Date().toISOString().slice(0, 10) && !data.requests.some((request) => request.offerId === offer.id && ['pending', 'accepted'].includes(request.status))).sort((a, b) => a.date.localeCompare(b.date) || a.price - b.price);
}
export function sharedDepartureStatus(offerId) {
  const data = read();
  const offer = data.offerings.find((item) => item.id === offerId && item.mode === 'shared');
  if (!offer) return null;
  const bookings = sharedTripRequests(data, offerId);
  const historicalBookings = data.requests.filter((request) => request.offerId === offerId && (request.status === 'completed' && request.paymentStatus === 'paid' || request.status === 'cancelled' && request.paymentStatus === 'refunded'));
  const paidTravelers = bookings.reduce((sum, request) => sum + Number(request.travelers || 0), 0);
  const accepted = data.requests.filter((request) => request.offerId === offerId && request.status === 'accepted');
  const pendingCount = data.requests.filter((request) => request.offerId === offerId && request.status === 'pending').length;
  const unpaidCount = accepted.filter((request) => request.paymentStatus !== 'paid').length;
  const minGuests = Number(offer.minGuests || 1);
  const start = offerStartTime(offer);
  const hoursUntil = start ? (start.getTime() - Date.now()) / 3600000 : null;
  const underMinimum = paidTravelers > 0 && paidTravelers < minGuests;
  const workStatus = offer.workStatus || (bookings.length && bookings.every((request) => request.status === 'completed') ? 'completed' : bookings.some((request) => request.bookingStatus === 'in_progress') ? 'in_progress' : 'not_started');
  const decision = offer.departureDecision || null;
  const sharedMeetingPoint = offer.sharedMeetingPoint || { value: '', setBy: '', setAt: null, acknowledgements: {} };
  const meetingPointAcknowledgements = sharedMeetingPoint.acknowledgements || {};
  const meetingPointAcknowledgedCount = bookings.filter((request) => Boolean(meetingPointAcknowledgements[request.id])).length;
  return {
    offer,
    bookings,
    historicalBookings,
    paidTravelers,
    acceptedCount: accepted.length,
    pendingCount,
    unpaidCount,
    minGuests,
    maxGuests: Number(offer.maxGuests || 0),
    minimumMet: paidTravelers >= minGuests,
    underMinimum,
    decisionDue: underMinimum && hoursUntil !== null && hoursUntil <= 24,
    hoursUntil,
    decision,
    workStatus,
    meetingPoint: sharedMeetingPoint.value || '',
    meetingPointSetBy: sharedMeetingPoint.setBy || '',
    meetingPointSetAt: sharedMeetingPoint.setAt || null,
    meetingPointAcknowledgedCount,
    allMeetingPointsAcknowledged: Boolean(sharedMeetingPoint.value) && bookings.length > 0 && meetingPointAcknowledgedCount === bookings.length,
    ownMeetingPointAcknowledgements: meetingPointAcknowledgements,
    allVerified: bookings.length > 0 && bookings.every((request) => request.verificationStatus === 'verified'),
    allInProgress: bookings.length > 0 && bookings.every((request) => request.bookingStatus === 'in_progress'),
    hasOpenReport: bookings.some(openReport),
  };
}
export function setSharedDepartureMeetingPoint(offerId, actor, value) {
  const data = read();
  const offer = data.offerings.find((entry) => entry.id === offerId && entry.mode === 'shared');
  const clean = String(value || '').trim().slice(0, 180);
  if (!offer || !sharedGuideCanAct(offer, actor) || !clean || (offer.workStatus || 'not_started') !== 'not_started') return false;
  const status = sharedDepartureStatus(offerId);
  if (!status?.bookings.length) return false;
  const previous = offer.sharedMeetingPoint || { value: '', setBy: '', setAt: null, acknowledgements: {} };
  const changed = previous.value !== clean;
  const timestamp = new Date().toISOString();
  offer.sharedMeetingPoint = { value: clean, setBy: actor.id, setAt: timestamp, acknowledgements: changed ? {} : { ...(previous.acknowledgements || {}) } };
  data.requests.filter((request) => request.offerId === offerId && request.status === 'accepted' && request.paymentStatus === 'paid').forEach((request) => logBookingEvent(request, 'shared_meeting_point_set', `The guide set the official shared meeting point to: ${clean}.`, 'guide'));
  write(data);
  return true;
}
export function acknowledgeSharedDepartureMeetingPoint(offerId, actor) {
  const data = read();
  const offer = data.offerings.find((entry) => entry.id === offerId && entry.mode === 'shared');
  if (!offer || actor?.role !== 'traveler' || (offer.workStatus || 'not_started') !== 'not_started') return false;
  const request = sharedTripRequests(data, offerId).find((entry) => bookingActor(entry, actor) === 'traveler');
  const point = offer.sharedMeetingPoint;
  if (!request || !point?.value || point.acknowledgements?.[request.id] || openReport(request)) return false;
  const timestamp = new Date().toISOString();
  point.acknowledgements ||= {};
  point.acknowledgements[request.id] = { at: timestamp };
  logBookingEvent(request, 'shared_meeting_point_seen', `The traveler confirmed seeing the official shared meeting point: ${point.value}.`, 'traveler');
  write(data);
  return true;
}
function validDepartureDate(data, offer, date, travelers, ignoredIds, allowLockedDeparture = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < new Date().toISOString().slice(0, 10)) return false;
  const option = getExperience(offer.experienceId)?.packageOptions?.find((entry) => entry.id === offer.packageId);
  if (!packageDates(date, option).length) return false;
  return offeringAvailabilityIn(data, { ...offer, date }, travelers, ignoredIds, allowLockedDeparture).available;
}
export function proposeSharedDepartureDecision(offerId, actor, { kind, date = '', targetOfferId = '', message = '' } = {}) {
  const data = read();
  const offer = data.offerings.find((item) => item.id === offerId && item.mode === 'shared');
  const status = offer && sharedDepartureStatus(offerId);
  const cleanMessage = String(message || '').trim().slice(0, 360);
  if (!offer || !sharedGuideCanAct(offer, actor) || !status?.decisionDue || status.pendingCount || status.unpaidCount || status.workStatus !== 'not_started' || status.hasOpenReport || !['proceed', 'reschedule', 'change_package', 'refund'].includes(kind) || !cleanMessage) return false;
  const ignoredIds = status.bookings.map((request) => request.id);
  const travelers = status.paidTravelers;
  let target = null;
  if (kind === 'reschedule' && (date === offer.date || !validDepartureDate(data, offer, date, travelers, ignoredIds))) return false;
  if (kind === 'change_package') {
    target = sharedDepartureAlternatives(offerId, actor.id).find((entry) => entry.id === targetOfferId);
    if (!target || !offeringAvailabilityIn(data, target, travelers, ignoredIds).available || status.bookings.some((request) => tripOfferingQuote(target, request.travelers) === null)) return false;
  }
  offer.departureDecision = {
    id: crypto.randomUUID(),
    kind,
    date: kind === 'reschedule' ? date : '',
    targetOfferId: target?.id || '',
    targetDate: target?.date || '',
    targetPackageId: target?.packageId || '',
    message: cleanMessage,
    proposedBy: actor.id,
    proposedAt: new Date().toISOString(),
    responses: Object.fromEntries(status.bookings.map((request) => [request.id, null])),
    status: 'proposed',
  };
  write(data);
  return true;
}
function applySharedDepartureDecision(data, offer, decision) {
  const group = sharedTripRequests(data, offer.id);
  const timestamp = new Date().toISOString();
  if (!group.length || group.some(openReport)) return false;
  if (decision.kind === 'proceed') {
    decision.status = 'approved';
    decision.resolvedAt = timestamp;
    offer.workStatus = 'not_started';
    return true;
  }
  if (decision.kind === 'refund') {
    group.forEach((request) => {
      request.status = 'cancelled'; request.bookingStatus = 'cancelled'; request.paymentStatus = 'refunded'; request.payoutStatus = 'not_due'; request.refundedAt = timestamp;
      editableSafety(request).events.push({ id: crypto.randomUUID(), type: 'shared_trip_refund', text: 'The group agreed to cancel this under-filled departure. A demo refund was recorded; no real money moved.', actor: 'guide', at: timestamp });
    });
    data.requests.filter((request) => request.offerId === offer.id && request.status === 'accepted' && request.paymentStatus !== 'paid').forEach((request) => { request.status = 'declined'; request.bookingStatus = 'cancelled'; });
    offer.status = 'closed'; offer.workStatus = 'cancelled'; decision.status = 'resolved'; decision.resolvedAt = timestamp;
    return true;
  }
  if (decision.kind === 'reschedule') {
    if (!validDepartureDate(data, offer, decision.date, group.reduce((sum, request) => sum + request.travelers, 0), group.map((request) => request.id), true)) return false;
    offer.date = decision.date;
    if (offer.sharedMeetingPoint) offer.sharedMeetingPoint.acknowledgements = {};
    group.forEach((request) => {
      request.date = decision.date;
      editableSafety(request).events.push({ id: crypto.randomUUID(), type: 'shared_trip_rescheduled', text: `The group agreed to move the shared departure to ${decision.date}.`, actor: 'guide', at: timestamp });
    });
    decision.status = 'resolved'; decision.resolvedAt = timestamp; decision.result = 'rescheduled';
    return true;
  }
  if (decision.kind === 'change_package') {
    const target = data.offerings.find((entry) => entry.id === decision.targetOfferId && entry.status === 'published' && entry.mode === 'shared' && entry.experienceId === offer.experienceId && entry.guideId === offer.guideId);
    const totalTravelers = group.reduce((sum, request) => sum + request.travelers, 0);
    if (!target || !offeringAvailabilityIn(data, target, totalTravelers, group.map((request) => request.id)).available) return false;
    const option = getExperience(target.experienceId)?.packageOptions?.find((entry) => entry.id === target.packageId);
    if (!option) return false;
    group.forEach((request, index) => {
      const previousTotal = Number(request.finance?.travelerTotal || request.travelerTotal || 0);
      let nextTotal = tripOfferingQuote(target, request.travelers);
      if (target.priceUnit === 'group') {
        nextTotal = index === group.length - 1
          ? tripOfferingQuote(target, totalTravelers) - group.slice(0, -1).reduce((sum, prior) => sum + Math.round(tripOfferingQuote(target, totalTravelers) * prior.travelers / totalTravelers), 0)
          : Math.round(tripOfferingQuote(target, totalTravelers) * request.travelers / totalTravelers);
      }
      const split = priceSplit(nextTotal);
      request.offerId = target.id; request.tripMode = target.mode; request.teamGuideIds = [...(target.teamGuideIds || [target.guideId])]; request.experienceId = target.experienceId; request.packageId = target.packageId; request.guideId = target.guideId; request.date = target.date; request.time = target.time; request.unitPrice = target.price; request.priceUnit = target.priceUnit; request.priceApprovedBy = target.approvedBy; request.priceApprovedAt = target.approvedAt; request.currency = option.currency || 'IDR'; Object.assign(request, split); request.finance = financeBreakdown(nextTotal); request.settlementAdjustment = nextTotal - previousTotal;
      const safety = editableSafety(request);
      safety.events.push({ id: crypto.randomUUID(), type: 'shared_trip_package_changed', text: `The group agreed to move this booking to ${option.name} on ${target.date}. The demo ledger recorded a ${request.settlementAdjustment > 0 ? 'balance due' : request.settlementAdjustment < 0 ? 'refund due' : 'no price adjustment'} of Rp${Math.abs(request.settlementAdjustment).toLocaleString('id-ID')}.`, actor: 'guide', at: timestamp });
    });
    offer.status = 'closed'; decision.status = 'resolved'; decision.resolvedAt = timestamp; decision.result = 'package_changed';
    target.departureDecision = null; target.workStatus = 'not_started';
    target.sharedMeetingPoint ||= { value: '', setBy: '', setAt: null, acknowledgements: {} };
    target.sharedMeetingPoint.acknowledgements = {};
    return true;
  }
  return false;
}
export function respondSharedDepartureDecision(offerId, actor, accept) {
  const data = read();
  const offer = data.offerings.find((entry) => entry.id === offerId && entry.mode === 'shared');
  const decision = offer?.departureDecision;
  if (!decision || decision.status !== 'proposed' || actor?.role !== 'traveler' || typeof accept !== 'boolean') return { ok: false };
  const request = sharedTripRequests(data, offerId).find((entry) => bookingActor(entry, actor) === 'traveler');
  if (!request || !Object.hasOwn(decision.responses, request.id) || decision.responses[request.id] !== null) return { ok: false };
  decision.responses[request.id] = accept;
  if (!accept) {
    decision.status = 'declined'; decision.resolvedAt = new Date().toISOString();
    write(data);
    return { ok: true, status: 'declined', kind: decision.kind };
  }
  const allAccepted = Object.values(decision.responses).every((response) => response === true);
  let result = { ok: true, status: 'proposed', kind: decision.kind, targetOfferId: decision.targetOfferId };
  if (allAccepted) {
    if (applySharedDepartureDecision(data, offer, decision)) result = { ...result, status: decision.status };
    else { decision.status = 'needs_review'; decision.resolvedAt = new Date().toISOString(); result = { ...result, status: 'needs_review' }; }
  }
  write(data);
  return result;
}
export function startSharedTrip(offerId, actor) {
  const data = read();
  const offer = data.offerings.find((entry) => entry.id === offerId && entry.mode === 'shared');
  const status = offer && sharedDepartureStatus(offerId);
  const cleanMeetingPoint = String(offer?.sharedMeetingPoint?.value || '').trim().slice(0, 180);
  const today = new Date().toISOString().slice(0, 10);
  const decisionAllowsStart = status?.minimumMet || status?.decision?.kind === 'proceed' && status.decision.status === 'approved';
  if (!offer || !sharedGuideCanAct(offer, actor) || !decisionAllowsStart || status.workStatus !== 'not_started' || offer.date > today || status.pendingCount || status.unpaidCount || !status.bookings.length || !status.allVerified || status.hasOpenReport || !cleanMeetingPoint || !status.allMeetingPointsAcknowledged) return false;
  const timestamp = new Date().toISOString();
  offer.workStatus = 'in_progress'; offer.workStartedAt = timestamp;
  data.requests.filter((request) => request.offerId === offerId && request.status === 'accepted' && request.paymentStatus === 'paid').forEach((request) => {
    const safety = editableSafety(request);
    safety.meetingPoint = cleanMeetingPoint; safety.guideStartedAt = timestamp;
    safety.events.push({ id: crypto.randomUUID(), type: 'shared_trip_started', text: `Guide started work at the agreed meeting point: ${cleanMeetingPoint}.`, actor: 'guide', at: timestamp });
  });
  if (offer.departureDecision?.kind === 'proceed') offer.departureDecision.startedAt = timestamp;
  write(data); return true;
}
export function finishSharedTrip(offerId, actor) {
  const data = read();
  const offer = data.offerings.find((entry) => entry.id === offerId && entry.mode === 'shared');
  const status = offer && sharedDepartureStatus(offerId);
  if (!offer || !sharedGuideCanAct(offer, actor) || status.workStatus !== 'in_progress' || !status.allInProgress || status.hasOpenReport) return false;
  const timestamp = new Date().toISOString();
  offer.workStatus = 'completion_pending'; offer.completionRequestedAt = timestamp;
  data.requests.filter((request) => request.offerId === offerId && request.status === 'accepted' && request.paymentStatus === 'paid').forEach((request) => {
    const safety = editableSafety(request);
    safety.guideEndedAt = timestamp;
    safety.events.push({ id: crypto.randomUUID(), type: 'shared_trip_completion_requested', text: 'Guide marked the shared trip work as complete. Traveler confirmation is pending.', actor: 'guide', at: timestamp });
  });
  write(data); return true;
}
export function availableGuides(experienceId, optionId, date = '', travelers = 1) {
  const data = read();
  const option = getExperience(experienceId)?.packageOptions?.find((entry) => entry.id === optionId);
  if (!option || (date && !packageDates(date, option).length)) return [];
  const dates = date ? packageDates(date, option) : [];
  return data.guides.filter((guide) => guide.status === 'verified' && guide.experienceIds.includes(experienceId) && packagePrice(guide, option) !== null && Number(travelers) > 0 && dates.every((day) => !guide.blockedDates.includes(day) && data.requests.filter((request) => request.guideId === guide.id && request.status === 'accepted' && requestDates(request).includes(day)).reduce((total, request) => total + request.travelers, 0) + Number(travelers) <= guide.capacity) && Number(travelers) <= guide.capacity);
}
export function createGuideRequest({ experienceId, packageId, guideId, date, time, adults, children, travelerName, travelerEmail, notes, expectedUnitPrice }) {
  const experience = getExperience(experienceId);
  const option = experience?.packageOptions?.find((entry) => entry.id === packageId);
  const travelers = Number(adults) + Number(children);
  const guide = availableGuides(experienceId, packageId, date, travelers).find((entry) => entry.id === guideId);
  if (!experience || !option || !guide || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < new Date().toISOString().slice(0, 10) || travelers < 1 || !String(travelerName).trim() || !String(travelerEmail).includes('@')) return null;
  const data = read();
  if (data.requests.some((request) => request.travelerEmail === String(travelerEmail).trim().toLowerCase() && request.experienceId === experienceId && request.packageId === packageId && request.date === date && ['pending', 'accepted'].includes(request.status))) return null;
  const unitPrice = packagePrice(guide, option);
  if (Number(expectedUnitPrice) !== unitPrice) return null;
  const split = priceSplit(unitPrice * travelers);
  const id = globalThis.crypto?.randomUUID?.() || `request-${Date.now()}`;
  const createdAt = new Date().toISOString();
  const identity = bookingIdentity(id, createdAt);
  const request = { id, schemaVersion: 2, ...identity, verificationStatus: 'unverified', experienceId, packageId, guideId, date, time: packageStartTimes(experience, option).includes(time) ? time : packageStartTimes(experience, option)[0], adults: Number(adults), children: Number(children), travelers, travelerName: String(travelerName).trim(), travelerEmail: String(travelerEmail).trim().toLowerCase(), notes: String(notes || '').trim().slice(0, 1000), unitPrice, priceApprovedBy: guide.priceAgreements[packageId].approvedBy, priceApprovedAt: guide.priceAgreements[packageId].approvedAt, currency: option.currency || 'IDR', ...split, finance: financeBreakdown(split.travelerTotal), paymentStatus: 'unpaid', payoutStatus: 'not_due', bookingStatus: 'request_sent', status: 'pending', createdAt, review: null };
  data.requests.unshift(request); write(data); return request;
}
export function verifyBooking(id, code, guideId) {
  const data = read();
  const request = data.requests.find((entry) => entry.id === id);
  const normalizedCode = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!request || request.guideId !== guideId || request.status !== 'accepted' || request.paymentStatus !== 'paid' || request.verificationStatus === 'verified' || normalizedCode !== request.verificationCode || request.safety?.reports?.some((report) => report.status === 'open')) return false;
  request.verificationStatus = 'verified';
  request.verifiedAt = new Date().toISOString();
  logBookingEvent(request, 'identity_verified', 'Guide verified the traveler at the meeting point.', 'guide');
  write(data);
  return true;
}
export function updateGuideRequest(id, guideId, status) {
  const data = read();
  const request = data.requests.find((entry) => entry.id === id && entry.guideId === guideId);
  if (!request || !({ pending: ['accepted', 'declined'] }[request.status] || []).includes(status)) return false;
  if (status === 'accepted') {
    const offer = request.offerId && data.offerings.find((item) => item.id === request.offerId);
    if (request.offerId ? !offer || !offeringAvailabilityIn(data, offer, request.travelers, request.id).available : !availableGuides(request.experienceId, request.packageId, request.date, request.travelers).some((guide) => guide.id === guideId)) return false;
  }
  request.status = status;
  if (status === 'accepted' && request.paymentStatus === 'paid') request.bookingStatus = 'confirmed';
  request.updatedAt = new Date().toISOString();
  if (status === 'declined' && request.paymentStatus === 'paid') { request.paymentStatus = 'refunded'; request.refundedAt = request.updatedAt; request.payoutStatus = 'not_due'; }
  logBookingEvent(request, `request_${status}`, `Guide ${status} the booking request.`, 'guide');
  write(data); return true;
}
export function markGuideRequestPaid(id, email = '') {
  const data = read();
  const request = data.requests.find((entry) => entry.id === id && (!email || entry.travelerEmail === String(email).trim().toLowerCase()));
  if (!request || request.status !== 'accepted' || request.paymentStatus !== 'unpaid') return false;
  request.paymentStatus = 'paid'; request.paidAt = new Date().toISOString();
  request.bookingStatus = request.status === 'completed' ? 'completed' : 'confirmed';
  request.confirmedAt = request.paidAt;
  logBookingEvent(request, 'payment_recorded', 'Demo payment recorded at the agreed booking total.', 'traveler');
  write(data); return true;
}
export function releaseGuidePayout(id) {
  const data = read();
  const request = data.requests.find((entry) => entry.id === id);
  if (!request || request.status !== 'completed' || request.paymentStatus !== 'paid' || request.payoutStatus === 'paid' || request.safety?.reports?.some((report) => report.status === 'open')) return false;
  request.payoutStatus = 'paid'; request.payoutReleasedAt = new Date().toISOString(); write(data); return true;
}
export function reviewGuideRequest(id, email, stars, comment) {
  const data = read();
  const request = data.requests.find((entry) => entry.id === id && entry.travelerEmail === String(email).toLowerCase());
  if (!request || request.status !== 'completed' || request.review || !Number.isInteger(Number(stars)) || Number(stars) < 1 || Number(stars) > 5) return false;
  request.review = { stars: Number(stars), comment: String(comment || '').trim().slice(0, 500), createdAt: new Date().toISOString() }; write(data); return true;
}
export function saveGuideProfile(id, { name, area, languages, bio, capacity }) {
  const data = read(); const guide = data.guides.find((entry) => entry.id === id);
  if (!guide || !String(name).trim() || !String(area).trim() || !Number.isInteger(Number(capacity)) || Number(capacity) < 1 || Number(capacity) > 30) return false;
  Object.assign(guide, { name: String(name).trim().slice(0, 80), area: String(area).trim().slice(0, 100), languages: String(languages).trim().slice(0, 100), bio: String(bio).trim().slice(0, 500), capacity: Number(capacity) }); write(data); return true;
}
export function proposeGuidePrice(guideId, packageId, amount) {
  const data = read(); const guide = data.guides.find((entry) => entry.id === guideId);
  const option = guide?.experienceIds.flatMap((id) => getExperience(id)?.packageOptions || []).find((entry) => entry.id === packageId);
  if (!guide || !option || guide.status !== 'verified' || !Number.isInteger(Number(amount)) || Number(amount) < 1000) return false;
  const agreement = guide.priceAgreements[packageId] || { approvedAmount: null, approvedAt: null, approvedBy: null, proposal: null };
  if (Number(amount) === agreement.approvedAmount) return false;
  agreement.proposal = { amount: Number(amount), status: 'pending', submittedAt: new Date().toISOString() };
  guide.priceAgreements[packageId] = agreement; write(data); return true;
}
export function decideGuidePrice(guideId, packageId, decision) {
  const data = read(); const guide = data.guides.find((entry) => entry.id === guideId);
  const agreement = guide?.priceAgreements?.[packageId];
  if (!agreement || agreement.proposal?.status !== 'pending' || !['approved', 'rejected'].includes(decision)) return false;
  const amount = agreement.proposal.amount;
  agreement.proposal = { ...agreement.proposal, status: decision, decidedAt: new Date().toISOString(), agreedAmount: decision === 'approved' ? amount : null };
  if (decision === 'approved') { agreement.approvedAmount = amount; agreement.approvedAt = agreement.proposal.decidedAt; agreement.approvedBy = 'demo-admin'; }
  write(data); return true;
}
export function toggleGuideExperience(guideId, experienceId) {
  const data = read(); const guide = data.guides.find((entry) => entry.id === guideId);
  const experience = experiences.find((item) => item.id === experienceId && item.packageOptions?.length);
  if (!guide || guide.status !== 'verified' || !experience) return false;
  if (guide.experienceIds.includes(experienceId)) {
    if (data.requests.some((request) => (request.teamGuideIds || [request.guideId]).includes(guideId) && request.experienceId === experienceId && ['pending', 'accepted'].includes(request.status)) || data.offerings.some((offer) => (offer.teamGuideIds || [offer.guideId]).includes(guideId) && offer.experienceId === experienceId && ['pending', 'published'].includes(offer.status))) return false;
    guide.experienceIds = guide.experienceIds.filter((id) => id !== experienceId);
  } else guide.experienceIds.push(experienceId);
  write(data); return true;
}
export function toggleGuideDate(guideId, date) {
  const data = read(); const guide = data.guides.find((entry) => entry.id === guideId);
  if (!guide || guide.status !== 'verified' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < new Date().toISOString().slice(0, 10)) return false;
  if (data.requests.some((request) => (request.teamGuideIds || [request.guideId]).includes(guideId) && request.status === 'accepted' && requestDates(request).includes(date))) return false;
  guide.blockedDates = guide.blockedDates.includes(date) ? guide.blockedDates.filter((entry) => entry !== date) : [...guide.blockedDates, date].sort(); write(data); return true;
}
export function applyAsGuide({ accountUserId, name, nik = '', phone = '', address = '', area, languages, bio, capacity, yearsExperience = '', hasOwnVehicle = false, vehicleType = '', experienceIds, associationName = '', associationId = '', documents = {} }) {
  const data = read();
  if (!accountUserId || !String(name).trim() || !String(area).trim() || !Array.isArray(experienceIds) || !experienceIds.length) return null;
  const validExperienceIds = experienceIds.filter((experienceId) => experiences.some((item) => item.id === experienceId && item.packageOptions?.length));
  if (!validExperienceIds.length) return null;
  const existing = data.guides.find((entry) => entry.accountUserId === accountUserId);
  if (existing && existing.status !== 'rejected') return null;
  const id = existing?.id || (globalThis.crypto?.randomUUID?.() || `guide-${Date.now()}`);
  const priceAgreements = existing?.priceAgreements || Object.fromEntries(validExperienceIds.flatMap((experienceId) => (getExperience(experienceId)?.packageOptions || []).map((option) => [option.id, { approvedAmount: null, approvedAt: null, approvedBy: null, proposal: null }])));
  const guide = { ...(existing || { id, accountUserId, blockedDates: [], prices: {} }), id, accountUserId, name: String(name).trim().slice(0, 80), initials: String(name).trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase(), nik: String(nik || '').trim().slice(0, 16), phone: String(phone || '').trim().slice(0, 30), address: String(address || '').trim().slice(0, 300), area: String(area).trim().slice(0, 100), languages: String(languages).trim().slice(0, 100), bio: String(bio).trim().slice(0, 500), capacity: Math.max(1, Math.min(30, Number(capacity) || 1)), yearsExperience: String(yearsExperience || '').trim(), hasOwnVehicle: !!hasOwnVehicle, vehicleType: String(vehicleType || '').trim().slice(0, 80), experienceIds: validExperienceIds, associationName: String(associationName || '').trim().slice(0, 100), associationId: String(associationId || '').trim().slice(0, 80), documents: { ktpFileId: documents.ktpFileId || '', selfieFileId: documents.selfieFileId || '', skckFileId: documents.skckFileId || '', ktppFileId: documents.ktppFileId || '', bnspFileId: documents.bnspFileId || '', ktppNumber: documents.ktppNumber || '', bnspNumber: documents.bnspNumber || '', profilePhotoFileId: documents.profilePhotoFileId || '' }, verificationStatus: 'pending_review', status: 'pending', submittedAt: new Date().toISOString(), blockedDates: existing?.blockedDates || [], prices: existing?.prices || {}, priceAgreements };
  if (existing) Object.assign(existing, guide);
  else data.guides.push(guide);
  data.activeGuideId = id; write(data); return guide;
}

// ──────────────────────────────────────────────────────────────────────────
// Guide-created trip listings (guide builds their own experience + the four
// travel methods: solo / private / shared / group). Stored additively under
// data.guideTrips; absent arrays default to [] so no legacy migration is
// needed. These are draft listings pending demo-admin review.
// ──────────────────────────────────────────────────────────────────────────
export const GUIDE_TRIP_SCHEMA_VERSION = 1;
export const GUIDE_TRIP_METHODS = ['solo', 'private', 'shared', 'group'];
const guideTripMethodUnit = (mode) => (['private', 'group'].includes(mode) ? 'group' : 'person');

export function guideTripsByGuide(guideId) {
  return read().guideTrips?.filter((trip) => trip.guideId === guideId).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))) || [];
}
export function guideTripById(id) { return read().guideTrips?.find((trip) => trip.id === id) || null; }

function normaliseTripLines(value, limit) {
  return String(value || '').split('\n').map((line) => line.trim()).filter(Boolean).slice(0, limit);
}

export function createGuideTrip(guideId, values) {
  const data = read();
  const guide = data.guides.find((item) => item.id === guideId && item.status === 'verified');
  if (!guide) return null;
  const title = String(values.title || '').trim().slice(0, 120);
  const city = String(values.city || '').trim().slice(0, 60);
  const description = String(values.description || '').trim().slice(0, 1200);
  const startDate = String(values.startDate || '').trim();
  const endDate = String(values.endDate || '').trim();
  const meetingPoint = String(values.meetingPoint || '').trim().slice(0, 200);
  const meetingLat = Number.isFinite(Number(values.meetingLat)) ? Number(values.meetingLat) : null;
  const meetingLng = Number.isFinite(Number(values.meetingLng)) ? Number(values.meetingLng) : null;
  const meetingTime = String(values.meetingTime || '').trim();
  const days = startDate && endDate ? Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000) + 1 : 1;
  const nights = Math.max(0, days - 1);
  const duration = nights > 0 ? `${days} day${days === 1 ? '' : 's'} · ${nights} night${nights === 1 ? '' : 's'}` : `${days} day${days === 1 ? '' : 's'}`;
  const highlights = normaliseTripLines(values.highlights, 12);
  const itinerary = normaliseTripLines(values.itinerary, 40);
  const includes = normaliseTripLines(values.includes, 20);
  const methods = (Array.isArray(values.methods) ? values.methods : [])
    .filter((entry) => GUIDE_TRIP_METHODS.includes(entry.mode) && Number.isInteger(Number(entry.price)) && Number(entry.price) >= 1000)
    .map((entry) => {
      const min = Math.max(1, Math.min(60, Number(entry.minGuests) || 1));
      const max = Math.max(min, Math.min(60, Number(entry.maxGuests) || min));
      return {
        mode: entry.mode,
        price: Number(entry.price),
        pricingUnit: guideTripMethodUnit(entry.mode),
        minGuests: entry.mode === 'solo' ? 1 : min,
        maxGuests: entry.mode === 'solo' ? 1 : max,
        currency: 'IDR',
      };
    });
  const seen = new Set();
  const uniqueMethods = methods.filter((entry) => !seen.has(entry.mode) && seen.add(entry.mode));
  if (!title || !city || !description || !startDate || !endDate || !meetingPoint || !meetingTime || !uniqueMethods.length) return null;
  const allowedDest = new Set(guide.experienceIds || []);
  const experienceIds = [...new Set((Array.isArray(values.experienceIds) ? values.experienceIds : []).filter((id) => Boolean(getExperience(id))))];
  const trip = {
    id: `gtrip-${crypto.randomUUID()}`,
    schemaVersion: GUIDE_TRIP_SCHEMA_VERSION,
    guideId,
    title, city, duration, days, nights,
    startDate, endDate, meetingPoint, meetingLat, meetingLng, meetingTime,
    description, highlights, itinerary, includes,
    experienceIds,
    methods: uniqueMethods,
    status: 'published',
    createdAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
    approvedBy: 'demo-admin',
  };
  data.guideTrips = [trip, ...(data.guideTrips || [])];
  write(data);
  return trip;
}

export function updateGuideTrip(tripId, values) {
  const data = read();
  const trip = data.guideTrips?.find((item) => item.id === tripId);
  if (!trip) return null;
  const guide = data.guides.find((item) => item.id === trip.guideId && item.status === 'verified');
  if (!guide) return null;
  
  const title = String(values.title || '').trim().slice(0, 120);
  const city = String(values.city || '').trim().slice(0, 60);
  const description = String(values.description || '').trim().slice(0, 1200);
  const days = Math.max(1, Math.min(30, Number(values.days) || 1));
  const nights = Math.max(0, days - 1);
  const duration = nights > 0 ? `${days} day${days === 1 ? '' : 's'} · ${nights} night${nights === 1 ? '' : 's'}` : `${days} day${days === 1 ? '' : 's'}`;
  const highlights = normaliseTripLines(values.highlights, 12);
  const itinerary = normaliseTripLines(values.itinerary, 40);
  const includes = normaliseTripLines(values.includes, 20);
  const methods = (Array.isArray(values.methods) ? values.methods : [])
    .filter((entry) => GUIDE_TRIP_METHODS.includes(entry.mode) && Number.isInteger(Number(entry.price)) && Number(entry.price) >= 1000)
    .map((entry) => {
      const min = Math.max(1, Math.min(60, Number(entry.minGuests) || 1));
      const max = Math.max(min, Math.min(60, Number(entry.maxGuests) || min));
      return {
        mode: entry.mode,
        price: Number(entry.price),
        pricingUnit: guideTripMethodUnit(entry.mode),
        minGuests: entry.mode === 'solo' ? 1 : min,
        maxGuests: entry.mode === 'solo' ? 1 : max,
        currency: 'IDR',
      };
    });
  const seen = new Set();
  const uniqueMethods = methods.filter((entry) => !seen.has(entry.mode) && seen.add(entry.mode));
  if (!title || !city || !description || !startDate || !endDate || !meetingPoint || !meetingTime || !uniqueMethods.length) return null;
  const allowedDest = new Set(guide.experienceIds || []);
  const experienceIds = [...new Set((Array.isArray(values.experienceIds) ? values.experienceIds : []).filter((id) => Boolean(getExperience(id))))];
  
  trip.title = title;
  trip.city = city;
  trip.duration = duration;
  trip.days = days;
  trip.nights = nights;
  trip.startDate = startDate;
  trip.endDate = endDate;
  trip.meetingPoint = meetingPoint;
  trip.meetingLat = meetingLat;
  trip.meetingLng = meetingLng;
  trip.meetingTime = meetingTime;
  trip.description = description;
  trip.highlights = highlights;
  trip.itinerary = itinerary;
  trip.includes = includes;
  trip.experienceIds = experienceIds;
  trip.methods = uniqueMethods;
  trip.updatedAt = new Date().toISOString();
  if (trip.status === 'rejected' || trip.status === 'needs_revision') {
    trip.status = 'pending_review';
  }
  
  write(data);
  return trip;
}

export function deleteGuideTrip(tripId) {
  const data = read();
  const index = data.guideTrips?.findIndex((item) => item.id === tripId);
  if (index === undefined || index === -1) return false;
  data.guideTrips.splice(index, 1);
  write(data);
  return true;
}

export function reviewGuideApplication(guideId, decision) {
  const data = read();
  const guide = data.guides.find((entry) => entry.id === guideId && entry.accountUserId);
  if (!guide || guide.status !== 'pending' || !['approved', 'rejected'].includes(decision)) return null;
  guide.status = decision === 'approved' ? 'verified' : 'rejected';
  guide.reviewedAt = new Date().toISOString();
  guide.reviewedBy = 'demo-admin';
  write(data);
  return guide;
}
