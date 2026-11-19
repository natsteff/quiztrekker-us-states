const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const m=vm.runInNewContext(fs.readFileSync('dist/mastery.js','utf8').replaceAll('export ','')+';({toggleMastery,masteryMisses,toggleOrder,failedLocations})');
const c=vm.runInNewContext(fs.readFileSync('dist/core.js','utf8').replaceAll('export ','')+';({clean,exportProgress,importProgress})');
let p=c.clean();assert.equal(m.toggleMastery(p,'AL'),true);assert.equal(m.masteryMisses(p,['AL','AL','AK']).length,0);assert.equal(p.masteryFailures.AL,1);m.masteryMisses(p,['AL']);assert.equal(m.masteryMisses(p,['AL'])[0],'AL');for(let i=0;i<2;i++)assert.equal(m.masteryMisses(p,['AL']).length,0);assert.equal(m.masteryMisses(p,['AL'])[0],'AL');
const restored=c.importProgress(c.exportProgress(p),[{abbr:'AL'},{abbr:'AK'}]);assert.equal(restored.masteryFailures.AL,6);assert.equal(restored.mastered[0],'AL');assert.equal(m.toggleMastery(p,'AL'),false);assert.equal(p.masteryFailures.AL,undefined);m.toggleMastery(p,'AL');assert.equal(p.masteryFailures.AL,undefined);
let order=['AL','AK','AZ'];assert.equal(m.toggleOrder(order,'AK').join(','),'AL,AZ');assert.equal(order.join(','),'AL,AK,AZ');assert.equal(m.toggleOrder(['AL','AZ'],'AK').join(','),'AL,AZ,AK');
const facts={A:{statehood_date:'1800'},B:{statehood_date:'1900'},C:{statehood_date:'2000'}};
assert.equal(m.failedLocations('timeline',false,null,{options:['A','B','C']},['B','A','C'],facts).sort().join(','),'A,B');assert.equal(m.failedLocations('timeline',true,null,{options:[]},[],facts).length,0);assert.equal(m.failedLocations('population',false,null,{pair:['AL','AK']},[],{}).join(','),'AL,AK');assert.equal(m.failedLocations('neighbors',false,{abbr:'AL'},null,[],{}).join(','),'AL');
assert.equal(c.clean({mastered:['AL','AL','bad'],masteryFailures:{AL:3,AK:8}}).mastered.join(','),'AL');assert.equal(c.clean({mastered:['AL'],masteryFailures:{AL:-1}}).masteryFailures.AL,undefined);
assert.throws(()=>c.importProgress(JSON.stringify({app:'QuizTrekker - US States',version:1,progress:{seen:[],records:{},best:0,streak:0,bestStreak:0,mastered:['XX']}}),[{abbr:'AL'}]));
const map=fs.readFileSync('dist/teaching-map.js','utf8');const context=JSON.parse(fs.readFileSync('dist/context-geometry.js','utf8').replace('export const contextGeometry = ','').trim().replace(/;$/,''));const t=vm.runInNewContext(map.replace(/^import .*;\n/gm,'').replaceAll('export ','')+';({teachingMap})',{contextGeometry:context,esc:x=>x});
const states=JSON.parse(fs.readFileSync('dist/states.js','utf8').replace('export const states = ','').trim().replace(/;$/,''));let html=t.teachingMap({locations:states,target:'WV',neighbors:['OH','VA'],chosen:['OH','FL'],eligible:['OH','VA'],all:true});assert(html.includes('correct'));assert(html.includes('missed'));assert(html.includes('wrong'));assert(html.includes('WV</text>'));
html=t.teachingMap({locations:states,mode:'quest',eligible:['AL']});assert.equal((html.match(/data-map-answer=/g)||[]).length,1);assert(html.includes('aria-label="Map region 1"'));assert(!html.includes('Alabama'));assert(!html.includes('<title>'));assert(!html.includes('<text'));
console.log('Mastery persistence/review, timeline removal, attribution and teaching-map checks passed');

assert.equal(context.length,70);assert(context.find(s=>s.abbr==='UM').path.length>0);

html=t.teachingMap({locations:states,mode:'quest',eligible:states.map(s=>s.abbr)});for(const s of states)assert(!html.includes(s.name));assert(!html.includes('<title>'));assert(!html.includes('aria-label="RI"'));
html=t.teachingMap({locations:states,target:'LA',neighbors:[]});assert(html.includes('<title>Louisiana</title>'));

// One mode has no missed neighbors, whether its selected answer is right or wrong.
for(const chosen of [['OH'],['FL']]){const one=t.teachingMap({locations:states,target:'WV',neighbors:['OH','VA'],chosen,eligible:['OH','VA'],all:false});assert(!one.includes('map-region missed'));assert(one.includes('map-region neighbor'));if(chosen[0]==='FL')assert(one.includes('map-region wrong'));}
const css=fs.readFileSync('dist/style.css','utf8');assert(css.includes('.map-region.missed,.map-region.neighbor{fill:#479fd7}'));assert(css.includes('.choices button.answer-missed{background:linear-gradient(#d9efff,#8bc8f2)}'));
