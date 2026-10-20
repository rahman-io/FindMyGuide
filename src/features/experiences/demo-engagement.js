// Demo-only engagement records; replace with reviews and inbox documents after authentication.
export const demoMessages = [
  {
    id: 'epic-views',
    userId: null,
    type: 'Updates',
    experienceId: 'skydiving',
    title: '👀 Love epic views?',
    body: 'These viewpoints make gravity feel optional!',
    timeLabel: 'Sat, 6:21 PM',
    read: false,
  },
];

export function getDemoReviews(item) {
  return {
    featured: {
      author: 'Kristy',
      country: 'United Kingdom',
      dateLabel: 'October 3, 2026',
      verified: true,
      rating: 5,
      text: item.featuredReview || 'An unforgettable experience with a wonderful guide. Everything was well organized and the views were amazing.',
    },
    summary: {
      author: 'Verified traveler',
      verified: true,
      rating: 5,
      text: `Fantastic experience and a wonderful way to discover ${item.city}.`,
    },
    more: [
      { author: 'Kristy', country: 'United Kingdom', verified: true, rating: 5, text: 'Beautiful experience and a fantastic guide. Everything was easy to find and well organized.' },
      { author: 'Rachel', country: 'New Zealand', verified: true, rating: 5, text: 'Absolutely amazing. We would recommend this to anyone visiting.' },
    ],
  };
}
