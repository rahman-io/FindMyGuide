import { state } from '../../app/store.js';
import { mainLayout } from '../../layouts/MainLayout.js';
import { header } from '../../components/Header.js';
import { icon } from '../../components/icons.js';
import { escapeHtml } from '../../utils/html.js';
import { experiences, images } from '../experiences/data.js';
import { activeSocialUser, socialFollowerCount, socialFollowingCount, socialState, visibleSocialPosts } from '../social/repository.js';
import { getGamificationSummary, getTravelMissions, getTravelProfileIntelligence } from '../travel-intelligence/repository.js';
import { getInstallState, isInstalledApp } from '../onboarding/install.js';
import { guideById } from '../guides/repository.js';
const groups = [
  ['Settings', [['Personal details', 'personal'], ['Saved cards', 'cards'], ['Currency', 'currency'], ['Language', 'language'], ['Appearance', 'appearance'], ['Notifications', 'notifications'], ['Privacy', 'privacy']]],
  ['Support', [['About FindMyGuide', 'about'], ['Chat with us', 'chat'], ['Help center', 'help']]],
];
export function profileView() {
  const greetingName = state.guestName.startsWith('A ') ? state.guestName.slice(2) : state.guestName.split(' ')[0];
  const social = socialState();
  const user = activeSocialUser();
  const userId = user.id;
  const guideApplication = user.guideApplicationId ? guideById(user.guideApplicationId) : null;
  const ownPosts = visibleSocialPosts().filter((post) => post.authorId === userId);
  const intelligenceContext = { userState: state, posts: social.posts, userId, catalog: experiences };
  const profileIntelligence = getTravelProfileIntelligence(intelligenceContext);
  const missions = getTravelMissions(intelligenceContext);
  const gamification = getGamificationSummary(missions);
  const installState = getInstallState();
  const installAvailable = !isInstalledApp() && (installState.platform === 'ios' || (installState.platform === 'android' && installState.canPrompt));
  return mainLayout(`
    <div class="page-pad profile-page"><div class="profile-hero"><div class="profile-brand"><span class="app-brand-mark">FMG</span><strong>FindMyGuide</strong></div><a class="profile-edit-button" href="#/profile/personal">Edit Profile</a><div class="profile-user"><button class="profile-photo-button" data-action="choose-profile-photo" aria-label="Change profile photo"><img class="profile-user-photo" src="${escapeHtml(state.profilePhoto || images.login)}" alt="Profile photo" /><span>${icon('camera', 16)}</span></button><input id="profile-photo-input" type="file" accept="image/*" hidden /><div class="profile-user-heading"><h1>👋 Hi ${escapeHtml(greetingName.toLowerCase())}</h1><div class="profile-vibes-stats"><a href="#/social/user/${escapeHtml(userId)}"><strong>${ownPosts.length}</strong><span>posts</span></a><a href="#/social/user/${escapeHtml(userId)}"><strong>${socialFollowerCount(userId)}</strong><span>followers</span></a><a href="#/social/user/${escapeHtml(userId)}"><strong>${socialFollowingCount(userId)}</strong><span>following</span></a></div></div></div></div>
      <a class="profile-link promo-link" href="#/profile/promos">${icon('tickets', 22)}<span>Your promos</span>${icon('chevron', 20)}</a>
      <a class="profile-link wishlist-profile-link" href="#/wishlist">${icon('heart', 22)}<span>Wishlist</span>${icon('chevron', 20)}</a>
      ${user.role === 'guide' ? `<a class="profile-link wishlist-profile-link" href="#/guide">${icon('user', 22)}<span>Guide workspace</span>${icon('chevron', 20)}</a>` : guideApplication ? `<section class="profile-guide-application"><div><strong>Guide application</strong><span class="guide-status guide-status-${escapeHtml(guideApplication.status)}">${escapeHtml(guideApplication.status === 'pending' ? 'Pending review' : guideApplication.status)}</span></div><p>${guideApplication.status === 'pending' ? 'Your traveler account stays active while the team reviews your guide application.' : 'Your application was not approved. Update it and submit again when ready.'}</p>${guideApplication.associationName ? `<small>Association: ${escapeHtml(guideApplication.associationName)} · self-reported, not verified</small>` : ''}${guideApplication.status === 'rejected' ? '<a href="#/guide/apply">Update application →</a>' : ''}</section>` : `<a class="profile-link wishlist-profile-link" href="#/guide/apply">${icon('user', 22)}<span>Become a guide</span>${icon('chevron', 20)}</a>`}
      <section class="travel-intelligence-card"><div class="travel-intelligence-heading"><span>${icon('sparkle', 17)} Travel profile intelligence</span><small>${profileIntelligence.confidence}% confidence</small></div><h2>${escapeHtml(profileIntelligence.persona)}</h2><p>Most aligned destination: <strong>${escapeHtml(profileIntelligence.topCity)}</strong></p><div class="travel-profile-signals"><span>${profileIntelligence.signals} signals</span><span>${escapeHtml(profileIntelligence.pace)}</span></div></section>
      <section class="travel-missions-card"><div class="travel-intelligence-heading"><span>${icon('star', 17)} Travel missions</span><strong>Level ${gamification.level}</strong></div><div class="gamification-progress"><span style="width:${gamification.progress}%"></span></div><div class="gamification-summary"><strong>${gamification.points} pts</strong><small>${escapeHtml(gamification.title)} · ${gamification.nextLevelPoints - gamification.points} pts to next level</small></div><div class="travel-missions-list">${missions.map((mission) => `<div class="travel-mission ${mission.completed ? 'completed' : ''}"><span class="travel-mission-icon">${mission.completed ? '✓' : '✦'}</span><span><strong>${escapeHtml(mission.title)}</strong><small>${escapeHtml(mission.description)}</small><em>${mission.progress}/${mission.target} · +${mission.reward} pts</em></span>${mission.completed && !mission.claimed ? `<button data-action="travel-mission-claim" data-id="${escapeHtml(mission.id)}">Claim</button>` : mission.claimed ? '<b>Claimed</b>' : ''}</div>`).join('')}</div></section>
      ${groups.map(([heading, rows]) => `<section class="profile-group"><h2>${heading}</h2>${rows.map(([label, route]) => `<a class="profile-link" href="#/profile/${route}"><span>${label}</span><small>${route === 'currency' ? state.currency : route === 'language' ? state.language : route === 'appearance' ? 'System default' : ''}</small>${icon('chevron', 19)}</a>`).join('')}</section>`).join('')}
      ${installAvailable ? `<section class="profile-group profile-install-group"><h2>App</h2><button class="profile-link" data-action="install-info"><span>Install app</span>${icon('chevron', 19)}</button></section>` : ''}
      <button class="text-link profile-logout" data-action="sign-out">Log out</button>
    </div>
  `, 'Profile');
}
export function profileSectionView(section) {
  const titles = { personal: 'Personal details', cards: 'Saved cards', currency: 'Currency', language: 'Language', appearance: 'Appearance', notifications: 'Notifications', privacy: 'Privacy', about: 'About FindMyGuide', chat: 'Chat with us', help: 'Help center', promos: 'Your promos' };
  const title = titles[section] || 'Settings';
  let body = '';
  if (section === 'personal') body = `<label class="form-label">Name<input id="profile-name" value="${escapeHtml(state.guestName)}" /></label><label class="form-label">Email address<input id="profile-email" type="email" value="${escapeHtml(state.email)}" /></label><button class="primary-button full" data-action="save-profile">Save changes</button>`;
  else if (section === 'currency') body = ['USD ($)', 'EUR (€)', 'PLN (zł)', 'GBP (£)'].map((value) => `<button class="choice-row ${state.currency === value ? 'active' : ''}" data-action="set-currency" data-value="${value}">${value}${state.currency === value ? icon('check') : ''}</button>`).join('');
  else if (section === 'language') body = ['English', 'Bahasa Indonesia', 'Polski', 'Français'].map((value) => `<button class="choice-row ${state.language === value ? 'active' : ''}" data-action="set-language" data-value="${value}">${value}${state.language === value ? icon('check') : ''}</button>`).join('');
  else if (section === 'cards') body = `<div class="empty-state">${icon('credit', 48)}<h2>No saved cards</h2><p>Cards used at checkout will appear here.</p></div>`;
  else if (section === 'promos') body = `<div class="empty-state">${icon('tickets', 48)}<h2>No promos yet</h2><p>Your offers will appear here.</p></div>`;
  else if (section === 'privacy') body = `<div class="privacy-setting"><span><strong>Online status</strong><small>Allow travelers to see when you are online.</small></span><button class="privacy-toggle ${state.privacy.onlineStatus ? 'active' : ''}" data-action="toggle-privacy" data-value="onlineStatus" aria-pressed="${state.privacy.onlineStatus}">${state.privacy.onlineStatus ? 'On' : 'Off'}</button></div><div class="privacy-setting"><span><strong>Read receipts</strong><small>Show when you have read messages.</small></span><button class="privacy-toggle ${state.privacy.readReceipts ? 'active' : ''}" data-action="toggle-privacy" data-value="readReceipts" aria-pressed="${state.privacy.readReceipts}">${state.privacy.readReceipts ? 'On' : 'Off'}</button></div>`;
  else body = `<div class="empty-state">${icon('info', 45)}<h2>${title}</h2><p>Manage your ${title.toLowerCase()} here.</p></div>`;
  return mainLayout(`${header(title)}<div class="page-pad settings-content">${body}</div>`, 'Profile');
}
