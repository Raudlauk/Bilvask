// Business hours are safely after Oslo's daylight-saving transitions.
export function calendarTime(date:string,minutes:number){
 const noon=new Date(date+'T12:00:00Z');
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Oslo',hour:'2-digit',hourCycle:'h23'}).format(noon));
 return new Date(Date.parse(date+'T00:00:00Z')+(minutes-(hour-12)*60)*60000).toISOString().replace(/[-:]/g,'').replace('.000','');
}
// iCalendar TEXT values must escape backslash, semicolon and comma.
const icsText=(value:string)=>value.replace(/[\\;,]/g,match=>'\\'+match);
export function calendarEvent(date:string,start:number,duration:number,uid:string,english:boolean,siteName='Steam'){
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Steam//Car wash//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${uid}@steam-bilvask`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART:${calendarTime(date,start)}`,`DTEND:${calendarTime(date,start+duration)}`,`SUMMARY:${icsText((english?'Car wash at ':'Bilvask hos ')+siteName)}`,'STATUS:CONFIRMED','END:VEVENT','END:VCALENDAR',''].join('\r\n');
}
