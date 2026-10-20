import { demoChatMessages, demoChatThreads } from './data.js';
import { activeSocialUser, socialState, socialUser } from '../social/repository.js';
import { transportDriverById } from '../transport/data.js';
import { analyzeBookingMessage } from '../guides/safety.js';
function tripData() {
  try { return JSON.parse(localStorage.getItem('lombok-guide-demo-v1') || 'null'); }
  catch { return null; }
}

const STORAGE_KEY = 'lombok-chat-demo-v1';
const clone = (value) => JSON.parse(JSON.stringify(value));
const now = () => new Date().toISOString();

export function createSeedMessagingState() {
  return { schemaVersion: 2, threads: clone(demoChatThreads), messages: clone(demoChatMessages) };
}

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if ([1, 2].includes(saved?.schemaVersion) && Array.isArray(saved.threads) && Array.isArray(saved.messages)) {
      if (saved.schemaVersion === 1) {
        const seededMemberIds = new Set(['maya', 'dario', 'sophie', 'nina']);
        const publicThreadIds = new Set();
        saved.threads.forEach((thread) => {
          if (!thread.group || !thread.context?.experienceId || thread.context.offerId || thread.context.requestId) return;
          publicThreadIds.add(thread.id);
          thread.context.kind = 'public';
          thread.participantIds = thread.participantIds.filter((id) => !seededMemberIds.has(id));
          thread.unreadBy = Object.fromEntries(thread.participantIds.map((id) => [id, thread.unreadBy?.[id] || 0]));
        });
        saved.messages = saved.messages.filter((message) => !publicThreadIds.has(message.threadId) || !/^Welcome to the .* traveler group\. Compare dates and plan together here\.$/.test(message.text));
        saved.threads.forEach((thread) => {
          if (publicThreadIds.has(thread.id)) thread.lastMessageId = saved.messages.filter((message) => message.threadId === thread.id).at(-1)?.id || null;
        });
        saved.schemaVersion = 2;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      }
      return saved;
    }
  } catch { /* Demo conversations remain available when storage is blocked. */ }
  return createSeedMessagingState();
}

let currentState;
function messagingState() {
  currentState ||= readState();
  return currentState;
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messagingState())); return true; }
  catch { return false; }
}

function eligibleSharedTripMember(thread, userId) {
  if (!thread.context?.offerId) return true;
  const data = tripData();
  const offerIds = [...new Set([thread.context.offerId, ...(thread.context.linkedOfferIds || [])])];
  const offers = data?.offerings?.filter((item) => offerIds.includes(item.id)) || [];
  const user = socialUser(userId);
  return offers.some((offer) => (offer.teamGuideIds || [offer.guideId]).includes(userId)) || Boolean(data?.requests?.some((request) => offerIds.includes(request.offerId) && request.travelerEmail === user?.accountEmail?.toLowerCase() && (['accepted', 'completed'].includes(request.status) && request.paymentStatus === 'paid' || request.status === 'cancelled' && request.paymentStatus === 'refunded')));
}
// Resolves a thread's other side to a displayable profile: a real social user (traveler/guide)
// or, for a transport driver thread, a lightweight profile built from the driver record so
// the same chat UI (avatar, name, online status, composer) works without the driver needing
// a social account.
function chatPersonProfile(id) {
  const person = socialUser(id);
  if (person) return person;
  const driver = transportDriverById(id);
  return driver ? { id: driver.id, displayName: driver.name, username: `${driver.id.replace('driver-', '')}.driver`, initials: driver.initials, color: '#305ee7', online: true, role: 'driver' } : null;
}
export function chatThread(threadId) { return messagingState().threads.find((thread) => thread.id === threadId && thread.status === 'active' && (!thread.group || thread.participantIds.includes(activeSocialUser().id)) && eligibleSharedTripMember(thread, activeSocialUser().id)); }
export function chatMessages(threadId) { return messagingState().messages.filter((message) => message.threadId === threadId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)); }
export function chatParticipant(threadId) {
  const selfId = activeSocialUser().id;
  const thread = chatThread(threadId);
  return chatPersonProfile(thread?.participantIds.find((id) => id !== selfId));
}
export function chatParticipants(threadId) {
  const selfId = activeSocialUser().id;
  const thread = chatThread(threadId);
  return (thread?.participantIds || []).filter((id) => id !== selfId).map((id) => chatPersonProfile(id)).filter(Boolean);
}
export function chatMessage(threadId, messageId) { return messagingState().messages.find((message) => message.threadId === threadId && message.id === messageId); }
export function isChatUserOnline(userId) { return Boolean(chatPersonProfile(userId)?.online); }
export function visibleChatThreads() {
  const selfId = activeSocialUser().id;
  return messagingState().threads
    .filter((thread) => thread.status === 'active' && thread.participantIds.includes(selfId) && eligibleSharedTripMember(thread, selfId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export function findChatThreadWith(userId) {
  const selfId = activeSocialUser().id;
  return messagingState().threads.find((thread) => thread.status === 'active' && thread.participantIds.includes(selfId) && thread.participantIds.includes(userId));
}
export function getOrCreateChatThread(userId, context = null) {
  const selfId = activeSocialUser().id;
  if (!chatPersonProfile(userId) || userId === selfId) return null;
  const existing = findChatThreadWith(userId);
  if (existing) {
    if (context) { existing.context = { ...(existing.context || {}), ...context }; existing.updatedAt = now(); persist(); }
    return existing.id;
  }
  const thread = {
    id: `thread-${selfId}-${userId}`,
    participantIds: [selfId, userId],
    context,
    createdAt: now(),
    updatedAt: now(),
    lastMessageId: null,
    unreadBy: { [selfId]: 0, [userId]: 0 },
    status: 'active',
  };
  messagingState().threads.push(thread);
  return persist() ? thread.id : null;
}
export function publicTravelGroup(experienceId) {
  return messagingState().threads.find((thread) => thread.status === 'active' && thread.group && thread.context?.experienceId === experienceId && !thread.context.offerId && !thread.context.requestId);
}
export function getOrCreateTravelGroupThread(experienceId, label) {
  const selfId = activeSocialUser().id;
  const existing = publicTravelGroup(experienceId);
  if (existing) {
    existing.title = label;
    existing.context.label = label;
    if (!existing.participantIds.includes(selfId)) {
      existing.participantIds.push(selfId);
      existing.unreadBy[selfId] = 0;
    }
    return persist() ? existing.id : null;
  }
  const timestamp = now();
  const thread = { id: `group-${experienceId}`, participantIds: [selfId], group: true, title: label, context: { kind: 'public', experienceId, label }, createdAt: timestamp, updatedAt: timestamp, lastMessageId: null, unreadBy: { [selfId]: 0 }, status: 'active' };
  messagingState().threads.push(thread);
  return persist() ? thread.id : null;
}
export function getOrCreateSharedTripThread(offerId) {
  const data = tripData();
  const offer = data?.offerings?.find((item) => item.id === offerId && item.mode === 'shared');
  if (!offer) return null;
  const bookings = data.requests.filter((request) => request.offerId === offerId && (['accepted', 'completed'].includes(request.status) && request.paymentStatus === 'paid' || request.status === 'cancelled' && request.paymentStatus === 'refunded'));
  const members = [...new Set([...(offer.teamGuideIds || [offer.guideId]), ...bookings.map((request) => socialState().users.find((user) => user.accountEmail?.toLowerCase() === request.travelerEmail)?.id).filter(Boolean)])];
  const selfId = activeSocialUser().id;
  if (!members.includes(selfId) || !bookings.length) return null;
  const id = `trip-${offerId}`;
  const existing = messagingState().threads.find((thread) => thread.group && thread.status === 'active' && (thread.context?.offerId === offerId || thread.context?.linkedOfferIds?.includes(offerId)) && eligibleSharedTripMember(thread, selfId));
  if (existing) {
    existing.participantIds = members;
    existing.unreadBy = Object.fromEntries(members.map((member) => [member, existing.unreadBy?.[member] || 0]));
    existing.title = `Shared trip · ${offer.date}`;
    existing.context = { ...existing.context, offerId, experienceId: offer.experienceId, label: existing.title };
    return persist() ? existing.id : null;
  }
  const createdAt = now();
  const title = `Shared trip · ${offer.date}`;
  const thread = { id, participantIds: members, group: true, title, context: { experienceId: offer.experienceId, offerId, label: title }, createdAt, updatedAt: createdAt, lastMessageId: null, unreadBy: Object.fromEntries(members.map((member) => [member, 0])), status: 'active' };
  messagingState().threads.push(thread);
  messagingState().messages.push({ id: `system-${crypto.randomUUID()}`, threadId: id, senderId: null, text: 'Welcome to this shared departure. Agree on the meeting point and preparation here. Each party keeps its booking and payment private.', createdAt, readBy: members, deliveredTo: members, system: true });
  return persist() ? id : null;
}
export function refreshSharedTripThread(sourceOfferId, targetOfferId = sourceOfferId) {
  const data = tripData();
  const target = data?.offerings?.find((offer) => offer.id === targetOfferId);
  if (!target) return null;
  const thread = messagingState().threads.find((entry) => entry.group && entry.status === 'active' && (entry.context?.offerId === sourceOfferId || entry.context?.linkedOfferIds?.includes(sourceOfferId)));
  if (!thread) return null;
  const bookings = data.requests.filter((request) => request.offerId === targetOfferId && (['accepted', 'completed'].includes(request.status) && request.paymentStatus === 'paid' || request.status === 'cancelled' && request.paymentStatus === 'refunded'));
  const members = [...new Set([...(target.teamGuideIds || [target.guideId]), ...bookings.map((request) => socialState().users.find((user) => user.accountEmail?.toLowerCase() === request.travelerEmail)?.id).filter(Boolean)])];
  thread.context = { ...thread.context, linkedOfferIds: [...new Set([...(thread.context.linkedOfferIds || []), sourceOfferId])], offerId: targetOfferId, experienceId: target.experienceId, label: `Shared trip · ${target.date}` };
  thread.title = thread.context.label;
  thread.participantIds = members;
  thread.unreadBy = Object.fromEntries(members.map((member) => [member, thread.unreadBy?.[member] || 0]));
  return persist() ? thread.id : null;
}
export function leaveTravelGroupThread(threadId) {
  const selfId = activeSocialUser().id;
  const thread = chatThread(threadId);
  if (!thread?.group || !thread.participantIds.includes(selfId)) return false;
  thread.participantIds = thread.participantIds.filter((id) => id !== selfId);
  delete thread.unreadBy[selfId];
  return persist();
}
export function markChatThreadRead(threadId) {
  const thread = chatThread(threadId);
  const selfId = activeSocialUser().id;
  if (!thread || !thread.participantIds.includes(selfId)) return false;
  let changed = false;
  messagingState().messages.filter((message) => message.threadId === threadId && !message.readBy.includes(selfId)).forEach((message) => { message.readBy.push(selfId); changed = true; });
  if (thread.unreadBy[selfId]) { thread.unreadBy[selfId] = 0; changed = true; }
  return changed ? persist() : true;
}
export function sendChatMessage(threadId, text, attachment = null, options = {}) {
  const thread = chatThread(threadId);
  const senderId = activeSocialUser().id;
  const clean = String(text || '').trim().slice(0, 1000);
  if (!thread || !thread.participantIds.includes(senderId) || !clean) return false;
  const attachmentId = attachment?.id || attachment?.postId;
  const allowedAttachment = ['social-post', 'experience', 'destination', 'attraction'].includes(attachment?.type) && attachmentId;
  const normalizedAttachment = attachment?.type === 'image' && attachment.localImage ? { type: 'image', localImage: attachment.localImage } : attachment?.type === 'audio' && attachment.localAudio ? { type: 'audio', localAudio: attachment.localAudio } : attachment?.type === 'sticker' && attachment.value ? { type: 'sticker', value: attachment.value } : allowedAttachment ? { type: attachment.type, ...(attachment.type === 'social-post' ? { postId: attachmentId } : { id: attachmentId }) } : null;
  const replyTo = options.replyTo ? chatMessage(threadId, options.replyTo) : null;
  const safetySignal = thread.context?.requestId ? analyzeBookingMessage(clean) : null;
  const message = { id: `chat-${crypto.randomUUID()}`, threadId, senderId, text: clean, createdAt: now(), readBy: [senderId], deliveredTo: [senderId, ...thread.participantIds.filter((id) => id !== senderId)], ...(replyTo ? { replyTo: { id: replyTo.id, text: replyTo.text, senderId: replyTo.senderId } } : {}), ...(normalizedAttachment ? { attachment: normalizedAttachment } : {}), ...(safetySignal ? { safetySignal: { kind: safetySignal.kind, advice: safetySignal.advice } } : {}) };
  messagingState().messages.push(message);
  thread.lastMessageId = message.id;
  thread.updatedAt = message.createdAt;
  thread.participantIds.filter((id) => id !== senderId).forEach((recipientId) => { thread.unreadBy[recipientId] = (thread.unreadBy[recipientId] || 0) + 1; });
  return persist();
}
export function sendChatSystemMessage(threadId, text, metadata = {}) {
  const thread = chatThread(threadId);
  const clean = String(text || '').trim().slice(0, 1000);
  if (!thread || !clean) return false;
  const createdAt = now();
  const message = { id: `system-${crypto.randomUUID()}`, threadId, senderId: null, text: clean, createdAt, readBy: [...thread.participantIds], deliveredTo: [...thread.participantIds], system: true, ...metadata };
  messagingState().messages.push(message);
  thread.lastMessageId = message.id;
  thread.updatedAt = createdAt;
  return persist();
}
export function editChatMessage(threadId, messageId, text) {
  const message = chatMessage(threadId, messageId);
  const clean = String(text || '').trim().slice(0, 1000);
  if (!message || message.senderId !== activeSocialUser().id || !clean) return false;
  message.text = clean;
  message.editedAt = now();
  return persist();
}
export function deleteChatMessage(threadId, messageId) {
  const message = chatMessage(threadId, messageId);
  if (!message || message.senderId !== activeSocialUser().id) return false;
  message.text = '';
  message.deletedAt = now();
  message.attachment = null;
  return persist();
}
export function toggleChatReaction(threadId, messageId, emoji = '👍') {
  const message = chatMessage(threadId, messageId);
  if (!message) return false;
  const userId = activeSocialUser().id;
  message.reactions ||= {};
  message.reactions[emoji] ||= [];
  message.reactions[emoji] = message.reactions[emoji].includes(userId) ? message.reactions[emoji].filter((id) => id !== userId) : [...message.reactions[emoji], userId];
  if (!message.reactions[emoji].length) delete message.reactions[emoji];
  return persist();
}
export function toggleChatFavorite(threadId, messageId) {
  const message = chatMessage(threadId, messageId);
  if (!message) return false;
  message.favoriteBy ||= [];
  const userId = activeSocialUser().id;
  message.favoriteBy = message.favoriteBy.includes(userId) ? message.favoriteBy.filter((id) => id !== userId) : [...message.favoriteBy, userId];
  return persist();
}
export function toggleChatPin(threadId, messageId) {
  const message = chatMessage(threadId, messageId);
  if (!message) return false;
  message.pinned = !message.pinned;
  return persist();
}
export function toMessagingFirebaseFixture(source = messagingState()) {
  return {
    conversations: source.threads.map((thread) => ({
      id: thread.id, schemaVersion: 1, participantIds: thread.participantIds, context: thread.context,
      status: thread.status, createdAt: thread.createdAt, updatedAt: thread.updatedAt,
      lastMessageAt: thread.updatedAt,
      lastMessagePreview: source.messages.find((message) => message.id === thread.lastMessageId)?.text || null,
    })),
    messages: source.messages.map((message) => ({
      id: message.id, conversationId: message.threadId, senderId: message.senderId,
      text: message.text, createdAt: message.createdAt, readBy: message.readBy, deliveredTo: message.deliveredTo || [], attachment: message.attachment || null,
    })),
  };
}
