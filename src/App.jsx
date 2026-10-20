import React, { useState, useEffect, useRef, useCallback } from 'react';
import { route, navigate, back, initializeNavigation, syncNavigation, consumeScrollRestore } from './app/router.js';
import { state, update, toggleWishlist, subscribe, notify } from './app/store.js';
import { homeView } from './features/home/view.js';
import { searchView, resultsView, mapView } from './features/search/view.js';
import { createDiscoverMap } from './features/search/map.js';
import { wishlistView, favouritesView } from './features/wishlist/view.js';
import { profileView, profileSectionView } from './features/profile/view.js';
import { notificationsView, chatInboxView, chatView } from './features/messaging/view.js';
import { loginView } from './features/authentication/view.js';
import { continueWithDemoProvider, demoAuthMode, demoSession, loginTraveler, setDemoSessionUser, signOutDemoAccount, registerTraveler } from './features/authentication/repository.js';
import { getInstallState, isInstalledApp, requestInstallation, watchInstallation } from './features/onboarding/install.js';
import { experienceView, guideOfferView } from './features/experience-detail/view.js';
import { bookingView, checkoutView, cardDetailsView } from './features/booking/view.js';
import { attractions, destinations, experiences, getExperience, getExperienceGallery, getExperiencesMatchingQuery } from './features/experiences/data.js';
import { modalView } from './components/Modal.js';
import { experienceCard } from './components/cards.js';
import { socialFeedView, socialExploreView, socialSavedView, socialProfileView, socialPostView, socialCreateView, socialEditView, socialDraft, clearSocialDraft } from './features/social/view.js';
import { activeSocialUser, addSocialComment, createSocialPost, deleteSocialComment, deleteSocialPost, editSocialPost, linkGuideApplication, prepareSocialPhoto, recordSocialShare, reportSocialPost, setSocialUserGuideRole, socialPost, socialState, socialUser, switchSocialUser, toggleSocialFollow, toggleSocialLike, toggleSocialSave, visibleSocialPosts } from './features/social/repository.js';
import { chatMessage, chatMessages, chatThread, editChatMessage, getOrCreateChatThread, getOrCreateSharedTripThread, getOrCreateTravelGroupThread, leaveTravelGroupThread, deleteChatMessage, refreshSharedTripThread, sendChatMessage, sendChatSystemMessage, toggleChatFavorite, toggleChatPin, toggleChatReaction, visibleChatThreads } from './features/messaging/repository.js';
import { trackExperienceView, trackSearch, trackWishlistChange, trackSocialBookingOpen } from './features/recommendations/repository.js';
import { tripPlannerView } from './features/trip-intelligence/view.js';
import { financeDashboardView, guideApplicationsAdminView, guideDashboardView, guidePackagesView, guidePriceApprovalsView, guideAvailabilityView, guideProfileView, guideApplyView, guideDestinationResultsHtml, guideDestinationSelectedHtml, travelerBookingsView, travelerBookingDetailView } from './features/guides/view.js';
import { guideOfferingsView, guideTeamAssignmentsView, tripOfferingApprovalsView } from './features/guides/offerings-view.js';
import { guideCreateTripView, guideTripDetailView, TRIP_METHODS, tripDestinationResultsHtml, tripDestinationSelectedHtml } from './features/guides/trip-builder-view.js';
import { transportLandingView, transportWizardView, transportTicketView, transportFerryEstimateBanner, transportDestinationResultsHtml } from './features/transport/view.js';
import { quoteTransport, ferryPickupEstimate, ferryArrivalCheck, createTransportOrder, submitTransportPaymentProof, markTransportDocked, cancelTransportOrder, transportCancellationPreview, transportOrderByCode, rateTransportOrder, witaToIso, ferryDepartureToIso } from './features/transport/repository.js';
import { transportDriverById, transportLocationById, transportFerryRouteById } from './features/transport/data.js';
import { bookingSafetyReviewView, bookingSafetyView } from './features/guides/safety-view.js';
import { acknowledgeSharedDepartureMeetingPoint, activeGuide, advanceBookingTrip, applyAsGuide, createGuideTrip, updateGuideTrip, deleteGuideTrip, guideTripById, closeTripOffering, createTripOffering, createTripOfferRequest, decideGuidePrice, finishSharedTrip, guideDemoData, markGuideRequestPaid, proposeBookingChange, proposeGuidePrice, proposeSharedDepartureDecision, publicTripOfferings, releaseGuidePayout, reportBookingIssue, resolveBookingIssue, respondBookingChange, respondSharedDepartureDecision, reviewGuideApplication, reviewGuideRequest, reviewTripOffering, saveBookingTrustedContact, saveGuideProfile, setBookingMeetingPoint, setSharedDepartureMeetingPoint, startSharedTrip, switchGuide, toggleGuideDate, toggleGuideExperience, updateGuideRequest, verifyBooking } from './features/guides/repository.js';
import { analyzeBookingMessage } from './features/guides/safety.js';
import { openKtpCamera, openLivenessFlow, openProfilePhotoCamera, validateProfilePhoto } from './features/guides/liveness.js';
import { markInboxItemRead } from './features/inbox/repository.js';
import { claimTravelMission } from './features/travel-intelligence/repository.js';
import { escapeHtml } from './utils/html.js';
import QRCode from 'qrcode';
import { refreshExchangeRates, formatCurrency } from './services/currency.js';
import { refreshDetailWeather } from './services/weather.js';

export default function App() {
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  const rootRef = useRef(null);
  const lastPathRef = useRef('');
  const galleryDragRef = useRef(null);
  const suppressGalleryClickRef = useRef(false);
  const suppressSocialMediaClickRef = useRef(false);
  const socialMediaTapRef = useRef(null);
  const socialCarouselDragRef = useRef(null);
  const socialHorizontalDragRef = useRef(null);
  const socialPinchPointersRef = useRef(new Map());
  const socialZoomRef = useRef({ scale: 1, x: 0, y: 0, lastTap: 0, moved: false });
  const chatPinchPointersRef = useRef(new Map());
  const chatGalleryDragRef = useRef(null);
  const chatZoomRef = useRef({ scale: 1, x: 0, y: 0, lastTap: 0, moved: false });
  const chatMessageSwipeRef = useRef(null);
  const suppressChatMessageClickRef = useRef(false);
  const chatGalleryHistoryEntryRef = useRef(false);
  const chatGalleryReturnScrollTopRef = useRef(null);
  const chatRecorderRef = useRef(null);
  const chatAudioStreamRef = useRef(null);
  const chatAudioChunksRef = useRef([]);
  const chatViewportFrameRef = useRef(0);
  const suppressSocialHorizontalClickRef = useRef(false);
  const homeDestinationAutoScrollRef = useRef(null);
  const homeDestinationResumeRef = useRef(null);
  const discoverMapRef = useRef(null);
  const gtripMapRef = useRef(null);
  const gtripMarkerRef = useRef(null);
  const locationSearchTimeoutRef = useRef(null);

  const mainNavigationPaths = ['/', '/bookings', '/social', '/chat', '/profile'];

  function mainNavigationIndex() {
    return mainNavigationPaths.indexOf(route().path);
  }

  function mainNavigationTransition(path) {
    const currentIndex = mainNavigationIndex();
    const previousIndex = mainNavigationPaths.indexOf(path);
    if (currentIndex < 0 || previousIndex < 0 || currentIndex === previousIndex) return '';
    return currentIndex > previousIndex ? 'next' : 'previous';
  }

  function appShareUrl(path) {
    return `${location.origin}${location.pathname}#${path}`;
  }

  function maybeShowInstallInfo() {
    const { path } = route();
    const { canPrompt, platform } = getInstallState();
    const supported = platform === 'ios' || (platform === 'android' && canPrompt);
    if (path === '/login' && !state.modal && !isInstalledApp() && supported && !localStorage.getItem('install-info-seen')) {
      state.modal = 'install-info';
    }
  }

  function experienceShareTarget(item) {
    return {
      kind: 'experience',
      id: item.id,
      title: item.title,
      subtitle: `${item.city} · ${item.duration}`,
      text: item.description,
      image: item.cardImage || item.image,
      url: appShareUrl(`/experience/${encodeURIComponent(item.id)}`),
      attachmentType: 'experience',
      attachmentId: item.id,
    };
  }

  function placeShareTarget(kind, name) {
    const items = kind === 'destination' ? destinations : attractions;
    const item = items.find((entry) => entry.name === name);
    if (!item) return null;
    const city = item.city || item.name;
    return {
      kind,
      id: item.name,
      title: item.name,
      subtitle: item.count || city,
      text: `${item.name}${item.city ? `, ${item.city}` : ''}`,
      image: item.image,
      url: appShareUrl(`/results?city=${encodeURIComponent(city)}`),
      attachmentType: kind,
      attachmentId: item.name,
    };
  }

  function socialPostShareTarget(post) {
    return post
      ? {
          kind: 'social-post',
          id: post.id,
          title: post.location || 'Travel moment',
          subtitle: post.caption || 'Shared on Vibes',
          text: post.caption || 'A travel moment from Vibes',
          url: appShareUrl(`/social/post/${encodeURIComponent(post.id)}`),
          attachmentType: 'social-post',
          attachmentId: post.id,
        }
      : null;
  }

  function shareTargetForRoute() {
    const { path } = route();
    if (path.startsWith('/experience/') || path.startsWith('/booking/') || path.startsWith('/checkout/')) {
      return experienceShareTarget(getExperience(path.split('/')[2]));
    }
    return null;
  }

  function setupBookingQrCodes() {
    if (!rootRef.current) return;
    rootRef.current.querySelectorAll('[data-booking-qr]').forEach((canvas) => {
      const value = canvas.dataset.qrValue;
      if (!value) return;
      QRCode.toCanvas(canvas, value, {
        width: 180,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#152748', light: '#ffffff' },
      }).catch(() => {});
    });
  }

  function shareOutside(target) {
    const url = target?.url || location.href;
    const payload = { title: target?.title || document.title, text: target?.text || '', url };
    if (navigator.share) {
      const sharing = navigator.share(payload);
      closeModal();
      sharing.catch((error) => {
        if (error.name !== 'AbortError') announce('Unable to share this link');
      });
      return;
    }
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        closeModal();
        announce('Link copied');
      })
      .catch(() => announce('Unable to copy link'));
  }

  function syncDetailHeader() {
    if (!rootRef.current) return;
    const header = rootRef.current.querySelector('[data-detail-sticky-header]');
    const actions = rootRef.current.querySelector('.detail-top-actions');
    if (!header || !actions) return;
    header.classList.toggle('is-visible', actions.getBoundingClientRect().bottom <= 0);
  }

  function setupHomeDestinationCarousel() {
    clearInterval(homeDestinationAutoScrollRef.current);
    clearTimeout(homeDestinationResumeRef.current);
    homeDestinationAutoScrollRef.current = null;
    homeDestinationResumeRef.current = null;
    if (!rootRef.current) return;
    const carousel = rootRef.current.querySelector('[data-home-destination-carousel]');
    if (!carousel) return;
    let index = 0;
    const cards = () => [...carousel.querySelectorAll('.destination-tile')];
    const start = () => {
      clearInterval(homeDestinationAutoScrollRef.current);
      homeDestinationAutoScrollRef.current = setInterval(() => {
        if (document.hidden) return;
        const items = cards();
        if (items.length < 2) return;
        index = (index + 1) % items.length;
        carousel.scrollTo({ left: items[index].offsetLeft - carousel.offsetLeft, behavior: 'smooth' });
      }, 4200);
    };
    const pause = () => {
      clearInterval(homeDestinationAutoScrollRef.current);
      clearTimeout(homeDestinationResumeRef.current);
      homeDestinationResumeRef.current = setTimeout(start, 6500);
    };
    carousel.addEventListener('pointerdown', pause, { passive: true });
    carousel.addEventListener('mouseenter', pause, { passive: true });
    carousel.addEventListener('mouseleave', start, { passive: true });
    start();
  }

  function galleryLength() {
    const { path } = route();
    const id = state.modal === 'gallery' ? state.galleryExperienceId : path.startsWith('/experience/') ? path.split('/')[2] : '';
    return id ? getExperienceGallery(getExperience(id)).length : 0;
  }

  function updateGalleryIndicators(index) {
    if (!rootRef.current) return;
    state.galleryIndex = index;
    rootRef.current.querySelectorAll('[data-gallery-dot]').forEach((dot) => {
      const active = Number(dot.dataset.index) === index;
      dot.classList.toggle('active', active);
      dot.setAttribute('aria-current', String(active));
    });
    rootRef.current.querySelectorAll('.gallery-thumb').forEach((thumb) => thumb.classList.toggle('active', Number(thumb.dataset.index) === index));
    const counter = rootRef.current.querySelector('[data-gallery-counter]');
    if (counter) counter.textContent = `${index + 1} / ${galleryLength()}`;
    const previous = rootRef.current.querySelector('[data-action="gallery-prev"]');
    const next = rootRef.current.querySelector('[data-action="gallery-next"]');
    if (previous) previous.disabled = index === 0;
    if (next) next.disabled = index === galleryLength() - 1;
  }

  function selectGalleryIndex(requestedIndex, animate = true) {
    if (!rootRef.current) return;
    const length = galleryLength();
    if (!length) return;
    const index = Math.max(0, Math.min(length - 1, Number(requestedIndex) || 0));
    updateGalleryIndicators(index);
    rootRef.current.querySelectorAll('[data-gallery-track]').forEach((track) => {
      track.scrollTo({ left: index * track.clientWidth, behavior: animate ? 'smooth' : 'instant' });
    });
  }

  function announce(message) {
    state.toast = message;
    rerender();
    setTimeout(() => {
      state.toast = '';
      rerender();
    }, 2200);
  }

  function copyChatText(text) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.append(input);
    input.select();
    const copied = document.execCommand('copy');
    input.remove();
    return copied ? Promise.resolve() : Promise.reject(new Error('Copy failed'));
  }

  function scrollChatToLatest(scrollTop = null) {
    cancelAnimationFrame(chatViewportFrameRef.current);
    const align = () => {
      const messages = rootRef.current?.querySelector('.chat-messages');
      if (messages) messages.scrollTo({ top: scrollTop === null ? messages.scrollHeight : scrollTop, behavior: 'instant' });
    };
    chatViewportFrameRef.current = requestAnimationFrame(() => {
      align();
      chatViewportFrameRef.current = requestAnimationFrame(align);
    });
    setTimeout(align, 120);
  }

  function syncChatViewport() {
    const viewport = window.visualViewport;
    const messages = rootRef.current?.querySelector('.chat-messages');
    const scrollTop = messages?.scrollTop ?? null;
    const height = viewport?.height || window.innerHeight;
    const top = viewport?.offsetTop || 0;
    const offset = Math.max(0, window.innerHeight - height - (viewport?.offsetTop || 0));
    document.documentElement.style.setProperty('--chat-viewport-height', `${height}px`);
    document.documentElement.style.setProperty('--chat-viewport-top', `${top}px`);
    document.documentElement.style.setProperty('--chat-keyboard-offset', `${offset}px`);
    if (!rootRef.current?.querySelector('.chat-page')) return;
    window.scrollTo(0, 0);
    closeChatMenus();
    if (!document.activeElement?.closest('.chat-composer')) return;
    if (scrollTop !== null) scrollChatToLatest(scrollTop);
  }

  function closeChatMenus(except = null) {
    if (!rootRef.current) return;
    rootRef.current.querySelectorAll('.chat-message-menu[open]').forEach((menu) => {
      if (menu !== except) {
        menu.open = false;
        const panel = menu.querySelector('div');
        if (panel) panel.removeAttribute('style');
      }
    });
  }

  function positionChatMenu(menu) {
    const panel = menu.querySelector('div');
    const messages = menu.closest('.chat-messages');
    if (!panel || !messages) return;
    const anchor = menu.getBoundingClientRect();
    const bounds = messages.getBoundingClientRect();
    panel.style.position = 'fixed';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.left = '0px';
    panel.style.top = '0px';
    panel.style.maxHeight = `${Math.max(96, bounds.height - 16)}px`;
    let size = panel.getBoundingClientRect();
    const viewportWidth = window.visualViewport?.width || window.innerWidth;
    const margin = 8;
    const leftBound = Math.max(margin, bounds.left + margin);
    const rightBound = Math.min(viewportWidth - margin, bounds.right - margin);
    const left = Math.max(leftBound, Math.min(rightBound - size.width, anchor.left));
    const topBound = bounds.top + margin;
    const bottomBound = bounds.bottom - margin;
    const above = anchor.top - size.height - 6;
    const below = anchor.bottom + 6;
    const preferredTop = above >= topBound ? above : below;
    const top = Math.max(topBound, Math.min(bottomBound - size.height, preferredTop));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  function sendChatPhotoFiles(threadId, files) {
    Promise.all([...files].slice(0, 6).map((file) => prepareSocialPhoto(file)))
      .then((dataUrls) => {
        dataUrls.forEach((localImage) => sendChatMessage(threadId, 'Photo', { type: 'image', localImage }));
        rerender();
      })
      .catch(() => announce('Could not send this photo'));
  }

  function toggleChatVoice(threadId, button) {
    if (chatRecorderRef.current) {
      chatRecorderRef.current.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      announce('Voice messages are not supported on this device');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        chatAudioStreamRef.current = stream;
        chatAudioChunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        chatRecorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data.size) chatAudioChunksRef.current.push(event.data);
        };
        recorder.onstop = () => {
          const reader = new FileReader();
          reader.onload = () => {
            sendChatMessage(threadId, 'Voice message', { type: 'audio', localAudio: reader.result });
            chatAudioStreamRef.current?.getTracks().forEach((track) => track.stop());
            chatRecorderRef.current = null;
            chatAudioStreamRef.current = null;
            chatAudioChunksRef.current = [];
            rerender();
          };
          reader.readAsDataURL(new Blob(chatAudioChunksRef.current, { type: recorder.mimeType || 'audio/webm' }));
        };
        recorder.start();
        button.classList.add('recording');
        button.setAttribute('aria-label', 'Stop recording');
        announce('Recording voice message… tap the microphone again to send');
      })
      .catch(() => announce('Microphone permission is required'));
  }

  function closeModal() {
    const closingChatGallery = state.modal === 'chat-gallery';
    const closingSharedChat = state.modal === 'shared-chat-confirm';
    const closingConfirm = state.modal === 'confirm-action';
    const closingInstallInfo = state.modal === 'install-info';
    state.modal = '';
    if (closingSharedChat) state.chatSharedTarget = null;
    if (closingConfirm) state.confirmAction = null;
    if (closingInstallInfo) localStorage.setItem('install-info-seen', '1');
    if (closingChatGallery && chatGalleryHistoryEntryRef.current) {
      chatGalleryHistoryEntryRef.current = false;
      history.back();
      rerender();
      return;
    }
    rerender();
  }

  function openModal(name) {
    if (name === 'chat-gallery' && !chatGalleryHistoryEntryRef.current) {
      history.pushState({ chatGallery: true }, '', location.href);
      chatGalleryHistoryEntryRef.current = true;
    }
    state.modal = name;
    rerender();
  }

  function resetSocialZoom() {
    socialZoomRef.current = { scale: 1, x: 0, y: 0, lastTap: 0, moved: false };
  }

  function applySocialZoom() {
    if (!rootRef.current) return;
    const image = rootRef.current.querySelector('[data-social-zoom-image]');
    if (image) image.style.transform = `translate(${socialZoomRef.current.x}px, ${socialZoomRef.current.y}px) scale(${socialZoomRef.current.scale})`;
  }

  function resetChatZoom() {
    chatZoomRef.current = { scale: 1, x: 0, y: 0, lastTap: 0, moved: false };
  }

  function applyChatZoom() {
    if (!rootRef.current) return;
    rootRef.current.querySelectorAll('[data-chat-zoom-image]').forEach((image) => {
      image.style.transform = 'translate(0, 0) scale(1)';
    });
    const image = rootRef.current.querySelector(`[data-chat-gallery-index="${state.chatGalleryIndex}"] [data-chat-zoom-image]`);
    if (image) image.style.transform = `translate(${chatZoomRef.current.x}px, ${chatZoomRef.current.y}px) scale(${chatZoomRef.current.scale})`;
  }

  function chatGalleryPhotos(threadId) {
    return chatMessages(threadId).filter((message) => message.attachment?.type === 'image' && message.attachment.localImage);
  }

  function selectChatGalleryIndex(requestedIndex, animate = true) {
    if (!rootRef.current) return;
    const photos = chatGalleryPhotos(state.chatGalleryThreadId);
    if (!photos.length) return;
    const index = Math.max(0, Math.min(photos.length - 1, Number(requestedIndex) || 0));
    state.chatGalleryIndex = index;
    resetChatZoom();
    const track = rootRef.current.querySelector('[data-chat-gallery-track]');
    if (track) track.scrollTo({ left: index * track.clientWidth, behavior: animate ? 'smooth' : 'instant' });
    const counter = rootRef.current.querySelector('[data-chat-gallery-counter]');
    if (counter) counter.textContent = `${index + 1} / ${photos.length}`;
    rootRef.current.querySelectorAll('[data-action="chat-gallery-prev"], [data-action="chat-gallery-next"]').forEach((button) => {
      button.disabled = button.dataset.action === 'chat-gallery-prev' ? index === 0 : index === photos.length - 1;
    });
    applyChatZoom();
  }

  function openSocialGallery(postId, index = 0) {
    state.socialGalleryPostId = postId;
    state.socialGalleryIndex = Number(index) || 0;
    resetSocialZoom();
    openModal('social-gallery');
  }

  function bookingChatContext(request) {
    const experience = getExperience(request.experienceId);
    const option = experience?.packageOptions?.find((entry) => entry.id === request.packageId);
    return {
      requestId: request.id,
      bookingId: request.bookingId,
      experienceId: request.experienceId,
      guideId: request.guideId,
      travelerEmail: request.travelerEmail,
      travelerName: request.travelerName,
      date: request.date,
      duration: option?.duration || '',
      total: request.finance?.travelerTotal || request.travelerTotal,
      label: `Booking · ${request.date}`,
    };
  }

  function ensureBookingChat(threadId, request) {
    if (!threadId || !request) return threadId;
    const hasWelcome = chatMessages(threadId).some((message) => message.system && message.bookingId === request.bookingId);
    if (!hasWelcome) sendChatSystemMessage(threadId, `Booking ${request.bookingId} is ready. Use this chat to coordinate the trip and keep payments inside FindMyGuide.`, { bookingId: request.bookingId });
    return threadId;
  }

  function ensureTransportChat(threadId, order, driver) {
    if (!threadId || !order) return threadId;
    const hasWelcome = chatMessages(threadId).some((message) => message.system && message.orderCode === order.bookingId);
    if (!hasWelcome) sendChatSystemMessage(threadId, `${driver.name} is your driver for transfer ${order.bookingId}. Chat here to coordinate your pickup — for your safety and data privacy, please keep communication inside FindMyGuide.`, { orderCode: order.bookingId });
    return threadId;
  }

  function activeBookingActor() {
    const account = activeSocialUser();
    return account?.role === 'guide' ? { role: 'guide', id: account.guideId || account.id } : { role: 'traveler', email: account?.accountEmail || state.email };
  }

  function bookingChatSystemUpdate(requestId, message) {
    const thread = visibleChatThreads().find((entry) => entry.context?.requestId === requestId);
    if (thread) sendChatSystemMessage(thread.id, message, { bookingId: thread.context.bookingId });
  }

  function sharedTripSystemUpdate(offerId, message, targetOfferId = offerId) {
    if (targetOfferId !== offerId) refreshSharedTripThread(offerId, targetOfferId);
    else getOrCreateSharedTripThread(offerId);
    const thread = visibleChatThreads().find((entry) => entry.context?.offerId === targetOfferId || entry.context?.linkedOfferIds?.includes(offerId));
    if (thread) sendChatSystemMessage(thread.id, message, { offerId: targetOfferId });
  }

  function performBookingTripStep(id, step) {
    const messages = { guide_start: 'Guide requested to start the trip.', traveler_start: 'Traveler confirmed meeting the guide; trip started.', check_in: 'Traveler checked in safely.', guide_finish: 'Guide requested to complete the trip.', traveler_finish: 'Traveler confirmed the trip is complete.' };
    if (advanceBookingTrip(id, activeBookingActor(), step)) {
      const request = guideDemoData().requests.find((entry) => entry.id === id);
      if (request?.offerId) sharedTripSystemUpdate(request.offerId, messages[step]);
      else bookingChatSystemUpdate(id, messages[step]);
      announce(messages[step]);
      rerender();
    } else announce('Complete the previous booking steps first');
  }

  function setButtonLoading(button) {
    if (!button || button.disabled || button.dataset.loading === 'true') return;
    const label = button.textContent.trim() || 'Processing';
    button.dataset.loading = 'true';
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.innerHTML = `<span class="loading-spinner" aria-hidden="true"></span><span>${escapeHtml(label)}</span>`;
  }

  function clickAction(action, el) {
    const { path } = route();
    const id = el.dataset.id || path.split('/')[2] || state.selectedExperience;
    const value = el.dataset.value || '';
    switch (action) {
      case 'back':
        if (path.startsWith('/checkout/') && state.checkoutStep === 2) {
          state.checkoutStep = 1;
          rerender();
        } else back();
        break;
      case 'heart': {
        const wasSaved = state.wishlist.includes(id);
        trackWishlistChange(id, wasSaved ? 'remove' : 'add', getExperience(id));
        toggleWishlist(id);
        rerender();
        if (!wasSaved && rootRef.current) {
          rootRef.current.querySelectorAll('[data-action="heart"]').forEach((button) => {
            if (button.dataset.id === id) button.classList.add('favorite-just-saved');
          });
        }
        break;
      }
      case 'select-package-option':
        update({ selectedPackageExperienceId: id, selectedPackageOptionId: value, selectedOfferId: '' });
        rerender();
        break;
      case 'select-trip-offer': {
        const offer = guideDemoData().offerings.find((entry) => entry.id === id);
        if (!offer || !publicTripOfferings(offer.experienceId, offer.packageId, offer.date, state.adults + state.children).some((entry) => entry.id === id)) {
          announce('This departure is no longer available');
          break;
        }
        update({ selectedOfferId: id, selectedPackageExperienceId: offer.experienceId, selectedPackageOptionId: offer.packageId, date: offer.date, selectedTime: offer.time });
        navigate(`/experience/${encodeURIComponent(offer.experienceId)}/guides/${encodeURIComponent(id)}`);
        break;
      }
      case 'set-trip-price-filter':
        update({ tripPriceFilter: value });
        rerender();
        break;
      case 'select-transport-vehicle': {
        const option = state.transport?.quote?.options.find((entry) => entry.vehicleClass === id);
        if (!option || !option.fits) {
          announce('This vehicle is not available for your party');
          break;
        }
        state.transport.vehicleClass = option.vehicleClass;
        state.transport.vehicleTotal = option.total;
        state.transport.vehiclePriceBreakdown = option.priceBreakdown;
        state.transport.priceUpdated = false;
        state.transport.step = state.transport.useFerry ? 2 : 3;
        rerender();
        break;
      }
      case 'select-transport-destination': {
        const location = transportLocationById(id);
        if (!location) break;
        const input = document.getElementById('transport-destination-search');
        const hiddenInput = document.getElementById('transport-destination-value');
        const results = document.getElementById('transport-destination-results');
        if (input) input.value = location.name;
        if (hiddenInput) hiddenInput.value = String(location.id);
        if (results) {
          results.hidden = true;
          results.innerHTML = '';
        }
        break;
      }
      case 'guide-apply-back':
        state.guideApply.step = Number(value);
        rerender();
        window.scrollTo(0, 0);
        break;
      case 'ktp-open-camera':
        openKtpCamera(function (dataUrl) {
          state.guideApply.ktpPhotoData = dataUrl;
          state.guideApply.ktpFileId = 'ktp_' + Date.now();
          rerender();
        });
        break;
      case 'selfie-start-liveness':
        openLivenessFlow(function (photos) {
          state.guideApply.livenessPhotos = photos;
          state.guideApply.selfieFileId = 'selfie_' + Date.now();
          rerender();
        });
        break;
      case 'gtrip-dest-remove': {
        state.tripBuilder.experienceIds = (state.tripBuilder.experienceIds || []).filter((x) => x !== id);
        const box = document.getElementById('gtrip-dest-selected');
        if (box) box.innerHTML = tripDestinationSelectedHtml();
        const cb = document.querySelector('#gtrip-dest-results input[name="experienceIds"][value="' + id + '"]');
        if (cb) {
          cb.checked = false;
          const c = cb.closest('.gapply-dest-card');
          if (c) c.classList.remove('is-selected');
        }
        break;
      }
      case 'gapply-dest-remove': {
        state.guideApply.experienceIds = (state.guideApply.experienceIds || []).filter((x) => x !== id);
        const box = document.getElementById('gapply-dest-selected');
        if (box) box.innerHTML = guideDestinationSelectedHtml();
        const cb = document.querySelector('#gapply-dest-results input[name="experienceIds"][value="' + id + '"]');
        if (cb) {
          cb.checked = false;
          const c = cb.closest('.gapply-dest-card');
          if (c) c.classList.remove('is-selected');
        }
        break;
      }
      case 'gtrip-next': {
        persistTripBuilder(el.closest('form'));
        state.tripBuilder.step = Math.min(4, (Number(state.tripBuilder.step) || 1) + 1);
        window.scrollTo(0, 0);
        rerender();
        break;
      }
      case 'gtrip-back': {
        persistTripBuilder(el.closest('form'));
        state.tripBuilder.step = Math.max(1, (Number(state.tripBuilder.step) || 1) - 1);
        window.scrollTo(0, 0);
        rerender();
        break;
      }
      case 'gtrip-edit': {
        const trip = guideTripById(id);
        if (!trip) {
          announce('Trip not found');
          break;
        }
        state.tripBuilder = {
          step: 1,
          editingTripId: trip.id,
          title: trip.title || '',
          city: trip.city || '',
          category: trip.category || 'Open trip',
          startDate: trip.startDate || '',
          endDate: trip.endDate || '',
          meetingPoint: trip.meetingPoint || '',
          meetingLat: trip.meetingLat || null,
          meetingLng: trip.meetingLng || null,
          meetingTime: trip.meetingTime || '',
          description: trip.description || '',
          highlights: (trip.highlights || []).join('\n'),
          itinerary: (trip.itinerary || []).join('\n'),
          includes: (trip.includes || []).join('\n'),
          experienceIds: trip.experienceIds || [],
          methods: {
            solo: { enabled: false, price: '', minGuests: 1, maxGuests: 1 },
            private: { enabled: false, price: '', minGuests: 1, maxGuests: 6 },
            shared: { enabled: false, price: '', minGuests: 2, maxGuests: 12 },
            group: { enabled: false, price: '', minGuests: 4, maxGuests: 20 },
          },
        };
        (trip.methods || []).forEach((method) => {
          if (state.tripBuilder.methods[method.mode]) {
            state.tripBuilder.methods[method.mode] = {
              enabled: true,
              price: String(method.price || ''),
              minGuests: method.minGuests || 1,
              maxGuests: method.maxGuests || 1,
            };
          }
        });
        navigate('/guide/trips');
        break;
      }
      case 'gtrip-delete': {
        if (!window.confirm('Are you sure you want to delete this trip? This action cannot be undone.')) break;
        const deleted = deleteGuideTrip(id);
        if (deleted) {
          announce('Trip deleted successfully');
          rerender();
        } else {
          announce('Failed to delete trip');
        }
        break;
      }
      case 'profile-open-camera':
        openProfilePhotoCamera(function (result) {
          if (result) {
            state.guideApply.profilePhotoData = result.dataUrl;
            state.guideApply.profilePhotoFileId = 'photo_' + Date.now();
          }
          rerender();
        });
        break;
      case 'transport-back-step':
        state.transport.step = Number(value);
        rerender();
        break;
      case 'guide-apply-submit-click': {
        const account = activeSocialUser();
        const g = state.guideApply;
        if (!g.fullName || !g.nik || !g.phone || !g.skckFileId) {
          announce('Please complete all required fields and uploads');
          break;
        }
        const guide =
          account?.role === 'traveler' && !account.guideApplicationId
            ? applyAsGuide({
                accountUserId: account.id,
                name: g.fullName,
                nik: g.nik,
                phone: g.phone,
                address: g.address,
                area: g.area,
                languages: g.languages,
                bio: g.bio,
                capacity: g.capacity,
                yearsExperience: g.yearsExperience,
                hasOwnVehicle: g.hasOwnVehicle,
                vehicleType: g.vehicleType,
                experienceIds: g.experienceIds,
                associationName: g.associationName,
                associationId: g.associationId,
                documents: {
                  ktpFileId: g.ktpFileId,
                  selfieFileId: g.selfieFileId,
                  skckFileId: g.skckFileId,
                  ktppFileId: g.ktppFileId,
                  bnspFileId: g.bnspFileId,
                  profilePhotoFileId: g.profilePhotoFileId,
                },
              })
            : null;
        if (guide && linkGuideApplication(account.id, guide.id)) {
          state.guideApply = {
            step: 0,
            fullName: '',
            nik: '',
            phone: '',
            address: '',
            ktpFileId: '',
            selfieFileId: '',
            skckFileId: '',
            ktppFileId: '',
            bnspFileId: '',
            area: '',
            languages: '',
            bio: '',
            yearsExperience: '',
            hasOwnVehicle: false,
            vehicleType: '',
            experienceIds: [],
            associationName: '',
            associationId: '',
            profilePhotoFileId: '',
            profilePhotoData: '',
            ktpPhotoData: '',
            livenessPhotos: [],
          };
          announce('Guide application submitted for review');
          navigate('/guide/apply');
        } else announce('Choose at least one destination or check whether an application is already pending');
        break;
      }
      case 'mark-transport-docked': {
        const result = markTransportDocked(id);
        if (result.error) announce(result.error);
        else {
          announce('Docked confirmed. Free waiting time has started.');
          rerender();
        }
        break;
      }
      case 'confirm-transport-payment': {
        const result = submitTransportPaymentProof(id);
        if (result.error) announce(result.error);
        else {
          announce('Payment confirmed — a driver has been assigned.');
          rerender();
        }
        break;
      }
      case 'cancel-transport-order': {
        const order = transportOrderByCode(id);
        if (!order) break;
        const preview = transportCancellationPreview(order);
        state.confirmAction = {
          type: 'cancel-transport-order',
          id,
          message: preview.fee > 0 ? `Cancel this transfer? A cancellation fee of ${formatCurrency(preview.fee, 'IDR')} (${preview.feePercent}%) applies.` : 'Cancel this transfer? No cancellation fee applies.',
        };
        openModal('confirm-action');
        break;
      }
      case 'transport-driver-chat': {
        const order = transportOrderByCode(id);
        const driver = order?.driverId ? transportDriverById(order.driverId) : null;
        if (!order || !driver) {
          announce('Driver chat is unavailable yet');
          break;
        }
        const threadId = getOrCreateChatThread(driver.id);
        if (threadId) {
          ensureTransportChat(threadId, order, driver);
          navigate(`/inbox/chat/${encodeURIComponent(threadId)}`);
        } else announce('Driver chat is unavailable');
        break;
      }
      case 'show-guide-picker':
        rootRef.current?.querySelector('#guide-picker')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      case 'guide-request-accept':
      case 'guide-request-decline': {
        const status = action === 'guide-request-accept' ? 'accepted' : 'declined';
        if (updateGuideRequest(id, activeGuide().id, status)) announce(`Request ${status}`);
        else announce('Unable to update this request');
        break;
      }
      case 'pay-guide-request':
        if (markGuideRequestPaid(id, state.email)) {
          const request = guideDemoData().requests.find((entry) => entry.id === id);
          if (request?.tripMode === 'shared') {
            getOrCreateSharedTripThread(request.offerId);
            sharedTripSystemUpdate(request.offerId, 'A traveler confirmed payment. Group size and departure status are updated.');
          }
          navigate(`/bookings/${encodeURIComponent(id)}`);
        } else announce('Payment is available after guide acceptance');
        break;
      case 'verify-booking': {
        const code = el.closest('[data-booking-verification]')?.querySelector('[data-booking-code]')?.value || '';
        if (activeSocialUser().role === 'guide' && verifyBooking(id, code, activeSocialUser().guideId || activeSocialUser().id)) {
          announce('Booking verified');
          rerender();
        } else announce('Booking code is invalid or payment is not confirmed');
        break;
      }
      case 'booking-change-decision':
        if (value === 'accept') {
          state.confirmAction = { type: 'booking-change-decision', id, decision: value, message: 'Accept this change to the agreed trip details?' };
          openModal('confirm-action');
        } else if (respondBookingChange(id, activeBookingActor(), false)) {
          bookingChatSystemUpdate(id, 'A proposed trip change was declined.');
          announce('Change declined');
          rerender();
        } else announce('This change cannot be updated');
        break;
      case 'booking-trip-step':
        if (value === 'check_in') performBookingTripStep(id, value);
        else {
          state.confirmAction = {
            type: 'booking-trip-step',
            id,
            step: value,
            message:
              value === 'traveler_finish'
                ? 'Confirm that the trip ended as agreed? If there is a problem, report it before completing.'
                : value === 'traveler_start'
                ? 'Confirm that you met the correct guide and are ready to start?'
                : value === 'guide_finish'
                ? 'Ask the traveler to confirm that the trip is complete?'
                : 'Request to start this trip after verifying the traveler?',
          };
          openModal('confirm-action');
        }
        break;
      case 'booking-review-report':
        if (resolveBookingIssue(id, value)) {
          announce('Report reviewed in local demo');
          rerender();
        } else announce('Report could not be updated');
        break;
      case 'booking-share-trip': {
        const request = guideDemoData().requests.find((entry) => entry.id === id && entry.travelerEmail === state.email.toLowerCase());
        if (!request) break;
        const shareText = `Trip ${request.bookingId}: ${getExperience(request.experienceId)?.title || 'Travel experience'} on ${request.date} at ${request.time}. Guide: ${guideDemoData().guides.find((entry) => entry.id === request.guideId)?.name || 'Local guide'}. Meeting point: ${request.safety?.meetingPoint || 'To be agreed'}. This is a manually shared summary, not live tracking.`;
        if (navigator.share) navigator.share({ title: 'Trip summary', text: shareText }).catch(() => {});
        else copyChatText(shareText).then(() => announce('Trip summary copied')).catch(() => announce('Could not share summary'));
        break;
      }
      case 'send-flagged-chat': {
        const pending = state.chatPendingUnsafe;
        state.chatPendingUnsafe = null;
        state.modal = '';
        if (pending && chatThread(pending.threadId)?.participantIds.includes(activeSocialUser().id) && sendChatMessage(pending.threadId, pending.text, null, { replyTo: pending.replyTo })) {
          state.chatDraft = null;
          state.chatReplyMessageId = '';
          rerender();
        } else announce('Message could not be sent');
        break;
      }
      case 'booking-chat': {
        const request = guideDemoData().requests.find((entry) => entry.id === id && entry.travelerEmail === state.email.toLowerCase());
        const threadId = request && getOrCreateChatThread(request.guideId, bookingChatContext(request));
        if (threadId) {
          ensureBookingChat(threadId, request);
          navigate(`/inbox/chat/${encodeURIComponent(threadId)}`);
        } else announce('Guide chat is unavailable');
        break;
      }
      case 'guide-booking-chat': {
        const request = guideDemoData().requests.find((entry) => entry.id === id && entry.guideId === activeGuide().id && entry.paymentStatus === 'paid');
        const traveler = request && socialState().users.find((user) => user.accountEmail === request.travelerEmail || user.displayName === request.travelerName);
        const threadId = request && traveler && getOrCreateChatThread(traveler.id, bookingChatContext(request));
        if (threadId) {
          ensureBookingChat(threadId, request);
          navigate(`/inbox/chat/${encodeURIComponent(threadId)}`);
        } else announce('Traveler chat is unavailable for this booking');
        break;
      }
      case 'booking-shared-chat': {
        const request = guideDemoData().requests.find((entry) => entry.id === id && entry.tripMode === 'shared' && ['paid', 'refunded'].includes(entry.paymentStatus) && (entry.travelerEmail === state.email.toLowerCase() || ((entry.teamGuideIds || [entry.guideId]).includes(activeGuide().id) && activeSocialUser()?.role === 'guide')));
        const threadId = request && getOrCreateSharedTripThread(request.offerId);
        if (threadId) navigate(`/inbox/chat/${encodeURIComponent(threadId)}`);
        else announce('Shared trip chat is unavailable for this account');
        break;
      }
      case 'shared-departure-vote': {
        const result = respondSharedDepartureDecision(id, activeBookingActor(), value === 'yes');
        if (!result.ok) {
          announce('This group proposal can no longer be updated');
          break;
        }
        const updates = { proceed: 'The group agreed to continue with the current traveler count.', reschedule: 'The group agreed to move the departure date.', change_package: 'The group agreed to switch to another approved shared departure.', refund: 'The group agreed to cancel the departure and record a demo refund.' };
        sharedTripSystemUpdate(id, result.status === 'declined' ? 'A traveler party declined the guide’s proposal. The guide can suggest another plan.' : result.status === 'proposed' ? 'A traveler party responded to the guide’s proposal.' : result.status === 'needs_review' ? 'Everyone agreed, but the requested change needs review because it could not be applied safely.' : updates[result.kind] || 'The group departure decision was updated.', result.targetOfferId || id);
        announce(result.status === 'needs_review' ? 'The agreed change needs review' : result.status === 'declined' ? 'Response recorded; the guide can propose another plan' : 'Response recorded');
        rerender();
        break;
      }
      case 'shared-trip-work': {
        if (value === 'complete') {
          state.confirmAction = { type: 'shared-trip-complete', offerId: id, message: 'Mark this shared trip as finished? Each traveler will still confirm completion in their Safety Center.' };
          openModal('confirm-action');
          break;
        }
        if (startSharedTrip(id, activeBookingActor())) {
          sharedTripSystemUpdate(id, 'The guide started work at the official group meeting point. Confirm the trip start in your Safety Center.');
          announce('Trip work started');
          rerender();
        } else announce('Verify every paid traveler, resolve any safety report, and wait for every traveler party to acknowledge the official meeting point before starting');
        break;
      }
      case 'shared-meeting-point-ack':
        if (acknowledgeSharedDepartureMeetingPoint(id, activeBookingActor())) {
          sharedTripSystemUpdate(id, 'A traveler party confirmed that it has seen the official group meeting point.');
          announce('Meeting point acknowledged');
          rerender();
        } else announce('The meeting point cannot be acknowledged yet. Check that it is set and that no safety report is open.');
        break;
      case 'booking-chat-action': {
        const thread = chatThread(id);
        const request = thread?.context?.requestId ? guideDemoData().requests.find((entry) => entry.id === thread.context.requestId) : null;
        const messages = { meeting: 'Hi, let’s confirm the meeting point for this booking.', time: 'Can we confirm the departure time for this booking?', location: 'Please share the meeting location or map pin for this booking.' };
        if (value === 'meeting' && request?.tripMode === 'shared') {
          const sharedThreadId = getOrCreateSharedTripThread(request.offerId);
          if (sharedThreadId) navigate(`/inbox/chat/${encodeURIComponent(sharedThreadId)}`);
          else announce('Shared trip chat is unavailable');
          break;
        }
        if (value === 'meeting' && request) {
          navigate(`/bookings/${encodeURIComponent(request.id)}/safety`);
          break;
        }
        if (value === 'safety') {
          state.modalTitle = 'Booking safety';
          state.modalMessage = 'Keep booking details and payments inside FindMyGuide. Verify the Booking ID and QR code at the meeting point, and contact support if anything looks wrong.';
          openModal('message');
          break;
        }
        if (value === 'details' || value === 'qr') {
          if (request) navigate(`/bookings/${encodeURIComponent(request.id)}`);
          break;
        }
        if (messages[value] && sendChatMessage(id, messages[value])) {
          announce(value === 'location' ? 'Location request sent' : 'Message sent');
          rerender();
        }
        break;
      }
      case 'admin-record-payment': {
        const paid = markGuideRequestPaid(id);
        const request = paid && guideDemoData().requests.find((entry) => entry.id === id);
        if (request?.tripMode === 'shared') getOrCreateSharedTripThread(request.offerId);
        announce(paid ? 'Payment recorded in the demo ledger' : 'Payment cannot be recorded');
        break;
      }
      case 'admin-approve-trip-offer':
        announce(reviewTripOffering(id, 'published') ? 'Departure approved and published' : 'Unable to approve departure');
        break;
      case 'admin-reject-trip-offer':
        announce(reviewTripOffering(id, 'rejected') ? 'Departure rejected' : 'Unable to reject departure');
        break;
      case 'guide-close-trip-offer':
        announce(closeTripOffering(id, activeGuide().id) ? 'Departure closed' : 'Cannot close a departure with active requests');
        break;
      case 'admin-release-payout':
        announce(releaseGuidePayout(id) ? 'Guide payout released in the demo ledger' : 'Payout cannot be released yet');
        break;
      case 'guide-unblock-date':
        if (toggleGuideDate(activeGuide().id, value)) announce('Availability updated');
        else announce('This date cannot be changed');
        break;
      case 'guide-toggle-experience':
        announce(toggleGuideExperience(activeGuide().id, id) ? 'Guide packages updated' : 'Cannot remove a package with an active request');
        break;
      case 'admin-reject-price':
        announce(decideGuidePrice(id, value, 'rejected') ? 'Price proposal rejected' : 'Unable to reject proposal');
        break;
      case 'admin-approve-price':
        announce(decideGuidePrice(id, value, 'approved') ? 'Guide price approved and published' : 'Unable to approve proposal');
        break;
      case 'admin-guide-approve':
      case 'admin-guide-reject': {
        const approved = action === 'admin-guide-approve';
        const guide = reviewGuideApplication(id, approved ? 'approved' : 'rejected');
        if (!guide || !setSocialUserGuideRole(guide.accountUserId, guide.id, approved)) {
          announce('Unable to review this guide application');
          break;
        }
        announce(approved ? 'Guide application approved. This account now has guide access.' : 'Guide application rejected. The traveler account remains active.');
        if (activeSocialUser()?.id === guide.accountUserId && approved) navigate('/profile');
        else rerender();
        break;
      }
      case 'send-guide-request': {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const experienceId = route().path.split('/')[2];
            const item = getExperience(experienceId);
            const packageId = state.selectedPackageExperienceId === experienceId ? state.selectedPackageOptionId : '';
            const option = item?.packageOptions?.find((entry) => entry.id === packageId) || item?.packageOptions?.[0];
            const offer = guideDemoData().offerings.find((entry) => entry.id === state.selectedOfferId && entry.experienceId === experienceId && entry.packageId === option?.id && entry.date === state.date);
            const request = offer && createTripOfferRequest({ offerId: offer.id, adults: state.adults, children: state.children, travelerName: state.guestName, travelerEmail: state.email, notes: state.bookingNotes, expectedTotal: el.dataset.total });
            if (request) {
              state.bookingNotes = '';
              state.checkoutStep = 1;
              navigate('/bookings');
            } else announce('Price or seats changed. Review the departure and try again.');
          })
        );
        break;
      }
      case 'open-dates':
        openModal('dates');
        break;
      case 'show-availability':
        rootRef.current?.querySelector('#detail-availability')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      case 'join-travelers': {
        const experience = getExperience(id);
        if (!experience) break;
        const threadId = getOrCreateTravelGroupThread(id, `${experience.city} · ${experience.title}`);
        if (threadId) navigate(`/inbox/chat/${encodeURIComponent(threadId)}`);
        else announce('Unable to join the public group');
        break;
      }
      case 'leave-travel-group': {
        const thread = chatThread(id);
        if (leaveTravelGroupThread(id)) {
          navigate(thread?.context?.kind === 'public' ? `/experience/${encodeURIComponent(thread.context.experienceId)}` : '/inbox');
          announce('You left the group');
        }
        break;
      }
      case 'view-group-members':
        state.travelerGroupThreadId = id;
        openModal('travel-group-members');
        break;
      case 'reply-chat':
        state.chatReplyMessageId = id;
        state.chatEditMessageId = '';
        rerender();
        break;
      case 'open-chat-menu': {
        const menu = el.closest('.chat-message')?.querySelector('.chat-message-menu');
        if (menu) {
          closeChatMenus();
          menu.open = true;
          requestAnimationFrame(() => positionChatMenu(menu));
        }
        break;
      }
      case 'copy-booking-code':
        copyChatText(value || '').then(() => announce('Verification code copied')).catch(() => announce('Unable to copy verification code'));
        break;
      case 'copy-meeting-point':
        copyChatText(value || '').then(() => announce('Meeting point address copied')).catch(() => announce('Unable to copy meeting point address'));
        break;
      case 'copy-chat': {
        const message = chatMessage(route().path.split('/')[3], id);
        if (message?.text) copyChatText(message.text).then(() => announce('Text copied')).catch(() => announce('Unable to copy text'));
        break;
      }
      case 'copy-chat-selection': {
        const text = window.getSelection?.()?.toString().trim();
        if (text) {
          copyChatText(text)
            .then(() => {
              rootRef.current?.querySelector('.chat-selection-copy')?.remove();
              announce('Text copied');
            })
            .catch(() => announce('Unable to copy text'));
        }
        break;
      }
      case 'edit-chat':
        state.chatEditMessageId = id;
        state.chatReplyMessageId = '';
        rerender();
        break;
      case 'cancel-chat-compose':
        state.chatReplyMessageId = '';
        state.chatEditMessageId = '';
        rerender();
        break;
      case 'delete-chat':
        state.confirmAction = { type: 'delete-chat', id, threadId: route().path.split('/')[3], message: 'Delete this message from the chat?' };
        openModal('confirm-action');
        break;
      case 'react-chat':
        if (toggleChatReaction(route().path.split('/')[3], id, value)) rerender();
        break;
      case 'favorite-chat':
        if (toggleChatFavorite(route().path.split('/')[3], id)) rerender();
        break;
      case 'pin-chat':
        if (toggleChatPin(route().path.split('/')[3], id)) rerender();
        break;
      case 'info-chat': {
        const message = chatMessage(route().path.split('/')[3], id);
        state.modalTitle = 'Message info';
        state.modalMessage = message ? `Sent ${new Date(message.createdAt).toLocaleString()} · Read by ${message.readBy.length} participant${message.readBy.length === 1 ? '' : 's'}${message.editedAt ? ' · Edited' : ''}${message.pinned ? ' · Pinned' : ''}` : 'Message unavailable';
        openModal('message');
        break;
      }
      case 'chat-collection':
        state.chatCollectionThreadId = route().path.split('/')[3];
        state.chatCollectionKind = value;
        openModal('chat-collection');
        break;
      case 'forward-chat':
        state.chatForwardMessageId = id;
        openModal('forward-chat');
        break;
      case 'forward-chat-message': {
        const message = chatMessage(route().path.split('/')[3], state.chatForwardMessageId);
        const threadId = getOrCreateChatThread(id);
        if (message && threadId && sendChatMessage(threadId, `Forwarded: ${message.text || 'Photo'}`, message.attachment || null)) {
          state.chatForwardMessageId = '';
          state.modal = '';
          navigate(`/inbox/chat/${encodeURIComponent(threadId)}`);
        }
        break;
      }
      case 'chat-open-gallery': {
        const threadId = route().path.split('/')[3];
        const photos = chatGalleryPhotos(threadId);
        const index = Math.max(0, photos.findIndex((message) => message.id === id));
        chatGalleryReturnScrollTopRef.current = rootRef.current?.querySelector('.chat-messages')?.scrollTop ?? null;
        state.chatGalleryThreadId = threadId;
        state.chatGalleryIndex = index;
        resetChatZoom();
        openModal('chat-gallery');
        break;
      }
      case 'chat-gallery-prev':
        selectChatGalleryIndex(state.chatGalleryIndex - 1);
        break;
      case 'chat-gallery-next':
        selectChatGalleryIndex(state.chatGalleryIndex + 1);
        break;
      case 'chat-tools':
        rootRef.current?.querySelector('.chat-compose-tools')?.classList.toggle('open');
        break;
      case 'chat-emoji': {
        const input = rootRef.current?.querySelector('#chat-message-form textarea[name="message"]');
        if (input) {
          input.focus();
          input.setAttribute('inputmode', 'text');
        }
        break;
      }
      case 'chat-sticker':
        rootRef.current?.querySelector('.chat-sticker-panel')?.classList.toggle('open');
        break;
      case 'send-chat-sticker': {
        const threadId = route().path.split('/')[3];
        if (sendChatMessage(threadId, value, { type: 'sticker', value })) rerender();
        break;
      }
      case 'chat-gallery':
        rootRef.current?.querySelector('#chat-photo-input')?.click();
        break;
      case 'chat-camera':
        rootRef.current?.querySelector('#chat-camera-input')?.click();
        break;
      case 'chat-voice':
        toggleChatVoice(route().path.split('/')[3], el);
        break;
      case 'toggle-privacy': {
        const key = value;
        update({ privacy: { ...state.privacy, [key]: !state.privacy[key] } });
        rerender();
        break;
      }
      case 'check-availability':
        state.availabilityChecked = true;
        if (!state.date) openModal('dates');
        else {
          rerender();
          rootRef.current?.querySelector('#detail-availability-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        break;
      case 'select-date':
        update({ date: value, selectedOfferId: '', tripPriceFilter: 'all' });
        closeModal();
        break;
      case 'tomorrow': {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        update({ date: d.toISOString().slice(0, 10), selectedOfferId: '', tripPriceFilter: 'all' });
        closeModal();
        break;
      }
      case 'participants':
        openModal('participants');
        break;
      case 'count': {
        const [key, amount] = value.split(':');
        update({ [key]: Math.max(key === 'adults' ? 1 : 0, state[key] + Number(amount)) });
        rerender();
        break;
      }
      case 'language':
        state.modalTitle = 'Language';
        state.modalMessage = 'English';
        openModal('message');
        break;
      case 'filter-sheet':
        openModal('filters');
        break;
      case 'set-filter':
        state.filter = value;
        rerender();
        break;
      case 'show-map':
        navigate('/map?city=' + encodeURIComponent(route().params.get('city') || 'Lombok'));
        break;
      case 'map-place-filter':
      case 'map-locate':
      case 'map-track-location':
      case 'map-retry-places':
      case 'map-retry-tiles':
      case 'map-more-places':
      case 'map-place-open':
        discoverMapRef.current?.action(action, value);
        break;
      case 'new-list':
        openModal('new-list');
        break;
      case 'create-list': {
        const input = document.getElementById('list-name');
        if (input?.value.trim()) {
          state.listName = input.value.trim();
          closeModal();
          navigate('/wishlist');
        }
        break;
      }
      case 'save-to-list':
        closeModal();
        break;
      case 'dismiss-banner':
        el.closest('.info-banner')?.remove();
        break;
      case 'list-menu':
        state.modalTitle = 'List options';
        state.modalMessage = 'Your saved activities are available in this list.';
        openModal('message');
        break;
      case 'reviews':
        state.reviewExperienceId = id;
        openModal('reviews');
        break;
      case 'gallery':
        state.galleryExperienceId = id;
        state.galleryIndex = Number(el.dataset.index) || 0;
        openModal('gallery');
        break;
      case 'gallery-select':
        selectGalleryIndex(el.dataset.index);
        break;
      case 'gallery-prev':
        selectGalleryIndex(state.galleryIndex - 1);
        break;
      case 'gallery-next':
        selectGalleryIndex(state.galleryIndex + 1);
        break;
      case 'share':
        state.shareTarget = shareTargetForRoute();
        openModal('share');
        break;
      case 'share-destination':
        state.shareTarget = placeShareTarget(el.dataset.kind || 'destination', el.dataset.id || '');
        if (state.shareTarget) openModal('share');
        break;
      case 'share-to-vibes':
        navigate(`/social/create?experience=${encodeURIComponent(id)}`);
        break;
      case 'install-info':
        openModal('install-info');
        break;
      case 'dismiss-install-info':
        localStorage.setItem('install-info-seen', '1');
        closeModal();
        break;
      case 'install-app':
        localStorage.setItem('install-info-seen', '1');
        requestInstallation().catch(() => announce('Installation not yet available in this browser'));
        break;
      case 'copy-link':
        navigator.clipboard?.writeText(state.shareTarget?.url || location.href).then(() => {
          closeModal();
          announce('Link copied');
        }).catch(() => announce('Unable to copy link'));
        break;
      case 'share-external':
        shareOutside(state.shareTarget);
        break;
      case 'close-modal':
        closeModal();
        break;
      case 'open-shared-chat-content': {
        const target = state.chatSharedTarget;
        state.chatSharedTarget = null;
        state.modal = '';
        if (target?.href) navigate(target.href);
        break;
      }
      case 'confirm-action': {
        const confirmation = state.confirmAction;
        state.confirmAction = null;
        state.modal = '';
        if (confirmation?.type === 'delete-chat') {
          deleteChatMessage(confirmation.threadId, confirmation.id);
          rerender();
        } else if (confirmation?.type === 'booking-trip-step') {
          performBookingTripStep(confirmation.id, confirmation.step);
        } else if (confirmation?.type === 'booking-change-decision') {
          if (respondBookingChange(confirmation.id, activeBookingActor(), true)) {
            bookingChatSystemUpdate(confirmation.id, 'A proposed trip change was accepted.');
            announce('Trip detail updated');
            rerender();
          } else announce('This change cannot be accepted');
        } else if (confirmation?.type === 'shared-trip-complete') {
          if (finishSharedTrip(confirmation.offerId, activeBookingActor())) {
            sharedTripSystemUpdate(confirmation.offerId, 'The guide marked the shared trip work complete. Each traveler should confirm completion in their Safety Center.');
            announce('Waiting for traveler completion confirmations');
          } else announce('All paid travelers must confirm the trip started, and safety reports must be resolved first');
        } else if (confirmation?.type === 'social-delete' && deleteSocialPost(confirmation.id)) {
          navigate('/social');
        } else if (confirmation?.type === 'cancel-transport-order') {
          const result = cancelTransportOrder(confirmation.id);
          if (result.error) announce(result.error);
          else {
            announce('Transfer cancelled.');
            rerender();
          }
        } else rerender();
        break;
      }
      case 'select-time':
        update({ selectedTime: value });
        rerender();
        break;
      case 'meeting':
        state.modalTitle = 'Meeting point';
        state.modalMessage = 'The guide sets a safe public meeting point after booking. You can request a different suitable point in chat, subject to guide approval.';
        openModal('message');
        break;
      case 'go-payment': {
        const experienceId = route().path.split('/')[2];
        const experience = getExperience(experienceId);
        const packageId = state.selectedPackageExperienceId === experienceId ? state.selectedPackageOptionId : experience?.packageOptions?.[0]?.id;
        if (experience?.packageOptions?.length && (!state.date || !publicTripOfferings(experienceId, packageId, state.date, state.adults + state.children).some((offer) => offer.id === state.selectedOfferId))) {
          announce('Choose an available departure first');
          break;
        }
        const name = document.getElementById('checkout-name');
        const email = document.getElementById('checkout-email');
        const phone = document.getElementById('checkout-phone');
        if (!name?.value.trim() || !email?.checkValidity() || !phone?.value.trim()) {
          name?.reportValidity();
          email?.reportValidity();
          phone?.reportValidity();
          break;
        }
        update({ guestName: name.value.trim(), email: email.value.trim() });
        state.bookingNotes = document.getElementById('checkout-notes')?.value.trim().slice(0, 1000) || '';
        state.checkoutStep = 2;
        rerender();
        window.scrollTo(0, 0);
        break;
      }
      case 'edit-contact':
        state.checkoutStep = 1;
        rerender();
        window.scrollTo(0, 0);
        break;
      case 'promo':
        openModal('promo');
        break;
      case 'apply-promo':
        closeModal();
        announce('Promo code is not available');
        break;
      case 'card-details':
        if (state.paymentMethod === 'card') navigate('/card/' + id);
        else {
          state.modalTitle = 'Payment method';
          state.modalMessage = 'This payment method will be connected in the backend phase.';
          openModal('message');
        }
        break;
      case 'payment-unavailable':
        state.modalTitle = 'Payment unavailable';
        state.modalMessage = 'Online payments will be available when the backend is connected.';
        openModal('message');
        break;
      case 'save-profile':
        update({ guestName: document.getElementById('profile-name')?.value.trim() || state.guestName, email: document.getElementById('profile-email')?.value.trim() || state.email });
        announce('Details saved');
        break;
      case 'choose-profile-photo':
        rootRef.current?.querySelector('#profile-photo-input')?.click();
        break;
      case 'set-currency':
        update({ currency: value });
        rerender();
        break;
      case 'set-language':
        update({ language: value });
        rerender();
        break;
      case 'inbox-filter':
        state.inboxFilter = value;
        rerender();
        break;
      case 'auth-toggle-mode':
        state.authMode = value;
        state.authError = '';
        rerender();
        break;
      case 'auth-demo-provider': {
        const result = continueWithDemoProvider(value);
        if (result.error) {
          state.authError = result.error;
          rerender();
          break;
        }
        switchSocialUser(result.user.id);
        state.authMode = 'login';
        state.authError = '';
        update({ accountUserId: result.user.id, guestName: result.user.displayName, email: result.user.accountEmail });
        navigate('/');
        break;
      }
      case 'sign-out':
        signOutDemoAccount();
        state.authMode = 'login';
        state.authError = '';
        navigate('/login');
        break;
      case 'booking-history':
        announce('No past bookings yet');
        break;
      case 'inbox-more':
        announce('Inbox is up to date');
        break;
      case 'inbox-read':
        markInboxItemRead(value);
        navigate(el.dataset.href || '/inbox');
        break;
      case 'travel-mission-claim': {
        const user = socialState().activeUserId;
        if (claimTravelMission(id, { userState: state, posts: visibleSocialPosts(), userId: user })) announce('Mission reward claimed');
        break;
      }
      case 'chat-user': {
        const threadId = getOrCreateChatThread(el.dataset.id);
        if (threadId) navigate(`/inbox/chat/${encodeURIComponent(threadId)}`);
        break;
      }
      case 'social-back':
        back();
        break;
      case 'social-switch-user':
        if (switchSocialUser(id)) {
          const user = socialUser(id);
          setDemoSessionUser(id);
          if (user?.role === 'guide') switchGuide(user.guideId || user.id);
          navigate('/social');
          rerender();
        }
        break;
      case 'social-discover-destination':
        navigate('/results?city=' + encodeURIComponent(value));
        break;
      case 'social-likes':
        state.socialLikesPostId = id;
        openModal('social-likes');
        break;
      case 'social-like-profile':
        state.modal = '';
        navigate(`/social/user/${encodeURIComponent(id)}`);
        break;
      case 'social-like':
        toggleSocialLike(id);
        rerender();
        break;
      case 'social-save':
        toggleSocialSave(id);
        rerender();
        break;
      case 'social-follow':
        toggleSocialFollow(id);
        rerender();
        break;
      case 'social-reply':
        state.socialReplyCommentId = value;
        rerender();
        break;
      case 'social-cancel-reply':
        state.socialReplyCommentId = '';
        rerender();
        break;
      case 'social-select-photo': {
        const current = socialDraft.media || [];
        const exists = current.some((item) => item.imageKey === value && !item.localImage);
        const next = exists ? current.filter((item) => item.imageKey !== value || item.localImage) : [...current, { imageKey: value, localImage: null }];
        socialDraft.media = next.length ? next : [{ imageKey: value, localImage: null }];
        socialDraft.imageKey = socialDraft.media[0].imageKey || 'kayaking';
        socialDraft.localImage = socialDraft.media[0].localImage || null;
        rerender();
        break;
      }
      case 'social-open-gallery':
        openSocialGallery(id, value);
        break;
      case 'social-gallery-prev':
        state.socialGalleryIndex = Math.max(0, state.socialGalleryIndex - 1);
        resetSocialZoom();
        rerender();
        break;
      case 'social-gallery-next':
        state.socialGalleryIndex += 1;
        resetSocialZoom();
        rerender();
        break;
      case 'social-delete':
        state.confirmAction = { type: 'social-delete', id, message: 'Delete this post from this device?' };
        openModal('confirm-action');
        break;
      case 'social-delete-comment':
        if (deleteSocialComment(id, value)) rerender();
        break;
      case 'social-report':
        if (reportSocialPost(id)) announce('Report saved for admin review (demo)');
        else announce('This post was already reported');
        break;
      case 'social-share': {
        const post = socialPost(id);
        if (!post) break;
        state.socialSharePostId = post.id;
        openModal('social-share');
        break;
      }
      case 'social-share-external':
        shareOutside(socialPostShareTarget(socialPost(state.socialSharePostId)));
        break;
      case 'share-to-chat': {
        const target = state.shareTarget;
        const recipient = socialUser(value);
        if (!target || !recipient) break;
        const threadId = getOrCreateChatThread(recipient.id);
        if (!threadId || !sendChatMessage(threadId, `Shared ${target.kind === 'experience' ? 'an experience' : 'a place'} with you`, { type: target.attachmentType, id: target.attachmentId })) {
          announce('Could not send this link');
          break;
        }
        state.shareTarget = null;
        state.modal = '';
        navigate(`/inbox/chat/${encodeURIComponent(threadId)}`);
        break;
      }
      case 'social-share-to-chat': {
        const post = socialPost(state.socialSharePostId);
        const recipient = socialUser(value);
        if (!post || !recipient) break;
        const threadId = getOrCreateChatThread(recipient.id);
        if (!threadId || !sendChatMessage(threadId, 'Shared a Vibes post with you', { type: 'social-post', postId: post.id })) {
          announce('Could not send this post');
          break;
        }
        recordSocialShare(post.id, recipient.id);
        state.socialSharePostId = '';
        state.modal = '';
        navigate(`/inbox/chat/${encodeURIComponent(threadId)}`);
        break;
      }
      default:
        break;
    }
  }

  function persistTripBuilder(form) {
    if (!form) return;
    const e = form.elements;
    const tb = state.tripBuilder;
    if (e.title) tb.title = e.title.value;
    if (e.city) tb.city = e.city.value;
    if (e.category) tb.category = e.category.value;
    if (e.startDate) tb.startDate = e.startDate.value;
    if (e.endDate) tb.endDate = e.endDate.value;
    if (e.meetingPoint) tb.meetingPoint = e.meetingPoint.value;
    if (e.meetingTime) tb.meetingTime = e.meetingTime.value;
    if (e.description) tb.description = e.description.value;
    if (e.highlights) tb.highlights = e.highlights.value;
    if (e.itinerary) tb.itinerary = e.itinerary.value;
    if (e.includes) tb.includes = e.includes.value;
    TRIP_METHODS.forEach((meta) => {
      const m = tb.methods[meta.mode];
      if (e['price_' + meta.mode]) m.price = e['price_' + meta.mode].value;
      if (e['min_' + meta.mode]) m.minGuests = e['min_' + meta.mode].value;
      if (e['max_' + meta.mode]) m.maxGuests = e['max_' + meta.mode].value;
    });
  }

  function submitTripBuilder(form) {
    persistTripBuilder(form);
    const tb = state.tripBuilder;
    const methods = TRIP_METHODS.filter((meta) => tb.methods[meta.mode].enabled).map((meta) => ({
      mode: meta.mode,
      price: Number(tb.methods[meta.mode].price),
      minGuests: Number(tb.methods[meta.mode].minGuests),
      maxGuests: Number(tb.methods[meta.mode].maxGuests),
    }));

    const checkedDestinations = [...document.querySelectorAll('#guide-trip-builder-form input[name="experienceIds"]:checked')].map((cb) => cb.value);
    if (checkedDestinations.length) {
      tb.experienceIds = [...new Set([...(tb.experienceIds || []), ...checkedDestinations])];
    }
    const tripData = {
      title: tb.title,
      city: tb.city,
      category: tb.category,
      startDate: tb.startDate,
      endDate: tb.endDate,
      meetingPoint: tb.meetingPoint,
      meetingLat: tb.meetingLat,
      meetingLng: tb.meetingLng,
      meetingTime: tb.meetingTime,
      description: tb.description,
      highlights: tb.highlights,
      itinerary: tb.itinerary,
      includes: tb.includes,
      experienceIds: tb.experienceIds,
      methods,
    };

    if (tb.editingTripId) {
      const trip = updateGuideTrip(tb.editingTripId, tripData);
      if (!trip) {
        announce('Failed to update trip. Check your details and try again.');
        return;
      }
      announce('Trip updated successfully');
    } else {
      const trip = createGuideTrip(activeGuide().id, tripData);
      if (!trip) {
        announce('Add a title, service area, description, and at least one travel method with a price of 1,000 or more.');
        return;
      }
      announce('Trip published (demo auto-approval)');
    }

    state.tripBuilder = {
      step: 1,
      title: '',
      city: '',
      category: 'Open trip',
      startDate: '',
      endDate: '',
      meetingPoint: '',
      meetingLat: null,
      meetingLng: null,
      meetingTime: '',
      description: '',
      highlights: '',
      itinerary: '',
      includes: '',
      experienceIds: [],
      methods: {
        solo: { enabled: false, price: '', minGuests: 1, maxGuests: 1 },
        private: { enabled: false, price: '', minGuests: 1, maxGuests: 6 },
        shared: { enabled: false, price: '', minGuests: 2, maxGuests: 12 },
        group: { enabled: false, price: '', minGuests: 4, maxGuests: 20 },
      },
      editingTripId: null,
    };
    window.scrollTo(0, 0);
    navigate('/guide');
  }

  function initGuideTripDatePicker() {
    const startInput = document.getElementById('gtrip-start-date');
    const endInput = document.getElementById('gtrip-end-date');
    if (!startInput || !endInput || !window.AirDatepicker) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const localeEn = {
      days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      daysMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      today: 'Today',
      clear: 'Clear',
      dateFormat: 'yyyy-MM-dd',
      timeFormat: 'hh:ii aa',
      firstDay: 0,
    };

    const startPicker = new window.AirDatepicker(startInput, {
      minDate: today,
      dateFormat: 'yyyy-MM-dd',
      autoClose: true,
      locale: localeEn,
      onSelect: ({ date }) => {
        if (date && endPicker) {
          endPicker.update({ minDate: date });
          const endDate = endInput.value;
          if (endDate && new Date(endDate) < date) {
            endPicker.clear();
          }
        }
      },
    });

    const endPicker = new window.AirDatepicker(endInput, {
      minDate: startInput.value ? new Date(startInput.value) : today,
      dateFormat: 'yyyy-MM-dd',
      autoClose: true,
      locale: localeEn,
    });
  }

  function initGuideTripMap() {
    const mapEl = document.getElementById('gtrip-map');
    if (!mapEl || !window.L) return;

    if (gtripMapRef.current) {
      gtripMapRef.current.remove();
      gtripMapRef.current = null;
      gtripMarkerRef.current = null;
    }

    const guide = activeGuide();
    const guideArea = state.tripBuilder.city || guide.area || 'Lombok';

    let lat = state.tripBuilder.meetingLat || -8.5778;
    let lng = state.tripBuilder.meetingLng || 116.3239;

    const map = window.L.map('gtrip-map').setView([lat, lng], 13);
    gtripMapRef.current = map;

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    const customIcon = window.L.divIcon({
      html: '<i class="fa-solid fa-location-dot" style="color: #ef4444; font-size: 32px;"></i>',
      className: 'custom-marker-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });

    if (state.tripBuilder.meetingLat && state.tripBuilder.meetingLng) {
      gtripMarkerRef.current = window.L.marker([lat, lng], { icon: customIcon }).addTo(map);
    }

    map.on('click', (e) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      state.tripBuilder.meetingLat = clickLat;
      state.tripBuilder.meetingLng = clickLng;

      if (gtripMarkerRef.current) {
        gtripMarkerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        gtripMarkerRef.current = window.L.marker([clickLat, clickLng], { icon: customIcon }).addTo(map);
      }

      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${clickLat}&lon=${clickLng}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.display_name) {
            const input = document.getElementById('gtrip-meeting-point');
            if (input) {
              input.value = data.display_name;
              state.tripBuilder.meetingPoint = data.display_name;
            }
          }
        })
        .catch(() => {});
    });
  }

  function searchGuideTripLocation(query) {
    if (!query || query.trim().length < 1) {
      const results = document.getElementById('gtrip-location-results');
      if (results) results.hidden = true;
      return;
    }

    const safeEsc = (val) =>
      String(val ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    clearTimeout(locationSearchTimeoutRef.current);
    locationSearchTimeoutRef.current = setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=5`)
        .then((res) => res.json())
        .then((data) => {
          const results = document.getElementById('gtrip-location-results');
          if (!results) return;

          if (!Array.isArray(data) || data.length === 0) {
            results.hidden = true;
            return;
          }

          results.innerHTML = data
            .map(
              (item) => `
            <button type="button" class="gtrip-location-item" data-lat="${item.lat}" data-lng="${item.lon}" data-name="${safeEsc(item.display_name)}">
              <i class="fa-solid fa-location-dot" style="color: #ff6b35;"></i>
              <div>
                <strong>${safeEsc(item.display_name.split(',')[0])}</strong>
                <small>${safeEsc(item.display_name)}</small>
              </div>
            </button>
          `
            )
            .join('');
          results.hidden = false;
        })
        .catch(() => {
          const results = document.getElementById('gtrip-location-results');
          if (results) results.hidden = true;
        });
    }, 300);
  }

  function currentView() {
    const { path, params } = route();
    const guideRoute = path === '/guide' || path.startsWith('/guide/');
    if (guideRoute && path !== '/guide/apply' && activeSocialUser()?.role !== 'guide') return profileView();
    if (path === '/login') return loginView(state.authMode || demoAuthMode(), state.authError || '');
    if (path === '/' || path === '') return homeView();
    if (path === '/search') return searchView();
    if (path === '/results') {
      const query = params.get('q') || '';
      trackSearch(query || params.get('city') || 'Lombok');
      return resultsView(params.get('city') || 'Lombok', params.get('category') || '', query);
    }
    if (path === '/map') return mapView(params.get('city') || 'Lombok');
    if (path === '/wishlist') return wishlistView();
    if (path === '/wishlist/favourites') return favouritesView();
    if (path === '/bookings') return travelerBookingsView(params.get('tab'), params.get('category') || 'all');
    if (path === '/transport') return transportLandingView();
    if (path === '/transport/book') return transportWizardView();
    if (path.startsWith('/transport/orders/')) return transportTicketView(path.split('/')[3]);
    if (/^\/bookings\/[^/]+\/safety$/.test(path)) return bookingSafetyView(path.split('/')[2]);
    if (path.startsWith('/bookings/')) return travelerBookingDetailView(path.split('/')[2]);
    if (path === '/guide') return guideDashboardView();
    if (path === '/guide/packages')
      return guidePackagesView().replace(
        '<a class="guide-admin-link" href="#/admin/prices">',
        '<a class="guide-admin-link" href="#/guide/offers">Manage dated trip offerings →</a><a class="guide-admin-link" href="#/admin/prices">'
      );
    if (path === '/guide/offers')
      return guideOfferingsView().replace(
        '<div class="guide-section-heading"><h2>Your departures</h2>',
        '<a class="guide-admin-link" href="#/guide/assignments">View team assignments →</a><div class="guide-section-heading"><h2>Your departures</h2>'
      );
    if (path.startsWith('/guide/trips/')) return guideTripDetailView(path.split('/')[3]);
    if (path === '/guide/trips') return guideCreateTripView();
    if (path === '/guide/assignments') return guideTeamAssignmentsView();
    if (path === '/admin/offers') return tripOfferingApprovalsView();
    if (path === '/admin/prices') return guidePriceApprovalsView();
    if (path === '/admin/guides') return guideApplicationsAdminView();
    if (path === '/admin/finance') return financeDashboardView();
    if (path === '/admin/safety') return bookingSafetyReviewView();
    if (path === '/guide/availability') return guideAvailabilityView();
    if (path === '/guide/profile') return guideProfileView();
    if (path === '/guide/apply') return guideApplyView();
    if (path === '/profile') return profileView();
    if (path === '/trip-planner') return tripPlannerView(params.get('city') || '', Number(params.get('days') || 3), params.get('budget') || 'mid');
    if (path.startsWith('/profile/')) return profileSectionView(path.split('/')[2]);
    if (path === '/inbox') return notificationsView();
    if (path === '/chat') return chatInboxView();
    if (path.startsWith('/inbox/chat/')) return chatView(path.split('/')[3]);
    if (path === '/social') return socialFeedView(params.get('feed') === 'following');
    if (path === '/social/explore') return socialExploreView(params.get('topic') || '');
    if (path === '/social/saved') return socialSavedView();
    if (path === '/social/activity') return notificationsView();
    if (path === '/social/create') return socialCreateView(params.get('experience') || '');
    if (path.startsWith('/social/edit/')) return socialEditView(path.split('/')[3]);
    if (path.startsWith('/social/user/')) return socialProfileView(path.split('/')[3]);
    if (path.startsWith('/social/post/')) return socialPostView(path.split('/')[3]);
    if (path.startsWith('/experience/') && path.split('/')[3] === 'guides' && path.split('/')[4]) return guideOfferView(path.split('/')[2], path.split('/')[4]);
    if (path.startsWith('/experience/') && path.endsWith('/guides')) return experienceView(path.split('/')[2], { marketplace: true });
    if (path.startsWith('/experience/')) {
      const experienceId = path.split('/')[2];
      const experience = getExperience(experienceId);
      trackExperienceView(experienceId, experience);
      if (params.get('from') === 'vibes') trackSocialBookingOpen(experienceId, experience);
      return experienceView(experienceId);
    }
    if (path.startsWith('/booking/')) return bookingView(path.split('/')[2]);
    if (path.startsWith('/checkout/')) return checkoutView(path.split('/')[2]);
    if (path.startsWith('/card/')) return cardDetailsView(path.split('/')[2]);
    return homeView();
  }

  // React component mount & external setup
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    initializeNavigation();
    watchInstallation(rerender);

    const session = demoSession();
    if (session) switchSocialUser(session.userId);
    else {
      state.authMode = demoAuthMode();
      if (route().path !== '/login') navigate('/login');
    }

    refreshExchangeRates().then(rerender);

    const unsub = subscribe(rerender);

    const handleHashChange = () => {
      state.modal = '';
      syncNavigation();
      rerender();
    };

    const handlePopState = () => {
      if (chatGalleryHistoryEntryRef.current) {
        chatGalleryHistoryEntryRef.current = false;
        if (state.modal === 'chat-gallery') {
          state.modal = '';
          rerender();
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('scroll', syncDetailHeader, { passive: true });
    window.addEventListener('resize', syncChatViewport, { passive: true });
    window.visualViewport?.addEventListener('resize', syncChatViewport, { passive: true });
    window.visualViewport?.addEventListener('scroll', syncChatViewport, { passive: true });

    return () => {
      unsub();
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('scroll', syncDetailHeader);
      window.removeEventListener('resize', syncChatViewport);
      window.visualViewport?.removeEventListener('resize', syncChatViewport);
      window.visualViewport?.removeEventListener('scroll', syncChatViewport);
      discoverMapRef.current?.destroy();
      if (gtripMapRef.current) {
        gtripMapRef.current.remove();
        gtripMapRef.current = null;
      }
    };
  }, [rerender]);

  // View lifecycle after each render
  useEffect(() => {
    const { path } = route();
    const session = demoSession();

    if (!session && path !== '/login') {
      state.authMode = demoAuthMode();
      navigate('/login');
      return;
    }
    if (session && path === '/login') {
      navigate('/');
      return;
    }
    if (session && activeSocialUser()?.id !== session.userId) switchSocialUser(session.userId);

    const chatRoute = path.startsWith('/inbox/chat/');
    const safetyRoute = /^\/bookings\/[^/]+\/safety$/.test(path);

    maybeShowInstallInfo();

    const account = activeSocialUser();
    if (account) {
      if (state.accountUserId !== account.id) {
        update({ accountUserId: account.id, guestName: account.displayName, email: account.accountEmail || `${account.username.replace(/[^a-z0-9]+/gi, '.')}@demo.example.com` });
      }
      if (account.role === 'guide' && activeGuide().id !== (account.guideId || account.id)) {
        switchGuide(account.guideId || account.id);
      }
    }

    if (path !== lastPathRef.current) {
      state.galleryIndex = 0;
      state.availabilityChecked = false;
    }

    setupBookingQrCodes();
    setupHomeDestinationCarousel();

    if (path === '/map' && rootRef.current?.querySelector('[data-map-surface]')) {
      if (!discoverMapRef.current) {
        discoverMapRef.current = createDiscoverMap(rootRef.current);
      } else {
        discoverMapRef.current.refresh();
      }
    } else if (discoverMapRef.current) {
      discoverMapRef.current.destroy();
      discoverMapRef.current = null;
    }

    selectGalleryIndex(state.galleryIndex, false);

    if (state.modal === 'chat-gallery') {
      requestAnimationFrame(() => {
        const track = rootRef.current?.querySelector('[data-chat-gallery-track]');
        if (track) track.scrollTo({ left: state.chatGalleryIndex * track.clientWidth, behavior: 'instant' });
        applyChatZoom();
      });
    }

    if (chatRoute) {
      syncChatViewport();
      if (path !== lastPathRef.current) scrollChatToLatest();
      else if (chatGalleryReturnScrollTopRef.current !== null) {
        const scrollTop = chatGalleryReturnScrollTopRef.current;
        chatGalleryReturnScrollTopRef.current = null;
        scrollChatToLatest(scrollTop);
      }
    }

    if (path === '/guide/trips') {
      setTimeout(() => {
        initGuideTripDatePicker();
        const destRes = document.getElementById('gtrip-dest-results');
        if (destRes) {
          destRes.innerHTML = tripDestinationResultsHtml('');
          destRes.hidden = false;
        }
        initGuideTripMap();
      }, 100);
    }

    if (path !== lastPathRef.current) {
      const scrollRestore = consumeScrollRestore();
      if (scrollRestore !== null) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: scrollRestore, behavior: 'instant' });
          requestAnimationFrame(() => window.scrollTo({ top: scrollRestore, behavior: 'instant' }));
        });
      } else window.scrollTo({ top: 0, behavior: 'instant' });
      lastPathRef.current = path;
    }

    syncDetailHeader();
    if (rootRef.current) refreshDetailWeather(rootRef.current);
  });

  // Event Handlers
  const handleClick = (event) => {
    if (suppressSocialHorizontalClickRef.current) {
      event.preventDefault();
      suppressSocialHorizontalClickRef.current = false;
      return;
    }
    if (!event.target.closest('.chat-message-menu')) closeChatMenus();

    const locationItem = event.target.closest('.gtrip-location-item');
    if (locationItem) {
      event.preventDefault();
      const lat = parseFloat(locationItem.dataset.lat);
      const lng = parseFloat(locationItem.dataset.lng);
      const name = locationItem.dataset.name;

      state.tripBuilder.meetingLat = lat;
      state.tripBuilder.meetingLng = lng;
      state.tripBuilder.meetingPoint = name;

      const currentInput = document.getElementById('gtrip-meeting-point');
      if (currentInput) currentInput.value = name;

      const results = document.getElementById('gtrip-location-results');
      if (results) results.hidden = true;

      if (gtripMapRef.current) {
        gtripMapRef.current.setView([lat, lng], 15);
        const customIcon = window.L.divIcon({
          html: '<i class="fa-solid fa-location-dot" style="color: #ef4444; font-size: 32px;"></i>',
          className: 'custom-marker-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        });
        if (gtripMarkerRef.current) {
          gtripMarkerRef.current.setLatLng([lat, lng]);
        } else {
          gtripMarkerRef.current = window.L.marker([lat, lng], { icon: customIcon }).addTo(gtripMapRef.current);
        }
      }
      return;
    }

    if (!event.target.closest('#gtrip-meeting-point') && !event.target.closest('#gtrip-location-results')) {
      const results = document.getElementById('gtrip-location-results');
      if (results) results.hidden = true;
    }

    const chatImage = event.target.closest('.chat-image-attachment');
    if (chatImage) {
      event.preventDefault();
      clickAction('chat-open-gallery', chatImage);
      return;
    }

    const sharedChatContent = event.target.closest('.chat-shared-post');
    if (sharedChatContent) {
      event.preventDefault();
      state.chatSharedTarget = {
        href: sharedChatContent.getAttribute('href')?.replace(/^#/, ''),
        kind: sharedChatContent.querySelector('strong')?.textContent.trim() || 'Shared content',
        title: sharedChatContent.querySelector('small')?.textContent.trim() || '',
        image: sharedChatContent.querySelector('img')?.getAttribute('src') || '',
      };
      openModal('shared-chat-confirm');
      return;
    }

    const socialMedia = event.target.closest('[data-social-media]');
    if (socialMedia) {
      event.preventDefault();
      if (suppressSocialMediaClickRef.current) {
        suppressSocialMediaClickRef.current = false;
        return;
      }
      const postId = socialMedia.dataset.socialMedia;
      const now = Date.now();
      if (socialMediaTapRef.current?.postId === postId && now - socialMediaTapRef.current.at < 360) {
        clearTimeout(socialMediaTapRef.current.timer);
        socialMediaTapRef.current = null;
        toggleSocialLike(postId);
        rerender();
      } else {
        if (socialMediaTapRef.current) clearTimeout(socialMediaTapRef.current.timer);
        socialMediaTapRef.current = {
          postId,
          at: now,
          timer: setTimeout(() => {
            socialMediaTapRef.current = null;
            navigate(`/social/post/${encodeURIComponent(postId)}`);
          }, 360),
        };
      }
      return;
    }

    const zoomStage = event.target.closest('[data-social-zoom-stage]');
    if (zoomStage) {
      const now = Date.now();
      if (now - socialZoomRef.current.lastTap < 320) {
        socialZoomRef.current.scale = socialZoomRef.current.scale > 1 ? 1 : 2;
        socialZoomRef.current.x = 0;
        socialZoomRef.current.y = 0;
        applySocialZoom();
        socialZoomRef.current.lastTap = 0;
      } else socialZoomRef.current.lastTap = now;
      return;
    }

    const chatZoomStage = event.target.closest('[data-chat-zoom-stage]');
    if (chatZoomStage) {
      const now = Date.now();
      if (now - chatZoomRef.current.lastTap < 320) {
        chatZoomRef.current.scale = chatZoomRef.current.scale > 1 ? 1 : 2;
        chatZoomRef.current.x = 0;
        chatZoomRef.current.y = 0;
        applyChatZoom();
        chatZoomRef.current.lastTap = 0;
      } else chatZoomRef.current.lastTap = now;
      return;
    }

    const socialCaption = event.target.closest('.social-post-caption.is-expandable');
    if (socialCaption && !event.target.closest('a')) {
      event.preventDefault();
      socialCaption.classList.toggle('is-expanded');
      return;
    }

    const el = event.target.closest('[data-action]');
    if (!el) return;
    if (suppressChatMessageClickRef.current && el.dataset.action === 'open-chat-menu') {
      suppressChatMessageClickRef.current = false;
      return;
    }
    if (el.dataset.action === 'open-chat-menu' && window.getSelection?.()?.toString()) return;
    if (suppressGalleryClickRef.current && el.dataset.action === 'gallery') {
      event.preventDefault();
      suppressGalleryClickRef.current = false;
      return;
    }
    event.preventDefault();
    if (el.classList.contains('modal-backdrop') && event.target !== el) return;
    if (el.matches('button.primary-button,button.outline-button') && !['close-modal', 'back'].includes(el.dataset.action)) {
      setButtonLoading(el);
    }
    clickAction(el.dataset.action, el);
  };

  const handleInput = (event) => {
    if (event.target.id === 'gtrip-meeting-point') {
      state.tripBuilder.meetingPoint = event.target.value;
      searchGuideTripLocation(event.target.value);
    }
    if (event.target.closest('#social-compose-form')) {
      if (event.target.name === 'caption') socialDraft.caption = event.target.value;
      if (event.target.name === 'location') socialDraft.location = event.target.value;
    }
    if (event.target.id === 'transport-destination-search') {
      const results = document.getElementById('transport-destination-results');
      const hiddenInput = document.getElementById('transport-destination-value');
      if (results) {
        results.hidden = false;
        results.innerHTML = transportDestinationResultsHtml(event.target.value);
      }
      if (hiddenInput) hiddenInput.value = '';
    }
    if (event.target.id === 'social-search') {
      const query = event.target.value.toLowerCase().trim();
      let shown = 0;
      rootRef.current?.querySelectorAll('#social-explore-grid [data-search-text]').forEach((post) => {
        post.hidden = !post.dataset.searchText.includes(query);
        if (!post.hidden) shown += 1;
      });
      const empty = rootRef.current?.querySelector('#social-search-empty');
      if (empty) empty.hidden = shown !== 0;
    }
    if (event.target.id === 'gapply-dest-search') {
      const query = event.target.value.trim();
      const hint = document.getElementById('gapply-dest-hint');
      const results = document.getElementById('gapply-dest-results');
      if (results) {
        if (query.length < 2) {
          results.hidden = true;
          results.innerHTML = '';
          if (hint) hint.hidden = false;
        } else {
          if (hint) hint.hidden = true;
          results.hidden = false;
          results.innerHTML = guideDestinationResultsHtml(state.guideApply.area, query);
        }
      }
    }
    if (event.target.id === 'gtrip-dest-search') {
      const query = event.target.value.trim();
      const hint = document.getElementById('gtrip-dest-hint');
      const results = document.getElementById('gtrip-dest-results');
      if (results) {
        if (query.length < 2) {
          results.hidden = true;
          results.innerHTML = '';
          if (hint) hint.hidden = false;
        } else {
          if (hint) hint.hidden = true;
          results.hidden = false;
          results.innerHTML = tripDestinationResultsHtml(query);
        }
      }
    }
    if (event.target.id === 'place-search') {
      state.search = event.target.value;
      const searchQuery = state.search.trim().toLowerCase();
      const suggestionsEl = document.getElementById('search-suggestions');
      const liveResultsEl = document.getElementById('search-live-results');
      if (!liveResultsEl) {
        document.querySelectorAll('#search-suggestions .suggestion').forEach((item) => {
          item.hidden = !item.textContent.toLowerCase().includes(searchQuery);
        });
        return;
      }
      if (searchQuery.length < 2) {
        suggestionsEl.hidden = false;
        liveResultsEl.hidden = true;
        liveResultsEl.innerHTML = '';
        document.querySelectorAll('#search-suggestions .suggestion').forEach((item) => {
          item.hidden = searchQuery ? !item.textContent.toLowerCase().includes(searchQuery) : false;
        });
      } else {
        suggestionsEl.hidden = true;
        const results = getExperiencesMatchingQuery(searchQuery);
        liveResultsEl.hidden = false;
        liveResultsEl.innerHTML = results.length
          ? results.map((item) => experienceCard(item)).join('')
          : '<div class="empty-state"><h2>No results for \u201c' + escapeHtml(searchQuery) + '\u201d</h2><p>Try different keywords or press Enter.</p></div>';
      }
    }
  };

  const handleKeyDown = (event) => {
    if (event.target.id === 'place-search' && event.key === 'Enter') {
      const query = event.target.value.trim();
      state.filter = '';
      navigate(query ? '/results?q=' + encodeURIComponent(query) : '/results?city=Lombok');
    }
    if (event.target.id === 'gapply-dest-search' && event.key === 'Enter') event.preventDefault();
    if (event.target.id === 'gtrip-dest-search' && event.key === 'Enter') event.preventDefault();
    if (event.key === 'Escape' && state.modal) closeModal();
    if (event.target.matches('[data-gallery-track]') && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      selectGalleryIndex(state.galleryIndex + (event.key === 'ArrowRight' ? 1 : -1));
    }
  };

  const handleChange = (event) => {
    if (event.target.id === 'guide-apply-agree') {
      const btn = document.getElementById('guide-apply-submit');
      if (btn) btn.disabled = !event.target.checked;
      return;
    }
    if (event.target.matches('[data-shared-decision-kind]')) {
      rootRef.current?.querySelectorAll('[data-shared-decision-field]').forEach((field) => {
        const visible = field.dataset.sharedDecisionField === (event.target.value === 'reschedule' ? 'date' : event.target.value === 'change_package' ? 'offer' : '');
        field.hidden = !visible;
        const input = field.querySelector('input,select');
        if (input) input.required = visible;
      });
    }
    if (event.target.closest('#transport-step-2-form') && ['ferryRouteId', 'ferryDepDate', 'ferryDepTime'].includes(event.target.name)) {
      const form = event.target.closest('form');
      const routeId = form.elements.ferryRouteId?.value;
      const date = form.elements.ferryDepDate?.value;
      const time = form.elements.ferryDepTime?.value;
      const banner = document.getElementById('transport-ferry-estimate');
      const tzHint = document.getElementById('transport-ferry-tz');
      if (tzHint && routeId) tzHint.textContent = transportFerryRouteById(routeId)?.scheduleTimezone || 'WITA';
      if (banner && routeId && date && time) {
        const check = ferryArrivalCheck(routeId, ferryDepartureToIso(routeId, date, time));
        banner.hidden = !check?.overnight;
        banner.innerHTML = transportFerryEstimateBanner(check);
      }
    }
    if (event.target.id === 'social-photo-input' && event.target.files?.length) {
      Promise.all([...event.target.files].slice(0, 10).map((file) => prepareSocialPhoto(file)))
        .then((dataUrls) => {
          socialDraft.media = dataUrls.map((dataUrl) => ({ imageKey: null, localImage: dataUrl }));
          socialDraft.localImage = dataUrls[0] || null;
          socialDraft.imageKey = null;
          rerender();
        })
        .catch((error) => announce(error.message));
    }
    if (event.target.id === 'profile-photo-input' && event.target.files?.length) {
      prepareSocialPhoto(event.target.files[0])
        .then((profilePhoto) => {
          update({ profilePhoto });
          rerender();
          announce('Profile photo updated');
        })
        .catch((error) => announce(error.message));
    }
    if (event.target.name === 'languages' && event.target.closest('#guide-apply-step-2')) {
      const label = event.target.closest('.gapply-lang-option');
      if (label) label.classList.toggle('is-checked', event.target.checked);
      return;
    }
    if (event.target.name === 'experienceIds' && event.target.closest('#guide-trip-builder-form')) {
      const ids = state.tripBuilder.experienceIds || [];
      state.tripBuilder.experienceIds = event.target.checked ? [...new Set([...ids, event.target.value])] : ids.filter((x) => x !== event.target.value);
      const card = event.target.closest('.gapply-dest-card');
      if (card) card.classList.toggle('is-selected', event.target.checked);
      const selectedBox = document.getElementById('gtrip-dest-selected');
      if (selectedBox) selectedBox.innerHTML = tripDestinationSelectedHtml();
      return;
    }
    if (event.target.name === 'experienceIds' && event.target.closest('#guide-apply-step-2')) {
      const ids = state.guideApply.experienceIds || [];
      state.guideApply.experienceIds = event.target.checked ? [...new Set([...ids, event.target.value])] : ids.filter((id) => id !== event.target.value);
      const card = event.target.closest('.gapply-dest-card');
      if (card) card.classList.toggle('is-selected', event.target.checked);
      const selectedBox = document.getElementById('gapply-dest-selected');
      if (selectedBox) selectedBox.innerHTML = guideDestinationSelectedHtml();
      return;
    }
    if (event.target.name === 'area' && event.target.closest('#guide-apply-step-2')) {
      const form = event.target.closest('form');
      Object.assign(state.guideApply, {
        area: event.target.value,
        languages: [...form.querySelectorAll('input[name="languages"]:checked')].map((cb) => cb.value).join(', ') || state.guideApply.languages,
        yearsExperience: form.elements.yearsExperience?.value || state.guideApply.yearsExperience,
        bio: form.elements.bio?.value || state.guideApply.bio,
        associationName: form.elements.associationName?.value || state.guideApply.associationName,
        associationId: form.elements.associationId?.value || state.guideApply.associationId,
        experienceIds: [],
      });
      rerender();
      return;
    }
    if (event.target.name && event.target.name.startsWith('method_') && event.target.closest('#guide-trip-builder-form')) {
      persistTripBuilder(event.target.closest('form'));
      const mode = event.target.name.slice(7);
      const turnOn = event.target.checked;
      Object.keys(state.tripBuilder.methods).forEach((key) => {
        state.tripBuilder.methods[key].enabled = turnOn && key === mode;
      });
      rerender();
      return;
    }
    if (event.target.name === 'profilePhotoFile' && event.target.closest('#guide-apply-step-2') && event.target.files?.length) {
      const reader = new FileReader();
      reader.onload = function () {
        validateProfilePhoto(reader.result, function (result) {
          if (result) {
            state.guideApply.profilePhotoData = result.dataUrl;
            state.guideApply.profilePhotoFileId = 'photo_' + Date.now();
          }
          rerender();
        });
      };
      reader.readAsDataURL(event.target.files[0]);
      return;
    }
    if (['chat-photo-input', 'chat-camera-input'].includes(event.target.id) && event.target.files?.length) {
      sendChatPhotoFiles(route().path.split('/')[3], event.target.files);
    }
    if (event.target.id === 'social-experience-select') socialDraft.experienceId = event.target.value || null;
    if (event.target.id === 'guide-account-select' && switchGuide(event.target.value)) {
      const guideUser = socialState().users.find((user) => user.guideId === event.target.value || user.id === event.target.value);
      if (guideUser) switchSocialUser(guideUser.id);
      rerender();
    }
    if (event.target.name === 'payment') {
      update({ paymentMethod: event.target.value });
      rerender();
    }
    if (event.target.dataset.filter) {
      state.filter = event.target.dataset.filter;
      rerender();
    }
  };

  const handleSubmit = (event) => {
    if (event.submitter?.matches('button.primary-button,button.outline-button')) setButtonLoading(event.submitter);
    if (event.target.id === 'demo-auth-form') {
      event.preventDefault();
      const form = event.target;
      const values = { name: form.elements.name?.value || '', email: form.elements.email?.value || '', password: form.elements.password?.value || '' };
      if (form.dataset.mode === 'register' && values.password !== form.elements.passwordConfirmation?.value) {
        state.authError = 'The passwords do not match.';
        rerender();
        return;
      }
      const authenticate = form.dataset.mode === 'register' ? registerTraveler(values) : loginTraveler(values);
      authenticate
        .then((result) => {
          if (result.error) {
            state.authError = result.error;
            rerender();
            return;
          }
          switchSocialUser(result.user.id);
          state.authMode = 'login';
          state.authError = '';
          update({ accountUserId: result.user.id, guestName: result.user.displayName, email: result.user.accountEmail });
          navigate('/');
        })
        .catch(() => {
          state.authError = 'Could not complete demo sign-in. Please try again.';
          rerender();
        });
      return;
    }
    if (event.target.id === 'shared-meeting-point-form') {
      event.preventDefault();
      const form = event.target;
      const point = form.elements.meetingPoint.value;
      if (setSharedDepartureMeetingPoint(form.dataset.offerId, activeBookingActor(), point)) {
        sharedTripSystemUpdate(form.dataset.offerId, `The guide set the official shared meeting point: ${point.trim()}. Each paid traveler party, please review it and acknowledge it here.`);
        announce('Official group meeting point updated; traveler acknowledgements were reset if it changed');
        rerender();
      } else announce('Only the assigned guide team can set the point before the trip starts, and at least one paid traveler party is required');
      return;
    }
    if (event.target.id === 'booking-meeting-point-form') {
      event.preventDefault();
      const form = event.target;
      const point = form.elements.meetingPoint.value;
      if (setBookingMeetingPoint(form.dataset.bookingId, activeBookingActor(), point)) {
        bookingChatSystemUpdate(form.dataset.bookingId, 'The guide set the official public meeting point for this booking. Traveler requests must be approved before they change it.');
        announce('Official meeting point saved');
        rerender();
      } else announce('Only the assigned guide can set a public meeting point before the trip starts');
      return;
    }
    if (event.target.id === 'shared-departure-decision-form') {
      event.preventDefault();
      const form = event.target;
      const sent = proposeSharedDepartureDecision(form.dataset.offerId, activeBookingActor(), {
        kind: form.elements.kind.value,
        date: form.elements.date?.value || '',
        targetOfferId: form.elements.targetOfferId?.value || '',
        message: form.elements.message.value,
      });
      if (sent) {
        sharedTripSystemUpdate(form.dataset.offerId, 'The guide proposed a plan for the shared departure. Each paid traveler party can review and respond here.');
        announce('Proposal sent to the group');
        rerender();
      } else announce('This proposal cannot be sent. Check the 24-hour window, group payments, selected option, and safety status.');
      return;
    }
    if (event.target.id === 'guide-apply-step-0') {
      event.preventDefault();
      const form = event.target;
      const ktpInput = form.querySelector('input[name="ktpFile"]');
      const ktpFileId = (ktpInput?.files?.length ? 'ktp_' + Date.now() : state.guideApply.ktpFileId) || '';
      const selfieFileId = state.guideApply.selfieFileId || '';
      if (ktpInput?.files?.length) state.guideApply.ktpPhotoData = '';
      Object.assign(state.guideApply, { step: 1, fullName: form.elements.fullName.value, nik: form.elements.nik.value, phone: form.elements.phone.value, address: form.elements.address.value, ktpFileId, selfieFileId });
      rerender();
      window.scrollTo(0, 0);
      return;
    }
    if (event.target.id === 'guide-apply-step-1') {
      event.preventDefault();
      const form = event.target;
      const skckInput = form.querySelector('input[name="skckFile"]');
      const ktppInput = form.querySelector('input[name="ktppFile"]');
      const bnspInput = form.querySelector('input[name="bnspFile"]');
      const skckFileId = (skckInput?.files?.length ? 'skck_' + Date.now() : state.guideApply.skckFileId) || '';
      const ktppFileId = (ktppInput?.files?.length ? 'ktpp_' + Date.now() : state.guideApply.ktppFileId) || '';
      const bnspFileId = (bnspInput?.files?.length ? 'bnsp_' + Date.now() : state.guideApply.bnspFileId) || '';
      Object.assign(state.guideApply, { step: 2, skckFileId, ktppFileId, bnspFileId });
      rerender();
      window.scrollTo(0, 0);
      return;
    }
    if (event.target.id === 'guide-trip-builder-form') {
      event.preventDefault();
      submitTripBuilder(event.target);
      return;
    }
    if (event.target.id === 'guide-apply-step-2') {
      event.preventDefault();
      const form = event.target;
      Object.assign(state.guideApply, {
        step: 3,
        area: form.elements.area.value,
        languages: [...form.querySelectorAll('input[name="languages"]:checked')].map((cb) => cb.value).join(', '),
        yearsExperience: form.elements.yearsExperience.value,
        bio: form.elements.bio.value,
        capacity: 6,
        experienceIds: state.guideApply.experienceIds || [],
        associationName: form.elements.associationName.value,
        associationId: form.elements.associationId.value,
      });
      rerender();
      window.scrollTo(0, 0);
      return;
    }
    if (event.target.id === 'guide-profile-form' || event.target.id === 'guide-capacity-form') {
      event.preventDefault();
      const form = event.target;
      const guide = activeGuide();
      if (
        saveGuideProfile(guide.id, {
          name: form.elements.name?.value || guide.name,
          area: form.elements.area?.value || guide.area,
          languages: form.elements.languages?.value ?? guide.languages,
          bio: form.elements.bio?.value ?? guide.bio,
          capacity: form.elements.capacity?.value || guide.capacity,
        })
      )
        announce('Guide profile saved');
      else announce('Check the profile fields');
      return;
    }
    if (event.target.id === 'guide-date-form') {
      event.preventDefault();
      announce(toggleGuideDate(activeGuide().id, event.target.elements.date.value) ? 'Availability updated' : 'This date cannot be changed');
      return;
    }
    if (event.target.id === 'guide-trip-offer-form') {
      event.preventDefault();
      const form = event.target;
      const [experienceId, packageId] = form.elements.package.value.split(':');
      const [hour, minute] = form.elements.time.value.split(':').map(Number);
      const time = `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
      const offer = createTripOffering(activeGuide().id, {
        experienceId,
        packageId,
        date: form.elements.date.value,
        time,
        mode: form.elements.mode.value,
        minGuests: form.elements.minGuests.value,
        maxGuests: form.elements.maxGuests.value,
        price: form.elements.price.value,
        meetingPoint: form.elements['meetingPoint']?.value,
        includes: form.elements['includes']?.value,
        itinerary: form.elements['itinerary']?.value,
        coGuideIds: [...form.querySelectorAll('input[name="coGuideIds"]:checked')].map((input) => input.value),
      });
      announce(offer ? 'Departure submitted for demo admin review' : 'Check the date, group size and guide team capacity');
      return;
    }
    if (event.target.classList.contains('guide-price-form')) {
      event.preventDefault();
      announce(proposeGuidePrice(activeGuide().id, event.target.dataset.packageId, event.target.elements.price.value) ? 'Price proposal sent for admin review' : 'Enter a new valid price');
      return;
    }
    if (event.target.classList.contains('guide-review-form')) {
      event.preventDefault();
      announce(reviewGuideRequest(event.target.dataset.requestId, state.email, event.target.elements.stars.value, event.target.elements.comment.value) ? 'Review submitted' : 'Review could not be saved');
      return;
    }
    if (event.target.id === 'booking-change-form') {
      event.preventDefault();
      const form = event.target;
      if (proposeBookingChange(form.dataset.bookingId, activeBookingActor(), form.elements.field.value, form.elements.value.value)) {
        bookingChatSystemUpdate(form.dataset.bookingId, 'A trip detail change was proposed. Open Safety Center to review it.');
        announce('Change sent for approval');
        rerender();
      } else announce('Check the new detail or resolve the pending change first');
      return;
    }
    if (event.target.id === 'booking-contact-form') {
      event.preventDefault();
      const form = event.target;
      if (saveBookingTrustedContact(form.dataset.bookingId, state.email, form.elements.name.value, form.elements.phone.value)) {
        announce('Trusted contact saved on this device');
        rerender();
      } else announce('Enter a valid name and phone number');
      return;
    }
    if (event.target.id === 'booking-report-form') {
      event.preventDefault();
      const form = event.target;
      if (reportBookingIssue(form.dataset.bookingId, activeBookingActor(), form.elements.category.value, form.elements.detail.value)) {
        bookingChatSystemUpdate(form.dataset.bookingId, 'A booking concern was reported. Completion and payout are paused for review.');
        announce('Report saved for review on this device');
        rerender();
      } else announce('Could not save this report');
      return;
    }
    if (event.target.id === 'chat-message-form') {
      event.preventDefault();
      const threadId = route().path.split('/')[3];
      const input = event.target.elements.message;
      const editing = state.chatEditMessageId;
      const signal = !editing && chatThread(threadId)?.context?.requestId ? analyzeBookingMessage(input?.value) : null;
      if (signal) {
        state.chatPendingUnsafe = { threadId, text: input.value, replyTo: state.chatReplyMessageId, advice: signal.advice };
        state.chatDraft = { threadId, text: input.value };
        openModal('chat-safety-warning');
        return;
      }
      const sent = editing ? editChatMessage(threadId, editing, input?.value) : sendChatMessage(threadId, input?.value, null, { replyTo: state.chatReplyMessageId });
      if (sent) {
        state.chatDraft = null;
        state.chatReplyMessageId = '';
        state.chatEditMessageId = '';
        rerender();
      }
      return;
    }
    if (event.target.id === 'social-compose-form') {
      event.preventDefault();
      const post = createSocialPost({
        caption: socialDraft.caption,
        location: socialDraft.location,
        imageKey: socialDraft.imageKey,
        localImage: socialDraft.localImage,
        media: socialDraft.media,
        experienceId: socialDraft.experienceId,
      });
      if (!post) {
        announce('Could not save this post on this device');
        return;
      }
      clearSocialDraft();
      navigate(`/social/post/${encodeURIComponent(post.id)}`);
      return;
    }
    if (event.target.id === 'social-comment-form') {
      event.preventDefault();
      const postId = route().path.split('/')[3];
      const input = event.target.elements.comment;
      if (addSocialComment(postId, input?.value, event.target.dataset.replyTo || null)) {
        state.socialReplyCommentId = '';
        rerender();
      }
      return;
    }
    if (event.target.id === 'social-edit-form') {
      event.preventDefault();
      const postId = route().path.split('/')[3];
      const { caption, location } = event.target.elements;
      if (editSocialPost(postId, { caption: caption.value, location: location.value })) {
        navigate(`/social/post/${encodeURIComponent(postId)}`);
      }
      return;
    }
    if (event.target.id === 'transport-step-0-form') {
      event.preventDefault();
      const form = event.target;
      const destinationLocationId = form.elements.destinationLocationId.value;
      const date = form.elements.date.value;
      const time = form.elements.time.value;
      const passengers = Number(form.elements.passengers.value) || 1;
      const luggageUnits = Number(form.elements.luggageUnits.value) || 0;
      const childSeats = Number(form.elements.childSeats.value) || 0;
      const needsRoofRack = form.elements.needsRoofRack.checked;
      const useFerry = form.elements.useFerry.checked;
      const pickupAt = witaToIso(date, time);
      const quote = quoteTransport({ destinationLocationId, pickupAt, passengers, luggageUnits, childSeats, needsRoofRack });
      if (!quote) {
        announce('Choose a valid destination to continue');
        return;
      }
      state.transport = {
        ...state.transport,
        destLocationId: destinationLocationId,
        date,
        time,
        pax: passengers,
        luggage: luggageUnits,
        childSeats,
        roofRack: needsRoofRack,
        useFerry,
        pickupAt,
        quote,
        vehicleClass: '',
        vehicleTotal: 0,
        vehiclePriceBreakdown: null,
        priceUpdated: false,
        ferry: null,
        step: 1,
      };
      rerender();
      return;
    }
    if (event.target.id === 'transport-step-2-form') {
      event.preventDefault();
      const form = event.target;
      const t = state.transport;
      const ferryRouteId = Number(form.elements.ferryRouteId.value);
      const ferryDepDate = form.elements.ferryDepDate.value;
      const ferryDepTime = form.elements.ferryDepTime.value;
      const meetingPointId = Number(form.elements.meetingPointId.value);
      const departureAt = ferryDepartureToIso(ferryRouteId, ferryDepDate, ferryDepTime);
      const estimate = ferryPickupEstimate(ferryRouteId, departureAt);
      if (!estimate) {
        announce('Choose a ferry route to continue');
        return;
      }
      const pickupAt = estimate.etaMaxAt;
      const requote = quoteTransport({ destinationLocationId: t.destLocationId, pickupAt, passengers: t.pax, luggageUnits: t.luggage, childSeats: t.childSeats, needsRoofRack: t.roofRack });
      const matched = requote?.options.find((entry) => entry.vehicleClass === t.vehicleClass);
      const priceUpdated = Boolean(matched && matched.total !== t.vehicleTotal);
      state.transport = {
        ...t,
        ferryRouteId,
        ferryDepDate,
        ferryDepTime,
        meetingPointId,
        pickupAt,
        ferry: { routeId: ferryRouteId, departureAt, etaMinAt: estimate.etaMinAt, etaMaxAt: estimate.etaMaxAt },
        quote: requote || t.quote,
        vehicleTotal: matched ? matched.total : t.vehicleTotal,
        vehiclePriceBreakdown: matched ? matched.priceBreakdown : t.vehiclePriceBreakdown,
        priceUpdated,
        step: 3,
      };
      rerender();
      return;
    }
    if (event.target.id === 'transport-step-3-form') {
      event.preventDefault();
      const form = event.target;
      const t = state.transport;
      const customerName = form.elements.customerName.value.trim();
      const customerPhone = form.elements.customerPhone.value.trim();
      const paymentMethod = form.elements.paymentMethod.value;
      const notes = form.elements.notes.value.trim();
      const result = createTransportOrder({
        destinationLocationId: t.destLocationId,
        pickupAt: t.pickupAt,
        vehicleClassCode: t.vehicleClass,
        passengers: t.pax,
        luggageUnits: t.luggage,
        childSeats: t.childSeats,
        needsRoofRack: t.roofRack,
        ferry: t.ferry,
        meetingPointId: t.meetingPointId,
        notes,
        paymentMethod,
        customerEmail: state.email,
        customerName,
        customerPhone,
      });
      if (result.error) {
        announce(result.error);
        return;
      }
      update({ guestName: customerName || state.guestName });
      state.transport = {
        step: 0,
        destLocationId: '',
        date: '',
        time: '05:30',
        pax: 2,
        luggage: 2,
        childSeats: 0,
        roofRack: false,
        vehicleClass: '',
        quote: null,
        useFerry: true,
        ferryRouteId: '',
        ferryDepDate: '',
        ferryDepTime: '23:00',
        pickupAt: null,
        ferry: null,
        meetingPointId: '',
        vehicleTotal: 0,
        vehiclePriceBreakdown: null,
        priceUpdated: false,
      };
      announce('Transfer booked');
      navigate(`/transport/orders/${encodeURIComponent(result.order.bookingId)}`);
      return;
    }
    if (event.target.matches?.('.transport-rate-form')) {
      event.preventDefault();
      const form = event.target;
      const code = form.dataset.orderCode;
      const score = Number(form.elements.score.value);
      const comment = form.elements.comment.value;
      const result = rateTransportOrder(code, score, comment);
      if (result.error) announce(result.error);
      else {
        announce('Thanks for rating your transfer');
        rerender();
      }
      return;
    }
  };

  const handlePointerDown = (event) => {
    if (!event.target.closest('.chat-message-menu')) closeChatMenus();
    const track = event.target.closest('[data-gallery-track]');
    if (track && event.pointerType === 'mouse') galleryDragRef.current = { track, pointerId: event.pointerId, x: event.clientX, left: track.scrollLeft, moved: false };
    const carousel = event.target.closest('[data-social-carousel]');
    if (carousel) socialCarouselDragRef.current = { track: carousel, pointerId: event.pointerId, x: event.clientX, left: carousel.scrollLeft, moved: false };
    const socialRow = event.target.closest('.social-stories,.social-topic-row,.social-people-row');
    if (socialRow) socialHorizontalDragRef.current = { track: socialRow, pointerId: event.pointerId, x: event.clientX, left: socialRow.scrollLeft, moved: false };

    const socialMedia = event.target.closest('[data-social-media]');
    if (socialMedia && event.pointerType !== 'mouse') {
      socialPinchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY, postId: socialMedia.dataset.socialMedia, index: socialMedia.dataset.mediaIndex || 0 });
      if (socialPinchPointersRef.current.size === 2) {
        const first = [...socialPinchPointersRef.current.values()][0];
        clearTimeout(socialMediaTapRef.current?.timer);
        socialMediaTapRef.current = null;
        openSocialGallery(first.postId, first.index);
      }
    }

    const chatZoomStage = event.target.closest('[data-chat-zoom-stage]');
    if (chatZoomStage) {
      const ztrack = chatZoomStage.closest('[data-chat-gallery-track]');
      chatPinchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (ztrack && chatPinchPointersRef.current.size === 1) chatGalleryDragRef.current = { track: ztrack, pointerId: event.pointerId, x: event.clientX, left: ztrack.scrollLeft, moved: false };
      chatZoomStage.setPointerCapture?.(event.pointerId);
      chatZoomStage.dataset.pointerId = event.pointerId;
      chatZoomStage._chatPointer = { x: event.clientX, y: event.clientY };
    }

    const chatMessageBubble = event.target.closest('.chat-message-bubble');
    if (chatMessageBubble && !event.target.closest('.chat-image-attachment,button,a,input,textarea,select,summary')) {
      const message = chatMessageBubble.closest('.chat-message');
      chatMessageSwipeRef.current = { pointerId: event.pointerId, messageId: chatMessageBubble.dataset.id, x: event.clientX, y: event.clientY, moved: false };
      if (!chatMessageSwipeRef.current.messageId) chatMessageSwipeRef.current.messageId = message?.querySelector('[data-action="open-chat-menu"]')?.dataset.id || '';
    }

    const zoomStage = event.target.closest('[data-social-zoom-stage]');
    if (zoomStage) {
      zoomStage.setPointerCapture?.(event.pointerId);
      zoomStage.dataset.pointerId = event.pointerId;
      zoomStage._socialPointer = { x: event.clientX, y: event.clientY };
    }
  };

  const handlePointerMove = (event) => {
    if (chatMessageSwipeRef.current?.pointerId === event.pointerId) {
      const distanceX = event.clientX - chatMessageSwipeRef.current.x;
      const distanceY = event.clientY - chatMessageSwipeRef.current.y;
      if (Math.abs(distanceX) > 10 && Math.abs(distanceX) > Math.abs(distanceY)) {
        chatMessageSwipeRef.current.moved = true;
        event.preventDefault();
      }
    }
    if (socialPinchPointersRef.current.has(event.pointerId)) {
      socialPinchPointersRef.current.set(event.pointerId, { ...socialPinchPointersRef.current.get(event.pointerId), x: event.clientX, y: event.clientY });
    }
    if (chatPinchPointersRef.current.has(event.pointerId)) {
      chatPinchPointersRef.current.set(event.pointerId, { ...chatPinchPointersRef.current.get(event.pointerId), x: event.clientX, y: event.clientY });
    }

    const chatZoomStage = event.target.closest('[data-chat-zoom-stage]');
    if (chatPinchPointersRef.current.size === 2) {
      const points = [...chatPinchPointersRef.current.values()];
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      if (!chatZoomRef.current.pinchStart) chatZoomRef.current.pinchStart = { distance, scale: chatZoomRef.current.scale };
      chatZoomRef.current.scale = Math.max(1, Math.min(4, chatZoomRef.current.pinchStart.scale * (distance / chatZoomRef.current.pinchStart.distance)));
      applyChatZoom();
      return;
    }
    if (chatZoomStage && chatZoomRef.current.scale > 1 && chatZoomStage._chatPointer) {
      chatZoomRef.current.x += event.clientX - chatZoomStage._chatPointer.x;
      chatZoomRef.current.y += event.clientY - chatZoomStage._chatPointer.y;
      chatZoomStage._chatPointer = { x: event.clientX, y: event.clientY };
      chatZoomRef.current.moved = true;
      applyChatZoom();
      return;
    }
    if (chatGalleryDragRef.current?.pointerId === event.pointerId && chatZoomRef.current.scale === 1) {
      const distance = event.clientX - chatGalleryDragRef.current.x;
      if (Math.abs(distance) > 6 && !chatGalleryDragRef.current.moved) {
        chatGalleryDragRef.current.moved = true;
        chatGalleryDragRef.current.track.style.scrollSnapType = 'none';
        chatZoomRef.current.lastTap = 0;
      }
      if (chatGalleryDragRef.current.moved) {
        event.preventDefault();
        chatGalleryDragRef.current.track.scrollLeft = chatGalleryDragRef.current.left - distance;
      }
    }

    const zoomStage = event.target.closest('[data-social-zoom-stage]');
    if (zoomStage && socialZoomRef.current.scale > 1 && zoomStage._socialPointer && socialPinchPointersRef.current.size < 2) {
      socialZoomRef.current.x += event.clientX - zoomStage._socialPointer.x;
      socialZoomRef.current.y += event.clientY - zoomStage._socialPointer.y;
      zoomStage._socialPointer = { x: event.clientX, y: event.clientY };
      socialZoomRef.current.moved = true;
      applySocialZoom();
      return;
    }
    if (socialPinchPointersRef.current.size === 2) {
      const points = [...socialPinchPointersRef.current.values()];
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      if (!socialZoomRef.current.pinchStart) socialZoomRef.current.pinchStart = { distance, scale: socialZoomRef.current.scale };
      socialZoomRef.current.scale = Math.max(1, Math.min(4, socialZoomRef.current.pinchStart.scale * (distance / socialZoomRef.current.pinchStart.distance)));
      applySocialZoom();
      return;
    }
    if (socialCarouselDragRef.current && socialCarouselDragRef.current.pointerId === event.pointerId) {
      const distance = event.clientX - socialCarouselDragRef.current.x;
      if (Math.abs(distance) > 6 && !socialCarouselDragRef.current.moved) {
        socialCarouselDragRef.current.moved = true;
        socialCarouselDragRef.current.track.style.scrollSnapType = 'none';
        socialCarouselDragRef.current.track.setPointerCapture?.(event.pointerId);
      }
      if (socialCarouselDragRef.current.moved) {
        event.preventDefault();
        socialCarouselDragRef.current.track.scrollLeft = socialCarouselDragRef.current.left - distance;
      }
    }
    if (socialHorizontalDragRef.current && socialHorizontalDragRef.current.pointerId === event.pointerId) {
      const distance = event.clientX - socialHorizontalDragRef.current.x;
      if (Math.abs(distance) > 6 && !socialHorizontalDragRef.current.moved) {
        socialHorizontalDragRef.current.moved = true;
        socialHorizontalDragRef.current.track.setPointerCapture?.(event.pointerId);
        socialHorizontalDragRef.current.track.classList.add('is-dragging');
      }
      if (socialHorizontalDragRef.current.moved) {
        event.preventDefault();
        socialHorizontalDragRef.current.track.scrollLeft = socialHorizontalDragRef.current.left - distance;
      }
    }
    if (!galleryDragRef.current || galleryDragRef.current.pointerId !== event.pointerId) return;
    const distance = event.clientX - galleryDragRef.current.x;
    if (Math.abs(distance) > 6 && !galleryDragRef.current.moved) {
      galleryDragRef.current.moved = true;
      galleryDragRef.current.track.style.scrollSnapType = 'none';
      galleryDragRef.current.track.setPointerCapture(event.pointerId);
    }
    if (galleryDragRef.current.moved) galleryDragRef.current.track.scrollLeft = galleryDragRef.current.left - distance;
  };

  const endGalleryDrag = (event) => {
    socialPinchPointersRef.current.delete(event.pointerId);
    if (!socialPinchPointersRef.current.size) socialZoomRef.current.pinchStart = null;
    chatPinchPointersRef.current.delete(event.pointerId);
    if (!chatPinchPointersRef.current.size) chatZoomRef.current.pinchStart = null;
    if (chatMessageSwipeRef.current?.pointerId === event.pointerId) {
      const distanceX = event.clientX - chatMessageSwipeRef.current.x;
      if (chatMessageSwipeRef.current.moved && Math.abs(distanceX) >= 60 && chatMessageSwipeRef.current.messageId) {
        state.chatReplyMessageId = chatMessageSwipeRef.current.messageId;
        state.chatEditMessageId = '';
        suppressChatMessageClickRef.current = true;
        setTimeout(() => {
          suppressChatMessageClickRef.current = false;
        }, 0);
        rerender();
      }
      chatMessageSwipeRef.current = null;
    }
    if (chatGalleryDragRef.current && chatPinchPointersRef.current.size === 0) {
      if (chatGalleryDragRef.current.moved) {
        chatGalleryDragRef.current.track.style.scrollSnapType = '';
        selectChatGalleryIndex(Math.round(chatGalleryDragRef.current.track.scrollLeft / chatGalleryDragRef.current.track.clientWidth));
      }
      chatGalleryDragRef.current = null;
    }
    if (socialCarouselDragRef.current?.pointerId === event.pointerId) {
      if (socialCarouselDragRef.current.moved) {
        socialCarouselDragRef.current.track.style.scrollSnapType = '';
        const index = Math.max(0, Math.min(socialCarouselDragRef.current.track.children.length - 1, Math.round(socialCarouselDragRef.current.track.scrollLeft / socialCarouselDragRef.current.track.clientWidth)));
        socialCarouselDragRef.current.track.scrollTo({ left: index * socialCarouselDragRef.current.track.clientWidth, behavior: 'smooth' });
        suppressSocialMediaClickRef.current = true;
        setTimeout(() => {
          suppressSocialMediaClickRef.current = false;
        }, 180);
      }
      socialCarouselDragRef.current = null;
    }
    if (socialHorizontalDragRef.current?.pointerId === event.pointerId) {
      if (socialHorizontalDragRef.current.moved) {
        socialHorizontalDragRef.current.track.classList.remove('is-dragging');
        suppressSocialHorizontalClickRef.current = true;
        setTimeout(() => {
          suppressSocialHorizontalClickRef.current = false;
        }, 180);
      }
      socialHorizontalDragRef.current = null;
    }
    if (!galleryDragRef.current || galleryDragRef.current.pointerId !== event.pointerId) return;
    if (galleryDragRef.current.moved) {
      galleryDragRef.current.track.style.scrollSnapType = '';
      selectGalleryIndex(Math.round(galleryDragRef.current.track.scrollLeft / galleryDragRef.current.track.clientWidth));
      suppressGalleryClickRef.current = true;
      setTimeout(() => {
        suppressGalleryClickRef.current = false;
      }, 0);
    }
    galleryDragRef.current = null;
  };

  const handleScrollCapture = (event) => {
    const track = event.target;
    if (track.matches?.('.chat-messages')) closeChatMenus();
    if (track.matches?.('[data-chat-gallery-track]') && track.clientWidth) {
      const index = Math.max(0, Math.min(chatGalleryPhotos(state.chatGalleryThreadId).length - 1, Math.round(track.scrollLeft / track.clientWidth)));
      if (index !== state.chatGalleryIndex) {
        state.chatGalleryIndex = index;
        resetChatZoom();
        applyChatZoom();
      }
      const counter = rootRef.current?.querySelector('[data-chat-gallery-counter]');
      if (counter) counter.textContent = `${index + 1} / ${chatGalleryPhotos(state.chatGalleryThreadId).length}`;
      rootRef.current?.querySelectorAll('[data-action="chat-gallery-prev"], [data-action="chat-gallery-next"]').forEach((button) => {
        button.disabled = button.dataset.action === 'chat-gallery-prev' ? index === 0 : index === chatGalleryPhotos(state.chatGalleryThreadId).length - 1;
      });
      return;
    }
    if (track.matches?.('[data-social-carousel]') && track.clientWidth) {
      const index = Math.max(0, Math.round(track.scrollLeft / track.clientWidth));
      track.parentElement?.querySelectorAll('.social-post-dots span').forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === index));
      return;
    }
    if (!track.matches?.('[data-gallery-track]') || !track.clientWidth) return;
    const index = Math.max(0, Math.min(galleryLength() - 1, Math.round(track.scrollLeft / track.clientWidth)));
    updateGalleryIndicators(index);
  };

  const viewMarkup = currentView();
  const modalMarkup = modalView();

  return (
    <div
      ref={rootRef}
      className="findmyguide-react-root"
      onClick={handleClick}
      onInput={handleInput}
      onChange={handleChange}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endGalleryDrag}
      onPointerCancel={endGalleryDrag}
      onScrollCapture={handleScrollCapture}
    >
      <div dangerouslySetInnerHTML={{ __html: viewMarkup + modalMarkup }} />
      {state.toast && (
        <div className="toast" role="status">
          {state.toast}
        </div>
      )}
    </div>
  );
}
