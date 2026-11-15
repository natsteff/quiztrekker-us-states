const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function moduleFile(file,expression){return vm.runInNewContext(fs.readFileSync('dist/'+file+'.js','utf8').replace(/^import .*;$/mg,'').replaceAll('export ','')+';('+expression+')');}
const geo=moduleFile('geography','{GEOGRAPHY_KEY,geographyPreferences,readGeography,selectedLocations,deckStorageKey,mergeFacts,eligibleLocations}');
const base=moduleFile('states','states'),pack=moduleFile('extra-locations','{extraLocations,extraFacts}'),baseFacts=moduleFile('facts','facts');
const game=moduleFile('games','{makeQuestion,makeTimeline}'),deck=moduleFile('decks','{createDecks}');
const facts=geo.mergeFacts(baseFacts,pack.extraFacts);let checks=0;
assert.equal(pack.extraLocations.length,20);assert.equal(new Set([...base,...pack.extraLocations].map(s=>s.abbr)).size,70);
assert.equal(geo.selectedLocations(base,pack.extraLocations,geo.geographyPreferences()).length,50);
assert.equal(geo.readGeography({getItem:()=>'{broken'}).usExtras,false);
assert.equal(geo.geographyPreferences({usExtras:'true',canadaProvinces:1,canadaTerritories:true}).usExtras,false);
let n=98765;const random=()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};
const storage={data:{},getItem(k){return this.data[k]??null;},setItem(k,v){this.data[k]=v;}};
for(let mask=0;mask<8;mask++){
 const prefs={usExtras:!!(mask&1),canadaProvinces:!!(mask&2),canadaTerritories:!!(mask&4)};
 storage.setItem(geo.GEOGRAPHY_KEY,JSON.stringify(prefs));const pool=geo.selectedLocations(base,pack.extraLocations,geo.readGeography(storage));
 assert.equal(pool.length,50+(prefs.usExtras?7:0)+(prefs.canadaProvinces?10:0)+(prefs.canadaTerritories?3:0));
 const ids=new Set(pool.map(s=>s.abbr)),key=geo.deckStorageKey(pool),decks=deck.createDecks(pool,storage,random,key);
 for(const mode of ['shape','neighbors'])for(let round=0;round<2;round++){
  const seen=new Set();for(let i=0;i<pool.length;i++){const a=decks.current(mode);assert(ids.has(a));assert(!seen.has(a));seen.add(a);assert.equal(decks.position(mode).total,pool.length);assert(decks.complete(mode,a));checks++;}assert.equal(seen.size,pool.length);
 }
 for(const s of pool){
  const q=game.makeQuestion('neighbors',pool,facts,null,random,{target:s.abbr,neighborMode:'all'});
  const expected=facts[s.abbr].neighbors.filter(a=>ids.has(a));assert.equal(JSON.stringify([...q.correctSet].sort()),JSON.stringify((expected.length?expected:['NONE']).sort()));
  assert(q.options.every(a=>a==='NONE'||ids.has(a)));assert(q.correctSet.every(a=>q.options.includes(a)));assert.equal(new Set(q.options).size,q.options.length);checks++;
 }
 for(let i=0;i<100;i++){
  for(const type of ['population','area']){
   const q=game.makeQuestion(type,pool,facts,null,random);assert.notEqual(q.target,'UM');assert(q.pair.every(a=>ids.has(a)&&a!=='UM'));
   if(type==='population')assert.equal(facts[q.pair[0]].population_as_of,facts[q.pair[1]].population_as_of);
   const metric=type==='population'?'population':mask?'land_sq_mi':'area_sq_mi';const expected=facts[q.pair[0]][metric]>facts[q.pair[1]][metric]?q.pair[0]:q.pair[1];assert.equal(q.correct,expected);checks++;
  }
  const t=game.makeTimeline(pool,facts,random);assert.equal(t.options.length,4);assert(t.options.every(a=>base.some(s=>s.abbr===a)));checks++;
 }
}
// Changing scopes must leave the 50-state deck and scores untouched.
const original=storage.getItem('statequest.decks.v1');deck.createDecks([...base,...pack.extraLocations],storage,random,geo.deckStorageKey([...base,...pack.extraLocations])).current('shape');assert.equal(storage.getItem('statequest.decks.v1'),original);
assert.equal(geo.eligibleLocations('timeline',[...base,...pack.extraLocations],facts).length,50);
assert.equal(geo.eligibleLocations('population',[...base,...pack.extraLocations],facts).length,69);
assert.equal(geo.eligibleLocations('area',[...base,...pack.extraLocations],facts).length,69);
assert.equal(pack.extraLocations.filter(s=>s.abbr==='UM').length,1);assert.equal(pack.extraLocations.find(s=>s.abbr==='UM').inset_names.length,9);
for(const f of Object.values(pack.extraFacts)){assert.equal(f.statehood_date,undefined);assert.equal(f.statehood_order,undefined);}
console.log(`${checks} expanded-pool/deck/quiz scenarios passed across all 8 settings combinations`);

const layout=moduleFile('capital-map','{capitalLayout}');
for(const s of pack.extraLocations)for(const [width,height] of [[280,130],[360,350],[700,500]])for(const relative of [true,false]){
 const p=layout.capitalLayout(s,width,height,relative);assert(Number.isFinite(p.scale)&&p.scale>0);
 if(s.capitalPoint){assert(Math.abs((p.x-p.tx)/p.scale-s.capitalPoint.x)<1e-8);assert(Math.abs((p.y-p.ty)/p.scale-s.capitalPoint.y)<1e-8);}else{assert.equal(p.x,null);assert.equal(p.y,null);}
}
assert.equal(pack.extraFacts.PE.water_sq_mi,null);
assert(pack.extraFacts.ON.motto.includes('permanet'));assert(pack.extraFacts.NU.motto.includes('Sannginivut'));
console.log('120 optional-map viewport transforms and missing-value checks passed');
