import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the booking component's effects with deterministic network and timers.
const states=[], effects=[], timers=new Set(), listeners=new Map();
let cursor=0, effectCursor=0, queued=[], requests=[], tree;
const react={
  useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value}];},
  useEffect(fn,deps){const i=effectCursor++,previous=effects[i];if(!previous||deps.some((v,j)=>v!==previous.deps[j]))queued.push(()=>{previous?.cleanup?.();effects[i]={deps,cleanup:fn()}});},
};
const jsx=(type,props)=>({type,props});
const exports={};
const source=fs.readFileSync('app/page.tsx','utf8')+'\nexport {Booking};';
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(code,{
  exports, AbortController, Date, Intl,
  require(name){if(name==='react')return react;if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};if(name==='@/components/language')return {useLanguage:()=>({t:s=>s,language:'nb'})};if(name==='@/lib/schedule')return {today:()=> '2030-01-01',blocked:()=>false,washDuration:()=>30,dateLabel:s=>s,timeLabel:String};return {};},
  fetch(url,options){return new Promise(resolve=>requests.push({url,signal:options.signal,resolve}));},
  setInterval(fn){timers.add(fn);return fn;},clearInterval(fn){timers.delete(fn);},
  document:{visibilityState:'visible'},window:{addEventListener:(event,fn)=>listeners.set(event,fn),removeEventListener:(event,fn)=>{if(listeners.get(event)===fn)listeners.delete(event)}},
});
const props={schedule:{weekdays:62},scheduleReady:true,inside:false,outside:true};
function render(){cursor=0;effectCursor=0;tree=exports.Booking(props);const pending=queued;queued=[];pending.forEach(fn=>fn());}
function nodes(node){if(!node||typeof node!=='object')return [];if(Array.isArray(node))return node.flatMap(nodes);return [node,...nodes(node.props?.children)];}
function buttons(){return nodes(tree).filter(n=>n.type==='button');}
async function respond(slots=[480,510],ok=true){const pending=requests;requests=[];for(const req of pending)req.resolve({ok,json:async()=>req.url.includes('month=')?{fullDates:[],closedDates:[],maxDate:'2030-02-01'}:{slots}});await new Promise(setImmediate);render();}
function selected(){return buttons().filter(n=>n.props.className?.startsWith('slot ')&&n.props['aria-pressed']);}
render();await respond();
buttons().find(n=>n.props['aria-label']==='2030-01-02').props.onClick();render();await respond();
buttons().find(n=>n.props.className==='slot ').props.onClick();render();assert.equal(selected().length,1);
assert.equal(timers.size,1,'Calendar and slots share one timer');
timers.forEach(fn=>fn());assert.ok(requests.some(r=>r.url.includes('date=2030-01-02')));
listeners.get('focus')();assert.equal(requests.length,2,'Overlapping refreshes are skipped');
await respond();assert.equal(selected().length,1,'Available selection survives refresh');
listeners.get('focus')();await respond([510]);assert.equal(selected().length,0,'Unavailable selection is cleared');
assert.equal(buttons().filter(n=>n.props.className?.startsWith('slot ')).length,1);
listeners.get('focus')();await respond([],false);assert.equal(buttons().filter(n=>n.props.className?.startsWith('slot ')).length,0,'Failures clear stale times');
listeners.get('focus')();await respond();assert.equal(buttons().filter(n=>n.props.className?.startsWith('slot ')).length,2,'Refresh recovers after failure');
listeners.get('focus')();const old=requests;requests=[];
buttons().find(n=>n.props['aria-label']==='2030-01-03').props.onClick();render();assert.ok(old.every(r=>r.signal.aborted));
await respond([540]);for(const req of old)req.resolve({ok:true,json:async()=>req.url.includes('month=')?{fullDates:[],closedDates:[],maxDate:'2030-02-01'}:{slots:[480]}});
await new Promise(setImmediate);render();assert.equal(buttons().find(n=>n.props.className==='slot ').props.children[0],'540','Outdated responses are ignored');
// The preview keeps the same Booking instance while switching visible slides.
Object.assign(props,{slideBooking:true,step:2,priceReady:true,price:null,setStep:step=>{props.step=step}});
render();
assert.equal(buttons().find(n=>n.props.children?.[0]==='Neste').props.disabled,true,'Next requires a selected time');
buttons().find(n=>n.props.className==='slot ').props.onClick();render();
buttons().find(n=>n.props.children?.[0]==='Neste').props.onClick();render();
assert.equal(props.step,3);
const nameInput=nodes(tree).find(n=>n.type==='input'&&n.props.autoComplete==='name');
nameInput.props.onChange({target:{value:'Test Customer'}});render();
buttons().filter(n=>n.props.className==='secondary'&&n.props.children?.includes('Tilbake')).at(-1).props.onClick();render();
assert.equal(props.step,2);
assert.equal(nodes(tree).find(n=>n.type==='input'&&n.props.autoComplete==='name').props.value,'Test Customer','Customer details survive Back');
assert.equal(nodes(tree).find(n=>n.type==='input'&&n.props.autoComplete==='name').props.disabled,true,'Hidden inputs cannot block validation');
assert.equal(selected().length,1,'Time selection survives Back');
const beforeSubmit=requests.length;
await tree.props.onSubmit({preventDefault(){}});
assert.equal(requests.length,beforeSubmit,'Earlier slides cannot submit a booking');
buttons().find(n=>n.props.children?.[0]==='Neste').props.onClick();render();
listeners.get('focus')();await respond([540]);render();
assert.equal(props.step,3,'Available selection remains on customer slide after refresh');
listeners.get('focus')();await respond([]);render();
assert.equal(props.step,2,'Availability invalidation returns to date/time slide');
assert.ok(nodes(tree).some(n=>n.props?.role==='alert'&&nodes(n).some(child=>child.props?.children?.includes?.('Tidspunktet er ikke lenger tilgjengelig. Velg et nytt tidspunkt.'))));
effects.forEach(e=>e.cleanup?.());assert.equal(timers.size,0);assert.equal(listeners.size,0);
console.log('PASS: slot refresh, preserved/cleared selection, failure recovery, overlap prevention, stale responses, slide navigation, retained details, submit guard, invalidation fallback and cleanup');
