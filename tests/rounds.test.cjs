const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const facts=JSON.parse(fs.readFileSync('data/state-facts.json','utf8'));
const states=Object.entries(facts).map(([abbr,f])=>({abbr,name:f.name}));
const {createDecks}=vm.runInNewContext(fs.readFileSync('dist/decks.js','utf8').replaceAll('export ','')+';({createDecks})');
const game=vm.runInNewContext(fs.readFileSync('dist/games.js','utf8').replaceAll('export ','')+';({makeQuestion,sameAnswers,makeTimeline,timelineCorrect})');
let seed=7;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
let memory={};const storage={getItem:k=>memory[k],setItem:(k,v)=>memory[k]=v};let decks=createDecks(states,storage,random),checks=0;
for(const key of ['shape','neighbors']){
 let last;
 for(let round=1;round<=4;round++){
  const seen=new Set();
  for(let i=1;i<=50;i++){
   if(i%7===0)decks=createDecks(states,storage,random);
   const a=decks.current(key);assert.equal(decks.current(key),a);assert(!seen.has(a));if(i===1&&last)assert.notEqual(a,last);
   assert.equal(decks.position(key).number,i);assert.equal(decks.position(key).round,round);
   seen.add(a);assert.equal(decks.complete(key,a),true);assert.equal(decks.complete(key,a),false);last=a;checks++;
  }
  assert.equal(seen.size,50);
 }
}
const bad=createDecks(states,{getItem:()=>JSON.stringify({shape:{order:Array(50).fill('AL'),cursor:0}}),setItem(){}},random);
const recovered=[];for(let i=0;i<50;i++){const a=bad.current('shape');recovered.push(a);bad.complete('shape',a);}assert.equal(new Set(recovered).size,50);checks++;
for(const s of states){
 const q=game.makeQuestion('neighbors',states,facts,null,random,{target:s.abbr,neighborMode:'all'});
 assert.equal(q.options.length,10);assert.equal(new Set(q.options).size,10);assert(!q.options.includes(s.abbr));
 const expected=facts[s.abbr].neighbors.length?facts[s.abbr].neighbors:['NONE'];assert(game.sameAnswers(q.correctSet,expected));assert(game.sameAnswers(expected,q.correctSet));
 assert(!game.sameAnswers([],q.correctSet));assert(!game.sameAnswers([...q.correctSet,q.options.find(a=>!q.correctSet.includes(a))],q.correctSet));
 for(const a of q.correctSet)assert(q.options.includes(a));checks++;
}
for(let i=0;i<100;i++){
 const q=game.makeTimeline(states,facts,random);assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);
 assert(game.timelineCorrect(q.solution,q.options,facts));assert(!game.timelineCorrect([...q.solution].reverse(),q.options,facts));assert(!game.timelineCorrect(q.solution.slice(1),q.options,facts));checks++;
}
const ties=['NY','ND','SD','HI'];assert(game.timelineCorrect(ties,ties,facts));assert(game.timelineCorrect(['NY','SD','ND','HI'],ties,facts));assert(!game.timelineCorrect(['HI','ND','SD','NY'],ties,facts));assert(!game.timelineCorrect(['NY','ND','ND','HI'],ties,facts));checks+=4;
console.log(`${checks} full-deck, all-neighbor, and timeline scenarios passed`);
