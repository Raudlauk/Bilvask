# LINK Mobility SMS setup

The project now sends transactional SMS through the MyLINK SMS API for:

- New booking confirmation
- 24-hour booking reminder (when the appointment is more than 24 hours away)
- Admin date/time changes
- Admin cancellations

When an admin moves or cancels a booking, the previous scheduled reminder is cancelled using the deterministic LINK schedule tag for that booking. Moving a booking creates a replacement reminder when applicable.

## Configuration

Set these only on the server / Cloudflare environment. Never expose them to browser code.

```env
LINK_SMS_ENABLED=true
LINK_SMS_CLIENT_ID=
LINK_SMS_CLIENT_SECRET=
LINK_SMS_TOKEN_URL=https://sso.linkmobility.com/auth/realms/CPaaS/protocol/openid-connect/token
LINK_SMS_SENDER=Steam
```

`LINK_SMS_BEARER_TOKEN` is also supported as an alternative for testing or accounts that provide a bearer token directly.

The API client uses `POST https://api.linkmobility.com/sms/v1/messages` and scheduled-message management under `/sms/v1/schedules`.

Before production, confirm the OAuth token URL and permitted sender name for the specific LINK Mobility account. `LINK_SMS_TOKEN_URL` is configurable so account-specific authentication can be changed without code changes.

## Behavior when LINK is unavailable

Booking, rescheduling, and cancellation remain successful even if LINK temporarily fails. The server logs the SMS error, and admin reschedule/cancellation responses include an SMS warning so the employee can see that the booking change itself succeeded but the notification needs attention.

## Address in SMS

Confirmation, reminder, and reschedule SMS messages read the current address from the existing `contact` table (`id=1`). Keep the address in the admin contact settings up to date.
