const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const m=vm.runInNewContext(fs.readFileSync('dist/map-quest.js','utf8').replaceAll('export ','')+';({zoomBox,fitQuestBox,createMapTap})');
let serial=0,time=0,answered=[],zoomed=[],timers=new Map();const tap=m.createMapTap({onAnswer:a=>answered.push(a),onZoom:p=>zoomed.push(p),setTimer:fn=>{timers.set(++serial,fn);return serial;},clearTimer:id=>timers.delete(id),now:()=>time});
tap.tap({state:'RI',screen:[100,100],point:[900,100]});assert.equal(answered.length,0);time=150;tap.begin();assert.equal(timers.size,0);tap.tap({state:'RI',screen:[101,101],point:[900,100]});assert.equal(timers.size,0);assert.equal(answered.length,0);assert.equal(zoomed.length,1);
time=1000;tap.tap({state:'DE',screen:[150,150],point:[800,200]});[...timers.values()][0]();assert.equal(answered.join(','),'DE');
tap.tap({state:'CA',screen:[10,10],point:[10,10]});tap.cancel();assert.equal(timers.size,0);assert.equal(answered.length,1);
let box=m.zoomBox([0,0,975,610],[970,605],2);assert(box[0]>=0&&box[1]>=0&&box[0]+box[2]<=975&&box[1]+box[3]<=610);for(let i=0;i<10;i++)box=m.zoomBox(box,[970,605],2);assert(box[2]>=975/12);assert.equal(m.zoomBox(box,[0,0],.001).join(','),'0,0,975,610');
const states=JSON.parse(fs.readFileSync('dist/states.js','utf8').replace('export const states = ','').trim().replace(/;$/,''));const result=m.fitQuestBox(states,['RI']);assert(result[2]<975/2);const full=m.fitQuestBox(states,['CA','RI']);assert(full[2]>result[2]);
console.log('Map Quest double-tap arbitration, cancellation, zoom limits and small-state result framing passed');
