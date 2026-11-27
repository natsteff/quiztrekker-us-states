const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/sharing.js','utf8').replace(/import[^\n]+\n/,'const VERSION="test";\n').replaceAll('export ','');
const {startSharing,GAME_URL}=vm.runInNewContext(source+';({startSharing,GAME_URL})');
function fixture(navigator={}){
 const ids=['aboutDialog','shareDialog','aboutVersion','shareURL','aboutButton','closeAbout','closeShare','shareStatus','aboutShare','settingsShare','copyShare'];
 const els=Object.fromEntries(ids.map(id=>[id,{open:false,textContent:'',value:'',focus(){this.focused=true;},select(){this.selected=true;},showModal(){this.open=true;},close(){this.open=false;}}]));
 let paused=0;startSharing({document:{getElementById:id=>els[id]},navigator,onOpen:()=>paused++});return {els,paused:()=>paused};
}
(async()=>{
 let f=fixture();f.els.aboutButton.onclick();assert(f.els.aboutDialog.open);assert.equal(f.paused(),1);assert.equal(f.els.aboutVersion.textContent,'Version test');f.els.closeAbout.onclick();assert(!f.els.aboutDialog.open);
 await f.els.settingsShare.onclick();assert(f.els.shareDialog.open);assert.equal(f.els.shareURL.value,GAME_URL);assert(f.els.shareURL.selected);f.els.closeShare.onclick();assert(!f.els.shareDialog.open);
 let payload;f=fixture({share:async p=>payload=p});await f.els.aboutShare.onclick();assert.equal(payload.url,'https://natsteff.github.io/quiztrekker-us-states/');assert(!payload.url.includes('?'));assert(!f.els.shareDialog.open);
 f=fixture({share:async()=>{throw Object.assign(Error('cancelled'),{name:'AbortError'});}});await f.els.settingsShare.onclick();assert(!f.els.shareDialog.open);
 f=fixture({share:async()=>{throw Error('unsupported');}});await f.els.settingsShare.onclick();assert(f.els.shareDialog.open);
 let copied;f=fixture({clipboard:{writeText:async value=>copied=value}});await f.els.settingsShare.onclick();await f.els.copyShare.onclick();assert.equal(copied,GAME_URL);assert.equal(f.els.shareStatus.textContent,'Link copied!');
 for(const nav of [{},{clipboard:{writeText:async()=>{throw Error('denied');}}}]){f=fixture(nav);await f.els.settingsShare.onclick();await f.els.copyShare.onclick();assert(f.els.shareURL.selected);assert(f.els.shareStatus.textContent.includes('Select and copy'));}
 let resolve,calls=0;f=fixture({share:()=>{calls++;return new Promise(r=>resolve=r);}});const pending=f.els.settingsShare.onclick();await f.els.aboutShare.onclick();assert.equal(calls,1);resolve();await pending;
 const html=fs.readFileSync('dist/index.html','utf8');assert(html.includes('id="aboutButton"'));assert(!html.includes('<p>Controller:'));assert.equal((html.match(/id="appVersion"/g)||[]).length,1);
 assert(fs.readFileSync('dist/sw.js','utf8').includes('./sharing.js'));
 console.log('About/share: native success/cancel/failure, explicit fallback, clipboard success/denial/unavailable, duplicate activation and clean public URL passed');
})();
