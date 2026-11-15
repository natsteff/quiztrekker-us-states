const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const g=vm.runInNewContext(fs.readFileSync('dist/games.js','utf8').replaceAll('export ','')+';({makeQuestion})');
const f=JSON.parse(fs.readFileSync('data/state-facts.json','utf8'));
const states=Object.entries(f).map(([abbr,s])=>({abbr,name:s.name}));let count=0;
for(const type of ['population','area','neighbors']){
 const targets=new Set();
 for(let seed=1;seed<=300;seed++){
  let n=seed,first=seed>150;const random=()=>{if(first){first=false;return ((seed-151)%50+.25)/50;}n=(n*1664525+1013904223)>>>0;return n/4294967296;};
  const previous=seed<=150?'WI':null;const q=g.makeQuestion(type,states,f,previous,random);targets.add(q.target);if(previous)assert.notEqual(q.target,previous);assert.equal(new Set(q.options).size,q.options.length);assert(q.options.includes(q.correct));
  if(type==='neighbors'){
   const matches=q.options.filter(a=>a==='NONE'?f[q.target].neighbors.length===0:f[q.target].neighbors.includes(a));assert.equal(matches.length,1);assert.equal(matches[0],q.correct);
  }else{
   const key=type==='population'?'population':'area_sq_mi';assert.equal(q.options.length,2);const expected=[...q.options].sort((a,b)=>f[b][key]-f[a][key])[0];assert.equal(q.correct,expected);
  }count++;
 }
 assert.equal(targets.size,50);count++;
}
for(const a of ['AK','HI']){
 const q=g.makeQuestion('neighbors',states,f,null,()=>states.findIndex(s=>s.abbr===a)/50+.001);assert.equal(q.target,a);assert.equal(q.correct,'NONE');assert.equal(q.options.length,4);count++;
}
const prefs=vm.runInNewContext(fs.readFileSync('dist/facts-core.js','utf8').replaceAll('export ','')+';({factPreferences,escapeHtml,formatStatehood,placeDisplayName})');
assert.equal(prefs.factPreferences(['capital','flag','nickname','statehood','population']).length,4);
assert.equal(prefs.factPreferences(['unknown'])[0],'flag');assert.equal(prefs.factPreferences([]).length,0);assert.equal(prefs.factPreferences(['flag','flag']).length,1);
assert(!prefs.escapeHtml('<img src=x onerror="alert(1)">').includes('<'));assert.equal(prefs.formatStatehood('1848-05-29'),'May 29, 1848');count+=6;
for(const [official,display] of [['Milwaukee city','Milwaukee'],['Juneau city and borough','Juneau'],['Salt Lake City city','Salt Lake City'],['Indianapolis city (balance)','Indianapolis (balance)'],['Jersey City city','Jersey City'],['Pearl City CDP','Pearl City CDP']]){assert.equal(prefs.placeDisplayName(official),display);count++;}
console.log(`${count} quiz generation and fact-preference checks passed`);

assert.equal(JSON.stringify(prefs.factPreferences(['capital','flag','nickname','statehood'])),JSON.stringify(['flag','nickname','statehood']));

const layout=vm.runInNewContext(fs.readFileSync('dist/capital-map.js','utf8').replace(/^import .*;\n/,'').replaceAll('export ','')+';({capitalLayout})');
const outlines=JSON.parse(fs.readFileSync('dist/states.js','utf8').replace('export const states = ','').trim().replace(/;$/,''));
for(const state of outlines)for(const [width,height] of [[280,130],[360,350],[700,500]])for(const relative of [true,false]){
 const p=layout.capitalLayout(state,width,height,relative);
 assert(Number.isFinite(p.scale)&&p.scale>0);
 assert(Math.abs((p.x-p.tx)/p.scale-state.capitalPoint.x)<1e-8);
 assert(Math.abs((p.y-p.ty)/p.scale-state.capitalPoint.y)<1e-8);
 assert(p.x>=0&&p.x<=width&&p.y>=0&&p.y<height-30);
}
console.log('300 capital viewport transforms preserve source positions');
