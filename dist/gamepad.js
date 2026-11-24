// Standard-layout controllers only. Buttons activate on press, never while held.
export function createPadInput(){
 let previous={},repeat={},padId;
 return function poll(pad,time){
  if(!pad){previous={};repeat={};padId=undefined;return [];}
  const b=i=>!!pad.buttons?.[i]?.pressed,keys={activate:b(0),back:b(1),previous:b(4),next:b(5),start:b(9),flip:b(2),submit:b(3),up:b(12),down:b(13),left:b(14),right:b(15),'nav-up':(pad.axes?.[1]||0)<-.6,'nav-down':(pad.axes?.[1]||0)>.6,'nav-left':(pad.axes?.[0]||0)<-.6,'nav-right':(pad.axes?.[0]||0)>.6};
  if(padId!==pad.index){padId=pad.index;previous=keys;repeat={};return [];}
  const actions=[];for(const [key,pressed] of Object.entries(keys)){if(pressed&&!previous[key]){actions.push(key);repeat[key]=time+400;}else if(pressed&&['up','down','left','right'].includes(key.replace('nav-',''))&&time>=(repeat[key]??Infinity)){actions.push(key);repeat[key]=time+150;}if(!pressed)delete repeat[key];}previous=keys;return actions;
 };
}
export function nearestControl(items,active,direction){
 if(!items.length)return null;if(!items.includes(active))return items[0];const a=active.getBoundingClientRect(),ax=a.x+a.width/2,ay=a.y+a.height/2;
 const horizontal=direction==='left'||direction==='right',sign=direction==='left'||direction==='up'?-1:1;
 return items.filter(e=>e!==active).map(e=>{const b=e.getBoundingClientRect(),dx=b.x+b.width/2-ax,dy=b.y+b.height/2-ay,major=(horizontal?dx:dy)*sign,cross=Math.abs(horizontal?dy:dx);return {e,major,score:major+cross*3};}).filter(v=>v.major>2).sort((a,b)=>a.score-b.score)[0]?.e||active;
}
export function startGamepad({window,document,navigator}){
 if(!navigator.getGamepads)return ()=>{};
 const poll=createPadInput();let frame,stopped=false;
 const visible=e=>!e.disabled&&!e.closest('[inert]')&&e.getAttribute('aria-disabled')!=='true'&&!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
 function controls(){const dialogs=[...document.querySelectorAll('dialog[open]')],root=dialogs.at(-1)||document;return [...root.querySelectorAll('button,a[href],input:not([type=hidden]),select,summary,[tabindex="0"]')].filter(visible);}
 function focus(e){if(!e)return;document.body.classList.add('keyboard-focus');e.focus({preventScroll:true});e.scrollIntoView({block:'nearest',inline:'nearest'});}
 function act(action){
  const items=controls(),active=document.activeElement,dialog=[...document.querySelectorAll('dialog[open]')].at(-1);
  if(action==='back'){
   if(dialog){const close=dialog.querySelector('#closeWelcome,#closeMore,#closeCompare,#cancelImport,#masteryNo,button[aria-label^="Close"]');if(close)close.click();return;}
   if(document.body.dataset.view==='options')document.getElementById('closeOptions')?.click();else if(document.body.dataset.view==='progress')document.getElementById('progressTab')?.click();else if(document.getElementById('flipBack'))document.getElementById('flipBack').click();else document.getElementById('learnTab')?.click();return;
  }
  if(action==='start'){if(dialog)return;const pause=document.getElementById('pauseSprint')||document.getElementById('resumeSprint');(pause&&visible(pause)&&document.body.dataset.view==='game'?pause:document.getElementById('settingsButton'))?.click();return;}
  if(action==='previous'||action==='next'){
   if(dialog||document.body.dataset.view!=='game')return;
   if(document.body.dataset.mode==='learn')document.getElementById('challengeTab')?.click();
   const select=document.getElementById('gameSelect');if(select){const options=[...select.options].filter(o=>!o.disabled),i=options.indexOf(select.selectedOptions[0]);select.value=options[(i+(action==='next'?1:-1)+options.length)%options.length].value;select.dispatchEvent(new Event('change',{bubbles:true}));focus(document.getElementById('gameSelect'));}return;
  }
  if(action==='flip'){if(!dialog&&document.body.dataset.view==='game'&&document.body.dataset.mode==='learn')(document.getElementById('flip')||document.getElementById('flipBack'))?.click();return;}
  if(action==='submit'){if(dialog||document.body.dataset.view!=='game')return;for(const id of ['nextQuestion','submitMapAnswer','checkNeighbors','checkTimeline']){const button=document.getElementById(id);if(button&&visible(button)){button.click();break;}}return;}
  if(action==='activate'){
   if(!items.includes(active)){focus(items.find(e=>e.matches('[data-answer],[data-pick],[data-sprint-answer],[data-map-answer],#flip,#startQuiz'))||items[0]);return;}
   if(active.matches('input[type=text],input:not([type])')){active.focus();return;}
   if(active.matches('select'))return; // Left/right changes the focused selector.
   if(active.matches('[data-map-answer]'))active.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));else active.click();return;
  }
  const allNavigation=action.startsWith('nav-'),direction=action.replace('nav-',''),delta=direction==='up'||direction==='left'?-1:1;
  if(!allNavigation&&!dialog&&document.body.dataset.view==='game'&&document.body.dataset.mode==='learn'&&['left','right'].includes(direction)){document.getElementById(direction==='right'?'next':'prev')?.click();return;}
  let targets=items;if(!allNavigation&&!dialog&&document.body.dataset.view==='game'){const primary=items.filter(e=>e.matches('[data-answer],[data-pick],[data-sprint-answer],[data-map-answer],#flip,#flipBack,#prev,#next,#nextQuestion,#submitMapAnswer,#checkNeighbors,#checkTimeline,#undoTimeline,#clearTimeline,#startQuiz,#startChallenge,#startSprint,#resumeSprint,#pauseSprint'));if(primary.length)targets=primary;}

  if(allNavigation&&active?.matches('select')&&['left','right'].includes(direction)){const options=[...active.options].filter(o=>!o.disabled),i=options.indexOf(active.selectedOptions[0]);active.value=options[(i+delta+options.length)%options.length]?.value;active.dispatchEvent(new Event('change',{bubbles:true}));const replacement=active.id&&document.getElementById(active.id);focus(replacement||active);return;}
  focus(nearestControl(targets,active,direction));
 }
 function tick(time){if(stopped)return;let pad;try{if(!document.hidden)pad=[...navigator.getGamepads()].find(p=>p?.connected&&p.mapping==='standard');}catch{}for(const action of poll(pad,time))act(action);frame=window.requestAnimationFrame(tick);}
 frame=window.requestAnimationFrame(tick);return ()=>{stopped=true;window.cancelAnimationFrame(frame);};
}
