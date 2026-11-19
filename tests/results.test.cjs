const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function read(file,names){return vm.runInNewContext(fs.readFileSync(file,'utf8').replaceAll('export ','')+`;({${names}})`);}
const r=read('dist/result-rules.js','timelinePrefix,neighborResult,comparePopulation,neighborLegend');
const g=read('dist/games.js','makeQuestion,sameAnswers');const geo=read('dist/geography.js','selectedLocations,mergeFacts');
const {extraLocations,extraFacts}=read('dist/extra-locations.js','extraLocations,extraFacts');const {states}=read('dist/states.js','states');const {facts:base}=read('dist/facts.js','facts');const facts=geo.mergeFacts(base,extraFacts);
let seed=19;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};let count=0;
for(let mask=0;mask<8;mask++){
 const enabled=geo.selectedLocations(states,extraLocations,{usExtras:!!(mask&1),canadaProvinces:!!(mask&2),canadaTerritories:!!(mask&4)}),valid=new Set(enabled.map(s=>s.abbr));
 for(const target of enabled){
  // All other locations may be mastered/excluded as targets: required answers must remain.
  const q=g.makeQuestion('neighbors',[target],facts,null,random,{target:target.abbr,neighborMode:'all',answerLocations:enabled});
  const neighbors=facts[target.abbr].neighbors.filter(a=>valid.has(a));
  assert.equal([...q.correctSet].sort().join(','),(neighbors.length?neighbors:['NONE']).sort().join(','));
  assert(q.correctSet.every(a=>q.options.includes(a)));assert(q.options.filter(a=>a!=='NONE'&&!neighbors.includes(a)).length>=2);
  assert.equal(new Set(q.options).size,q.options.length);assert(!q.options.includes(target.abbr));assert(g.sameAnswers(q.correctSet,q.correctSet));
  if(neighbors.length){assert(!g.sameAnswers(q.correctSet.slice(1),q.correctSet));assert.equal(r.neighborResult(neighbors[0],q.correctSet,[]),'missed');assert.equal(r.neighborResult(neighbors[0],q.correctSet,[neighbors[0]]),'correct');}
  const wrong=q.options.find(a=>a!=='NONE'&&!neighbors.includes(a));assert.equal(r.neighborResult(wrong,q.correctSet,[wrong]),'wrong');count++;
 }
}
const f={A:{statehood_date:'1800'},B:{statehood_date:'1850'},C:{statehood_date:'1900'},D:{statehood_date:'1950'},E:{statehood_date:'1900'}};
assert.equal(r.timelinePrefix(['A','B','D','C'],['A','B','C','D'],f).statuses.join(','),'correct,correct,wrong,neutral');assert.equal(r.timelinePrefix(['D','A','B','C'],['A','B','C','D'],f).statuses.join(','),'wrong,neutral,neutral,neutral');assert.equal(r.timelinePrefix(['A','B','C','D'],['A','B','C','D'],f).prefix,4);assert.equal(r.timelinePrefix(['A','E','C','D'],['A','C','E','D'],f).prefix,4);assert.equal(r.timelinePrefix(['A','C','E','D'],['A','C','E','D'],f).prefix,4);
const pool=[...states,...extraLocations].filter(s=>Number.isFinite(facts[s.abbr].population));const sorted=[...pool].sort((a,b)=>r.comparePopulation(a,b,facts));assert.equal(sorted[0].abbr,'CA');for(let i=1;i<sorted.length;i++)assert(facts[sorted[i-1].abbr].population>=facts[sorted[i].abbr].population);
assert(sorted.findIndex(s=>s.abbr==='TX')<sorted.findIndex(s=>s.abbr==='PR'));assert(r.comparePopulation({abbr:'A',name:'Alabama'},{abbr:'B',name:'Alaska'},{A:{population:10},B:{population:10}})<0);
console.log(`${count} ALL-neighbor scope/mastery cases; sequential feedback, ties and global population ordering passed`);

assert(!r.neighborLegend(false).includes("Missed"));assert(r.neighborLegend(true).includes("Missed neighbor"));assert(r.neighborLegend(false).includes("Incorrect selection"));
