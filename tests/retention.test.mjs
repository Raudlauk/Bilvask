import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const require=createRequire(import.meta.url);

// Personal data is removed after the retention period; nothing newer is touched.
const sqlite=new DatabaseSync(':memory:');
for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync('drizzle/'+file,'utf8'));
const DB={prepare(sql){let params=[];const execute=method=>{const statement=sqlite.prepare(sql);return /\?\d/.test(sql)?statement[method](Object.fromEntries(params.map((p,i)=>[String(i+1),p]))):statement[method](...params);};return {bind(...values){params=values;return this},async first(){return execute('get')??null},async all(){return {results:execute('all')}},async run(){return {meta:execute('run')}}};},async batch(statements){const result=[];for(const stmt of statements)result.push(await stmt.run());return result}};
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports,require:name=>name==='cloudflare:workers'?{env:{DB}}:name.startsWith('node:')?require(name):load(name.startsWith('@/')?name.slice(2)+'.ts':path.resolve(path.dirname(file),name)+'.ts'),crypto,Request,Response,URL,TextEncoder,TextDecoder,SyntaxError,AbortSignal,Date,Intl,console},{filename:file});return exports;}
const retention=load('lib/retention.ts'),policy=load('lib/retention-policy.ts'),schedule=load('lib/schedule.ts'),admin=load('app/api/admin/route.ts'),server=load('lib/server.ts');
const shift=days=>{const d=new Date(schedule.today()+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
const add=(id,date,code)=>sqlite.prepare('INSERT INTO bookings (id,status_code,name,phone,date,start,duration,inside,outside,created,price) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id,code,'Kari Nordmann','41234567',date,600,30,0,1,Date.now(),19900);
const days=policy.PERSONAL_DATA_RETENTION_DAYS;
add('old',shift(-days-1),'OLD234');add('edge',shift(-days),'EDG234');add('recent',shift(-10),'REC234');add('future',shift(5),'FUT234');
sqlite.prepare('INSERT INTO attempts (key,count,until) VALUES (?,?,?)').run('expired',3,Date.now()-1000);
sqlite.prepare('INSERT INTO attempts (key,count,until) VALUES (?,?,?)').run('active',3,Date.now()+60000);

await retention.cleanupPersonalData();
const row=id=>sqlite.prepare('SELECT * FROM bookings WHERE id=?').get(id);
assert.deepEqual([row('old').name,row('old').phone,row('old').status_code],['','',null],'older than the retention period is anonymised');
assert.equal(row('old').price,19900,'statistics (date, service, price) are kept');assert.equal(row('old').date,shift(-days-1));
for(const id of ['edge','recent','future'])assert.equal(row(id).name,'Kari Nordmann',id+' is kept');
assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM attempts WHERE key='expired'").get().n,0,'expired rate-limit rows removed');
assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM attempts WHERE key='active'").get().n,1,'active rate-limit rows kept');

// Viewing an old date in the work list must not hand the anonymised booking a new code.
const salt=crypto.randomUUID();sqlite.prepare('INSERT INTO admins(id,username,hash,salt,version) VALUES(1,?,?,?,2)').run('admin',await server.passwordHash('Admin-test-9274',salt),salt);
const login=await admin.POST(new Request('http://localhost/api/admin',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json','cf-connecting-ip':'10.2.0.1'},body:JSON.stringify({action:'login',username:'admin',password:'Admin-test-9274'})}));
const cookie=login.headers.get('set-cookie').split(';')[0];
const work=await (await admin.GET(new Request('http://localhost/api/admin?date='+shift(-days-1),{headers:{cookie}}))).json();
assert.equal(work.bookings[0].status_code,null);assert.equal(row('old').status_code,null);
console.log('PASS: personal data is anonymised after '+days+' days, newer bookings and statistics are kept, and expired rate-limit rows are removed');
