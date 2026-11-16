const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const w=vm.runInNewContext(fs.readFileSync('dist/welcome.js','utf8').replaceAll('export ','')+';({startWelcome,welcomeMode,standaloneDisplay,WELCOME_KEY,INSTALL_DISMISS_KEY,INSTALL_HELP})');
function fixture({seen=false,mobile=true,standalone=false,ios=false,suppressed=false,ready=true,values={},blocked=false}={}){
 if(seen)values[w.WELCOME_KEY]='true';if(suppressed)values[w.INSTALL_DISMISS_KEY]='true';
 const ids=['settingsInstallHelp','welcomeInstallHelp','welcomeInstall','installReminder','welcomeDialog','welcomeScroll','welcomeContinue','closeWelcome','showWelcome','installHow','dismissInstallReminder','neverInstallReminder','updateOverlay'];
 const elements=Object.fromEntries(ids.map(id=>[id,{hidden:id==='installReminder',open:false,scrollTop:0,offsetTop:200,innerHTML:'',events:{},addEventListener(t,fn){this.events[t]=fn;},showModal(){this.open=true;},close(){this.open=false;this.events.close?.();}}]));elements.updateOverlay.hidden=ready;
 const observers=[],events={};let listener;
 const window={matchMedia:()=>({matches:standalone,addEventListener:(t,cb)=>listener=cb}),addEventListener:(t,cb)=>events[t]=cb,MutationObserver:class{constructor(cb){this.cb=cb;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}};
 const storage={getItem:k=>{if(blocked)throw Error('blocked');return values[k];},setItem:(k,v)=>{if(blocked)throw Error('blocked');values[k]=v;}};
 const document={body:{},getElementById:id=>elements[id],querySelector:()=>Object.values(elements).find(e=>e.open)||null};
 w.startWelcome({storage,document,window,navigator:{standalone:ios},mobile});
 return {elements,values,events,ready(){elements.updateOverlay.hidden=true;for(const o of observers)if(!o.disconnected)o.cb();},standalone(){standalone=true;listener();}};
}
let c=fixture({ready:false});assert(!c.elements.welcomeDialog.open);c.ready();assert(c.elements.welcomeDialog.open);assert(!c.values[w.WELCOME_KEY]);assert.equal(c.elements.welcomeInstallHelp.innerHTML,c.elements.settingsInstallHelp.innerHTML);c.elements.welcomeContinue.onclick();assert.equal(c.values[w.WELCOME_KEY],'true');assert(!c.elements.welcomeDialog.open);c.ready();assert(!c.elements.welcomeDialog.open);
c=fixture({seen:true});assert(!c.elements.installReminder.hidden);c.elements.dismissInstallReminder.onclick();assert(c.elements.installReminder.hidden);const again=fixture({values:c.values});assert(!again.elements.installReminder.hidden);again.elements.neverInstallReminder.onclick();assert.equal(again.values[w.INSTALL_DISMISS_KEY],'true');const muted=fixture({values:again.values});assert(muted.elements.installReminder.hidden);
c=fixture({standalone:true});assert(c.elements.welcomeDialog.open);assert(c.elements.welcomeInstall.hidden);c.elements.welcomeContinue.onclick();c=fixture({seen:true,standalone:true});assert(c.elements.installReminder.hidden);assert(!c.elements.welcomeDialog.open);
c=fixture({ios:true});assert(c.elements.welcomeInstall.hidden);c=fixture({seen:true,mobile:false});assert(c.elements.installReminder.hidden);c.elements.showWelcome.onclick();assert(c.elements.welcomeDialog.open);c.elements.closeWelcome.onclick();assert(!c.elements.welcomeDialog.open);
c=fixture({seen:true});c.elements.installHow.onclick();assert(c.elements.welcomeDialog.open);assert.equal(c.elements.welcomeScroll.scrollTop,200);c.elements.welcomeDialog.events.cancel();assert.equal(c.values[w.WELCOME_KEY],'true');
c=fixture({seen:true});c.standalone();assert(c.elements.installReminder.hidden);c=fixture({seen:true});c.events.appinstalled();assert(c.elements.installReminder.hidden);assert.equal(c.values[w.INSTALL_DISMISS_KEY],'true');
c=fixture({blocked:true});assert(c.elements.welcomeDialog.open);assert.doesNotThrow(()=>c.elements.welcomeContinue.onclick());
for(const seen of [false,true])for(const mobile of [false,true])for(const standalone of [false,true])for(const suppressed of [false,true])assert.equal(w.welcomeMode({seen,mobile,standalone,suppressed}),!seen?'welcome':mobile&&!standalone&&!suppressed?'reminder':null);
assert(w.INSTALL_HELP.includes('Safari → Share → Add to Home Screen.'));assert(w.INSTALL_HELP.includes('your browser menu → Install app or Add to Home screen.'));
console.log('Welcome startup coordination, first/return visits, persistence, standalone suppression, dismiss/replay and shared installation copy passed');
