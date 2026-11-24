const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.runInNewContext(fs.readFileSync('dist/capitals.js','utf8').replaceAll('export ','')+';({capitalLocations,makeCapitalQuestion})');
function read(file,name){return vm.runInNewContext(fs.readFileSync(file,'utf8').replaceAll('export ','')+';'+name);}
const states=read('dist/states.js','states'),extras=read('dist/extra-locations.js','extraLocations'),pool=c.capitalLocations([...states,...extras]);assert.equal(c.capitalLocations(states).length,50);assert(!pool.some(s=>s.abbr==='UM'));
for(const s of pool){for(let i=0;i<5;i++){const q=c.makeCapitalQuestion(pool,s.abbr,()=>i/5);assert(q.options.includes(s.abbr));assert.equal(q.labels[q.correct],s.capital);assert.equal(q.options.length,4);assert.equal(new Set(q.options.map(a=>q.labels[a].toLowerCase())).size,4);assert(q.prompt.includes(s.name));}}
const duplicates=[{abbr:'A',name:'A',capital:'Same'},{abbr:'B',name:'B',capital:'Same'},{abbr:'C',name:'C',capital:'Other'}];const q=c.makeCapitalQuestion(duplicates,'A');assert.equal(q.options.length,2);assert.equal(q.correct,'A');assert.throws(()=>c.makeCapitalQuestion(pool,'UM'));
const {kioskRequested}=vm.runInNewContext(fs.readFileSync('dist/kiosk.js','utf8').replaceAll('export ','')+';({kioskRequested})',{URLSearchParams});assert(kioskRequested('?fullscreen=1'));assert(!kioskRequested('?fullscreen=0'));assert(!kioskRequested(''));assert(kioskRequested('?x=2&fullscreen=1'));
console.log('Capital coverage, unique city choices, missing capitals and explicit kiosk flag passed');

const core=vm.runInNewContext(fs.readFileSync('dist/core.js','utf8').replaceAll('export ','')+';({clean,trackGame,exportProgress,importProgress})');const p=core.clean();core.trackGame(p,'capitals',true,100,1,'Alabama',100);assert.equal(core.importProgress(core.exportProgress(p),states).gameStats.capitals.points,100);
const master=vm.runInNewContext(fs.readFileSync('dist/mastery.js','utf8').replaceAll('export ','')+';({failedLocations})');assert.equal(master.failedLocations('capitals',false,{abbr:'AL'},null,[],{}).join(','),'AL');
console.log('Capital scoring/save whitelist and target mastery attribution passed');
