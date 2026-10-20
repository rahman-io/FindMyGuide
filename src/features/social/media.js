import { images } from '../experiences/data.js';

export const socialImages = {
  kayaking: images.kayaking,
  kayakingSunset: images.kayakingThumbB,
  skydiving: images.skydiving,
  skydivingFriends: images.skydivingThumbA,
  pantheon: images.pantheon,
  pantheonDetail: images.pantheonThumbB,
  rome: images.rome,
  paris: images.paris,
  agafay: images.agafay,
  sumo: images.sumo,
  vatican: images.vaticanTour,
  colosseum: images.colosseum,
};

export function socialMediaItems(post) {
  if (Array.isArray(post?.media) && post.media.length) {
    return post.media.map((item, index) => typeof item === 'string'
      ? { id: `${post.id}-media-${index}`, imageKey: item, localImage: null }
      : { id: item.id || `${post.id}-media-${index}`, imageKey: item.imageKey || item.assetKey || null, localImage: item.localImage || item.url || null });
  }
  return [{ id: `${post?.id || 'social'}-media-0`, imageKey: post?.imageKey, localImage: post?.localImage || null }];
}

export function socialImagesForPost(post) {
  return socialMediaItems(post).map((item) => item.localImage || socialImages[item.imageKey] || socialImages.kayaking);
}

export function socialImage(post) { return socialImagesForPost(post)[0]; }
