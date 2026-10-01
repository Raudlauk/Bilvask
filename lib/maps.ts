export const defaultMapsUrl='https://maps.app.goo.gl/eLbrjaFsUCS2t9VNA';
export const mapsUrlError='Lim inn en Google Maps-lenke som starter med https://maps.app.goo.gl/ eller https://www.google.com/maps/. Åpne stedet i Google Maps og kopier lenken via Del. Vanlige nettadresser, som komplett.no, kan ikke brukes.';
export function validMapsUrl(value:unknown):value is string {
  if(typeof value!=='string'||value.length>2048)return false;
  try {
    const url=new URL(value);
    if(url.protocol!=='https:'||url.username||url.password||url.port)return false;
    return url.hostname==='maps.app.goo.gl'||(url.hostname==='goo.gl'&&url.pathname.startsWith('/maps/'))||url.hostname==='maps.google.com'||(['google.com','www.google.com','google.no','www.google.no'].includes(url.hostname)&&/^\/maps(?:\/|$)/.test(url.pathname));
  }catch{return false;}
}
