import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const require=createRequire(import.meta.url);

// Customer self-service: phone + code, 2-hour cutoff, move limit, and staff visibility.
const sqlite=new DatabaseSync(':memory:');
for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync('drizzle/'+file,'utf8'));
const DB={prepare(sql){let params=[];const execute=method=>{const statement=sqlite.prepare(sql);return /\?\d/.test(sql)?statement[method](Object.fromEntries(params.map((p,i)=>[String(i+1),p]))):statement[method](...params);};return {bind(...values){params=values;return this},async first(){return execute('get')??null},async all(){return {results:execute('all')}},async run(){return {meta:execute('run')}}};},async batch(statements){const result=[];for(const stmt of statements)result.push(await stmt.run());return result}};
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports,require:name=>name==='cloudflare:workers'?{env:{DB}}:name.startsWith('node:')?require(name):load(name.startsWith('@/')?name.slice(2)+'.ts':path.resolve(path.dirname(file),name)+'.ts'),crypto,Request,Response,URL,TextEncoder,TextDecoder,SyntaxError,AbortSignal,Date,Intl,console},{filename:file});return exports;}
const route=load('app/api/customer-booking/route.ts'),admin=load('app/api/admin/route.ts'),server=load('lib/server.ts'),schedule=load('lib/schedule.ts');
let ip=0;
const call=async body=>{const r=await route.POST(new Request('http://localhost/api/customer-booking',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json','cf-connecting-ip':'10.0.0.'+(++ip)},body:JSON.stringify(body)}));return {status:r.status,body:await r.json()};};
const shift=days=>{const d=new Date(schedule.today()+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
const weekday=from=>{let n=from;while([0,6].includes(new Date(shift(n)+'T12:00:00Z').getUTCDay()))n++;return shift(n);};
const dayA=weekday(3),dayB=weekday(Math.round((Date.parse(dayA)-Date.parse(schedule.today()))/86400000)+1);
const add=(id,code,date,start,extra={})=>sqlite.prepare('INSERT INTO bookings (id,status_code,name,phone,date,start,duration,inside,outside,created,status,customer_moves) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(id,code,extra.name??'Kari Nordmann',extra.phone??'41234567',date,start,30,0,1,Date.now(),extra.status??0,extra.moves??0);
const row=id=>sqlite.prepare('SELECT * FROM bookings WHERE id=?').get(id);
sqlite.exec("INSERT INTO booking_settings (id,status_enabled,customer_changes,weekdays,weeks_ahead) VALUES (1,1,0,62,8)");
sqlite.exec("INSERT INTO contact (id,name,phone,email,address,vipps) VALUES (1,'Steam','98 67 63 26','','','')");
const id='11111111-1111-4111-8111-111111111111';add(id,'ABC234',dayA,600);

// Off by default: nothing is exposed until staff enable it.
assert.equal((await call({action:'options',code:'ABC234',phone:'41234567'})).status,403);
sqlite.exec('UPDATE booking_settings SET customer_changes=1');

// Phone number is required; name or a wrong number is not enough.
assert.equal((await call({action:'options',code:'ABC234',phone:'Kari Nordmann'})).status,404);
assert.equal((await call({action:'options',code:'ABC234',phone:'49999999'})).status,404);
assert.equal((await call({action:'options',code:'abc234',phone:'412 34 567'})).status,200,'code is case-insensitive and phone spaces are ignored');

const options=(await call({action:'options',code:'ABC234',phone:'41234567'})).body;
assert.equal(options.canMove,true);assert.equal(options.canCancel,true);assert.equal(options.contactPhone,'98 67 63 26');
assert.ok(options.dates.some(d=>d.date===dayB&&d.slots.includes(600)),'other days are offered');
assert.ok(!options.dates.find(d=>d.date===dayA)?.slots.includes(600),'current slot is not offered');
assert.ok(options.dates.every(d=>schedule.blocked(d.date,62)===false),'only open weekdays');

// Move succeeds, counts the move, and is logged for staff.
const moved=await call({action:'move',code:'ABC234',phone:'41234567',date:dayB,start:600});
assert.equal(moved.status,200,JSON.stringify(moved.body));
assert.equal(row(id).date,dayB);assert.equal(row(id).customer_moves,1);assert.ok(row(id).customer_changed_at>0);
const log=sqlite.prepare("SELECT * FROM booking_changes WHERE booking_id=? AND action='moved'").get(id);
assert.equal(log.old_date,dayA);assert.equal(log.old_start,600);assert.equal(log.new_date,dayB);assert.equal(log.new_start,600);assert.equal(log.name,'Kari Nordmann');

// Taken slots are refused atomically.
add('22222222-2222-4222-8222-222222222222','DEF567',dayA,660,{phone:'48888888'});
assert.equal((await call({action:'move',code:'ABC234',phone:'41234567',date:dayA,start:660})).status,409);
assert.equal(row(id).date,dayB,'booking unchanged after conflict');

// New time must be at least 2 hours ahead.
const tooSoon=await call({action:'move',code:'ABC234',phone:'41234567',date:schedule.today(),start:schedule.currentMinutes()+30});
assert.equal(tooSoon.status,409);assert.match(tooSoon.body.error,/2 timer/);

// Move limit: cancelling stays possible.
sqlite.prepare('UPDATE bookings SET customer_moves=3 WHERE id=?').run(id);
assert.equal((await call({action:'move',code:'ABC234',phone:'41234567',date:dayA,start:540})).status,409);
const limited=(await call({action:'options',code:'ABC234',phone:'41234567'})).body;
assert.equal(limited.canMove,false);assert.equal(limited.canCancel,true);assert.deepEqual(limited.dates,[]);
sqlite.prepare('UPDATE bookings SET customer_moves=0 WHERE id=?').run(id);

// Started washes and appointments within 2 hours cannot be changed or cancelled.
sqlite.prepare('UPDATE bookings SET status=1 WHERE id=?').run(id);
assert.equal((await call({action:'cancel',code:'ABC234',phone:'41234567'})).status,409);
sqlite.prepare('UPDATE bookings SET status=0 WHERE id=?').run(id);
const pastId='33333333-3333-4333-8333-333333333333';add(pastId,'GHJ892',shift(-1),600);
const late=await call({action:'cancel',code:'GHJ892',phone:'41234567'});
assert.equal(late.status,409);assert.match(late.body.error,/2 timer/);assert.ok(row(pastId),'late booking kept');

// Cancel removes the booking and logs it so staff can see it.
assert.equal((await call({action:'cancel',code:'ABC234',phone:'41234567'})).status,200);
assert.equal(row(id),undefined);
assert.ok(sqlite.prepare("SELECT 1 FROM booking_changes WHERE booking_id=? AND action='cancelled'").get(id));

// Staff see recent customer changes in the work list.
const salt=crypto.randomUUID();sqlite.prepare('INSERT INTO admins(id,username,hash,salt,version) VALUES(1,?,?,?,2)').run('admin',await server.passwordHash('Admin-test-9274',salt),salt);
const loginResponse=await admin.POST(new Request('http://localhost/api/admin',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json','cf-connecting-ip':'10.1.0.1'},body:JSON.stringify({action:'login',username:'admin',password:'Admin-test-9274'})}));
const cookie=loginResponse.headers.get('set-cookie').split(';')[0];
const work=await (await admin.GET(new Request('http://localhost/api/admin',{headers:{cookie}}))).json();
assert.deepEqual(work.customerChanges.map(c=>c.action).sort(),['cancelled','moved']);
console.log('PASS: customer changes need phone + code, respect the 2-hour cutoff and move limit, and are visible to staff');
