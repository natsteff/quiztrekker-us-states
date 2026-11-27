import {VERSION} from './version.js';
// Always share the public entry point, never kiosk parameters or a local preview URL.
export const GAME_URL='https://natsteff.github.io/quiztrekker-us-states/';
export function startSharing({document,navigator,onOpen=()=>{}}){
 const $=id=>document.getElementById(id),about=$('aboutDialog'),dialog=$('shareDialog');
 let sharing=false,copying=false;
 $('aboutVersion').textContent=`Version ${VERSION}`;
 $('shareURL').value=GAME_URL;
 $('aboutButton').onclick=()=>{onOpen();about.showModal();};
 $('closeAbout').onclick=()=>about.close();
 $('closeShare').onclick=()=>dialog.close();
 function fallback(){
  $('shareStatus').textContent='';dialog.showModal();
  $('shareURL').focus();$('shareURL').select();
 }
 async function share(){
  if(sharing)return;
  sharing=true;onOpen();
  try{
   if(typeof navigator.share==='function'){
    try{await navigator.share({title:'QuizTrekker – US States',text:'Explore and play QuizTrekker – US States!',url:GAME_URL});return;}
    catch(error){if(error?.name==='AbortError')return;}
   }
   fallback();
  }finally{sharing=false;}
 }
 $('aboutShare').onclick=share;$('settingsShare').onclick=share;
 $('copyShare').onclick=async()=>{
  if(copying)return;
  copying=true;
  try{
   if(typeof navigator.clipboard?.writeText!=='function')throw Error('Clipboard unavailable');
   await navigator.clipboard.writeText(GAME_URL);
   $('shareStatus').textContent='Link copied!';
  }catch{
   $('shareURL').focus();$('shareURL').select();
   $('shareStatus').textContent='Select and copy the link above using your device’s copy command.';
  }finally{copying=false;}
 };
}
