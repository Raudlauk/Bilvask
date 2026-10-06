import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Delivery failures must be diagnosable without logging addresses or tokens.
const env={BOOKING_PUBLIC_ORIGIN:'https://bilvask.example.no',BOOKING_RESEND_API_KEY:'re_test',BOOKING_EMAIL_FROM:'Steam <noreply@example.no>'};
let response;
const exports={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/reset-mail.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
 exports,AbortSignal,URL,
 require:name=>name==='cloudflare:workers'?{env}:{},
 fetch:async()=>response,
});
const config=exports.mailConfig();
assert.ok(config,'complete https configuration is accepted');

response=new Response(JSON.stringify({statusCode:403,name:'validation_error',message:'You can only send testing emails to owner@example.no'}),{status:403});
await assert.rejects(exports.sendResetEmail(config,'admin@example.no','token',false,'id'),error=>{
 assert.equal(error.message,'Resend responded 403 validation_error');
 assert.ok(!error.message.includes('@'),'no address in the logged message');
 return true;
});

response=new Response('not json',{status:502});
await assert.rejects(exports.sendResetEmail(config,'admin@example.no','token',false,'id'),{message:'Resend responded 502'});

response=new Response('{}',{status:200});
await exports.sendResetEmail(config,'admin@example.no','token',false,'id');

env.BOOKING_PUBLIC_ORIGIN='http://localhost:3000';
assert.equal(exports.mailConfig(),null,'plain http origin is rejected');
console.log('PASS: reset mail failures report status and error name only');
