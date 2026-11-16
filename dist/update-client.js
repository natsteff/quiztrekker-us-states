import {VERSION} from './version.js';
export function startUpdates({storage,document,navigator,location,window=globalThis,now=()=>Date.now(),setTimer=setTimeout,clearTimer=clearTimeout}){
 const $=id=>document.getElementById(id),toggle=$('autoUpdate'),checkButton=$('checkUpdates'),applyButton=$('applyUpdate'),hint=$('updateReloadNote');
 let enabled=true;try{enabled=storage.getItem('statequest.autoUpdate')!=='false';}catch{}
 toggle.checked=enabled;$('appVersion').textContent=`QuizTrekker - US States v${VERSION}`;
 const shell=[document.querySelector?.('header'),document.querySelector?.('main')].filter(Boolean);
 const block=value=>shell.forEach(el=>el.inert=value);
 let startup=enabled,applying=false,reloadRequested=false,reloaded=false,reg,registration,checking,lastCheck=-Infinity,controllerChanged=false,timer;
 let controlled=Boolean(navigator.serviceWorker?.controller),wasHidden=document.visibilityState==='hidden';
 function status(text){$('offlineStatus').textContent=text;}
 function offer(){const ready=Boolean(reg?.waiting||controllerChanged);if(applyButton)applyButton.hidden=!ready;if(hint)hint.hidden=!ready;return ready;}
 function finish(text){const wasVisible=!$('updateOverlay').hidden;startup=false;applying=false;reloadRequested=false;clearTimer(timer);$('updateOverlay').hidden=true;block(false);if(text)status(text);if(wasVisible)document.querySelector?.('#flip')?.focus();}
 function apply(){if(applying)return true;if(!reg?.waiting&&!controllerChanged)return false;applying=true;reloadRequested=true;if(!startup)timer=setTimer(()=>{applying=false;reloadRequested=false;status('Could not apply the update yet. Try Update & Reload again.');},8000);status('Applying update and reloading…');if(reg?.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});else if(!reloaded){reloaded=true;location.reload();}return true;}
 function ready(){offer();status('A game update is ready. Choose Update & Reload when you are ready.');}
 function watch(worker){if(!worker)return;worker.addEventListener('statechange',()=>{
  if(worker.state==='installed'){if(startup&&enabled&&reg.waiting){apply();}else if(navigator.serviceWorker.controller){ready();}}
  if(worker.state==='activated'&&startup&&!applying)finish('Ready for offline play.');
  if(worker.state==='redundant'){if(startup)finish('Update unavailable. Your saved game is still playable.');else status('Update download failed. Try Check for Updates Now again.');}
 });}
 function register(){if(reg)return Promise.resolve(reg);if(registration)return registration;registration=navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(value=>{reg=value;reg.addEventListener('updatefound',()=>watch(reg.installing));watch(reg.installing);return reg;}).catch(error=>{registration=null;throw error;});return registration;}
 function check(manual=false){
  if(checking)return checking;
  if(!manual&&now()-lastCheck<60000)return Promise.resolve();
  lastCheck=now();if(checkButton)checkButton.disabled=true;
  status('Checking for game updates…');
  let timeout;const work=(async()=>{try{
   await register();
   if(reg.waiting){if(startup&&enabled)apply();else ready();return;}
   await reg.update();
   if(startup&&enabled&&reg.waiting){apply();return;}
   if(offer())ready();else if(reg.installing)status('Downloading an update… You can keep playing.');else status(`Up to date — v${VERSION}. Ready for offline play.`);
   if(startup&&!reg.installing)finish();
  }catch{if(startup)finish('Playing from your saved offline game. Check for updates when online.');else status('Could not check for updates. You may be offline; your saved game is still available.');}})();
  checking=Promise.race([work,new Promise(resolve=>{timeout=setTimer(()=>{if(startup)finish('Update check timed out. You can keep playing.');else status('Update check timed out. Try again when online.');resolve();},8000);})]).finally(()=>{clearTimer(timeout);checking=null;if(checkButton)checkButton.disabled=false;});return checking;
 }
 toggle.onchange=()=>{enabled=toggle.checked;try{storage.setItem('statequest.autoUpdate',String(enabled));}catch{}if(!enabled)finish('Automatic startup and resume checks are off. Manual checks remain available.');else status('Automatic startup and resume checks enabled.');};
 $('skipUpdate').onclick=()=>finish('Playing now. Use Check for Updates Now or Update & Reload in Options.');
 if(!('serviceWorker' in navigator)){finish('Offline installation and update checks are unavailable in this browser.');if(checkButton)checkButton.disabled=true;return Promise.resolve();}
 if(checkButton)checkButton.onclick=()=>check(true);
 if(applyButton){applyButton.hidden=true;applyButton.onclick=()=>{if(!apply())check(true);};}
 navigator.serviceWorker.addEventListener('controllerchange',()=>{const replacing=controlled;controlled=true;if(reloadRequested&&!reloaded){reloaded=true;clearTimer(timer);location.reload();}else if(replacing){controllerChanged=true;ready();}else status('Ready for offline play.');});
 const resume=()=>{if(enabled&&!startup)check(false);};
 document.addEventListener?.('visibilitychange',()=>{if(document.visibilityState==='hidden'){wasHidden=true;}else if(wasHidden){wasHidden=false;resume();}});
 window.addEventListener?.('pageshow',e=>{if(e.persisted)resume();});
 if(enabled){block(true);$('updateOverlay').hidden=false;timer=setTimer(()=>finish('Update check timed out. You can keep playing.'),8000);return check(true);}
 return register().then(()=>{if(offer())ready();else status('Ready for offline play. Automatic startup updates are off.');}).catch(()=>status('Playing from your saved offline game. Use Check for Updates Now when online.'));
}
