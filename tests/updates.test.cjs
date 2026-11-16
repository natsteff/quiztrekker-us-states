const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {startUpdates}=vm.runInNewContext('const VERSION="test";'+fs.readFileSync('dist/update-client.js','utf8').replace(/^import .*;$/mg,'').replaceAll('export ','')+';({startUpdates})');
const flush=async()=>{for(let i=0;i<16;i++)await Promise.resolve();};
function fixture({enabled,waiting=false,controller=true,offline=false,pending=false,supported=true,updateFail=false}={}){
 const elements={};for(const id of ['autoUpdate','appVersion','offlineStatus','skipUpdate','updateOverlay','checkUpdates','applyUpdate','updateReloadNote'])elements[id]={hidden:true,checked:false,disabled:false,textContent:''};
 const timers=new Map(),events={},docEvents={},windowEvents={},regEvents={},messages=[],values={};let serial=0,reloads=0,updates=0,release,clock=0,networkOffline=offline;
 if(enabled!==undefined)values['statequest.autoUpdate']=String(enabled);
 const reg={waiting:waiting?{postMessage:m=>messages.push(m.type)}:null,installing:null,addEventListener:(type,cb)=>regEvents[type]=cb,update:()=>{updates++;if(updateFail)return Promise.reject(Error('offline'));return pending?new Promise(resolve=>release=resolve):Promise.resolve(reg);}};
 const document={visibilityState:'visible',getElementById:id=>elements[id],addEventListener:(t,cb)=>docEvents[t]=cb};
 const serviceWorker={controller:controller?{}:null,addEventListener:(type,cb)=>events[type]=cb,register:async(url,options)=>{assert.equal(url,'./sw.js');assert.equal(options.updateViaCache,'none');if(networkOffline)throw Error('offline');return reg;}};
 const done=startUpdates({storage:{getItem:k=>values[k],setItem:(k,v)=>values[k]=v},document,window:{addEventListener:(t,cb)=>windowEvents[t]=cb},now:()=>clock,navigator:supported?{serviceWorker}:{},location:{reload:()=>reloads++},setTimer:fn=>{timers.set(++serial,fn);return serial;},clearTimer:id=>timers.delete(id)});
 return {elements,timers,events,docEvents,windowEvents,regEvents,document,reg,messages,values,done,get reloads(){return reloads;},get updates(){return updates;},release:()=>release(),time:v=>clock=v,online:()=>networkOffline=false};
}
(async()=>{
 let c=fixture();await c.done;assert(c.elements.autoUpdate.checked);assert(c.elements.updateOverlay.hidden);assert.equal(c.updates,1);assert(c.elements.offlineStatus.textContent.includes('Up to date'));
 c=fixture({waiting:true});await c.done;assert.equal(c.messages.length,1);c.events.controllerchange();c.events.controllerchange();assert.equal(c.reloads,1);
 c=fixture({enabled:false,waiting:true});await c.done;assert.equal(c.messages.length,0);assert.equal(c.updates,0);assert(!c.elements.applyUpdate.hidden);await c.elements.checkUpdates.onclick();assert.equal(c.messages.length,0);c.elements.applyUpdate.onclick();c.events.controllerchange();assert.equal(c.reloads,1);
 c=fixture({offline:true});await c.done;assert(c.elements.updateOverlay.hidden);assert(c.elements.offlineStatus.textContent.includes('offline'));c.online();await c.elements.checkUpdates.onclick();assert.equal(c.updates,1);
 c=fixture({pending:true});await flush();[...c.timers.values()][0]();c.reg.waiting={postMessage:m=>c.messages.push(m.type)};c.release();await c.done;c.events.controllerchange();assert.equal(c.reloads,0);assert.equal(c.messages.length,0);
 c=fixture({pending:true});await flush();c.elements.skipUpdate.onclick();c.reg.waiting={postMessage:m=>c.messages.push(m.type)};c.release();await c.done;c.events.controllerchange();assert.equal(c.reloads,0);
 c=fixture({supported:false});await c.done;assert(c.elements.updateOverlay.hidden);assert(c.elements.checkUpdates.disabled);
 c=fixture({enabled:false,controller:false});await c.done;c.events.controllerchange();assert.equal(c.elements.offlineStatus.textContent,'Ready for offline play.');c.elements.autoUpdate.checked=true;c.elements.autoUpdate.onchange();assert.equal(c.values['statequest.autoUpdate'],'true');
 // Foreground and back-forward cache checks are throttled and never reload a quiz.
 c=fixture();await c.done;c.time(60001);c.document.visibilityState='hidden';c.docEvents.visibilitychange();c.document.visibilityState='visible';c.docEvents.visibilitychange();await flush();assert.equal(c.updates,2);c.windowEvents.pageshow({persisted:true});await flush();assert.equal(c.updates,2);assert.equal(c.reloads,0);
 c.time(120002);c.windowEvents.pageshow({persisted:true});await flush();assert.equal(c.updates,3);
 const workerEvents={};const worker={state:'installing',addEventListener:(t,fn)=>workerEvents[t]=fn,postMessage:m=>c.messages.push(m.type)};c.reg.installing=worker;c.regEvents.updatefound();c.reg.waiting=worker;worker.state='installed';workerEvents.statechange();assert.equal(c.messages.length,0);assert(!c.elements.applyUpdate.hidden);c.elements.applyUpdate.onclick();assert.equal(c.messages.length,1);c.events.controllerchange();assert.equal(c.reloads,1);
 c=fixture({enabled:false,updateFail:true});await c.done;await c.elements.checkUpdates.onclick();assert(c.elements.offlineStatus.textContent.includes('offline'));assert(!c.elements.checkUpdates.disabled);c.document.visibilityState='hidden';c.docEvents.visibilitychange();c.document.visibilityState='visible';c.docEvents.visibilitychange();await flush();assert.equal(c.updates,1);
 c=fixture({enabled:false,pending:true});await c.done;const check=c.elements.checkUpdates.onclick();await flush();[...c.timers.values()][0]();await check;assert(c.elements.offlineStatus.textContent.includes('timed out'));assert(!c.elements.checkUpdates.disabled);c.release();await flush();assert.equal(c.reloads,0);
 console.log('Startup, manual check/apply, offline retry, timeout, resume/throttling and no-midgame-reload scenarios passed');
})()
