import { destinations, attractions, experiences, experienceCategories, getFeaturedExperiences, images } from '../experiences/data.js';
import { horizontalTile, experienceCard } from '../../components/cards.js';
import { icon } from '../../components/icons.js';
import { mainLayout } from '../../layouts/MainLayout.js';
import { state } from '../../app/store.js';
import { escapeHtml } from '../../utils/html.js';
import { getRecommendedExperiences } from '../recommendations/repository.js';
import { visibleSocialPosts } from '../social/repository.js';
import { socialBookingSignals } from '../social/intelligence.js';
import { inboxBadge } from '../inbox/repository.js';

function greetingName() {
  return state.guestName.startsWith('A ') ? state.guestName.slice(2) : state.guestName.split(' ')[0];
}

function destinationTile(item) {
  return `<div class="tile destination-tile"><a class="tile-link" href="#/results?city=${encodeURIComponent(item.name)}"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" /><span class="destination-tile-copy"><strong>${escapeHtml(item.name)}</strong>${item.location ? `<span class="destination-tile-location">${icon('pin', 13)}<span>${escapeHtml(item.location)}</span></span>` : ''}<span class="destination-tile-meta">${item.count ? `<span>${escapeHtml(item.count)}</span>` : ''}${item.rating ? `<span>${icon('star', 13)} ${escapeHtml(item.rating)}</span>` : ''}</span></span></a>${item.imageCredit ? `<a class="tile-image-credit" href="${escapeHtml(item.imageCredit.url)}" target="_blank" rel="noopener noreferrer">Photo: ${escapeHtml(item.imageCredit.label)}</a>` : ''}<button class="destination-share-button" data-action="share-destination" data-kind="destination" data-id="${escapeHtml(item.name)}" aria-label="Share ${escapeHtml(item.name)}">${icon('send', 18)}</button></div>`;
}

function categoryTile(item) {
  return `<div class="category-card"><a class="category-card-link" href="#/results?city=${encodeURIComponent(item.city || 'Lombok')}&category=${encodeURIComponent(item.value)}"><img src="${escapeHtml(item.image)}" alt="" loading="lazy" /><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.description)}</small><em>${item.count} ${item.count === 1 ? 'experience' : 'experiences'}</em></span></a>${item.imageCredit ? `<a class="tile-image-credit category-image-credit" href="${escapeHtml(item.imageCredit.url)}" target="_blank" rel="noopener noreferrer">Photo: ${escapeHtml(item.imageCredit.label)}</a>` : ''}</div>`;
}

function trendingDestinations(posts, recommendations) {
  return destinations.map((item, index) => {
    const name = item.name.toLowerCase();
    const relatedPosts = posts.filter((post) => `${post.location || ''} ${post.caption || ''}`.toLowerCase().includes(name));
    const socialScore = relatedPosts.reduce((score, post) => score + post.likedBy.length + post.comments.length * 2 + Number(post.shareCount || 0) + (post.shares?.length || 0), 0);
    const recommendationScore = recommendations.filter(({ experience }) => experience.city.toLowerCase() === name).length * 5;
    return { item, score: socialScore + relatedPosts.length * 4 + recommendationScore, index };
  }).sort((a, b) => b.score - a.score || a.index - b.index).map(({ item }) => item);
}

export function homeView() {
  const recommendations = getRecommendedExperiences(state, experiences);
  const posts = visibleSocialPosts();
  const communitySignals = new Map(socialBookingSignals(posts).map((signal) => [signal.experienceId, signal]));
  const communityLabel = (item) => { const signal = communitySignals.get(item.id); return signal?.posts ? `Shared by ${signal.posts} traveler${signal.posts === 1 ? '' : 's'} on Vibes` : ''; };
  const topDestinations = trendingDestinations(posts, recommendations);
  return mainLayout(`
    <div class="home-brand"><span class="app-brand-mark">FMG</span><strong>FindMyGuide</strong></div>
    <section class="home-hero">
      <div class="hero-top"><div class="home-greeting"><div class="home-greeting-row"><div><h1>Hi, ${escapeHtml(greetingName())}</h1><p>Where would you like to go today?</p></div><a class="home-profile-link" href="#/profile" aria-label="Open profile"><img class="home-profile-photo" src="${escapeHtml(state.profilePhoto || images.login)}" alt="Profile photo" /></a></div></div><a class="inbox-button" href="#/inbox" aria-label="Inbox">${icon('bell', 21)}${inboxBadge()}</a></div>
      <a href="#/search" class="search-pill">${icon('search', 19)}<span>Find places and things to do</span></a>
    </section>
    <section class="home-ai-planner"><a href="#/trip-planner" class="home-ai-planner-card"><div class="home-ai-planner-content"><span class="home-ai-planner-badge">${icon('sparkle', 12)} AI Travel Companion</span><strong class="home-ai-planner-title">Plan a smarter trip</strong><small class="home-ai-planner-sub">Let AI match your interests with bookable experiences.</small></div><div class="home-ai-robot-wrap"><svg class="home-ai-robot" viewBox="0 0 80 88" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g class="robot-body-group"><rect class="robot-body" x="8" y="32" width="64" height="48" rx="16" fill="#E8EDF8"/><rect class="robot-face" x="16" y="38" width="48" height="36" rx="12" fill="#1A1D2E"/><g class="robot-eyes"><ellipse class="robot-eye robot-eye-left" cx="29" cy="54" rx="5" ry="5" fill="#3B9EFF"/><ellipse class="robot-pupil-left" cx="29" cy="54" rx="2.5" ry="2.5" fill="#fff"/><ellipse class="robot-eye robot-eye-right" cx="51" cy="54" rx="5" ry="5" fill="#3B9EFF"/><ellipse class="robot-pupil-right" cx="51" cy="54" rx="2.5" ry="2.5" fill="#fff"/><rect class="robot-blink-left" x="24" y="50" width="10" height="0" rx="5" fill="#1A1D2E"/><rect class="robot-blink-right" x="46" y="50" width="10" height="0" rx="5" fill="#1A1D2E"/></g><g class="robot-mouth-group"><path class="robot-mouth" d="M30 66 Q40 73 50 66" stroke="#3B9EFF" stroke-width="2.5" stroke-linecap="round" fill="none"/></g><rect class="robot-antenna-base" x="36" y="24" width="8" height="10" rx="4" fill="#E8EDF8"/><circle class="robot-antenna-tip" cx="40" cy="20" r="5" fill="#3B9EFF"/><circle class="robot-antenna-glow" cx="40" cy="20" r="7" fill="#3B9EFF" opacity="0.25"/><rect class="robot-ear-left" x="4" y="44" width="7" height="16" rx="3.5" fill="#E8EDF8"/><rect class="robot-ear-right" x="69" y="44" width="7" height="16" rx="3.5" fill="#E8EDF8"/><rect class="robot-chest-light" x="34" y="68" width="12" height="5" rx="2.5" fill="#3B9EFF" opacity="0.5"/></g></svg></div></a></section>
    <section class="home-transport-banner">
    <!-- Premium Orange Transport Card -->
    <a href="#/transport" style="display: block; text-decoration: none; margin: 12px 0; width: 100%; box-sizing: border-box;">
      <div style="background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%); border-radius: 28px; padding: 24px; color: white; position: relative; overflow: hidden; box-shadow: 0 12px 30px rgba(255,107,53,0.35); display: flex; flex-direction: column; justify-content: space-between; min-height: 180px;">
        
        <!-- Top Tags Row -->
        <div style="display: flex; justify-content: space-between; align-items: center; z-index: 2;">
          <span style="background: rgba(255,255,255,0.25); backdrop-filter: blur(8px); padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; letter-spacing: 0.3px;">Lembar & Gili Mas</span>
          <span style="background: rgba(255,255,255,0.25); backdrop-filter: blur(8px); padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 500;">Fixed Fare</span>
        </div>

        <!-- Middle Title & Vehicle Image -->
        <div style="display: flex; justify-content: space-between; align-items: flex-end; z-index: 2; margin-top: 15px;">
          <div>
            <h3 style="font-size: 24px; font-weight: 700; margin: 0 0 6px 0; line-height: 1.1; letter-spacing: -0.5px;">Port & Airport<br>Transfer</h3>
            <span style="font-size: 13px; opacity: 0.9; text-decoration: underline; font-weight: 500;">Show more</span>
          </div>
          <div style="width: 140px; height: 90px; display: flex; align-items: center; justify-content: center; margin-bottom: -10px; margin-right: -10px;">
            <img src="./images/vehicle-mpv.webp" alt="Transport" style="width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 8px 12px rgba(0,0,0,0.3)); transform: scale(1.15);" onerror="this.style.display='none'" />
          </div>
        </div>

        <!-- Subtle background decorative circle -->
        <div style="position: absolute; right: -30px; bottom: -30px; width: 160px; height: 160px; background: rgba(255,255,255,0.1); border-radius: 50%; z-index: 1;"></div>
      </div>
    </a>
    </section>
    <section class="home-section home-categories"><div class="home-section-heading"><div><h2>Explore by category</h2><p>Find experiences across Lombok, Sumbawa, and beyond</p></div>${icon('sparkle', 18)}</div><div class="tile-row category-row">${experienceCategories.map(categoryTile).join('')}</div></section>
    <section class="home-section home-destinations"><div class="home-destinations-heading"><div class="home-destinations-title-row"><h2>Top destinations</h2><a href="#/search">See all</a></div><span>${icon('sparkle', 14)} Trending on Vibes</span></div><div class="tile-row" data-home-destination-carousel>${topDestinations.map(destinationTile).join('')}</div></section>
    <section class="home-section"><h2>Attractions you can't miss</h2><div class="tile-row attraction-row">${attractions.map((item) => horizontalTile(item, item.experienceId ? '/experience/' + encodeURIComponent(item.experienceId) : item.name === 'Mount Rinjani' ? '/experience/arena' : '/results?city=' + encodeURIComponent(item.city))).join('')}</div></section>
    ${recommendations.length ? `<section class="home-section recommendation-section"><h2>Picked for you</h2><div class="feature-grid">${recommendations.map(({ experience, reason }) => experienceCard({ ...experience, recommendationReason: reason, communityReason: communityLabel(experience) }, 'grid')).join('')}</div></section>` : ''}
    <section class="home-section last"><h2>Go beyond the guidebook</h2><div class="feature-grid">${getFeaturedExperiences().map((item) => experienceCard({ ...item, communityReason: communityLabel(item) }, 'grid')).join('')}</div></section>
  `, 'Discover', { className: 'home-page' });
}
