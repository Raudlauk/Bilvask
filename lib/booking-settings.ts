import { defaultMapsUrl } from './maps';
import { db } from './server';
import { bookingDeadline } from './schedule';

export async function getBookingSettings() {
  const row = await db().prepare('SELECT status_enabled AS statusEnabled,customer_changes AS customerChanges,large_car_percent AS largeCarPercent,weeks_ahead AS weeksAhead,inside_minutes AS insideMinutes,outside_minutes AS outsideMinutes,weekdays,maps_url AS mapsUrl FROM booking_settings WHERE id=1').first<{ statusEnabled:number;customerChanges:number;largeCarPercent:number;weeksAhead: number;insideMinutes:number;outsideMinutes:number;weekdays:number;mapsUrl:string }>();
  const polish=await db().prepare('SELECT enabled,minutes,price FROM polish_settings WHERE id=1').first<{enabled:number;minutes:number;price:number|null}>();
  const weeksAhead = row?.weeksAhead ?? 8;
  // Customer changes happen in Vaskestatus, so they require status to be enabled.
  return { statusEnabled:row?.statusEnabled===1,customerChanges:row?.statusEnabled===1&&row?.customerChanges===1,largeCarPercent:row?.largeCarPercent??0,mapsUrl:row?.mapsUrl??defaultMapsUrl,weeksAhead,polishEnabled:polish?.enabled===1,polishMinutes:polish?.minutes??60,polishPrice:polish?.price??null, insideMinutes:row?.insideMinutes??30,outsideMinutes:row?.outsideMinutes??30,weekdays:(row?.weekdays??44)&62, maxDate: bookingDeadline(weeksAhead) };
}
