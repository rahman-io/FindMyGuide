const patterns = [
  { kind: 'outside_payment', expression: /(?:transfer|pay|send|bayar|kirim).{0,50}(?:direct|outside|rekening|bank|wallet|dana|ovo|gopay|whatsapp|cash)|(?:rekening|bank account|crypto wallet).{0,40}(?:transfer|pay|bayar)/i, advice: 'Payment outside the booking can be hard to verify. Keep the agreed total and any payment changes in the booking record.' },
  { kind: 'sensitive_code', expression: /\b(?:otp|password|pin|verification code|kode verifikasi)\b.{0,35}\b(?:send|share|give|kirim|bagikan|beri)\b|\b(?:send|share|give|kirim|bagikan|beri)\b.{0,35}\b(?:otp|password|pin|verification code|kode verifikasi)\b/i, advice: 'Never send account passwords or one-time login codes. Show the booking verification code only in person at the meeting point.' },
  { kind: 'threat', expression: /\b(?:threaten|hurt you|kill you|ancam|bunuh|lukai|paksa)\b/i, advice: 'This message may indicate a safety issue. You can pause the trip and open Safety Center to record a report.' },
  { kind: 'price_change', expression: /(?:price|cost|harga|biaya|pay|bayar).{0,50}(?:increase|extra|additional|tambahan|naik)|(?:increase|extra|additional|tambahan|naik).{0,50}(?:price|cost|harga|biaya)/i, advice: 'The booked price is fixed. A different amount should not be requested through chat.' },
];

export function analyzeBookingMessage(text) {
  const value = String(text || '').slice(0, 1000);
  return patterns.find(({ expression }) => expression.test(value)) || null;
}

export function bookingAssistantAdvice(request) {
  const safety = request?.safety || {};
  if (!request || request.status === 'declined') return 'Check the booking details before planning the trip.';
  if (request.status === 'cancelled') return 'This booking was cancelled and a demo refund was recorded. Review the booking history for details.';
  if (safety.reports?.some((report) => report.status === 'open')) return 'A report is waiting for review. Keep relevant details in the booking and avoid agreeing to changes outside it.';
  if (request.status === 'completed') return 'The trip is complete. Review the itinerary and leave feedback about the guide.';
  if (request.paymentStatus !== 'paid') return 'Confirm the agreed price, travel date, group size and package before paying.';
  if (safety.proposal) return 'A date, time or meeting place change needs the other person’s approval before it takes effect.';
  if (!safety.meetingPoint) return 'Agree on a precise public meeting point before departure. Keep the booking code private until you meet.';
  if (request.verificationStatus !== 'verified') return 'At the meeting point, compare the Booking ID and let the guide enter the traveler’s code.';
  if (request.bookingStatus !== 'in_progress') return 'The guide can request the start. The traveler should confirm they are with the correct guide.';
  if (!safety.guideEndedAt) return 'During the trip, the traveler can check in safely or report a concern from Safety Center.';
  return 'The guide marked the trip finished. The traveler should confirm completion or report a problem.';
}
