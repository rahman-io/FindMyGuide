import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

import './styles/reset.css';
import './styles/tokens.css';
import './styles/global.css';
import './styles/social.css';
import './styles/messaging.css';
import './styles/safety-interactions.css';
import './styles/recommendations.css';
import './styles/trip-intelligence.css';
import './styles/booking-intelligence.css';
import './styles/travel-intelligence.css';
import './styles/guides.css';
import './styles/utilities.css';
import './styles/sumbawa.css';
import './styles/authentication.css';
import './styles/bottom-navigation.css';
import './styles/transport.css';

const container = document.getElementById('app');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
