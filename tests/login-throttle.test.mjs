import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const require=createRequire(import.meta.url);

// Staff login limits: only failures count, per username and per IP, with no site-wide lockout.
const sqlite=new DatabaseSync(':memory:');
for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync('drizzle/'+file,'utf8'));
const DB={prepare(sql){let params=[];const execute=method=>{const statement=sqlite.prepare(sql);return /\?\d/.test(sql)?statement[method](Object.fromEntries(params.map((p,i)=>[String(i+1),p]))):statement[method](...params);};return {bind(...values){params=values;return this},async first(){return execute('get')??null},async all(){return {results:execute('all')}},async run(){return {meta:execute('run')}}};},async batch(statements){const result=[];for(const stmt of statements)result.push(await stmt.run());return result}};
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports,require:name=>name==='cloudflare:workers'?{env:{DB}}:name.startsWith('node:')?require(name):load(name.startsWith('@/')?name.slice(2)+'.ts':path.resolve(path.dirname(file),name)+'.ts'),crypto,Request,Response,URL,TextEncoder,TextDecoder,SyntaxError,AbortSignal,Date,Intl,console},{filename:file});return exports;}
const server=load('lib/server.ts'),admin=load('app/api/admin/route.ts');
const salt=crypto.randomUUID();sqlite.prepare('INSERT INTO admins(id,username,hash,salt,version) VALUES(1,?,?,?,2)').run('admin',await server.passwordHash('Admin-test-9274',salt),salt);
const login=async(username,password,ip)=>(await admin.POST(new Request('http://localhost/api/admin',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json','cf-connecting-ip':ip},body:JSON.stringify({action:'login',username,password})}))).status;

// 5 failures for one username are allowed; the 6th attempt is blocked even with the right password.
for(let i=0;i<5;i++)assert.equal(await login('admin','wrong',`10.0.1.${i}`),401);
assert.equal(await login('admin','Admin-test-9274','10.0.1.99'),429,'username locked after 5 failures, from any IP');
sqlite.exec('DELETE FROM attempts');

// A successful login clears the count, so normal use never adds up.
for(let round=0;round<3;round++){
 for(let i=0;i<4;i++)assert.equal(await login('admin','wrong','10.0.2.1'),401);
 assert.equal(await login('admin','Admin-test-9274','10.0.2.1'),200,'success after 4 failures, round '+round);
}
sqlite.exec('DELETE FROM attempts');

// One IP may fail 10 times across usernames, then it is blocked.
for(let i=0;i<10;i++)assert.equal(await login('guess'+i,'wrong','10.0.3.1'),401);
assert.equal(await login('admin','Admin-test-9274','10.0.3.1'),429,'IP blocked after 10 failures');
assert.equal(await login('admin','Admin-test-9274','10.0.3.2'),200,'other IPs are unaffected');
sqlite.exec('DELETE FROM attempts');

// No site-wide lockout: many failures for other usernames from many IPs do not block a real user.
for(let i=0;i<40;i++)assert.equal(await login('attacker'+(i%8),'wrong',`10.0.4.${i}`),401);
assert.equal(await login('admin','Admin-test-9274','10.0.5.1'),200,'admin can still log in');
console.log('PASS: login limits count failures per username (5) and per IP (10), successes reset, no site-wide lockout');
