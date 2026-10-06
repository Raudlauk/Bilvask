import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsxRuntime from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';

const states=[];let index=0;
const requests=[];
function load(file){
 const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports,AbortController,
  require(name){
   if(name==='react')return {useState(initial){const i=index++;if(!(i in states))states[i]=initial;return [states[i],value=>states[i]=typeof value==='function'?value(states[i]):value]},useEffect(){}};
   if(name==='react/jsx-runtime')return jsxRuntime;
   if(name.includes('language'))return {useLanguage:()=>({t:s=>s})};
   if(name.includes('wash-status'))return {washStatuses:['Bestilt','Påbegynt','Ferdig']};
   throw new Error(name);
  },
  fetch:async(url,options)=>{requests.push(JSON.parse(options.body));return {ok:true,json:async()=>({})}},
 });return exports;
}
function nodes(n){if(!n||typeof n!=='object')return [];return Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)]}
const {UserManager}=load('components/user-manager.tsx');
function render(){index=0;return UserManager()}
render();
states[0]=[{id:'reader',username:'Review reader',active:1,role:'viewer'},{id:'manager',username:'Review manager',active:0,role:'manager'}];
states[5]=true;
let tree=render();let selectors=nodes(tree).filter(n=>n.type==='select');
assert.equal(selectors.length,3);assert.equal(selectors[0].props.value,'viewer');assert.equal(selectors[1].props.value,'viewer');assert.equal(selectors[2].props.value,'manager');
for(const select of selectors)assert.deepEqual(nodes(select).filter(n=>n.type==='option').map(n=>n.props.value),['viewer','manager']);
selectors[1].props.onChange({target:{value:'manager'}});await new Promise(setImmediate);assert.deepEqual(requests.pop(),{action:'role',id:'reader',role:'manager'});
tree=render();assert.ok(nodes(tree).some(n=>n.type==='button'&&n.props.children==='Aktiver'));assert.ok(nodes(tree).some(n=>n.type==='button'&&n.props.children==='Deaktiver'));
// Creation submits the selected access level, while password values never appear in the fixture.
const inputs=nodes(tree).filter(n=>n.type==='input');for(const [i,value] of ['new-worker','Fixture-pass-123','Fixture-pass-123'].entries())inputs[i].props.onChange({target:{value}});
selectors[0].props.onChange({target:{value:'manager'}});tree=render();nodes(tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await new Promise(setImmediate);assert.equal(requests.pop().role,'manager');
states[1]=states[2]=states[3]='';tree=render();
if(process.argv.includes('--fixture'))fs.writeFileSync('public/_review-access.html','<!doctype html><html lang="nb"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>'+fs.readFileSync('app/globals.css','utf8')+'</style><body><main class="shell">'+renderToStaticMarkup(tree)+'</main></body></html>');
const {WashProgress}=load('components/wash-progress.tsx');index=0;const readOnly=WashProgress({id:'booking',status:1,readOnly:true,onSaved(){}});assert.equal(nodes(readOnly).filter(n=>n.type==='button').length,0);assert.ok(renderToStaticMarkup(readOnly).includes('Påbegynt'));
index=0;assert.equal(nodes(WashProgress({id:'booking',status:1,onSaved(){}})).filter(n=>n.type==='button').length,3);
console.log('PASS: access creation/edit controls, existing activation controls, and read-only status rendering.');
