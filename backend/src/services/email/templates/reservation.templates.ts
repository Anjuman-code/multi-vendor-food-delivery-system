import {
  ReservationReminderPayload,
  ReservationRequestedCustomerPayload,
  ReservationStatusUpdatedPayload,
  ReservationVendorAlertPayload,
} from '../email.types';
import { alertCallout, keyValList, primaryButton, statusBadge } from './components';
import { renderEmailLayout, RenderedEmail } from './layout';
import { escapeHtml } from './utils';

export function renderReservationRequestedCustomer(
  data: ReservationRequestedCustomerPayload,
): RenderedEmail {
  const subject = `Table Reservation Request: ${data.restaurantName} (#${data.reservationNumber})`;
  const preheader = `Your reservation request for ${data.partySize} guests on ${data.date} at ${data.time} is being processed.`;

  const meta = [
    { label: 'Reservation Number', value: `#${data.reservationNumber}` },
    { label: 'Restaurant', value: data.restaurantName },
    { label: 'Date', value: data.date },
    { label: 'Time', value: data.time },
    { label: 'Party Size', value: `${data.partySize} Guests` },
    { label: 'Address', value: data.restaurantAddress },
    ...(data.specialRequests ? [{ label: 'Special Requests', value: data.specialRequests }] : []),
  ];

  const contentHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#111827;" class="text-dark">Reservation Request</h1>
      ${statusBadge(data.status, data.status.toUpperCase(), data.status === 'confirmed' ? 'success' : 'warning')}
    </div>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Hi ${escapeHtml(data.guestName)}, thank you for reserving a table at <strong>${escapeHtml(data.restaurantName)}</strong>.
    </p>

    ${keyValList(meta)}

    ${alertCallout(
      'The restaurant host will review table availability. We will email you once your booking is confirmed.',
      'info',
      'Booking Status',
    )}

    ${primaryButton('View Reservation Details', data.detailsUrl)}
  `;

  const contentText = `
Reservation Request: #${data.reservationNumber}
Restaurant: ${data.restaurantName}
Date & Time: ${data.date} at ${data.time}
Party Size: ${data.partySize} Guests
Status: ${data.status.toUpperCase()}

View booking details:
${data.detailsUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
  });
}

export function renderReservationVendorAlert(
  data: ReservationVendorAlertPayload,
): RenderedEmail {
  const subject = `New Table Booking: #${data.reservationNumber} (${data.partySize} guests)`;
  const preheader = `New table reservation for ${data.date} at ${data.time}. Host action required.`;

  const meta = [
    { label: 'Reservation Number', value: `#${data.reservationNumber}` },
    { label: 'Guest Name', value: data.guestName },
    { label: 'Contact Phone', value: data.guestPhone },
    { label: 'Date & Time', value: `${data.date} at ${data.time}` },
    { label: 'Party Size', value: `${data.partySize} Guests` },
    ...(data.specialRequests ? [{ label: 'Special Notes', value: data.specialRequests }] : []),
  ];

  const contentHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#111827;" class="text-dark">New Table Reservation</h1>
      ${statusBadge('requested', 'New Booking', 'brand')}
    </div>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      A customer has booked a table at <strong>${escapeHtml(data.restaurantName)}</strong>. Please review capacity and assign a table.
    </p>

    ${keyValList(meta)}

    ${primaryButton('Manage Reservations in Portal', data.vendorReservationsUrl)}
  `;

  const contentText = `
New Table Reservation: #${data.reservationNumber}
Guest: ${data.guestName} (${data.guestPhone})
Date & Time: ${data.date} at ${data.time}
Party Size: ${data.partySize} Guests

Manage table bookings:
${data.vendorReservationsUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
  });
}

export function renderReservationStatusUpdated(
  data: ReservationStatusUpdatedPayload,
): RenderedEmail {
  const isConfirmed = data.status === 'confirmed';
  const isRejected = data.status === 'rejected';
  const statusLabel = isConfirmed ? 'Confirmed' : isRejected ? 'Declined' : data.status.toUpperCase();
  const tone = isConfirmed ? 'success' : isRejected ? 'danger' : 'info';

  const subject = `Reservation #${data.reservationNumber} is ${statusLabel} (${data.restaurantName})`;
  const preheader = `Your reservation for ${data.partySize} guests on ${data.date} has been ${statusLabel.toLowerCase()}.`;

  const meta = [
    { label: 'Reservation Number', value: `#${data.reservationNumber}` },
    { label: 'Restaurant', value: data.restaurantName },
    { label: 'Date & Time', value: `${data.date} at ${data.time}` },
    { label: 'Party Size', value: `${data.partySize} Guests` },
    { label: 'Status', value: statusLabel },
    ...(data.reason ? [{ label: 'Note from Host', value: data.reason }] : []),
  ];

  const contentHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#111827;" class="text-dark">Reservation ${statusLabel}</h1>
      ${statusBadge(data.status, statusLabel, tone)}
    </div>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      Hi ${escapeHtml(data.guestName)}, your reservation at <strong>${escapeHtml(data.restaurantName)}</strong> is now <strong>${escapeHtml(statusLabel.toLowerCase())}</strong>.
    </p>

    ${keyValList(meta)}

    ${
      isConfirmed
        ? alertCallout(
            'Your table will be held for 15 minutes past your booking time. If you need to modify or cancel, please inform the restaurant in advance.',
            'success',
            'Table Confirmed',
          )
        : isRejected
          ? alertCallout(
              data.reason || 'The restaurant was unable to accommodate this booking due to capacity constraints.',
              'danger',
              'Declined by Restaurant',
            )
          : ''
    }

    ${primaryButton('View Reservation Details', data.detailsUrl)}
  `;

  const contentText = `
Reservation #${data.reservationNumber} Update: ${statusLabel}
Restaurant: ${data.restaurantName}
Date & Time: ${data.date} at ${data.time}
Party Size: ${data.partySize}
Status: ${statusLabel}
${data.reason ? `Host Note: ${data.reason}\n` : ''}
Details:
${data.detailsUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
  });
}

export function renderReservationReminder(
  data: ReservationReminderPayload,
): RenderedEmail {
  const subject = `Reminder: Upcoming Reservation at ${data.restaurantName} (${data.time})`;
  const preheader = `Reminder for your booking today at ${data.time} (${data.partySize} guests).`;

  const meta = [
    { label: 'Reservation Number', value: `#${data.reservationNumber}` },
    { label: 'Restaurant', value: data.restaurantName },
    { label: 'Time Today', value: data.time },
    { label: 'Party Size', value: `${data.partySize} Guests` },
    { label: 'Address', value: data.restaurantAddress },
  ];

  const contentHtml = `
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;" class="text-dark">Upcoming Reservation Reminder</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;line-height:1.6;" class="text-muted">
      We look forward to seeing you at <strong>${escapeHtml(data.restaurantName)}</strong> today!
    </p>

    ${keyValList(meta)}

    ${alertCallout(
      'Tables are reserved for your arrival. Please arrive on time to ensure immediate seating.',
      'brand',
      'See you soon!',
    )}

    ${primaryButton('View Directions & Booking', data.detailsUrl)}
  `;

  const contentText = `
Upcoming Reservation Reminder!
Restaurant: ${data.restaurantName}
Time Today: ${data.time}
Party Size: ${data.partySize} Guests
Address: ${data.restaurantAddress}

Directions and details:
${data.detailsUrl}
`;

  return renderEmailLayout({
    subject,
    preheader,
    contentHtml,
    contentText,
  });
}
