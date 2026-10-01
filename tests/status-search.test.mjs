import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Deferred responses deliberately resolve even after abort to test stale-response guards.
const states=[],refs=[],effects=[],requests=[];
let stateIndex=0,refIndex=0,effectIndex=0,queued=[],tree;
const jsx=(type,props)=>({type,props});
const exports={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/status/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{
 exports,AbortController,URLSearchParams,
 require(name){
  if(name==='react')return {
   useState(initial){const i=stateIndex++;if(!(i in states))states[i]=initial;return [states[i],value=>states[i]=value]},
   useRef(initial){const i=refIndex++;return refs[i]??(refs[i]={current:initial})},
   useEffect(fn,deps){const i=effectIndex++,prev=effects[i];if(!prev||deps.some((v,j)=>v!==prev.deps[j]))queued.push(()=>{prev?.cleanup?.();effects[i]={deps,cleanup:fn()}})},
  };
  if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
  if(name.includes('language'))return {useLanguage:()=>({t:s=>s,language:'nb'})};
  if(name.includes('wash-status'))return {washStatuses:['Bestilt','Påbegynt','Ferdig']};
  if(name.includes('schedule'))return {dateLabel:String,timeLabel:String};
  return {default:{}};
 },
 window:{location:{hash:'',pathname:'/status',search:''}},
 fetch(url,options){return new Promise((resolve,reject)=>requests.push({url,options,resolve,reject}))},
});
function render(){stateIndex=refIndex=effectIndex=0;tree=exports.default();const work=queued;queued=[];work.forEach(fn=>fn())}
function nodes(n){if(!n||typeof n!=='object')return [];return Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)]}
function form(){return nodes(tree).find(n=>n.type==='form')}
function submit(){form().props.onSubmit({preventDefault(){}});render();return requests.shift()}
function edit(index,value){nodes(form()).filter(n=>n.type==='input')[index].props.onChange({target:{value}});form().props.onChange();render()}
function busy(){return nodes(form()).find(n=>n.type==='button').props.disabled}
function result(){return nodes(tree).find(n=>n.type==='div'&&n.props.role==='status')}
async function respond(req,body,ok=true,status=200){req.resolve({ok,status,json:async()=>body});await new Promise(setImmediate);render()}
render();await respond(requests.shift(),{statusEnabled:true});
const success={date:'2030-01-08',start:480,status:1};
for(const index of [0,1]){
 const old=submit();edit(index,'changed');assert.ok(old.options.signal.aborted);assert.equal(busy(),false);
 const current=submit();await respond(old,success);assert.equal(result(),undefined);assert.equal(busy(),true,'Old completion cannot clear new loading state');
 await respond(current,success);assert.ok(result(),'Current response displays normally');
}
const oldError=submit();edit(0,'another');await respond(oldError,{error:'old error'},false,403);
assert.ok(form(),'Stale 403 cannot disable the form');assert.ok(!nodes(tree).some(n=>n.props.role==='alert'));
const superseded=submit(),latest=submit();assert.ok(superseded.options.signal.aborted);await respond(superseded,success);assert.equal(result(),undefined);await respond(latest,success);assert.ok(result());
const pending=submit();effects.forEach(e=>e.cleanup?.());assert.ok(pending.options.signal.aborted,'Unmount cancels lookup');
console.log('PASS: edits cancel searches, stale results/errors ignored, latest search wins, loading ownership and unmount cleanup');
