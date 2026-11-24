// Standard-layout controllers only. Buttons activate on press, never while held.
export function createPadInput(){
 let previous={},repeat={},padId;
 return function poll(pad,time){
  if(!pad){previous={};repeat={};padId=undefined;return [];}
  const b=i=>!!pad.buttons?.[i]?.pressed,keys={activate:b(0),faceB:b(1),previous:b(4),next:b(5),leftTrigger:b(6),rightTrigger:b(7),back:b(8),start:b(9),flip:b(2),submit:b(3),up:b(12),down:b(13),left:b(14),right:b(15),'nav-up':(pad.axes?.[1]||0)<-.6,'nav-down':(pad.axes?.[1]||0)>.6,'nav-left':(pad.axes?.[0]||0)<-.6,'nav-right':(pad.axes?.[0]||0)>.6};
  if(padId!==pad.index){padId=pad.index;previous=keys;repeat={};return [];}
  const actions=[];for(const [key,pressed] of Object.entries(keys)){if(pressed&&!previous[key]){actions.push(key);repeat[key]=time+400;}else if(pressed&&['up','down','left','right'].includes(key.replace('nav-',''))&&time>=(repeat[key]??Infinity)){actions.push(key);repeat[key]=time+150;}if(!pressed)delete repeat[key];}previous=keys;return actions;
 };
}
export function nearestControl(items,active,direction){
 if(!items.length)return null;if(!items.includes(active))return items[0];const a=active.getBoundingClientRect(),ax=a.x+a.width/2,ay=a.y+a.height/2;
 const horizontal=direction==='left'||direction==='right',sign=direction==='left'||direction==='up'?-1:1;
 return items.filter(e=>e!==active).map(e=>{const b=e.getBoundingClientRect(),dx=b.x+b.width/2-ax,dy=b.y+b.height/2-ay,major=(horizontal?dx:dy)*sign,cross=Math.abs(horizontal?dy:dx);return {e,major,score:major+cross*3};}).filter(v=>v.major>2).sort((a,b)=>a.score-b.score)[0]?.e||active;
}
// Direct actions take priority in the game; the stick remains available for menus.
export function startGamepad({window,document,navigator}){
 if(!navigator.getGamepads)return ()=>{};
 const poll=createPadInput();let frame,stopped=false,connected=false,answerLatch=false,picker;
 const byId=id=>document.getElementById(id),body=document.body;
 const visible=e=>!!e&&!e.hidden&&!e.disabled&&!e.closest('[hidden],[inert]')&&e.getAttribute('aria-disabled')!=='true'&&!!e.getClientRects().length&&window.getComputedStyle(e).visibility!=='hidden';
 const dialog=()=>[...document.querySelectorAll('dialog[open]')].at(-1);
 const controls=(root=dialog()||document)=>[...root.querySelectorAll('button,a[href],input:not([type=hidden]),select,summary,[tabindex="0"]')].filter(visible);
 const game=()=>body.dataset.view==='game'&&body.dataset.mode==='challenge';
 const learn=()=>body.dataset.view==='game'&&body.dataset.mode==='learn';
 const click=id=>{const e=byId(id);if(visible(e)){e.click();return true;}return false;};
 const face=()=>[...document.querySelectorAll('[data-sprint-answer],[data-pick],[data-answer]')].filter(visible);
 const allNeighbors=()=>body.dataset.game==='neighbors-all';
 function focus(e){if(!e)return;body.classList.add('keyboard-focus');e.focus({preventScroll:true});e.scrollIntoView({block:'nearest',inline:'nearest'});}
 function activate(e){if(!visible(e))return;if(e.matches('input,select')){focus(e);return;}if(e.matches('[data-map-answer]'))e.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));else e.click();}
 function openPicker(){
  const select=byId('gameSelect');if(!select)return;
  click('pauseSprint');picker=document.createElement('dialog');picker.className='controller-picker';
  const heading=document.createElement('h2');heading.textContent='Choose a game';picker.append(heading);
  for(const option of select.options){const b=document.createElement('button');b.className='secondary';b.textContent=option.textContent+(option.value==='shape-typed'?' · Keyboard required':option.value==='mapquest'||option.value==='neighbors-all'?' · Adapted controls':'');b.disabled=option.disabled;b.onclick=()=>{picker.close();picker.remove();picker=null;select.value=option.value;select.dispatchEvent(new window.Event('change',{bubbles:true}));};picker.append(b);}
  const close=document.createElement('button');close.textContent='Close';close.setAttribute('aria-label','Close game picker');close.onclick=()=>{picker.close();picker.remove();picker=null;};picker.append(close);body.append(picker);picker.showModal();focus(controls(picker)[select.selectedIndex]);
 }
 function back(){const d=dialog();if(d){const close=d.querySelector('#closeWelcome,#closeMore,#closeCompare,#cancelImport,#masteryNo,button[aria-label^="Close"]');if(close)close.click();return;}if(body.dataset.view==='options')click('closeOptions');else if(body.dataset.view==='progress')click('progressTab');else if(game())openPicker();}
 function act(action){
  const d=dialog(),items=controls(),active=document.activeElement;
  if(action==='back'){back();return;}
  if(action==='start'){if(!d)click('settingsButton');return;}
  if(action==='previous'||action==='next'){
   if(d)return;const tabs=['learnTab','challengeTab','progressTab'],i=body.dataset.view==='progress'?2:body.dataset.mode==='learn'?0:1;click(tabs[(i+(action==='next'?1:2))%3]);return;
  }
  const direct=['activate','faceB','flip','submit'].indexOf(action);
  if(d||body.dataset.view!=='game'){
   if(action==='faceB'){back();return;}if(action==='activate'){activate(items.includes(active)?active:items[0]);return;}
  }else if(learn()){
   if(action==='leftTrigger'){click('prev');return;}if(action==='rightTrigger'){click('next');return;}
   if(action==='flip'){if(!click('flip'))click('flipBack');return;}
   if(action==='activate'){click('moreFacts');return;}
   if(action==='submit'){const map=byId('mapView');click(map?.getAttribute('aria-pressed')==='true'?'shapeView':'mapView');return;}
   if(action==='up'||action==='down'){const target=document.querySelector('.back-facts');target?.scrollBy({top:action==='down'?160:-160,behavior:'smooth'});return;}
  }else if(game()){
   if(action==='rightTrigger'){for(const id of ['nextQuestion','checkTimeline','checkNeighbors','submitMapAnswer','resumeSprint','startSprint'])if(click(id))break;return;}
   if(action==='leftTrigger'){click('undoTimeline');return;}
   if(direct>=0&&visible(byId('nextQuestion')))return; // Face buttons never advance a graded answer.
   if(direct>=0&&!allNeighbors()){
    const answers=face();if(answers.length){if(!answerLatch&&answers[direct]){answerLatch=true;activate(answers[direct]);}return;}
   }
   if(action==='activate'){
    const choices=face(),primary=allNeighbors()?choices:controls().filter(e=>e.matches('[data-capital-mode],#startQuiz,#startChallenge,#startSprint,#resumeSprint,[data-map-answer]'));
    activate(primary.includes(active)?active:primary[0]);return;
   }
  }
  const allNavigation=action.startsWith('nav-'),direction=action.replace('nav-','');if(!['up','down','left','right'].includes(direction))return;
  if(allNavigation&&active?.matches('select')&&['left','right'].includes(direction)){
   const options=[...active.options].filter(o=>!o.disabled),i=options.indexOf(active.selectedOptions[0]);active.value=options[(i+(direction==='left'?-1:1)+options.length)%options.length]?.value;active.dispatchEvent(new window.Event('change',{bubbles:true}));focus(active.id&&byId(active.id)||active);return;
  }
  let targets=items;if(!allNavigation&&!d&&game()){
   const primary=items.filter(e=>e.matches('[data-answer],[data-pick],[data-sprint-answer],[data-map-answer],[data-capital-mode],#startQuiz,#startChallenge,#startSprint,#resumeSprint'));if(primary.length)targets=primary;
  }
  focus(nearestControl(targets,active,direction));
 }
 function refresh(){
  const help=byId('controllerHelp');if(!help)return;help.hidden=!connected;if(!connected)return;
  const d=dialog(),answers=face(),typed=visible(byId('answerInput')),result=visible(byId('nextQuestion'));
  let hints=d?'D-pad / Stick: move · A: select · B / View: close':body.dataset.view!=='game'?'Stick: move · A: select · View: back':learn()?'LT / RT: previous / next card · X: flip · A: More Facts · Y: shape / map · D-pad ↑↓: scroll facts':result?'RT: next question':typed?'Keyboard required: type the postal code · View: choose game':allNeighbors()?'D-pad: choose option · A: toggle · RT: check answers':body.dataset.game==='timeline'?'A / B / X / Y: add / remove state · LT: undo · RT: check timeline':body.dataset.game==='mapquest'?'Adapted controls: D-pad: choose region · A: preview · RT: submit · Stick: map controls':answers.length?['A','B','X','Y'].slice(0,answers.length).join(' / ')+': answer':visible(byId('resumeSprint'))?'A / RT: resume Sprint':visible(byId('startSprint'))?'A / RT: play again':visible(byId('pauseSprint'))?'Sprint running · answers advance automatically':'D-pad: choose mode · A: start / select';
  hints+=' · LB / RB: Learn / Play / Progress · Menu: Settings';if(game()&&!d)hints+=' · View: games';
  if(help.textContent!==hints)help.textContent=hints;
  if(!d&&game()&&!allNeighbors()&&!result)answers.slice(0,4).forEach((b,i)=>{if(b.querySelector('.pad-badge'))return;const badge=document.createElement('span');badge.className='pad-badge';badge.setAttribute('aria-hidden','true');badge.textContent=['A','B','X','Y'][i];b.prepend(badge);});
 }
 function tick(time){
  if(stopped)return;let pad;try{if(!document.hidden)pad=[...navigator.getGamepads()].find(p=>p?.connected&&p.mapping==='standard');}catch{}
  connected=!!pad;body.classList.toggle('controller-mode',connected);
  if(!pad||![0,1,2,3].some(i=>pad.buttons?.[i]?.pressed))answerLatch=false;
  const actions=poll(pad,time);if(actions.length)act(actions[0]);refresh();frame=window.requestAnimationFrame(tick);
 }
 frame=window.requestAnimationFrame(tick);return ()=>{stopped=true;window.cancelAnimationFrame(frame);picker?.close();picker?.remove();body.classList.remove('controller-mode');if(byId('controllerHelp'))byId('controllerHelp').hidden=true;};
}
