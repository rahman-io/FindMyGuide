# Architecture

## Stack and deployment

This project uses HTML, CSS, and vanilla JavaScript ES modules. Vite produces static assets. Hash routes keep direct navigation compatible with GitHub Pages project URLs. The web app manifest and service worker enable installation and basic offline repeat visits.

## Ownership by feature

- `app/` owns route selection, application state, and DOM event handling.
- `components/` owns UI reused across two or more screens.
- `features/` owns screen templates and domain data. A team can work independently within one feature directory.
- `layouts/` owns the phone shell and persistent bottom navigation. Device status and gesture indicators are left to the operating system.
- `services/` is the boundary for persistence and future Firebase calls.
- `styles/` owns tokens, reset, shared layout, and screen styles.
- `assets/` contains imagery extracted from the supplied visual reference and cleaned photo variants. These should be reviewed for licensing before public commercial release.

## Routes

| Route | Screen |
| --- | --- |
| `#/` | Discover home |
| `#/login` | Intro and sign-in mockup |
| `#/search` | Place search |
| `#/results?city=Rome` | Activity results |
| `#/map?city=Rome` | Map and activity list |
| `#/experience/:id` | Activity detail |
| `#/booking/:id` | Participants, date, language, and option |
| `#/checkout/:id` | Contact and payment choice |
| `#/card/:id` | Card details mockup |
| `#/wishlist` and `#/wishlist/favourites` | Saved activities |
| `#/bookings` | Bookings |
| `#/profile` and `#/profile/:section` | Profile and settings |
| `#/inbox` and `#/inbox/chat/:threadId` | Combined messages, travel updates, and private chat |

## State and backend integration

`app/store.js` holds UI state and persists safe prototype preferences to local storage. `features/experiences/data.js` is the sample catalog: activity cards, city results, featured items, and photo galleries derive from its records. `services/firebase.js` is an explicit integration boundary. When a backend is added, replace local mock data with authenticated services and keep the view modules focused on rendering. Live activity prices, availability, account data, saved cards, and payments must come from backend services before production.

## Team conventions

Add a view under its feature folder, reuse components and tokens before adding styles, and use `data-action` for app interactions. Add new routes in `app/app.js`. Keep route payloads URL safe and escape user supplied strings before placing them in HTML templates. Do not put secrets into frontend code or GitHub Actions files.
