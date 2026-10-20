import { readSavedState, writeSavedState } from '../services/storage.js';

const saved = readSavedState();
export const state = {
  wishlist: saved.wishlist || ['vatican', 'sumo'],
  accountUserId: saved.accountUserId || 'rahman',
  guestName: saved.guestName || 'A Rahman',
  email: saved.email || 'lombok_transfer@gmail.com',
  authMode: 'login',
  authError: '',
  profilePhoto: saved.profilePhoto || '',
  currency: saved.currency || 'IDR (Rp)',
  language: saved.language || 'English',
  date: saved.date || '',
  adults: saved.adults || 1,
  children: saved.children || 0,
  selectedExperience: saved.selectedExperience || 'kayaking',
  selectedPackageExperienceId: saved.selectedPackageExperienceId || '',
  selectedPackageOptionId: saved.selectedPackageOptionId || '',
  selectedOfferId: saved.selectedOfferId || '',
  tripPriceFilter: saved.tripPriceFilter || 'all',
  selectedGuideExperienceId: saved.selectedGuideExperienceId || '',
  selectedGuideId: saved.selectedGuideId || '',
  selectedTime: saved.selectedTime || '6:00 PM',
  availabilityChecked: false,
  paymentMethod: saved.paymentMethod || 'card',
  checkoutStep: 1,
  bookingNotes: '',
  modal: '',
  confirmAction: null,
  galleryExperienceId: '',
  reviewExperienceId: '',
  galleryIndex: 0,
  toast: '',
  search: '',
  filter: 'All',
  inboxFilter: 'All',
  listName: 'Favourites',
  socialReplyCommentId: '',
  socialSharePostId: '',
  socialLikesPostId: '',
  shareTarget: null,
  chatSharedTarget: null,
  socialGalleryPostId: '',
  socialGalleryIndex: 0,
  travelerGroupThreadId: '',
  privacy: saved.privacy || { onlineStatus: true, readReceipts: true },
  chatReplyMessageId: '',
  chatEditMessageId: '',
  chatForwardMessageId: '',
  chatCollectionThreadId: '',
  chatCollectionKind: '',
  chatGalleryThreadId: '',
  chatGalleryIndex: 0,
  guideApply: { step: 0, fullName: '', nik: '', phone: '', address: '', ktpFileId: '', selfieFileId: '', skckFileId: '', ktppFileId: '', bnspFileId: '', area: '', languages: '', bio: '', yearsExperience: '', hasOwnVehicle: false, vehicleType: '', experienceIds: [], associationName: '', associationId: '', profilePhotoFileId: '', profilePhotoData: '', ktpPhotoData: '', livenessPhotos: [] },
  transport: { step: 0, destLocationId: '', date: '', time: '05:30', pax: 2, luggage: 2, childSeats: 0, roofRack: false, vehicleClass: '', quote: null, useFerry: true, ferryRouteId: '', ferryDepDate: '', ferryDepTime: '23:00', pickupAt: null, ferry: null, meetingPointId: '', vehicleTotal: 0, vehiclePriceBreakdown: null, priceUpdated: false },
  tripBuilder: { step: 1, title: '', city: '', category: 'Open trip', days: 1, nights: 0, imageData: '', description: '', highlights: '', itinerary: '', includes: '', experienceIds: [], methods: { solo: { enabled: false, price: '', minGuests: 1, maxGuests: 1 }, private: { enabled: false, price: '', minGuests: 1, maxGuests: 6 }, shared: { enabled: false, price: '', minGuests: 2, maxGuests: 12 }, group: { enabled: false, price: '', minGuests: 4, maxGuests: 20 } } },
};

const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function notify() {
  listeners.forEach((fn) => {
    try { fn(); } catch (e) { console.error(e); }
  });
}

export function update(patch) {
  Object.assign(state, patch);
  const { wishlist, accountUserId, guestName, email, profilePhoto, currency, language, date, adults, children, selectedExperience, selectedPackageOptionId, selectedOfferId, tripPriceFilter, selectedGuideExperienceId, selectedGuideId, selectedTime, paymentMethod, privacy } = state;
  writeSavedState({ wishlist, accountUserId, guestName, email, profilePhoto, currency, language, date, adults, children, selectedExperience, selectedPackageOptionId, selectedOfferId, tripPriceFilter, selectedGuideExperienceId, selectedGuideId, selectedTime, paymentMethod, privacy });
  notify();
}

export function toggleWishlist(id) {
  update({ wishlist: state.wishlist.includes(id) ? state.wishlist.filter((item) => item !== id) : [...state.wishlist, id] });
}
