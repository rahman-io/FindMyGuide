# FindMyGuide (React Application)

FindMyGuide is a mobile-first travel experience and local guide booking application rewritten in **React 19** with **Vite**. It preserves 100% of the core features, business logic, safety workflows, transport management, and social discovery from the original application.

## Key Features

- **Discover & Search**: Curated destination highlights, interactive search with live suggestions, categorized activities (Volcano, Culture, Ocean, Trekking), and Leaflet map exploration with nearby place layers.
- **Experience Details**: Rich photo galleries with swipe and lightbox zoom, package options, inclusions, day-by-day itineraries, traveler reviews, and live weather conditions.
- **Booking & Checkout Flow**: Participant counters, date selection with weekday price calculation, checkout review, payment options, and instant confirmation.
- **Safety Center & Verified Bookings**: QR code ticket generation, start/finish trip milestones, meeting point coordination with acknowledgement, trusted contact saving, and incident reporting.
- **Local Guides Platform**: Guide dashboard, dated departure offerings, multi-step Trip Builder with AirDatepicker and map pin search, team assignments, price proposals, availability calendar, and multi-step guide onboarding with KTP capture and biometric liveness verification.
- **Airport & Ferry Transfers**: Fixed-fare and dynamic transport quotes (MPV / Minibus), ferry arrival tracking with overnight schedule adjustments, driver assignment, real-time driver chat, and transfer rating.
- **Vibes (Social Feed)**: Travel moments feed, stories, double-tap to like, pinch-to-zoom galleries, post creation with photo drafts, comments, and profile feeds.
- **Unified Chat & Messaging**: Direct traveler-to-guide messaging, group departure channels, voice note recording with MediaRecorder, photo attachments, sticker sharing, message pinning, and safety detection.
- **Trip Intelligence**: Smart itinerary planner matching trip days and budget tiers.

## Development

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Run unit tests
npm test

# Build for production with PWA precaching
npm run build
```

## Architecture

- `src/App.jsx`: Core React root component managing application lifecycle, reactive state subscriptions, hash-based routing, Leaflet map lifecycle, audio recording, gestures, and modals.
- `src/main.jsx`: React entry point mounting the root application and service worker registration.
- `src/features/`: Domain repositories, mock stores, calculation models, and view components.
- `src/styles/`: Design system tokens, mobile phone shell layout, and screen-specific stylesheets.
- `src/services/`: Currency conversion, weather service, and persistence layer.
