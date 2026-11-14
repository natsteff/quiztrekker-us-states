// Run with node tests/core.test.cjs (or a compatible Node VM).
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('dist/core.js','utf8');
const c = vm.runInNewContext(source.replaceAll('export ','')+'; ({clean,load,save,matches,choose,record,weight,exportProgress,importProgress})');
const states = [{abbr:'AL'},{abbr:'AK'},{abbr:'AZ'}];
let checks = 0;
function check(value){assert.ok(value);checks++;}
let p=c.clean();
check(c.record(p,states[0],true,0)===100);
check(c.record(p,states[1],true,100)===110);
check(p.streak===2 && p.bestStreak===2 && p.best===210);
check(c.record(p,states[0],false,210)===0 && p.streak===0 && p.bestStreak===2);
check(c.weight(p,states[0])>c.weight(p,states[2]));
check(c.choose(states,p,'AL',()=>0).abbr!=='AL');
let counts={AL:0,AK:0,AZ:0};
for(let i=0;i<1000;i++) counts[c.choose(states,p,null,()=>i/1000).abbr]++;
check(counts.AL>counts.AZ);
check(c.matches(states[0],' al ') && !c.matches(states[0],'Alabama'));
let saved;const storage={getItem:()=>saved,setItem:(k,v)=>{saved=v;}};
check(c.save(storage,p));check(c.load(storage).best===210);
check(c.load({getItem:()=>'{bad'}).best===0);
check(!c.save({setItem(){throw Error('blocked');}},p));
check(c.load(undefined).streak===0);
check(c.clean({best:-1,streak:'9',seen:['AL','AL',null],records:{AL:{correct:-1,missed:2}}}).seen.length===1);
check(Object.keys(c.clean({records:{AL:{correct:-1,missed:2}}}).records).length===0);
const exported=c.exportProgress(p);
check(c.importProgress(exported,states).best===210);
for(const text of ['bad', '{}',JSON.stringify({app:'StateQuest',version:2,progress:p}),exported.replace('"AL"','"ZZ"')]) {
 let rejected=false;try{c.importProgress(text,states);}catch{rejected=true;}check(rejected);
}
let bad=JSON.parse(exported);bad.progress.best=-5;
check((()=>{try{c.importProgress(JSON.stringify(bad),states);return false;}catch{return true;}})());
check((()=>{try{c.importProgress(' '.repeat(100001),states);return false;}catch{return true;}})());
console.log(`${checks} gameplay and persistence assertions passed`);
