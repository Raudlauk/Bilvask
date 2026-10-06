import { db } from './server';
import { DEFAULT_SITE_NAME } from './brand';

// Read on its own and defensively: if the site_name column does not exist yet
// (migration not applied) or the database is unavailable, fall back to the default.
export async function getSiteName() {
  try {
    const row = await db().prepare('SELECT site_name AS siteName FROM booking_settings WHERE id=1').first<{ siteName: string | null }>();
    return row?.siteName?.trim() || DEFAULT_SITE_NAME;
  } catch {
    return DEFAULT_SITE_NAME;
  }
}
