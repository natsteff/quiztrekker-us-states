const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {startUpdates}=vm.runInNewContext('const VERSION="test";'+fs.readFileSync('dist/update-client.js','utf8').replace(/^import .*;$/mg,'').replaceAll('export ','')+';({startUpdates})');
function fixture({enabled,waiting=false,controller=true,offline=false,pending=false,supported=true}={}){
 const elements={};for(const id of ['autoUpdate','appVersion','offlineStatus','skipUpdate','updateOverlay'])elements[id]={hidden:true,checked:false,textContent:''};
 const timers=new Map(),events={},regEvents={},messages=[],values={};let serial=0,reloads=0,updates=0,release;
 if(enabled!==undefined)values['statequest.autoUpdate']=String(enabled);
 const reg={waiting:waiting?{postMessage:m=>messages.push(m.type)}:null,installing:null,addEventListener:(type,cb)=>regEvents[type]=cb,update:()=>{updates++;return pending?new Promise(resolve=>release=resolve):Promise.resolve(reg);}};
 const serviceWorker={controller:controller?{}:null,addEventListener:(type,cb)=>events[type]=cb,register:async(url,options)=>{assert.equal(url,'./sw.js');assert.equal(options.updateViaCache,'none');if(offline)throw Error('offline');return reg;}};
 const done=startUpdates({storage:{getItem:k=>values[k],setItem:(k,v)=>values[k]=v},document:{getElementById:id=>elements[id]},navigator:supported?{serviceWorker}:{},location:{reload:()=>reloads++},setTimer:fn=>{timers.set(++serial,fn);return serial;},clearTimer:id=>timers.delete(id)});
 return {elements,timers,events,reg,messages,values,done,get reloads(){return reloads;},get updates(){return updates;},release:()=>release()};
}
(async()=>{
 let c=fixture();await c.done;assert(c.elements.autoUpdate.checked);assert(c.elements.updateOverlay.hidden);assert.equal(c.updates,1);
 c=fixture({waiting:true});await c.done;assert.equal(c.messages.length,1);c.events.controllerchange();c.events.controllerchange();assert.equal(c.reloads,1);
 c=fixture({enabled:false,waiting:true});await c.done;assert.equal(c.messages.length,0);assert.equal(c.updates,0);assert(!c.elements.autoUpdate.checked);
 c=fixture({offline:true});await c.done;assert(c.elements.updateOverlay.hidden);assert(c.elements.offlineStatus.textContent.includes('offline'));
 c=fixture({pending:true});await Promise.resolve();await Promise.resolve();[...c.timers.values()][0]();c.reg.waiting={postMessage:m=>c.messages.push(m.type)};c.release();await c.done;c.events.controllerchange();assert.equal(c.reloads,0);assert.equal(c.messages.length,0);assert(c.elements.updateOverlay.hidden);
 c=fixture({pending:true});await Promise.resolve();await Promise.resolve();c.elements.skipUpdate.onclick();c.reg.waiting={postMessage:m=>c.messages.push(m.type)};c.release();await c.done;c.events.controllerchange();assert.equal(c.reloads,0);
 c=fixture({supported:false});await c.done;assert(c.elements.updateOverlay.hidden);
 c=fixture({enabled:false,controller:false});await c.done;c.events.controllerchange();assert.equal(c.elements.offlineStatus.textContent,'Ready for offline play.');c.elements.autoUpdate.checked=true;c.elements.autoUpdate.onchange();assert.equal(c.values['statequest.autoUpdate'],'true');
 console.log('8 startup-update lifecycle scenarios passed');
})()
