export const WELCOME_KEY='statequest.welcome.v1';
export const INSTALL_DISMISS_KEY='statequest.installReminder.dismissed';
export const INSTALL_HELP='<p><strong>On iPhone:</strong> Safari → Share → Add to Home Screen.</p><p><strong>On Android:</strong> your browser menu → Install app or Add to Home screen.</p><p>Load the game online once before playing offline. Saves stay on this device; use Export to back them up.</p>';
export function standaloneDisplay(window,navigator){return window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}
export function welcomeMode({seen,mobile,standalone,suppressed}){if(!seen)return 'welcome';return mobile&&!standalone&&!suppressed?'reminder':null;}
export function startWelcome({storage,document,window,navigator,mobile}){
 const $=id=>document.getElementById(id);let automaticShown=false,installedThisVisit=false,observer;
 const read=key=>{try{return storage.getItem(key)==='true';}catch{return false;}};
 const write=key=>{try{storage.setItem(key,'true');}catch{}};
 const standalone=()=>installedThisVisit||standaloneDisplay(window,navigator);
 $('settingsInstallHelp').innerHTML=INSTALL_HELP;$('welcomeInstallHelp').innerHTML=INSTALL_HELP;
 function refreshInstall(){const installed=standalone();$('welcomeInstall').hidden=installed;if(installed)$('installReminder').hidden=true;}
 function openWelcome(install=false){refreshInstall();$('installReminder').hidden=true;if(!$('welcomeDialog').open)$('welcomeDialog').showModal();$('welcomeScroll').scrollTop=install?$('welcomeInstall').offsetTop:0;}
 function closeWelcome(){write(WELCOME_KEY);$('welcomeDialog').close();}
 $('welcomeContinue').onclick=closeWelcome;$('closeWelcome').onclick=closeWelcome;
 $('welcomeDialog').addEventListener('close',()=>write(WELCOME_KEY));
 $('welcomeDialog').addEventListener('cancel',()=>write(WELCOME_KEY));
 $('showWelcome').onclick=()=>openWelcome();$('installHow').onclick=()=>openWelcome(true);
 $('dismissInstallReminder').onclick=()=>{$('installReminder').hidden=true;};
 $('neverInstallReminder').onclick=()=>{write(INSTALL_DISMISS_KEY);$('installReminder').hidden=true;};
 function maybeShow(){
  if(automaticShown||!$('updateOverlay').hidden||document.querySelector('dialog[open]'))return;
  automaticShown=true;observer?.disconnect();
  const mode=welcomeMode({seen:read(WELCOME_KEY),mobile,standalone:standalone(),suppressed:read(INSTALL_DISMISS_KEY)});
  if(mode==='welcome')openWelcome();else if(mode==='reminder')$('installReminder').hidden=false;
 }
 if(window.MutationObserver){observer=new window.MutationObserver(maybeShow);observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden','open']});}
 window.matchMedia('(display-mode: standalone)').addEventListener?.('change',refreshInstall);
 window.addEventListener('appinstalled',()=>{installedThisVisit=true;write(INSTALL_DISMISS_KEY);refreshInstall();});
 maybeShow();return {open:openWelcome};
}
