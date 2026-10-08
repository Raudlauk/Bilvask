import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const require=createRequire(import.meta.url);

// Cost guard: no more than 100 SMS per day reach LINK Mobility.
const sqlite=new DatabaseSync(':memory:');
for(const file of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync('drizzle/'+file,'utf8'));
const DB={prepare(sql){let params=[];const execute=method=>{const statement=sqlite.prepare(sql);return /\?\d/.test(sql)?statement[method](Object.fromEntries(params.map((p,i)=>[String(i+1),p]))):statement[method](...params);};return {bind(...values){params=values;return this},async first(){return execute('get')??null},async all(){return {results:execute('all')}},async run(){return {meta:execute('run')}}};},async batch(statements){const result=[];for(const stmt of statements)result.push(await stmt.run());return result}};
const env={DB,LINK_SMS_BEARER_TOKEN:'test-token'};
let sent=0;
const fetch=async()=>{sent++;return new Response(JSON.stringify({requestId:'r',messages:[{messageId:'m'}]}),{status:200})};
const cache=new Map();
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports,require:name=>name==='cloudflare:workers'?{env}:name.startsWith('node:')?require(name):load(name.startsWith('@/')?name.slice(2)+'.ts':path.resolve(path.dirname(file),name)+'.ts'),crypto,Request,Response,URL,TextEncoder,TextDecoder,SyntaxError,AbortSignal,Date,Intl,console,fetch},{filename:file});return exports;}
const sms=load('lib/link-sms.ts');
assert.equal(sms.SMS_DAILY_CAP,100);
const booking=i=>({id:'id'+i,name:'Kari',phone:'41234567',date:'2030-01-02',start:600,duration:30});
for(let i=0;i<100;i++)await sms.sendBookingCancelled(booking(i));
assert.equal(sent,100);assert.equal(await sms.smsSentToday(),100);
await assert.rejects(sms.sendBookingCancelled(booking(101)),/Daily SMS cap of 100/);
await assert.rejects(sms.sendBookingConfirmation(booking(102)),/Daily SMS cap/);
assert.equal(sent,100,'nothing beyond the cap reaches LINK');
console.log('PASS: SMS stop at 100 per day without calling LINK');
