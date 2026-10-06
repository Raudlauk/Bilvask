import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const require=createRequire(import.meta.url);

// The site name is configurable, survives a missing migration, and is validated.
function harness(skipLast=false){
 const sqlite=new DatabaseSync(':memory:');
 const files=fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort();
 for(const file of skipLast?files.slice(0,-1):files)sqlite.exec(fs.readFileSync('drizzle/'+file,'utf8'));
 const DB={prepare(sql){let params=[];const execute=method=>{const statement=sqlite.prepare(sql);return /\?\d/.test(sql)?statement[method](Object.fromEntries(params.map((p,i)=>[String(i+1),p]))):statement[method](...params);};return {bind(...values){params=values;return this},async first(){return execute('get')??null},async all(){return {results:execute('all')}},async run(){return {meta:execute('run')}}};},async batch(statements){const result=[];for(const stmt of statements)result.push(await stmt.run());return result}};
 const cache=new Map();
 function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports,require:name=>name==='cloudflare:workers'?{env:{DB}}:name.startsWith('node:')?require(name):load(name.startsWith('@/')?name.slice(2)+'.ts':path.resolve(path.dirname(file),name)+'.ts'),crypto,Request,Response,URL,TextEncoder,TextDecoder,SyntaxError,AbortSignal,Date,Intl,console},{filename:file});return exports;}
 return {sqlite,load};
}

// Before migration 0018 the site keeps working with the default name.
const old=harness(true);
assert.equal(await old.load('lib/site-name.ts').getSiteName(),'Steam');

const {sqlite,load}=harness();
const siteName=load('lib/site-name.ts'),settings=load('app/api/booking-settings/route.ts'),admin=load('app/api/admin/route.ts'),server=load('lib/server.ts'),calendar=load('lib/calendar.ts');
assert.equal(await siteName.getSiteName(),'Steam','default before any settings row exists');
const salt=crypto.randomUUID();sqlite.prepare('INSERT INTO admins(id,username,hash,salt,version) VALUES(1,?,?,?,2)').run('admin',await server.passwordHash('Admin-test-9274',salt),salt);
const login=await admin.POST(new Request('http://localhost/api/admin',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json','cf-connecting-ip':'10.3.0.1'},body:JSON.stringify({action:'login',username:'admin',password:'Admin-test-9274'})}));
const cookie=login.headers.get('set-cookie').split(';')[0];
const save=(body,auth=cookie)=>settings.POST(new Request('http://localhost/api/booking-settings',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json',cookie:auth},body:JSON.stringify(body)}));
assert.equal((await save({action:'site-name',siteName:'Namsos Bilpleie'},'')).status,401,'only admins can rename');
for(const bad of ['','   ','<b>Steam</b>','x'.repeat(41),42])assert.equal((await save({action:'site-name',siteName:bad})).status,400,'rejects '+JSON.stringify(bad));
assert.equal((await save({action:'site-name',siteName:'  Namsos Bilpleie  '})).status,200);
assert.equal(await siteName.getSiteName(),'Namsos Bilpleie','trimmed name is stored');

// Calendar invites escape iCalendar special characters in the name.
const invite=calendar.calendarEvent('2030-01-02',600,30,'id',false,'Vask, Polering; AS');assert.ok(invite.includes('SUMMARY:Bilvask hos Vask\\, Polering\\; AS\r\n'),invite);
console.log('PASS: site name defaults to Steam (also before the migration), only admins can change it, input is validated, and calendar text is escaped');
