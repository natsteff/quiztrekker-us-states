import {VERSION} from './version.js';
export function startUpdates({storage,document,navigator,location,setTimer=setTimeout,clearTimer=clearTimeout}){
 const $=id=>document.getElementById(id),toggle=$('autoUpdate');
 let enabled=true;try{enabled=storage.getItem('statequest.autoUpdate')!=='false';}catch{}
 toggle.checked=enabled;$('appVersion').textContent=`StateQuest v${VERSION}`;
 const shell=[document.querySelector?.('header'),document.querySelector?.('main')].filter(Boolean);
 function block(value){shell.forEach(el=>el.inert=value);}
 let startup=enabled,applying=false,timer,controlled=Boolean(navigator.serviceWorker?.controller);
 function status(text){$('offlineStatus').textContent=text;}
 function finish(text){const wasVisible=!$('updateOverlay').hidden;startup=false;applying=false;clearTimer(timer);$('updateOverlay').hidden=true;block(false);if(text)status(text);if(wasVisible)document.querySelector?.('#flip')?.focus();}
 toggle.onchange=()=>{enabled=toggle.checked;try{storage.setItem('statequest.autoUpdate',String(enabled));}catch{}if(!enabled)finish('Automatic startup updates are off. Cached offline play remains available.');else status('Automatic updates enabled for the next startup.');};
 $('skipUpdate').onclick=()=>finish('Playing now. Any ready update can apply on your next startup.');
 if(!('serviceWorker' in navigator)){finish('Offline installation is unavailable in this browser. Online play is available.');return Promise.resolve();}
 if(enabled){block(true);$('updateOverlay').hidden=false;timer=setTimer(()=>finish('Update check timed out. You can keep playing; try again next startup.'),8000);}
 navigator.serviceWorker.addEventListener('controllerchange',()=>{const replacing=controlled;controlled=true;if(startup&&applying){startup=false;clearTimer(timer);location.reload();}else if(!startup&&replacing)status('A game update is ready. Reopen the game to use the latest version.');else if(!replacing)status('Ready for offline play.');});
 return navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(async reg=>{
  function apply(){if(applying)return true;if(reg.waiting&&startup&&enabled){applying=true;status('Applying the ready game update…');reg.waiting.postMessage({type:'SKIP_WAITING'});return true;}return false;}
  function watch(worker){if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'){if(!apply()&&navigator.serviceWorker.controller)status('An update is ready for the next startup.');}if(worker.state==='activated'&&startup&&!applying)finish('Ready for offline play.');if(worker.state==='redundant'&&startup)finish('Update unavailable. Your saved game is still playable.');});}
  reg.addEventListener('updatefound',()=>watch(reg.installing));watch(reg.installing);
  if(startup){if(apply())return;try{await reg.update();}catch{finish(navigator.serviceWorker.controller?'Playing from your saved offline game.':'Online play is available; offline setup will retry next time.');return;}if(apply())return;if(!reg.installing)finish('Ready for offline play.');}
  else status('Ready for offline play. Automatic startup updates are off.');
 }).catch(()=>finish(navigator.serviceWorker.controller?'Playing from your saved offline game.':'Offline setup unavailable. Online play is still available.'));
}
