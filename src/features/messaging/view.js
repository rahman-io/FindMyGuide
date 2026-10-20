import { state } from '../../app/store.js';
import { mainLayout } from '../../layouts/MainLayout.js';
import { icon } from '../../components/icons.js';
import { attractions, destinations, getExperience } from '../experiences/data.js';
import { demoMessages } from '../experiences/demo-engagement.js';
import { escapeHtml } from '../../utils/html.js';
import { activeSocialUser, socialActivity, socialPost, socialUser } from '../social/repository.js';
import { socialImage } from '../social/media.js';
import { chatMessages, chatParticipant, chatParticipants, chatThread, isChatUserOnline, markChatThreadRead, visibleChatThreads } from './repository.js';
import { getContextAwareNotifications } from '../travel-intelligence/repository.js';
import { experiences } from '../experiences/data.js';
import { formatListedPrice } from '../experiences/booking-demo.js';
import { approvedExperienceLabel, guideDemoData, sharedDepartureAlternatives, sharedDepartureStatus } from '../guides/repository.js';
import { bookingAssistantAdvice } from '../guides/safety.js';
import { visibleSocialPosts } from '../social/repository.js';

const esc = escapeHtml;
function avatar(user, size = '') { return `<span class="chat-avatar ${size}" style="--avatar-color:${esc(user?.color || '#566d65')}" aria-hidden="true">${esc(user?.initials || '?')}</span>`; }
function timeLabel(value) { return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
function lastMessage(thread) { return chatMessages(thread.id).at(-1); }
function visibleOnline(userId) { return isChatUserOnline(userId) && (userId !== activeSocialUser().id || state.privacy.onlineStatus); }
function sharedAttachment(attachment, messageId = '') {
  if (attachment?.type === 'image' && attachment.localImage) return `<button type="button" class="chat-image-attachment" data-action="chat-open-gallery" data-id="${esc(messageId)}" aria-label="Open chat photo"><img src="${esc(attachment.localImage)}" alt="Photo sent in chat" loading="lazy" draggable="false" /></button>`;
  if (attachment?.type === 'audio' && attachment.localAudio) return `<audio class="chat-audio-attachment" src="${esc(attachment.localAudio)}" controls preload="metadata"></audio>`;
  if (attachment?.type === 'sticker') return `<span class="chat-sticker-attachment">${esc(attachment.value || '✨')}</span>`;
  const post = attachment?.type === 'social-post' ? socialPost(attachment.postId) : null;
  if (post) return `<a class="chat-shared-post" href="#/social/post/${encodeURIComponent(post.id)}"><img src="${esc(socialImage(post))}" alt="" /><span><strong>Vibes post</strong><small>${esc(post.location || 'Travel moment')}</small></span>${icon('chevron', 17)}</a>`;
  if (attachment?.type === 'experience') {
    const experience = getExperience(attachment.id);
    return `<a class="chat-shared-post" href="#/experience/${encodeURIComponent(experience.id)}"><img src="${esc(experience.cardImage || experience.image)}" alt="" /><span><strong>Discover experience</strong><small>${esc(experience.title)}</small></span>${icon('chevron', 17)}</a>`;
  }
  const places = attachment?.type === 'destination' ? destinations : attachment?.type === 'attraction' ? attractions : [];
  const place = places.find((item) => item.name === attachment?.id);
  if (!place) return '';
  return `<a class="chat-shared-post" href="#/results?city=${encodeURIComponent(place.city || place.name)}"><img src="${esc(place.image)}" alt="" /><span><strong>${attachment.type === 'destination' ? 'Destination' : 'Place to visit'}</strong><small>${esc(place.name)}</small></span>${icon('chevron', 17)}</a>`;
}
function messageStatus(message, thread, selfId) {
  if (message.senderId !== selfId) return '';
  if (!state.privacy.readReceipts) return '<span class="chat-message-status">✓</span>';
  const recipients = thread.participantIds.filter((id) => id !== selfId);
  const read = recipients.length > 0 && recipients.every((id) => message.readBy.includes(id));
  const delivered = recipients.length > 0 && recipients.every((id) => (message.deliveredTo || recipients).includes(id));
  return `<span class="chat-message-status ${read ? 'read' : ''}">${read ? '✓✓' : delivered ? '✓✓' : '✓'}</span>`;
}
function messageReactions(message) {
  return Object.entries(message.reactions || {}).filter(([, users]) => users.length).map(([emoji, users]) => `<span>${emoji} ${users.length}</span>`).join('');
}
function messageActions(message, selfId) {
  const own = message.senderId === selfId;
  return `<details class="chat-message-menu ${own ? 'mine' : ''}"><summary aria-label="Message actions">${icon('more', 17)}</summary><div><button data-action="reply-chat" data-id="${esc(message.id)}">Reply</button>${message.text && !message.deletedAt ? `<button data-action="copy-chat" data-id="${esc(message.id)}">Copy</button>` : ''}${own && !message.deletedAt ? `<button data-action="edit-chat" data-id="${esc(message.id)}">Edit</button>` : ''}${own && !message.deletedAt ? `<button data-action="delete-chat" data-id="${esc(message.id)}">Delete</button>` : ''}<button data-action="react-chat" data-id="${esc(message.id)}" data-value="👍">👍 Like</button><button data-action="react-chat" data-id="${esc(message.id)}" data-value="❤️">❤️ Love</button><button data-action="forward-chat" data-id="${esc(message.id)}">Forward</button><button data-action="favorite-chat" data-id="${esc(message.id)}">${message.favoriteBy?.includes(selfId) ? 'Unfavorite' : 'Favorite'}</button><button data-action="pin-chat" data-id="${esc(message.id)}">${message.pinned ? 'Unpin' : 'Pin'}</button><button data-action="info-chat" data-id="${esc(message.id)}">Info</button></div></details>`;
}
function bookingChatContextView(thread, request, experience, option, total) {
  const safety = request.safety || {};
  const guideMode = activeSocialUser().role === 'guide' && (activeSocialUser().guideId || activeSocialUser().id) === request.guideId;
  const status = safety.reports?.some((report) => report.status === 'open') ? 'Needs review' : request.status === 'cancelled' ? 'Cancelled · demo refund' : request.status === 'completed' ? 'Trip completed' : request.bookingStatus === 'in_progress' ? 'Trip in progress' : request.verificationStatus === 'verified' ? 'Identity verified' : request.paymentStatus === 'paid' ? 'Payment confirmed' : 'Payment required';
  const bookingLink = `#/bookings/${encodeURIComponent(request.id)}/safety`;
  return `<section class="chat-booking-context" aria-label="Booking context"><div class="chat-booking-status ${status === 'Needs review' ? 'pending' : request.status === 'completed' ? 'complete' : 'confirmed'}"><span>${esc(status)}</span><small>Keep coordination in this chat</small></div><div class="chat-booking-actions"><button type="button" data-action="booking-chat-action" data-id="${esc(thread.id)}" data-value="meeting">Meeting point</button><button type="button" data-action="booking-chat-action" data-id="${esc(thread.id)}" data-value="time">Start time</button><button type="button" data-action="booking-chat-action" data-id="${esc(thread.id)}" data-value="location">Share location</button><a href="${bookingLink}">Safety Center</a></div><div class="chat-booking-checklist"><span class="done">✓ Booking ID ready</span><span class="${request.paymentStatus === 'paid' ? 'done' : ''}">${request.paymentStatus === 'paid' ? '✓' : '○'} Payment confirmed</span><span class="${safety.meetingPoint ? 'done' : ''}">${safety.meetingPoint ? '✓' : '○'} Meeting point ${safety.meetingPoint ? 'agreed' : 'to confirm'}</span>${guideMode ? '' : `<a href="#/bookings/${encodeURIComponent(request.id)}">Show QR</a>`}</div></section>`;
}
function bookingChatInfoView(thread, request, experience, option, total, advice) {
  const bookingLink = `#/bookings/${encodeURIComponent(request.id)}/safety`;
  const title = experience?.title || thread.context.label || 'Travel booking';
  return `<details class="chat-booking-info" open><summary class="chat-booking-info-toggle"><span><small class="chat-booking-kicker">BOOKING · ${esc(request.bookingId || 'PENDING')}</small><strong>${esc(title)}</strong><span>${esc(request.date)} · ${esc(option?.duration || 'Duration to confirm')} · ${esc(total)}</span></span><span class="chat-booking-info-control"><span class="chat-booking-toggle-open">Hide info</span><span class="chat-booking-toggle-closed">Show info</span>${icon('chevron', 15)}</span></summary><div class="chat-booking-info-body"><div class="chat-booking-body-top"><a class="chat-booking-details" href="${bookingLink}">Details ${icon('chevron', 15)}</a></div>${bookingChatContextView(thread, request, experience, option, total)}<div class="chat-booking-assistant"><span>✦ Trip assistant · ${esc(advice)}</span><a href="${bookingLink}">Safety Center</a></div>${thread.context?.offerId ? sharedDeparturePanel(thread) : ''}</div></details>`;
}
function sharedDeparturePanel(thread) {
  const offerId = thread.context?.offerId;
  const departure = offerId && sharedDepartureStatus(offerId);
  if (!departure || (!departure.bookings.length && !departure.historicalBookings.length)) return '';
  const account = activeSocialUser();
  const guideId = account?.guideId || account?.id;
  const guideMode = account?.role === 'guide' && (departure.offer.teamGuideIds || [departure.offer.guideId]).includes(guideId);
  const ownRequest = [...departure.bookings, ...departure.historicalBookings].find((request) => request.travelerEmail === String(account?.accountEmail || '').toLowerCase());
  const paidOwnRequest = departure.bookings.find((request) => request.travelerEmail === String(account?.accountEmail || '').toLowerCase());
  const ownPointSeen = Boolean(paidOwnRequest && departure.ownMeetingPointAcknowledgements?.[paidOwnRequest.id]);
  const ownReportOpen = Boolean(paidOwnRequest?.safety?.reports?.some((report) => report.status === 'open'));
  const decision = departure.decision;
  const responses = Object.values(decision?.responses || {});
  const acceptedVotes = responses.filter((response) => response === true).length;
  const voteCount = responses.length;
  const today = new Date().toISOString().slice(0, 10);
  const options = guideMode ? sharedDepartureAlternatives(offerId, guideId) : [];
  const alternatives = options.map((offer) => {
    const packageOption = getExperience(offer.experienceId)?.packageOptions?.find((entry) => entry.id === offer.packageId);
    return `<option value="${esc(offer.id)}">${esc(packageOption?.name || 'Shared package')} · ${esc(offer.date)} · Rp${Number(offer.price).toLocaleString('id-ID')} per person</option>`;
  }).join('');
  const title = departure.workStatus === 'completed' ? 'Trip completed' : departure.workStatus === 'cancelled' ? 'Departure cancelled · demo refund' : departure.workStatus === 'completion_pending' ? 'Waiting for travelers to confirm completion' : departure.workStatus === 'in_progress' ? 'Guide is working · Trip in progress' : departure.minimumMet ? 'Departure confirmed' : `${departure.paidTravelers} of ${departure.minGuests} minimum travelers`;
  const subtitle = departure.workStatus === 'completed' ? 'The guide and travelers completed the trip.' : departure.workStatus === 'cancelled' ? 'The group agreed to cancel. A demo refund was recorded; no real money moved.' : departure.pendingCount ? `${departure.pendingCount} booking request${departure.pendingCount === 1 ? '' : 's'} still need a guide response.` : departure.unpaidCount ? `${departure.unpaidCount} accepted booking${departure.unpaidCount === 1 ? '' : 's'} still need payment before the group can decide.` : departure.underMinimum ? departure.decisionDue ? 'A group decision is needed within 24 hours of departure.' : 'If the minimum is still unmet within 24 hours of departure, the guide will ask the group what to do.' : `${Math.max(0, departure.maxGuests - departure.paidTravelers)} seats remain on this shared departure.`;
  const canPropose = guideMode && departure.decisionDue && departure.underMinimum && !departure.pendingCount && !departure.unpaidCount && departure.workStatus === 'not_started' && (!decision || ['declined', 'needs_review'].includes(decision.status));
  const proposalForm = canPropose ? `<form class="shared-decision-form" id="shared-departure-decision-form" data-offer-id="${esc(offerId)}"><strong>Ask the group to choose a plan</strong><label>Proposal<select name="kind" data-shared-decision-kind><option value="proceed">Continue with the current group</option><option value="reschedule">Move to another date</option>${alternatives ? '<option value="change_package">Switch to another approved shared departure</option>' : ''}<option value="refund">Cancel and record a demo refund</option></select></label><label data-shared-decision-field="date" hidden>New departure date<input name="date" type="date" min="${today}" /></label>${alternatives ? `<label data-shared-decision-field="offer" hidden>Approved shared departure<select name="targetOfferId"><option value="">Choose a departure</option>${alternatives}</select></label>` : ''}<label>Message to the group<textarea name="message" rows="2" maxlength="360" placeholder="Explain the available choice and any important details" required></textarea></label><button class="primary-button" type="submit">Send proposal to travelers</button></form>` : '';
  const pointControls = guideMode && departure.workStatus === 'not_started' && departure.bookings.length
    ? `<form class="shared-meeting-point-form" id="shared-meeting-point-form" data-offer-id="${esc(offerId)}"><label>Official public meeting point<input name="meetingPoint" value="${esc(departure.meetingPoint)}" maxlength="180" placeholder="Choose a clear public landmark or entrance" required /></label><small>Choose a clear, public place—not an isolated or private address. Changing this point resets every traveler party’s acknowledgement.</small><button class="primary-button" type="submit">${departure.meetingPoint ? 'Update official point' : 'Set official meeting point'}</button></form>`
    : !guideMode && paidOwnRequest && departure.workStatus === 'not_started'
      ? `${departure.meetingPoint ? ownReportOpen ? '<small class="shared-work-hint">Your safety report is open. Acknowledge the location after it is reviewed.</small>' : ownPointSeen ? '<small class="shared-vote-note">Your party has seen the official point.</small>' : `<button class="primary-button" data-action="shared-meeting-point-ack" data-id="${esc(offerId)}">I’ve seen this meeting point</button>` : '<small class="shared-work-hint">The guide has not set the official group meeting point yet.</small>'}<a class="shared-safety-link" href="#/bookings/${encodeURIComponent(paidOwnRequest.id)}/safety">${ownReportOpen ? 'View your safety report' : 'Report an unsafe or unsuitable point'}</a>`
      : '';
  const meetingPointContent = `<div class="shared-meeting-point"><strong>Official group meeting point</strong><p>${esc(departure.meetingPoint || 'Not set by the guide yet')}</p>${departure.meetingPoint ? `<small>Seen by ${departure.meetingPointAcknowledgedCount} of ${departure.bookings.length} paid traveler parties.</small>` : ''}${pointControls}</div>`;
  let decisionContent = '';
  if (decision?.status === 'proposed') {
    const kindLabel = { proceed: 'Continue with the current group', reschedule: `Move the trip to ${decision.date}`, change_package: `Switch to another shared departure on ${decision.targetDate}`, refund: 'Cancel and record a demo refund' }[decision.kind] || 'Update shared departure';
    const ownResponse = ownRequest ? decision.responses?.[ownRequest.id] : null;
    decisionContent = `<div class="shared-decision-proposal"><strong>Guide proposal · ${esc(kindLabel)}</strong><p>${esc(decision.message)}</p><small>${acceptedVotes} of ${voteCount} traveler parties agreed.</small>${!guideMode && ownRequest && ownResponse === null ? `<div class="guardian-actions"><button data-action="shared-departure-vote" data-id="${esc(offerId)}" data-value="yes">Agree</button><button data-action="shared-departure-vote" data-id="${esc(offerId)}" data-value="no">I don’t agree</button></div>` : ownResponse === true ? '<small class="shared-vote-note">Your party agreed.</small>' : ownResponse === false ? '<small class="shared-vote-note">Your party declined this proposal.</small>' : ''}</div>`;
  } else if (decision?.status === 'declined') {
    decisionContent = `<p class="shared-decision-note">At least one traveler party did not agree. The guide can propose another plan in the group chat.</p>${proposalForm}`;
  } else if (decision?.status === 'needs_review') {
    decisionContent = `<p class="shared-decision-note">The agreed change could not be applied safely. Keep coordinating here; no booking was changed.</p>${proposalForm}`;
  } else if (decision?.status === 'approved') {
    decisionContent = '<p class="shared-decision-note">Every paid traveler party agreed to continue with the current group. The guide can start on the departure date after checking every traveler.</p>';
  } else if (departure.decisionDue && departure.underMinimum) {
    decisionContent = guideMode ? departure.pendingCount ? '<p class="shared-decision-note">Respond to pending booking requests first so no traveler is left out of the group decision.</p>' : departure.unpaidCount ? '<p class="shared-decision-note">Wait until every accepted booking is paid before asking the group to decide.</p>' : proposalForm : '<p class="shared-decision-note">The guide will send a group proposal. Each paid traveler party must respond before the plan is finalized.</p>';
  }
  let workContent = '';
  if (guideMode && departure.workStatus === 'not_started') {
    const canStart = (departure.minimumMet || decision?.kind === 'proceed' && decision.status === 'approved') && departure.offer.date <= today && !departure.pendingCount && !departure.unpaidCount && departure.allVerified && !departure.hasOpenReport && departure.meetingPoint && departure.allMeetingPointsAcknowledged;
    workContent = canStart
      ? `<button class="primary-button" data-action="shared-trip-work" data-id="${esc(offerId)}" data-value="start">Start work and trip</button>`
      : `<small class="shared-work-hint">${departure.offer.date > today ? `Not started · Trip date ${esc(departure.offer.date)}` : departure.pendingCount ? 'Not started · Respond to all pending booking requests first.' : departure.unpaidCount ? 'Not started · Wait for all accepted bookings to be paid.' : !departure.meetingPoint ? 'Not started · Set an official public meeting point.' : !departure.allMeetingPointsAcknowledged ? `Not started · Waiting for ${departure.bookings.length - departure.meetingPointAcknowledgedCount} traveler party acknowledgements.` : !departure.allVerified ? 'Not started · Verify every paid traveler’s booking code first.' : departure.hasOpenReport ? 'Not started · Resolve the open safety report first.' : departure.underMinimum && decision?.status !== 'approved' ? 'Not started · The group must agree to proceed with fewer travelers first.' : 'Not started · Complete the pending booking steps first.'}</small>`;
  } else if (guideMode && departure.workStatus === 'in_progress') {
    workContent = departure.allInProgress
      ? `<button class="guardian-danger" data-action="shared-trip-work" data-id="${esc(offerId)}" data-value="complete" ${departure.hasOpenReport ? 'disabled' : ''}>Mark trip work complete</button>`
      : `<small class="shared-work-hint">In progress · Waiting for ${departure.bookings.filter((request) => request.bookingStatus !== 'in_progress').length} traveler${departure.bookings.filter((request) => request.bookingStatus !== 'in_progress').length === 1 ? '' : 's'} to confirm the trip start in Safety Center.</small>`;
  } else if (!guideMode && ownRequest && departure.workStatus === 'in_progress') {
    workContent = `<a class="shared-safety-link" href="#/bookings/${encodeURIComponent(ownRequest.id)}/safety">Confirm meeting and check in · Safety Center</a>`;
  } else if (!guideMode && ownRequest && departure.workStatus === 'completion_pending' && !ownRequest.safety?.travelerEndedAt) {
    workContent = `<a class="shared-safety-link" href="#/bookings/${encodeURIComponent(ownRequest.id)}/safety">Confirm trip completion · Safety Center</a>`;
  } else if (departure.workStatus === 'completion_pending') {
    workContent = '<small class="shared-work-hint">The guide marked the trip complete. Traveler confirmations are still pending.</small>';
  } else if (departure.workStatus === 'completed') {
    workContent = '<small class="shared-work-hint">Status · Completed</small>';
  } else if (departure.workStatus === 'cancelled') {
    workContent = '<small class="shared-work-hint">Status · Cancelled. Contact the guide in this chat if you need help with the demo record.</small>';
  }
  const adjustments = ownRequest?.settlementAdjustment ? `<small class="shared-work-hint">Demo balance ${ownRequest.settlementAdjustment > 0 ? 'due' : 'refund due'} after the package change: Rp${Math.abs(ownRequest.settlementAdjustment).toLocaleString('id-ID')}. No real payment has been processed.</small>` : '';
  return `<section class="shared-departure-panel" aria-label="Shared trip status"><div class="shared-departure-heading"><span><small>SHARED DEPARTURE</small><strong>${esc(title)}</strong></span><em class="shared-work-status ${esc(departure.workStatus)}">${esc(departure.workStatus.replace('_', ' '))}</em></div><p>${esc(subtitle)}</p>${meetingPointContent}${decisionContent}${workContent}${adjustments}</section>`;
}
function chatMessageView(message, thread, selfId) {
  if (message.system) return `<div class="chat-system-message"><span>${esc(message.text)}</span></div>`;
  return `<div class="chat-message ${message.senderId === selfId ? 'mine' : ''}">${thread.group && message.senderId !== selfId ? `<small class="chat-sender-name">${esc(socialUser(message.senderId)?.displayName || 'Traveler')}</small>` : ''}<div class="chat-message-line"><div class="chat-message-bubble ${message.deletedAt ? 'deleted' : ''}" data-action="open-chat-menu" data-id="${esc(message.id)}">${message.replyTo ? `<div class="chat-reply-preview"><strong>Reply</strong><span>${esc(message.replyTo.text || 'Message')}</span></div>` : ''}${message.deletedAt ? '<em>This message was deleted</em>' : `${esc(message.text)}${sharedAttachment(message.attachment, message.id)}${message.editedAt ? '<small class="chat-edited">edited</small>' : ''}`}</div>${messageActions(message, selfId)}</div>${messageReactions(message) ? `<div class="chat-reactions">${messageReactions(message)}</div>` : ''}${message.safetySignal && !message.deletedAt ? `<div class="chat-safety-signal">✦ Smart safety · ${esc(message.safetySignal.advice)}</div>` : ''}<small>${timeLabel(message.createdAt)} ${messageStatus(message, thread, selfId)}</small></div>`;
}
function chatRow(thread) {
  const person = chatParticipant(thread.id);
  const last = lastMessage(thread);
  const unread = thread.unreadBy[activeSocialUser().id] || 0;
  const title = thread.group ? thread.title : person?.displayName || 'Traveler';
  const handle = thread.group ? `${thread.participantIds.length} travelers · ${thread.participantIds.filter(visibleOnline).length} online` : `@${person?.username || 'traveler'}`;
  return `<a class="inbox-chat" href="#/inbox/chat/${encodeURIComponent(thread.id)}">${avatar(person || (thread.group ? activeSocialUser() : null))}<span><strong>${esc(title)}</strong><small>${esc(handle)}</small><span>${esc(last?.text || 'Start a conversation')}</span>${thread.context ? `<em>${esc(thread.context.label)}</em>` : ''}</span><small class="inbox-chat-time">${last ? timeLabel(last.createdAt) : ''}${unread ? `<b>${unread}</b>` : ''}</small></a>`;
}
function updateRow(message) {
  const experience = getExperience(message.experienceId);
  return `<a class="inbox-message" href="#/experience/${encodeURIComponent(message.experienceId)}" data-action="inbox-read" data-value="update:${esc(message.id)}" data-href="/experience/${encodeURIComponent(message.experienceId)}"><img src="${esc(experience.image)}" alt="" /><span><strong>${esc(message.title)}</strong><span>${esc(message.body)}</span></span><small>${esc(message.timeLabel)}</small></a>`;
}
function activityRow(event) {
  const person = socialUser(event.actorId);
  const label = event.kind === 'like' ? 'liked your Vibes post' : event.kind === 'comment' ? 'commented on your Vibes post' : 'started following you';
  const href = event.post ? `/social/post/${encodeURIComponent(event.post.id)}` : `/social/user/${encodeURIComponent(person?.id || '')}`;
  return `<a class="inbox-activity" href="#${href}" data-action="inbox-read" data-value="activity:${esc(event.id)}" data-href="${href}">${avatar(person, 'small')}<span><strong>${esc(person?.displayName || 'Traveler')}</strong> ${label}<small>@${esc(person?.username || 'traveler')}</small></span>${event.post ? `<em>${event.post.likedBy.length} likes</em>` : ''}</a>`;
}
function smartRow(notification) {
  return `<a class="inbox-smart" href="${esc(notification.href)}" data-action="inbox-read" data-value="smart:${esc(notification.id)}" data-href="${esc(notification.href.replace(/^#/, ''))}"><span class="inbox-smart-icon">✦</span><span><strong>${esc(notification.title)}</strong><span>${esc(notification.body)}</span></span><small>${esc(notification.timeLabel)}</small></a>`;
}
export function notificationsView() {
  const updates = demoMessages.filter((message) => state.inboxFilter === 'All' || message.type === state.inboxFilter);
  const activity = socialActivity(activeSocialUser().id);
  const smart = getContextAwareNotifications({ userState: state, posts: visibleSocialPosts(), catalog: experiences });
  const showUpdates = state.inboxFilter === 'All' || state.inboxFilter === 'Updates';
  const showActivity = state.inboxFilter === 'All' || state.inboxFilter === 'Activity';
  const showSmart = state.inboxFilter === 'All' || state.inboxFilter === 'Smart';
  const hasContent = (showUpdates && updates.length) || (showActivity && activity.length) || (showSmart && smart.length);
  return mainLayout(`
    <div class="page-pad inbox-page"><div class="inbox-top"><button class="icon-button" data-action="back">${icon('arrow')}</button><h1>Notifications</h1><button class="icon-button" data-action="inbox-more">${icon('more')}</button></div>
      <div class="chip-row">${['All', 'Updates', 'Activity', 'Smart', 'Archive'].map((filter) => `<button class="chip ${state.inboxFilter === filter ? 'selected' : ''}" data-action="inbox-filter" data-value="${filter}">${filter}</button>`).join('')}</div>
      ${hasContent ? `${showUpdates && updates.length ? `<section class="inbox-section"><h2>Updates</h2>${updates.map(updateRow).join('')}</section>` : ''}${showSmart && smart.length ? `<section class="inbox-section"><h2>Smart for you</h2>${smart.map(smartRow).join('')}</section>` : ''}${showActivity && activity.length ? `<section class="inbox-section"><h2>Vibes activity</h2>${activity.slice(0, 30).map(activityRow).join('')}</section>` : ''}` : `<div class="empty-state"><h2>No ${state.inboxFilter.toLowerCase()} yet</h2><p>Your booking updates, safety alerts, and Vibes activity will appear here.</p></div>`}
    </div>
  `, '', { className: 'inbox-shell' });
}
export function inboxView() { return notificationsView(); }
export function chatInboxView() {
  const threads = visibleChatThreads();
  return mainLayout(`
    <div class="page-pad inbox-page"><div class="inbox-top"><span></span><h1>Chat</h1><a class="icon-button" href="#/inbox" aria-label="Notifications">${icon('bell')}</a></div>
      ${threads.length ? `<section class="inbox-section"><h2>Your conversations</h2>${threads.map(chatRow).join('')}</section>` : '<div class="empty-state"><h2>No conversations yet</h2><p>Your private and public travel chats will appear here.</p><a class="primary-button" href="#/">Discover experiences</a></div>'}
    </div>
  `, 'Chat', { className: 'inbox-shell' });
}
export function chatView(threadId) {
  const thread = chatThread(threadId);
  const person = chatParticipant(threadId);
  const participants = chatParticipants(threadId);
  if (!thread || (!thread.group && !person) || !thread.participantIds.includes(activeSocialUser().id)) return chatInboxView();
  markChatThreadRead(threadId);
  const selfId = activeSocialUser().id;
  const messages = chatMessages(threadId);
  const onlineLabel = thread.group ? `${thread.participantIds.filter(visibleOnline).length} online` : visibleOnline(person.id) ? 'Online' : 'Last seen recently';
  const editing = messages.find((message) => message.id === state.chatEditMessageId && message.senderId === selfId);
  const replying = messages.find((message) => message.id === state.chatReplyMessageId);
  const pinnedCount = messages.filter((message) => message.pinned).length;
  const favoriteCount = messages.filter((message) => message.favoriteBy?.includes(selfId)).length;
  const contextExperience = thread.context ? getExperience(thread.context.experienceId) : null;
  const contextPrice = contextExperience?.packageOptions?.length ? approvedExperienceLabel(contextExperience) : contextExperience ? formatListedPrice(contextExperience) : '';
  const bookingRequest = thread.context?.requestId ? guideDemoData().requests.find((request) => request.id === thread.context.requestId) : null;
  const bookingOption = bookingRequest ? contextExperience?.packageOptions?.find((option) => option.id === bookingRequest.packageId) : null;
  const bookingTotal = bookingRequest?.finance?.travelerTotal || bookingRequest?.travelerTotal || thread.context?.total;
  const bookingMoney = bookingTotal ? `Rp${Math.round(bookingTotal).toLocaleString('id-ID')}` : 'Total to be confirmed';
  const bookingAdvice = bookingRequest ? bookingAssistantAdvice(bookingRequest) : '';
  const composerValue = editing?.text || (state.chatDraft?.threadId === threadId ? state.chatDraft.text : '');
  return mainLayout(`
    <div class="chat-page"><header class="chat-header"><button class="icon-button" data-action="back" aria-label="Back">${icon('arrow')}</button>${avatar(person || activeSocialUser(), 'small')}<span><strong>${esc(thread.group ? thread.title : person.displayName)}</strong><small>${esc(thread.group ? `${participants.length + 1} traveler${participants.length ? 's' : ''} · ${onlineLabel}` : `${onlineLabel} · @${person.username}`)}</small></span><button type="button" class="icon-button" id="btn-voice-call" aria-label="Voice Call" style="margin-left: auto; margin-right: 4px;">📞</button>${thread.group ? `<button class="icon-button" data-action="view-group-members" data-id="${esc(thread.id)}" aria-label="View group members">${icon('community', 22)}</button><button class="chat-group-leave-button" data-action="leave-travel-group" data-id="${esc(thread.id)}">Leave</button>` : `<a class="icon-button" href="#/social/user/${esc(person.id)}" aria-label="View profile">${icon('community', 22)}</a>`}</header>
      ${bookingRequest ? bookingChatInfoView(thread, bookingRequest, contextExperience, bookingOption, bookingMoney, bookingAdvice) : thread.context ? `<a class="chat-context" href="#/experience/${esc(thread.context.experienceId)}"><span><strong>${esc(thread.context.label)}</strong>${thread.context.kind === 'public' ? '<small>Public group · ask questions before booking</small>' : contextExperience ? `<small>From ${esc(contextPrice)} · ${esc(contextExperience.duration)}</small>` : ''}</span>${icon('chevron', 18)}</a>` : ''}
      ${(pinnedCount || favoriteCount) ? `<div class="chat-collections">${pinnedCount ? `<button data-action="chat-collection" data-value="pinned">${icon('pin', 15)} ${pinnedCount} pinned</button>` : ''}${favoriteCount ? `<button data-action="chat-collection" data-value="favorite">${icon('star', 15)} ${favoriteCount} favorite</button>` : ''}</div>` : ''}
      <div class="chat-messages">${thread.context?.kind === 'public' && !messages.length ? '<div class="chat-public-empty">Be the first to ask a question or share a travel tip.</div>' : messages.map((message) => chatMessageView(message, thread, selfId)).join('')}</div>
      <form class="chat-composer" id="chat-message-form">${editing ? `<div class="chat-compose-context"><strong>Edit message</strong><button type="button" data-action="cancel-chat-compose" aria-label="Cancel edit">${icon('close', 15)}</button></div>` : replying ? `<div class="chat-compose-context"><strong>Replying to ${esc(socialUser(replying.senderId)?.displayName || 'traveler')}</strong><span>${esc(replying.text || 'Message')}</span><button type="button" data-action="cancel-chat-compose" aria-label="Cancel reply">${icon('close', 15)}</button></div>` : ''}<div class="chat-compose-tools"><button type="button" data-action="chat-gallery" aria-label="Send photo">${icon('image', 19)}<span>Photo</span></button><button type="button" data-action="chat-camera" aria-label="Take photo">${icon('camera', 19)}<span>Camera</span></button><button type="button" data-action="chat-emoji" aria-label="Open system emoji keyboard">😊<span>Emoji</span></button><button type="button" data-action="chat-sticker" aria-label="Open stickers">✨<span>Stickers</span></button><button type="button" data-action="chat-voice" aria-label="Record voice message">${icon('mic', 19)}<span>Voice</span></button></div><div class="chat-sticker-panel">${['✨🗺️', '🌍✈️', '🏖️☀️', '🏔️🤍', '📸🌅', '🍜🧳'].map((sticker) => `<button type="button" data-action="send-chat-sticker" data-value="${sticker}" aria-label="Send ${sticker}">${sticker}</button>`).join('')}</div><div class="chat-compose-row"><button type="button" class="chat-compose-plus" data-action="chat-tools" aria-label="More chat tools">${icon('plus', 21)}</button><textarea name="message" rows="1" maxlength="1000" placeholder="Message ${thread.group ? 'the group' : esc(person.displayName.split(' ')[0])}..." autocomplete="off" required>${esc(composerValue)}</textarea><button type="submit" aria-label="Send message">${icon('send', 21)}</button></div><input id="chat-photo-input" type="file" accept="image/*" multiple hidden /><input id="chat-camera-input" type="file" accept="image/*" capture="environment" hidden /></form>
    </div>
  `, 'Discover', { className: 'inbox-shell', hideNavigation: true });
}

// Tambahan Script untuk Menyisipkan Tombol Call di Pojok Kanan Atas Header Chat
document.addEventListener('DOMContentLoaded', () => {
  const chatHeader = document.querySelector('.chat-header');
  if (chatHeader && !document.getElementById('btn-voice-call')) {
    const callButton = document.createElement('button');
    callButton.id = 'btn-voice-call';
    callButton.innerHTML = '📞';
    callButton.title = 'Panggilan Suara';
    callButton.style.cssText = 'background: none; border: none; font-size: 20px; cursor: pointer; padding: 4px 8px; margin-left: auto;';
    
    callButton.addEventListener('click', () => {
      alert('Memulai panggilan suara WebRTC (100% Gratis)...');
    });

    chatHeader.style.display = 'flex';
    chatHeader.style.alignItems = 'center';
    chatHeader.appendChild(callButton);
  }
});

// Integrasi presisi tombol Call di pojok kanan atas header chat
setTimeout(() => {
  const headerActions = document.querySelector('.chat-header-actions, .chat-header .flex, .chat-header .items-center') || document.querySelector('.chat-header');
  if (headerActions && !document.getElementById('btn-voice-call')) {
    const callBtn = document.createElement('button');
    callBtn.id = 'btn-voice-call';
    callBtn.innerHTML = '📞';
    callBtn.title = 'Panggil Suara';
    callBtn.style.cssText = 'background: transparent; border: none; font-size: 20px; cursor: pointer; margin-right: 12px; display: flex; align-items: center; justify-content: center;';
    
    callBtn.onclick = () => {
      alert('Memulai panggilan suara WebRTC ke pengguna...');
    };

    headerActions.insertBefore(callBtn, headerActions.firstChild);
  }
}, 500);








// --- WhatsApp Call Screen UI with FontAwesome Icons ---
let activeCallStream = null;
let callTimerInterval = null;
let callSeconds = 0;
let isMuted = false;
let isSpeakerOn = false;

function renderExactWACallScreen(participantName, participantAvatarUrl) {
  const existing = document.getElementById('whatsapp-call-overlay');
  if (existing) existing.remove();

  // Pastikan FontAwesome CSS dimuat untuk ikon yang bersih dan profesional
  if (!document.getElementById('font-awesome-cdn')) {
    const faLink = document.createElement('link');
    faLink.id = 'font-awesome-cdn';
    faLink.rel = 'stylesheet';
    faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(faLink);
  }

  const overlay = document.createElement('div');
  overlay.id = 'whatsapp-call-overlay';
  overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #111b21; z-index: 99999; display: flex; flex-direction: column; justify-content: space-between; align-items: center; color: white; padding: 50px 20px 45px 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-sizing: border-box;';

  const avatarContent = participantAvatarUrl 
    ? `<img src="${participantAvatarUrl}" alt="" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`
    : `<span style="font-size: 50px; color: #fff;"><i class="fa-solid fa-user"></i></span>`;

  overlay.innerHTML = `
    <!-- Top Header (Tanpa tombol bintang/gembok di pojok atas) -->
    <div style="width: 100%; display: flex; justify-content: center; align-items: center; padding: 0 10px; position: relative;">
      <div style="display: flex; flex-direction: column; align-items: center;">
        <span style="font-size: 16px; font-weight: 500; margin-bottom: 2px;">${participantName}</span>
        <span id="call-status-text" style="font-size: 13px; color: #8696a0;">Berdering ...</span>
      </div>
    </div>

    <!-- Center Avatar & Timer -->
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; flex-grow: 1;">
      <div style="width: 130px; height: 130px; border-radius: 50%; background: #222d34; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.6); margin-bottom: 15px; border: 2px solid #2a3942;">
        ${avatarContent}
      </div>
      <div id="call-timer" style="font-size: 14px; color: #00a884; font-weight: 600; display: none; margin-top: 5px;">00:00</div>
    </div>

    <!-- Bottom Control Panel (3 Buttons dengan FontAwesome Icons) -->
    <div style="width: 100%; max-width: 340px; background: #1f2c34; border-radius: 28px; padding: 25px 20px; display: flex; justify-content: space-around; align-items: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
      
      <!-- Speaker -->
      <button id="btn-toggle-speaker" style="display: flex; flex-direction: column; align-items: center; background: none; border: none; color: white; cursor: pointer; gap: 8px;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: #2a3942; display: flex; align-items: center; justify-content: center; font-size: 20px;" id="speaker-bg"><i class="fa-solid fa-volume-high"></i></div>
        <span style="font-size: 11px; color: #8696a0;">Speaker</span>
      </button>

      <!-- Bisukan (Mute) -->
      <button id="btn-toggle-mute" style="display: flex; flex-direction: column; align-items: center; background: none; border: none; color: white; cursor: pointer; gap: 8px;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: #2a3942; display: flex; align-items: center; justify-content: center; font-size: 20px;" id="mute-bg"><i class="fa-solid fa-microphone"></i></div>
        <span style="font-size: 11px; color: #8696a0;">Bisukan</span>
      </button>

      <!-- Akhiri Call (Red Button) -->
      <button id="btn-end-call" style="display: flex; flex-direction: column; align-items: center; background: none; border: none; color: white; cursor: pointer; gap: 8px;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: #ea0038; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 12px rgba(234,0,56,0.4);"><i class="fa-solid fa-phone-slash"></i></div>
        <span style="font-size: 11px; color: #8696a0;">Akhiri</span>
      </button>

    </div>
  `;

  document.body.appendChild(overlay);

  // Transisi status Berdering -> Terhubung setelah 2.5 detik
  setTimeout(() => {
    const statusText = document.getElementById('call-status-text');
    const timerElem = document.getElementById('call-timer');
    if (statusText && timerElem) {
      statusText.innerText = "Terhubung";
      timerElem.style.display = "block";
      callSeconds = 0;
      callTimerInterval = setInterval(() => {
        callSeconds++;
        const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
        const secs = String(callSeconds % 60).padStart(2, '0');
        timerElem.innerText = `${mins}:${secs}`;
      }, 1000);
    }
  }, 2500);

  // Event Listener Tombol Bisukan (Mute/Unmute)
  document.getElementById('btn-toggle-mute').onclick = () => {
    isMuted = !isMuted;
    if (activeCallStream) {
      activeCallStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
    const muteBg = document.getElementById('mute-bg');
    muteBg.style.background = isMuted ? '#00a884' : '#2a3942';
    muteBg.innerHTML = isMuted ? '<i class="fa-solid fa-microphone-slash"></i>' : '<i class="fa-solid fa-microphone"></i>';
  };

  // Event Listener Tombol Speaker
  document.getElementById('btn-toggle-speaker').onclick = () => {
    isSpeakerOn = !isSpeakerOn;
    const speakerBg = document.getElementById('speaker-bg');
    speakerBg.style.background = isSpeakerOn ? '#00a884' : '#2a3942';
  };

  // Event Listener Tombol Akhiri Panggilan
  document.getElementById('btn-end-call').onclick = () => {
    terminateCallSession();
  };
}

async function startVoiceCallSession(participantName, avatarUrl) {
  try {
    activeCallStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    renderExactWACallScreen(participantName, avatarUrl);
  } catch (err) {
    console.error('Gagal mengakses mikrofon:', err);
    alert('Izin mikrofon diperlukan untuk melakukan panggilan suara.');
  }
}



// --- Perbaikan Presisi Waktu Pencatatan Log Panggilan ke Chat ---
function terminateCallSession() {
  const timerElem = document.getElementById('call-timer');
  let statusMsg = 'Tidak dijawab';
  let durationStr = '';

  if (timerElem && timerElem.style.display !== 'none' && timerElem.innerText !== '00:00') {
    durationStr = timerElem.innerText;
    statusMsg = `Terhubung (${durationStr})`;
  }

  // Cari kontainer chat di halaman utama (di balik overlay)
  const chatMessagesContainer = document.querySelector('.chat-messages');
  if (chatMessagesContainer) {
    const logDiv = document.createElement('div');
    logDiv.className = 'chat-system-message';
    
    const isConnected = durationStr !== '';
    const iconClass = isConnected ? 'fa-solid fa-phone-arrow-up-right' : 'fa-solid fa-phone-slash';
    const iconColor = isConnected ? '#00a884' : '#ea0038';
    const labelText = isConnected ? `Telepon suara · ${durationStr}` : 'Panggilan suara tak terjawab';

    logDiv.innerHTML = `<span><i class="${iconClass}" style="color: ${iconColor}; margin-right: 6px;"></i> ${labelText}</span>`;
    chatMessagesContainer.appendChild(logDiv);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  }

  if (activeCallStream) {
    activeCallStream.getTracks().forEach(track => track.stop());
    activeCallStream = null;
  }
  if (callTimerInterval) {
    clearInterval(callTimerInterval);
    callTimerInterval = null;
  }
  isMuted = false;
  isSpeakerOn = false;
  
  const overlay = document.getElementById('whatsapp-call-overlay');
  if (overlay) overlay.remove();
}


// --- Memastikan Event Listener Tombol Call Selalu Aktif ---
if (!window._voiceCallListenerAttached) {
  window._voiceCallListenerAttached = true;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#btn-voice-call');
    if (btn) {
      const participantNameElem = document.querySelector('.chat-header span strong, header strong');
      const name = participantNameElem ? participantNameElem.innerText : 'Pelanggan / Driver';
      const avatarImg = document.querySelector('.chat-header img, header img, .chat-avatar');
      const avatarUrl = avatarImg ? avatarImg.src : null;
      if (typeof startVoiceCallSession === 'function') {
        startVoiceCallSession(name, avatarUrl);
      } else {
        console.error('Fungsi startVoiceCallSession belum terdefinisi.');
      }
    }
  });
}
