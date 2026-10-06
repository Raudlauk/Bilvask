import { authorized, db, getAdmin, json, readBody, sameOrigin } from '@/lib/server';
import { validMapsUrl, mapsUrlError } from '@/lib/maps';
import { getBookingSettings } from '@/lib/booking-settings';

export async function GET() {
  try { return json(await getBookingSettings()); }
  catch { return json({ error: 'Kunne ikke hente bestillingsinnstillingene.' }, 503); }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Ugyldig forespørsel.' }, 403);
  try {
    if (!await authorized(req)) return json({ error: 'Logg inn på nytt.' }, 401);
    if ((await getAdmin()).version === 1) return json({ error: 'Bytt standardpassordet først.' }, 403);
    const { statusEnabled, customerChanges, action, weeksAhead, insideMinutes, outsideMinutes, weekdays, mapsUrl, largeCarPercent } = await readBody(req);
    if(action==='status-enabled'){
      if(typeof statusEnabled!=='boolean'||(customerChanges!==undefined&&typeof customerChanges!=='boolean'))return json({error:'Ugyldig forespørsel.'},400);
      if(customerChanges===undefined)await db().prepare('INSERT INTO booking_settings(id,status_enabled) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET status_enabled=excluded.status_enabled').bind(Number(statusEnabled)).run();
      else await db().prepare('INSERT INTO booking_settings(id,status_enabled,customer_changes) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET status_enabled=excluded.status_enabled,customer_changes=excluded.customer_changes').bind(Number(statusEnabled),Number(customerChanges)).run();
      return json({ok:true});
    }
    if(action==='maps'){
      if(!validMapsUrl(mapsUrl))return json({error:mapsUrlError},400);
      await db().prepare('INSERT INTO booking_settings(id,maps_url) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET maps_url=excluded.maps_url').bind(mapsUrl).run();
      return json({ok:true});
    }
    if (typeof weeksAhead !== 'number' || !Number.isInteger(weeksAhead) || weeksAhead < 1 || weeksAhead > 52)
      return json({ error: 'Velg et helt antall uker mellom 1 og 52.' }, 400);
    if ([insideMinutes,outsideMinutes].some(v=>typeof v!=='number'||!Number.isInteger(v)||v<15||v>120||v%15!==0)) return json({error:'Velg vasketid fra 15 til 120 minutter i trinn på 15.'},400);
    if(typeof weekdays!=='number'||!Number.isInteger(weekdays)||weekdays<0||weekdays>62||(weekdays&62)!==weekdays)return json({error:'Velg gyldige ukedager.'},400);
    if(mapsUrl!==undefined&&!validMapsUrl(mapsUrl))return json({error:mapsUrlError},400);
    if(largeCarPercent!==undefined&&(typeof largeCarPercent!=='number'||!Number.isInteger(largeCarPercent)||largeCarPercent<0||largeCarPercent>1000))return json({error:'Velg et pristillegg fra 0 til 1000 prosent.'},400);
    // Only update supplied fields; independent forms may save concurrently.
    const columns=['weeks_ahead','inside_minutes','outside_minutes','weekdays'];
    const values:(string|number)[]=[weeksAhead,insideMinutes as number,outsideMinutes as number,weekdays];
    if(mapsUrl!==undefined){columns.push('maps_url');values.push(mapsUrl)}
    if(largeCarPercent!==undefined){columns.push('large_car_percent');values.push(largeCarPercent as number)}
    await db().prepare(`INSERT INTO booking_settings (id,${columns.join(',')}) VALUES (1,${columns.map(()=>'?').join(',')}) ON CONFLICT(id) DO UPDATE SET ${columns.map(column=>`${column}=excluded.${column}`).join(',')}`).bind(...values).run();
    return json({ ok: true });
  } catch (error) {
    return json({ error: error instanceof SyntaxError ? 'Ugyldig forespørsel.' : 'Kunne ikke lagre bestillingsinnstillingene.' }, error instanceof SyntaxError ? 400 : 503);
  }
}
