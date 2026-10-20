import { state } from '../app/store.js';
import { route } from '../app/router.js';
import { icon } from './icons.js';
import { escapeHtml } from '../utils/html.js';
import { activityFilters, getExperience, getExperienceGallery } from '../features/experiences/data.js';
import { getDemoReviews } from '../features/experiences/demo-engagement.js';
import { activeSocialUser, socialPost, socialState, socialUser } from '../features/social/repository.js';
import { socialImage, socialImagesForPost } from '../features/social/media.js';
import { chatMessages, chatThread } from '../features/messaging/repository.js';
import { getInstallState, isInstalledApp } from '../features/onboarding/install.js';
import { tripOfferingCalendar } from '../features/guides/repository.js';

function monthGrid(year, month, tripCalendar = null) {
  const first = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cells = Array(first).fill('<span></span>');
  for (let day = 1; day <= count; day++) {
    const date = new Date(year, month, day);
    const value = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const tripStatus = tripCalendar ? (tripCalendar[value] || { status: 'none', label: 'No open trip' }) : null;
    const dateLabel = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
    const statusClass = tripStatus ? ` calendar-status-${tripStatus.status}` : '';
    const statusLabel = tripStatus ? `: ${tripStatus.label}` : '';
    const statusDot = tripStatus ? '<i aria-hidden="true"></i>' : '';
    const statusTitle = tripStatus ? ` title="${escapeHtml(tripStatus.label)}"` : '';
    cells.push(`<button class="calendar-date${statusClass} ${state.date === value ? 'selected' : ''}" data-action="select-date" data-value="${value}" aria-label="${escapeHtml(`${dateLabel}${statusLabel}`)}"${statusTitle} ${date < today ? 'disabled' : ''}><span>${day}</span>${statusDot}</button>`);
  }
  return `<div class="calendar-month"><h3>${new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(year, month, 1))}</h3><div class="calendar-grid">${cells.join('')}</div></div>`;
}
function chatGalleryPhotos(threadId) {
  return chatMessages(threadId).filter((message) => message.attachment?.type === 'image' && message.attachment.localImage).map((message) => ({ id: message.id, source: message.attachment.localImage }));
}

export function modalView() {
  if (!state.modal) return '';
  let title = '';
  let body = '';
  if (state.modal === 'dates') {
    title = 'Date';
    const now = new Date();
    const experienceId = route().path.match(/^\/experience\/([^/]+)/)?.[1] || '';
    const showTripStatus = Boolean(getExperience(experienceId)?.packageOptions?.length);
    const tripCalendar = showTripStatus ? tripOfferingCalendar(experienceId) : null;
    const legend = showTripStatus ? `<div class="calendar-status-legend" aria-label="Trip availability legend"><span><i class="calendar-status-available"></i>Available</span><span><i class="calendar-status-almost-full"></i>Nearly full</span><span><i class="calendar-status-in-progress"></i>In progress</span><span><i class="calendar-status-completed"></i>Completed</span><span><i class="calendar-status-none"></i>No open trip</span></div>` : '';
    body = `<div class="calendar-content"><button class="chip" data-action="tomorrow">Tomorrow</button>${legend}<div class="weekdays">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => `<span>${d}</span>`).join('')}</div>${monthGrid(now.getFullYear(), now.getMonth(), tripCalendar)}${monthGrid(now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear(), (now.getMonth() + 1) % 12, tripCalendar)}<div class="date-help">${icon('calendar')}<span><strong>Dates not available?</strong><small>View this activity from other providers</small></span></div></div>`;
  } else if (state.modal === 'participants') {
    title = 'Participants';
    body = `<div class="participant-row"><span><strong>Adults</strong><small>Age 18+</small></span><div><button data-action="count" data-value="adults:-1">−</button><b>${state.adults}</b><button data-action="count" data-value="adults:1">+</button></div></div><div class="participant-row"><span><strong>Children</strong><small>Age 0–17</small></span><div><button data-action="count" data-value="children:-1">−</button><b>${state.children}</b><button data-action="count" data-value="children:1">+</button></div></div><button class="primary-button full" data-action="close-modal">Done</button>`;
  } else if (state.modal === 'filters') {
    title = 'Filters';
    body = `<h3>Activity types</h3>${activityFilters.map((value) => `<label class="filter-choice"><input type="radio" name="activity-filter" value="${value}" ${state.filter === value ? 'checked' : ''} data-filter="${value}" aria-label="${value}" /> <span>${value}</span></label>`).join('')}<button class="primary-button full" data-action="close-modal">Show results</button>`;
  } else if (state.modal === 'save') {
    title = 'Select a list';
    body = `<button class="select-list" data-action="save-to-list">${icon('image')}<span><strong>${escapeHtml(state.listName)}</strong><small>${state.wishlist.length} activities</small></span></button><button class="primary-button" data-action="new-list">Create a new list</button>`;
  } else if (state.modal === 'new-list') {
    title = 'Create a new list';
    body = `<label class="form-label">List name<input id="list-name" placeholder="My trip" maxlength="36" autofocus /></label><button class="primary-button full" data-action="create-list">Create list</button>`;
  } else if (state.modal === 'reviews') {
    title = 'Customer reviews';
    body = getDemoReviews(getExperience(state.reviewExperienceId)).more.map((review) => `<div class="review-card"><div class="review-stars">★★★★★</div><strong>${escapeHtml(review.author)} - ${escapeHtml(review.country)}</strong><small>Verified booking</small><p>${escapeHtml(review.text)}</p></div>`).join('');
  } else if (state.modal === 'gallery') {
    title = 'Photos';
    const experience = getExperience(state.galleryExperienceId);
    const photos = getExperienceGallery(experience);
    const current = Math.min(state.galleryIndex, photos.length - 1);
    body = `<div class="modal-gallery"><div class="modal-gallery-track" data-gallery-track aria-label="${escapeHtml(experience.title)} photos" tabindex="0">${photos.map((source, index) => `<img src="${escapeHtml(source)}" alt="${escapeHtml(experience.title)} — photo ${index + 1} of ${photos.length}" ${index !== current ? 'loading="lazy"' : ''} draggable="false" />`).join('')}</div><div class="modal-gallery-controls"><button data-action="gallery-prev" aria-label="Previous photo" ${current === 0 ? 'disabled' : ''}>‹</button><span data-gallery-counter>${current + 1} / ${photos.length}</span><button data-action="gallery-next" aria-label="Next photo" ${current === photos.length - 1 ? 'disabled' : ''}>›</button></div></div>`;
  } else if (state.modal === 'share') {
    const target = state.shareTarget;
    const people = socialState().users.filter((user) => user.id !== activeSocialUser().id);
    title = target?.kind === 'destination' || target?.kind === 'attraction' ? 'Share this place' : 'Share this experience';
    body = `${target?.title ? `<div class="social-share-preview"><img src="${escapeHtml(target.image || '')}" alt="" /><span><strong>${escapeHtml(target.title)}</strong><small>${escapeHtml(target.subtitle || '')}</small></span></div>` : '<p>Copy the link to share this activity.</p>'}<button class="outline-button full" data-action="share-external">Share outside app</button>${people.length ? `<p class="social-share-intro">Send to chat</p><div class="social-share-people">${people.map((user) => `<button data-action="share-to-chat" data-value="${escapeHtml(user.id)}"><span class="social-share-avatar" style="--avatar-color:${escapeHtml(user.color || '#566d65')}">${escapeHtml(user.initials || '?')}</span><span><strong>${escapeHtml(user.displayName)}</strong><small>@${escapeHtml(user.username)}</small></span>${icon('chevron', 17)}</button>`).join('')}</div>` : ''}`;
  } else if (state.modal === 'social-share') {
    const post = socialPost(state.socialSharePostId);
    const people = socialState().users.filter((user) => user.id !== activeSocialUser().id);
    title = 'Send to chat';
    body = `<p class="social-share-intro">Share this Vibes post with someone.</p>${post ? `<div class="social-share-preview"><img src="${escapeHtml(socialImage(post))}" alt="" /><span><strong>${escapeHtml(post.location || 'Travel moment')}</strong><small>${escapeHtml(post.caption || 'Travel moment')}</small></span></div>` : ''}<button class="outline-button full" data-action="social-share-external">Share outside app</button><p class="social-share-intro">Send to chat</p><div class="social-share-people">${people.map((user) => `<button data-action="social-share-to-chat" data-value="${escapeHtml(user.id)}"><span class="social-share-avatar" style="--avatar-color:${escapeHtml(user.color || '#566d65')}">${escapeHtml(user.initials || '?')}</span><span><strong>${escapeHtml(user.displayName)}</strong><small>@${escapeHtml(user.username)}</small></span>${icon('chevron', 17)}</button>`).join('')}</div>`;
  } else if (state.modal === 'social-likes') {
    const post = socialPost(state.socialLikesPostId);
    const people = post ? post.likedBy.map((userId) => socialUser(userId)).filter(Boolean) : [];
    title = 'Liked by';
    body = `<div class="social-share-people social-liked-people">${people.map((user) => `<button data-action="social-like-profile" data-id="${escapeHtml(user.id)}"><span class="social-share-avatar" style="--avatar-color:${escapeHtml(user.color || '#566d65')}">${escapeHtml(user.initials || '?')}</span><span><strong>${escapeHtml(user.displayName)}</strong><small>@${escapeHtml(user.username)}</small></span>${icon('chevron', 17)}</button>`).join('')}</div>`;
  } else if (state.modal === 'social-gallery') {
    const post = socialPost(state.socialGalleryPostId);
    const photos = post ? socialImagesForPost(post) : [];
    const current = Math.max(0, Math.min(Math.max(photos.length - 1, 0), state.socialGalleryIndex));
    title = 'Travel photos';
    body = post && photos.length ? `<div class="social-lightbox"><div class="social-lightbox-stage" data-social-zoom-stage aria-label="Travel photo ${current + 1} of ${photos.length}"><img data-social-zoom-image src="${escapeHtml(photos[current])}" alt="Travel photo ${current + 1} of ${photos.length}" draggable="false" /></div><div class="social-lightbox-controls"><button data-action="social-gallery-prev" aria-label="Previous photo" ${current === 0 ? 'disabled' : ''}>‹</button><span>${current + 1} / ${photos.length}</span><button data-action="social-gallery-next" aria-label="Next photo" ${current === photos.length - 1 ? 'disabled' : ''}>›</button></div><small class="social-lightbox-hint">Pinch or double tap to zoom · drag to explore</small></div>` : '<p>Photo unavailable.</p>';
  } else if (state.modal === 'chat-gallery') {
    const photos = chatGalleryPhotos(state.chatGalleryThreadId);
    const current = Math.max(0, Math.min(Math.max(photos.length - 1, 0), state.chatGalleryIndex));
    title = 'Chat photos';
    body = photos.length ? `<div class="chat-lightbox"><div class="chat-lightbox-track" data-chat-gallery-track aria-label="Chat photos">${photos.map((photo, index) => `<div class="chat-lightbox-slide" data-chat-gallery-slide="${index}"><div class="chat-lightbox-stage" data-chat-zoom-stage data-chat-gallery-index="${index}" aria-label="Chat photo ${index + 1} of ${photos.length}"><img data-chat-zoom-image src="${escapeHtml(photo.source)}" alt="Chat photo ${index + 1} of ${photos.length}" draggable="false" /></div></div>`).join('')}</div><div class="chat-lightbox-controls"><button data-action="chat-gallery-prev" aria-label="Previous photo" ${current === 0 ? 'disabled' : ''}>‹</button><span data-chat-gallery-counter>${current + 1} / ${photos.length}</span><button data-action="chat-gallery-next" aria-label="Next photo" ${current === photos.length - 1 ? 'disabled' : ''}>›</button></div><small class="chat-lightbox-hint">Swipe between photos · pinch or double tap to zoom</small></div>` : '<p>Photo unavailable.</p>';
  } else if (state.modal === 'install-info') {
    const { canPrompt, platform, status } = getInstallState();
    const installed = isInstalledApp() || status === 'installed' || status === 'accepted';
    const guidance = platform === 'ios'
      ? '<li>Buka halaman ini di <strong>Safari</strong>.</li><li>Ketuk <strong>Bagikan</strong>, lalu pilih <strong>Tambahkan ke Layar Utama</strong>.</li><li>Ketuk <strong>Tambah</strong> untuk menyelesaikan.</li>'
      : '<li>Buka menu browser <strong>⋮</strong>.</li><li>Pilih <strong>Install app</strong> atau <strong>Tambahkan ke layar utama</strong>.</li><li>Buka aplikasi melalui ikon yang baru terpasang.</li>';
    title = 'Install app';
    body = installed
      ? '<div class="install-info-copy"><p>Aplikasi sudah siap digunakan dari layar utama.</p><button class="primary-button full" data-action="close-modal">Done</button></div>'
      : `<div class="install-info-copy"><p>Install aplikasi agar akses ke perjalanan Anda lebih cepat dari layar utama. Anda tetap bisa menggunakan aplikasi tanpa install.</p><div class="install-steps"><strong>Cara memasang di ${platform === 'ios' ? 'iPhone atau iPad' : 'Android'}</strong><ol>${guidance}</ol></div><div class="chat-shared-confirm-actions">${canPrompt ? '<button class="primary-button" data-action="install-app">Install now</button>' : ''}<button class="outline-button" data-action="dismiss-install-info">Not now</button></div></div>`;
  } else if (state.modal === 'shared-chat-confirm') {
    const target = state.chatSharedTarget;
    title = 'Buka konten bersama?';
    body = `${target?.title ? `<div class="chat-shared-confirm-preview">${target.image ? `<img src="${escapeHtml(target.image)}" alt="" />` : ''}<span><strong>${escapeHtml(target.kind || 'Shared content')}</strong><small>${escapeHtml(target.title)}</small></span></div>` : ''}<p class="chat-shared-confirm-copy">Apakah Anda ingin melanjutkan membuka konten ini?</p><div class="chat-shared-confirm-actions"><button class="outline-button" data-action="close-modal">Batal</button><button class="primary-button" data-action="open-shared-chat-content">Lanjut buka</button></div>`;
  } else if (state.modal === 'confirm-action') {
    title = 'Konfirmasi';
    body = `<p class="chat-shared-confirm-copy">${escapeHtml(state.confirmAction?.message || 'Apakah Anda ingin melanjutkan?')}</p><div class="chat-shared-confirm-actions"><button class="outline-button" data-action="close-modal">Batal</button><button class="primary-button" data-action="confirm-action">Lanjutkan</button></div>`;
  } else if (state.modal === 'chat-safety-warning') {
    title = 'Smart safety warning';
    body = `<p>${escapeHtml(state.chatPendingUnsafe?.advice || 'Please check this message before sending.')}</p><p class="guide-caption">This is a demo rule-based alert. It can miss risks or flag harmless messages.</p><div class="chat-shared-confirm-actions"><button class="outline-button" data-action="close-modal">Edit message</button><button class="primary-button" data-action="send-flagged-chat">Send anyway</button></div>`;
  } else if (state.modal === 'travel-group-members') {
    const thread = chatThread(state.travelerGroupThreadId);
    const people = thread ? thread.participantIds.map((userId) => socialUser(userId)).filter(Boolean) : [];
    title = 'Traveler group';
    body = `<p class="social-share-intro">Travelers in this group can compare dates and plan together.</p><div class="social-share-people">${people.map((user) => `<button data-action="social-like-profile" data-id="${escapeHtml(user.id)}"><span class="social-share-avatar" style="--avatar-color:${escapeHtml(user.color || '#566d65')}">${escapeHtml(user.initials || '?')}</span><span><strong>${escapeHtml(user.displayName)}</strong><small>@${escapeHtml(user.username)}</small></span>${icon('chevron', 17)}</button>`).join('')}</div>`;
  } else if (state.modal === 'forward-chat') {
    const people = socialState().users.filter((user) => user.id !== activeSocialUser().id);
    title = 'Forward message';
    body = `<p class="social-share-intro">Choose a chat to forward this message to.</p><div class="social-share-people">${people.map((user) => `<button data-action="forward-chat-message" data-id="${escapeHtml(user.id)}"><span class="social-share-avatar" style="--avatar-color:${escapeHtml(user.color || '#566d65')}">${escapeHtml(user.initials || '?')}</span><span><strong>${escapeHtml(user.displayName)}</strong><small>@${escapeHtml(user.username)}</small></span>${icon('chevron', 17)}</button>`).join('')}</div>`;
  } else if (state.modal === 'chat-collection') {
    const messages = chatMessages(state.chatCollectionThreadId).filter((message) => state.chatCollectionKind === 'pinned' ? message.pinned : message.favoriteBy?.includes(activeSocialUser().id));
    title = state.chatCollectionKind === 'pinned' ? 'Pinned messages' : 'Favorite messages';
    body = messages.length ? `<div class="chat-collection-list">${messages.map((message) => `<button data-action="info-chat" data-id="${escapeHtml(message.id)}"><span>${escapeHtml(message.text || 'Attachment')}</span><small>${new Date(message.createdAt).toLocaleString()}</small>${icon('chevron', 17)}</button>`).join('')}</div>` : `<div class="empty-state"><h2>No ${state.chatCollectionKind === 'pinned' ? 'pinned' : 'favorite'} messages</h2><p>Messages you save here will appear in this chat collection.</p></div>`;
  } else if (state.modal === 'promo') {
    title = 'Promo or gift code';
    body = `<label class="form-label">Enter code<input id="promo-code" placeholder="Promo code" /></label><button class="primary-button full" data-action="apply-promo">Apply</button>`;
  } else if (state.modal === 'card') {
    title = 'Card details';
    body = `<p>Payment processing will be connected in the backend phase.</p><button class="primary-button full" data-action="close-modal">Close</button>`;
  } else {
    title = state.modalTitle || 'Information';
    body = `<p>${escapeHtml(state.modalMessage || '')}</p><button class="primary-button full" data-action="close-modal">OK</button>`;
  }
  return `<div class="modal-backdrop ${state.modal === 'chat-gallery' ? 'chat-gallery-backdrop' : ''}" data-action="close-modal"><section class="bottom-sheet ${['social-gallery', 'chat-gallery'].includes(state.modal) ? `${state.modal}-modal` : ''}" role="dialog" aria-modal="true" aria-label="${title}"><header><button class="icon-button" data-action="close-modal">${icon('close')}</button><h2>${title}</h2><span></span></header><div class="sheet-content">${body}</div></section></div>`;
}
