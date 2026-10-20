import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeBookingMessage, bookingAssistantAdvice } from '../src/features/guides/safety.js';

test('booking chat flags likely off-platform payment and private-code requests without blocking ordinary coordination', () => {
  assert.equal(analyzeBookingMessage('Please transfer direct to my bank account')?.kind, 'outside_payment');
  assert.equal(analyzeBookingMessage('Send your OTP to me')?.kind, 'sensitive_code');
  assert.equal(analyzeBookingMessage('The price is extra now')?.kind, 'price_change');
  assert.equal(analyzeBookingMessage('See you at the public meeting point at 8:00 AM'), null);
});

test('trip assistant presents a safety step appropriate to the booking stage', () => {
  const request = { status: 'accepted', paymentStatus: 'paid', verificationStatus: 'unverified', bookingStatus: 'confirmed', safety: {} };
  assert.match(bookingAssistantAdvice(request), /meeting point/i);
  request.safety.meetingPoint = 'Sembalun village office';
  assert.match(bookingAssistantAdvice(request), /Booking ID/i);
  request.safety.reports = [{ status: 'open' }];
  assert.match(bookingAssistantAdvice(request), /report is waiting for review/i);
});
