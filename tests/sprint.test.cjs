const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const m=vm.runInNewContext(fs.readFileSync('dist/sprint.js','utf8').replaceAll('export ','')+';({createSprint,readSprintBest,saveSprintBest,sprintBestKey})');
let time=0,answers=[],changes=[];const s=m.createSprint({ids:['AL','AK','AZ','AR'],now:()=>time,random:()=>.5,onAnswer:r=>answers.push(r),onChange:r=>changes.push(r.phase)});
assert(!s.answer('AL'));s.start();assert.equal(s.snapshot().phase,'countdown');time=2999;s.tick();assert.equal(s.snapshot().phase,'countdown');time=3000;s.tick();assert.equal(s.snapshot().phase,'playing');
const visited=[];for(let i=0;i<4;i++){const target=s.snapshot().target;visited.push(target);assert(s.answer(target));assert(!s.answer(target));time+=650;s.tick();}
assert.equal(new Set(visited).size,4);assert.equal(s.snapshot().correct,4);assert.equal(s.snapshot().points,460);assert.equal(s.snapshot().longest,4);assert.notEqual(s.snapshot().target,visited.at(-1));
s.answer('XX');assert.equal(s.snapshot().streak,0);time+=1099;s.tick();assert.equal(s.snapshot().phase,'feedback');time++;s.tick();assert.equal(s.snapshot().phase,'playing');
s.pause();const remaining=s.snapshot().remaining;time+=60000;s.tick();assert.equal(s.snapshot().remaining,remaining);assert(!s.answer(s.snapshot().target));s.resume();time+=100;s.tick();assert.equal(s.snapshot().remaining,remaining-100);
time+=s.snapshot().remaining;s.tick();assert.equal(s.snapshot().phase,'finished');const attempts=s.snapshot().attempted;assert(!s.answer(s.snapshot().target));assert.equal(s.snapshot().attempted,attempts);
s.start();assert.equal(s.snapshot().correct,0);assert.equal(s.snapshot().remaining,60000);time+=1000;s.tick();s.pause();time+=5000;s.resume();time+=2000;s.tick();assert.equal(s.snapshot().phase,'playing');assert.equal(s.snapshot().remaining,60000);
// Expiry during feedback cannot advance; late click cannot score.
s.answer(s.snapshot().target);time+=60000;s.tick();assert.equal(s.snapshot().phase,'finished');assert.equal(s.snapshot().correct,1);
const store=new Map(),storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};assert.equal(m.readSprintBest(storage,['AL']),0);assert.equal(m.saveSprintBest(storage,['AL'],7),7);assert.equal(m.saveSprintBest(storage,['AL'],3),7);assert.equal(m.readSprintBest(storage,['AK']),0);assert.equal(m.sprintBestKey(['AL','AK']),m.sprintBestKey(['AK','AL']));assert.equal(m.readSprintBest({getItem:()=>'{broken'},['AL']),0);assert.equal(m.saveSprintBest(undefined,['AL'],4),4);
// Zero/one eligible location remains safe; no duplicate distractors or grading at timeout.
assert.equal(m.createSprint({ids:[],now:()=>time}).start(),false);const single=m.createSprint({ids:['AL'],now:()=>time});single.start();time+=3000;single.tick();assert.equal(single.snapshot().target,'AL');
console.log('Sprint countdown, coverage, feedback timing, scoring, pauses, expiry, restart and pool-specific best passed');

for(const size of [1,50,70]){let clock=0;const ids=Array.from({length:size},(_,i)=>String(i)),round=m.createSprint({ids,now:()=>clock,random:()=>.3});round.start();clock=3000;round.tick();const seen=[];for(let i=0;i<size;i++){seen.push(round.snapshot().target);round.answer(round.snapshot().target);clock+=650;round.tick();}assert.equal(new Set(seen).size,size);assert.equal(round.snapshot().correct,size);if(size>11){assert.equal(round.snapshot().result,null);assert.equal(round.snapshot().points,1650+(size-11)*200);}}
let lateTime=0;const late=m.createSprint({ids:['AL'],now:()=>lateTime});late.start();lateTime=3000;late.tick();lateTime=63000;assert.equal(late.answer('AL'),false);assert.equal(late.snapshot().attempted,0);
console.log('Sprint 1/50/70-location pools, bonus cap and late-submit expiry passed');
