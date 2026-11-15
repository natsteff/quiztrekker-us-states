const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 const events={},deleted=[],added=[];let skipped=0;
 const store={addAll:async assets=>{for(const request of assets){assert.equal(request.cache,'reload');added.push('./'+new URL(request.url).pathname.split('/quiztrekker-us-states/')[1]);}},match:async key=>({cached:key})};
 vm.runInNewContext(fs.readFileSync('dist/sw.js','utf8'),{URL,Request:class{constructor(url,options){this.url=String(url);this.cache=options.cache;}},caches:{open:async()=>store,keys:async()=>['quiztrekker-us-states:/quiztrekker-us-states/:old','quiztrekker-us-states:/other/:keep','unrelated'],delete:async name=>deleted.push(name)},self:{skipWaiting:async()=>{skipped++;},location:{href:'https://example.github.io/quiztrekker-us-states/sw.js'},clients:{claim:async()=>{}},addEventListener:(name,handler)=>events[name]=handler},fetch:()=>{throw Error('Network should not be needed');}});
 let wait;events.message({data:{type:'OTHER'},waitUntil:p=>wait=p});assert.equal(skipped,0);events.message({data:{type:'SKIP_WAITING'},waitUntil:p=>wait=p});await wait;assert.equal(skipped,1);
 events.install({waitUntil:p=>wait=p});await wait;
 assert.equal(added.filter(p=>p.startsWith('./assets/flags/')).length,50);
 assert.equal(added.filter(p=>p.startsWith('./assets/extra-flags/')).length,20);
 assert(['./extra-locations.js','./geography.js','./GSHHG-LICENSE.txt','./GSHHG-COPYING.LESSERv3.txt','./GSHHG-COPYINGv3.txt'].every(p=>added.includes(p)));
 assert(['./decks.js','./update-client.js','./version.js'].every(p=>added.includes(p)));
 assert(added.includes('./credits.html') && added.includes('./facts.js'));
 assert(added.includes('./index.html') && added.includes('./states.js') && added.includes('./icon-512.png'));
 events.activate({waitUntil:p=>wait=p});await wait;
 assert.deepEqual(deleted,['quiztrekker-us-states:/quiztrekker-us-states/:old']);
 let response;events.fetch({request:{url:'https://example.github.io/quiztrekker-us-states/',method:'GET',mode:'navigate'},respondWith:p=>response=p});assert.equal((await response).cached,'./index.html');
 events.fetch({request:{url:'https://example.github.io/quiztrekker-us-states/states.js',method:'GET'},respondWith:p=>response=p});assert.equal((await response).cached,'./states.js');
 for(const path of ['credits.html','assets/flags/MN.svg']){events.fetch({request:{url:'https://example.github.io/quiztrekker-us-states/'+path,method:'GET'},respondWith:p=>response=p});assert.equal((await response).cached,'./'+path);}
 for(const url of ['https://example.github.io/other/','https://elsewhere.test/quiztrekker-us-states/','https://example.github.io/quiztrekker-us-states/unknown.json']){let intercepted=false;events.fetch({request:{url,method:'GET'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);}
 console.log('17 offline cache/subpath isolation checks passed');
})()
