import { demoMessages } from '../experiences/demo-engagement.js';
import { activeSocialUser, socialActivity } from '../social/repository.js';
import { chatMessages, visibleChatThreads } from '../messaging/repository.js';
import { state } from '../../app/store.js';
import { visibleSocialPosts } from '../social/repository.js';
import { getContextAwareNotifications } from '../travel-intelligence/repository.js';

const STORAGE_KEY = 'lombok-inbox-demo-v1';
const clone = (value) => JSON.parse(JSON.stringify(value));

export function createSeedInboxState() {
  return { schemaVersion: 1, readIds: [] };
}

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.schemaVersion === 1 && Array.isArray(saved.readIds)) return saved;
  } catch { /* The inbox remains usable when storage is blocked. */ }
  return createSeedInboxState();
}

let currentState;
function inboxState() {
  currentState ||= readState();
  return currentState;
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(inboxState())); return true; }
  catch { return false; }
}

function isRead(id) { return inboxState().readIds.includes(id); }

export function markInboxItemRead(id) {
  if (!id || isRead(id)) return false;
  inboxState().readIds.push(id);
  return persist();
}

export function unreadInboxItems() {
  const selfId = activeSocialUser().id;
  const items = [];
  demoMessages.filter((message) => !message.read && !isRead(`update:${message.id}`)).forEach((message) => items.push({ id: `update:${message.id}`, type: 'Updates', source: message }));
  socialActivity(selfId).filter((event) => !isRead(`activity:${event.id}`)).forEach((event) => items.push({ id: `activity:${event.id}`, type: 'Activity', source: event }));
  getContextAwareNotifications({ userState: state, posts: visibleSocialPosts() }).filter((notification) => !isRead(`smart:${notification.id}`)).forEach((notification) => items.push({ id: `smart:${notification.id}`, type: 'Smart', source: notification }));
  return items;
}

export function getInboxUnreadCount() { return unreadInboxItems().length; }

export function inboxBadge() {
  const count = getInboxUnreadCount();
  return count ? `<span class="notification-dot">${count > 99 ? '99+' : count}</span>` : '';
}

export function chatBadge() {
  const selfId = activeSocialUser().id;
  const count = visibleChatThreads().reduce((total, thread) => total + chatMessages(thread.id).filter((message) => message.senderId !== selfId && !message.readBy.includes(selfId)).length, 0);
  return count ? `<span class="notification-dot">${count > 99 ? '99+' : count}</span>` : '';
}

export function toInboxFirebaseFixture(source = inboxState()) {
  return { notificationReads: clone(source.readIds).map((notificationId) => ({ notificationId, readAt: null, schemaVersion: 1 })) };
}
