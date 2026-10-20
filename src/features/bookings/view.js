import { icon } from '../../components/icons.js';
import { mainLayout } from '../../layouts/MainLayout.js';
export function bookingsView() {
  return mainLayout(`
    <div class="page-pad bookings-page"><h1>Bookings</h1><div class="tab-row"><button class="tab active">Upcoming</button><button class="tab" data-action="booking-history">Past</button></div>
      <div class="empty-state">${icon('tickets', 52)}<h2>No bookings yet</h2><p>Once you've booked an experience, you'll find your tickets and details here.</p><a class="primary-button" href="#/">Discover experiences</a></div>
    </div>
  `, 'Bookings');
}
