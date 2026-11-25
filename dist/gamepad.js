// Standard layouts by default; device-specific overrides require explicit assignment.
// Buttons activate on press, never while held.
export const PAD_ACTIONS={activate:'A / select',faceB:'B / back',flip:'X / flip',submit:'Y / map',previous:'LB / previous tab',next:'RB / next tab',leftTrigger:'LT / previous card / undo',rightTrigger:'RT / next card / check',back:'View / close / games',start:'Menu / Settings',up:'D-pad up',down:'D-pad down',left:'D-pad left',right:'D-pad right'};
const PAD_BUTTONS={activate:0,faceB:1,flip:2,submit:3,previous:4,next:5,leftTrigger:6,rightTrigger:7,back:8,start:9,up:12,down:13,left:14,right:15};
export function bindingPressed(pad,binding,held=false){
 if(binding?.type==='axis'){const value=pad.axes?.[binding.index];return Number.isFinite(value)&&(value-binding.rest)*binding.direction>(held ? 0.25 : 0.55);}
 const button=pad.buttons?.[binding?.index];return !!button&&(button.pressed||Number.isFinite(button.value)&&button.value>(held ? 0.25 : 0.55));
}
export function cleanPadProfiles(raw){
 const out=Object.create(null);if(!raw||typeof raw!=='object')return out;
 for(const [id,p] of Object.entries(raw).slice(0,12)){if(!id||id.length>300||!p||typeof p!=='object')continue;const bindings={};for(const [action,b] of Object.entries(p.bindings||{})){if(!Object.hasOwn(PAD_BUTTONS,action)||!b||!Number.isInteger(b.index)||b.index<0||b.index>63)continue;if(b.type==='button')bindings[action]={type:'button',index:b.index};else if(b.type==='axis'&&[1,-1].includes(b.direction)&&Number.isFinite(b.rest)&&Math.abs(b.rest)<=1)bindings[action]={type:'axis',index:b.index,rest:b.rest,direction:b.direction};}out[id]={enabled:p.enabled===true,bindings};}return out;
}
export function createPadInput(){
 let previous={},repeat={},padId;
 return function poll(pad,time,bindings={}){
  if(!pad){previous={};repeat={};padId=undefined;return [];}
  const keys=Object.fromEntries(Object.entries(PAD_BUTTONS).map(([action,index])=>[action,bindingPressed(pad,bindings[action]||{type:'button',index},previous[action])]));const reserved=new Set(Object.values(bindings).filter(b=>b.type==='axis').map(b=>b.index));Object.assign(keys,{'nav-up':!reserved.has(1)&&(pad.axes?.[1]||0)<-.6,'nav-down':!reserved.has(1)&&(pad.axes?.[1]||0)>.6,'nav-left':!reserved.has(0)&&(pad.axes?.[0]||0)<-.6,'nav-right':!reserved.has(0)&&(pad.axes?.[0]||0)>.6});
  const identity=String(pad.index)+':'+(pad.id||'');if(padId!==identity){padId=identity;previous=keys;repeat={};return [];}
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
 if(!document)return ()=>{};
 const poll=createPadInput();let frame,stopped=false,connected=false,answerLatch=false,picker,device,capture,lastAction='None yet',lastDiagnostic='',profiles=Object.create(null),showHelp=false,lastFocus;
 let storage;try{storage=window.localStorage;profiles=cleanPadProfiles(JSON.parse(storage?.getItem('statequest.controllerProfiles')||'{}'));showHelp=storage?.getItem('statequest.controllerHelp')==='true';}catch{}
 const byId=id=>document.getElementById(id),body=document.body;
 const visible=e=>{if(!e||e.hidden||e.disabled||e.closest('[hidden],[inert]')||e.getAttribute('aria-disabled')==='true'||!e.getClientRects().length||window.getComputedStyle(e).visibility==='hidden')return false;for(let parent=e.parentElement;parent;parent=parent.parentElement)if(parent.matches('details:not([open])')&&!parent.querySelector('summary')?.contains(e))return false;return true;};
 const dialog=()=>[...document.querySelectorAll('dialog[open]')].at(-1);
 const controls=(root=dialog()||(body.dataset.view==='options'?document.querySelector('.save-tools'):null)||document)=>[...root.querySelectorAll('button,a[href],input:not([type=hidden]),select,summary,[tabindex="0"]')].filter(visible);
 const game=()=>body.dataset.view==='game'&&body.dataset.mode==='challenge';
 const learn=()=>body.dataset.view==='game'&&body.dataset.mode==='learn';
 const click=id=>{const e=byId(id);if(visible(e)){e.click();return true;}return false;};
 const face=()=>[...document.querySelectorAll('[data-sprint-answer],[data-pick],[data-answer]')].filter(visible);
 const allNeighbors=()=>body.dataset.game==='neighbors-all';
 function focus(e){if(!e)return;lastFocus=e;body.classList.add('keyboard-focus');e.focus({preventScroll:true});e.scrollIntoView({block:'nearest',inline:'nearest'});}
 function activate(e){if(!visible(e))return;lastFocus=e;if(e.matches('select,input:not([type]),input[type=text],input[type=number],input[type=file]')){focus(e);return;}if(e.matches('[data-map-answer]'))e.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));else e.click();}
 function openPicker(){
  const select=byId('gameSelect');if(!select)return;
  click('pauseSprint');picker=document.createElement('dialog');picker.className='controller-picker';
  const heading=document.createElement('h2');heading.textContent='Choose a game';picker.append(heading);
  for(const option of select.options){const b=document.createElement('button');b.className='secondary';b.textContent=option.textContent+(option.value==='shape-typed'?' · Keyboard required':option.value==='mapquest'||option.value==='neighbors-all'?' · Adapted controls':'');b.disabled=option.disabled;b.onclick=()=>{picker.close();picker.remove();picker=null;select.value=option.value;select.dispatchEvent(new window.Event('change',{bubbles:true}));};picker.append(b);}
  const close=document.createElement('button');close.textContent='Close';close.setAttribute('aria-label','Close game picker');close.onclick=()=>{picker.close();picker.remove();picker=null;};picker.append(close);body.append(picker);picker.showModal();focus(controls(picker)[select.selectedIndex]);
 }
 function back(){const d=dialog();if(d){const close=d.querySelector('#closeWelcome,#closeMore,#closeCompare,#cancelImport,#masteryNo,button[aria-label^="Close"]');if(close)close.click();return;}if(body.dataset.view==='options')click('closeOptions');else if(body.dataset.view==='progress')click('progressTab');else if(game())openPicker();}
 function act(action){
  const d=dialog(),items=controls(),active=items.includes(document.activeElement)?document.activeElement:items.includes(lastFocus)?lastFocus:document.activeElement;
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
  if(active?.matches('select')&&['left','right'].includes(direction)){
   const options=[...active.options].filter(o=>!o.disabled),i=options.indexOf(active.selectedOptions[0]);active.value=options[(i+(direction==='left'?-1:1)+options.length)%options.length]?.value;active.dispatchEvent(new window.Event('change',{bubbles:true}));focus(active.id&&byId(active.id)||active);return;
  }
  let targets=items;if(!allNavigation&&!d&&game()){
   const primary=items.filter(e=>e.matches('[data-answer],[data-pick],[data-sprint-answer],[data-map-answer],[data-capital-mode],#startQuiz,#startChallenge,#startSprint,#resumeSprint'));if(primary.length)targets=primary;
  }
  if(d||body.dataset.view!=='game'){
   if(active?.matches('summary')&&['left','right'].includes(direction)){active.parentElement.open=direction==='right';return;}
   const index=targets.indexOf(active),step=direction==='up'||direction==='left'?-1:1;focus(targets[index<0?0:Math.max(0,Math.min(targets.length-1,index+step))]);return;
  }
  focus(nearestControl(targets,active,direction));
 }
 function refresh(){
  const help=byId('controllerHelp');if(!help)return;help.hidden=!(connected||showHelp);if(help.hidden)return;
  const d=dialog(),answers=face(),typed=visible(byId('answerInput')),result=visible(byId('nextQuestion'));
  let hints=d?'D-pad / Stick: move · A: select · B / View: close':body.dataset.view!=='game'?'D-pad / Stick ↑↓: move · A: toggle / select · ←→: change option · View: back':learn()?'LT / RT: previous / next card · X: flip · A: More Facts · Y: shape / map · D-pad ↑↓: scroll facts':result?'RT: next question':typed?'Keyboard required: type the postal code · View: choose game':allNeighbors()?'D-pad: choose option · A: toggle · RT: check answers':body.dataset.game==='timeline'?'A / B / X / Y: add / remove state · LT: undo · RT: check timeline':body.dataset.game==='mapquest'?'Adapted controls: D-pad: choose region · A: preview · RT: submit · Stick: map controls':answers.length?['A','B','X','Y'].slice(0,answers.length).join(' / ')+': answer':visible(byId('resumeSprint'))?'A / RT: resume Sprint':visible(byId('startSprint'))?'A / RT: play again':visible(byId('pauseSprint'))?'Sprint running · answers advance automatically':'D-pad: choose mode · A: start / select';
  if(!connected)hints='Controls preview — no active controller. '+hints;
  hints+=' · LB / RB: Learn / Play / Progress · Menu: Settings';if(game()&&!d)hints+=' · View: games';
  if(help.textContent!==hints)help.textContent=hints;
  if((connected||showHelp)&&!d&&game()&&!allNeighbors()&&!result)answers.slice(0,4).forEach((b,i)=>{if(b.querySelector('.pad-badge'))return;const badge=document.createElement('span');badge.className='pad-badge';badge.setAttribute('aria-hidden','true');badge.textContent=['A','B','X','Y'][i];b.prepend(badge);});
 }
 function write(id,value){const e=byId(id);if(e&&e.textContent!==value)e.textContent=value;}
 function persistProfiles(){try{if(!storage)return false;storage.setItem('statequest.controllerProfiles',JSON.stringify(profiles));return true;}catch{return false;}}
 function endCapture(message){capture=null;poll(null,0);write('controllerAssignStatus',message);}
 function assign(binding){const action=capture.action;profiles[device.id]||={enabled:false,bindings:{}};profiles[device.id].bindings[action]=binding;const saved=persistProfiles();endCapture(`${PAD_ACTIONS[action]} assigned to ${binding.type} ${binding.index}${saved?'.':'. Session only; storage unavailable.'} Release the control before using it.`);}
 function diagnostics(pad,usable,blocked){
  const state=!navigator.getGamepads?'This browser has no Gamepad API.':blocked?'Browser access to controllers is blocked.':document.hidden?'Controller input paused while this page is in the background.':!pad?'No controller detected. Focus this page, then press and release a controller button. A keyboard-emulating mapper does not appear as a gamepad.':`${usable?'Connected':'Unsupported layout'}: ${pad.id}. Mapping: ${pad.mapping||'unmapped'}. ${pad.buttons.length} buttons, ${pad.axes.length} axes. ${Object.keys(profiles[pad.id]?.bindings||{}).length} custom assignments.${usable?'':' Assign controls below and explicitly enable the standard-layout fallback to test this device.'}`;
  write('controllerStatus',state);
  const pressed=pad?pad.buttons.map((b,i)=>(b.pressed||b.value>.1)?`${i}:${Number(b.value||Number(b.pressed)).toFixed(2)}`:'').filter(Boolean).join(' '):'';
  const axes=pad?pad.axes.map((v,i)=>`${i}:${v.toFixed(2)}`).join(' '):'';
  write('controllerInputs',`Buttons: ${pressed||'none'} · Axes: ${axes||'none'} · Last action: ${lastAction}`);
  const signature=pad?pad.id+'|'+usable:'none';if(signature!==lastDiagnostic){lastDiagnostic=signature;const fallback=byId('controllerFallback');if(fallback){fallback.checked=!!profiles[pad?.id]?.enabled;fallback.disabled=!pad||pad.mapping==='standard';}const action=byId('controllerBinding');if(action)action.disabled=!pad;const button=byId('assignController');if(button)button.disabled=!pad;}
 }
 const preview=byId('showControllerHelp');if(preview){preview.checked=showHelp;preview.onchange=()=>{showHelp=preview.checked;try{storage?.setItem('statequest.controllerHelp',String(showHelp));}catch{}};}
 const fallback=byId('controllerFallback');if(fallback)fallback.onchange=()=>{if(!device)return;profiles[device.id]||={enabled:false,bindings:{}};profiles[device.id].enabled=fallback.checked;persistProfiles();poll(null,0);};
 const binding=byId('controllerBinding');if(binding){for(const [value,label] of Object.entries(PAD_ACTIONS)){const o=document.createElement('option');o.value=value;o.textContent=label;binding.append(o);}}
 const assignButton=byId('assignController');if(assignButton)assignButton.onclick=()=>{if(!device)return;capture={action:binding.value,id:device.id,buttons:device.buttons.map((b,i)=>bindingPressed(device,{type:'button',index:i})),axes:[...device.axes],deadline:(window.performance?.now()||0)+15000};poll(null,0);write('controllerAssignStatus',`Press ${PAD_ACTIONS[capture.action]} now. Keep sticks still. Input is paused during assignment.`);};
 const cancel=byId('cancelControllerAssign');if(cancel)cancel.onclick=()=>endCapture('Assignment cancelled.');
 const reset=byId('resetController');if(reset)reset.onclick=()=>{if(!device)return;delete profiles[device.id];persistProfiles();lastDiagnostic='';endCapture('This controller uses its original browser mapping again.');};
 function tick(time){
  if(stopped)return;let pads=[],blocked=false;try{if(!document.hidden)pads=[...(navigator.getGamepads?.()||[])].filter(p=>p?.connected);}catch{blocked=true;}
  const pad=pads.find(p=>p.mapping==='standard'||profiles[p.id]?.enabled)||pads[0];device=pad;
  const profile=profiles[pad?.id],usable=!!pad&&(pad.mapping==='standard'||profile?.enabled);connected=usable&&!capture;body.classList.toggle('controller-mode',connected||showHelp);
  if(capture){
   if(!pad||pad.id!==capture.id){endCapture('Controller disconnected. Assignment cancelled.');}
   else if(time>capture.deadline){endCapture('Assignment timed out. Try again.');}
   else{capture.buttons=capture.buttons.map((held,i)=>held&&bindingPressed(pad,{type:'button',index:i}));const button=pad.buttons.findIndex((b,i)=>bindingPressed(pad,{type:'button',index:i})&&!capture.buttons[i]);const axis=pad.axes.findIndex((v,i)=>Number.isFinite(v)&&Math.abs(v-(capture.axes[i]||0))>.65);if(button>=0)assign({type:'button',index:button});else if(axis>=0)assign({type:'axis',index:axis,rest:capture.axes[axis]||0,direction:Math.sign(pad.axes[axis]-(capture.axes[axis]||0))});}
  }
  if(!pad||!['activate','faceB','flip','submit'].some(action=>bindingPressed(pad,profile?.bindings?.[action]||{type:'button',index:PAD_BUTTONS[action]})))answerLatch=false;
  const actions=poll(connected?pad:null,time,profile?.bindings);if(actions.length){lastAction=PAD_ACTIONS[actions[0]]||actions[0];act(actions[0]);}diagnostics(pad,usable,blocked);refresh();frame=window.requestAnimationFrame(tick);
 }
 frame=window.requestAnimationFrame(tick);return ()=>{stopped=true;window.cancelAnimationFrame(frame);picker?.close();picker?.remove();body.classList.remove('controller-mode');if(byId('controllerHelp'))byId('controllerHelp').hidden=true;};
}
