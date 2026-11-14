const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 const events={},deleted=[],added=[];
 const store={addAll:async assets=>added.push(...assets),match:async key=>({cached:key})};
 vm.runInNewContext(fs.readFileSync('dist/sw.js','utf8'),{URL,caches:{open:async()=>store,keys:async()=>['statequest:/statequest/:old','statequest:/other/:keep','unrelated'],delete:async name=>deleted.push(name)},self:{location:{href:'https://example.github.io/statequest/sw.js'},clients:{claim:async()=>{}},addEventListener:(name,handler)=>events[name]=handler},fetch:()=>{throw Error('Network should not be needed');}});
 let wait;events.install({waitUntil:p=>wait=p});await wait;
 assert.equal(added.filter(p=>p.startsWith('./assets/flags/')).length,50);
 assert(added.includes('./credits.html') && added.includes('./facts.js'));
 assert(added.includes('./index.html') && added.includes('./states.js') && added.includes('./icon-512.png'));
 events.activate({waitUntil:p=>wait=p});await wait;
 assert.deepEqual(deleted,['statequest:/statequest/:old']);
 let response;events.fetch({request:{url:'https://example.github.io/statequest/',method:'GET',mode:'navigate'},respondWith:p=>response=p});assert.equal((await response).cached,'./index.html');
 events.fetch({request:{url:'https://example.github.io/statequest/states.js',method:'GET'},respondWith:p=>response=p});assert.equal((await response).cached,'./states.js');
 for(const path of ['credits.html','assets/flags/MN.svg']){events.fetch({request:{url:'https://example.github.io/statequest/'+path,method:'GET'},respondWith:p=>response=p});assert.equal((await response).cached,'./'+path);}
 for(const url of ['https://example.github.io/other/','https://elsewhere.test/statequest/','https://example.github.io/statequest/unknown.json']){let intercepted=false;events.fetch({request:{url,method:'GET'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);}
 console.log('11 offline cache/subpath isolation checks passed');
})()
