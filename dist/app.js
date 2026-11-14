import {states} from './states.js';
import {facts} from './facts.js';
import {createFactsUI} from './facts-ui.js';
import {escapeHtml as esc} from './facts-core.js';
import {GAME_NAMES,makeQuestion} from './games.js';
import {load,save,matches,choose,record,exportProgress,importProgress} from './core.js';
const $ = id=>document.getElementById(id);
let storage;try{storage=window.localStorage;}catch{}
const progress=load(storage);
progress.seen=progress.seen.filter(a=>states.some(s=>s.abbr===a));
let mode='learn', index=0, flipped=false, answerMode='choice', current, answered=false, score=0, choices=[], relativeScale=false, suppressFlipUntil=0, gameType='shape', mini;
const factUI=createFactsUI({storage,onChange:()=>{if(mode==='learn')learn();},renderMap:map});
function persist(){ const ok=save(storage,progress);document.querySelector('.local').textContent=ok?'● Saved on this device':'● Session only';$('storageNote').textContent=ok?'Your progress stays in this browser. No account, no leaderboard, just you and the map.':'Browser storage is unavailable. You can still play, but progress will only last for this visit.';stats(); }
function stats(){ $('seenCount').textContent=`${progress.seen.length} / 50`;$('explored').value=progress.seen.length;for(const id of ['best','streak','bestStreak']) $(id).textContent=progress[id].toLocaleString(); }
function shape(s){const [x,y,w,h]=s.bounds;const pad=12;const side=760;const box=relativeScale?`${x+w/2-side/2} ${y+h/2-side/2} ${side} ${side}`:`${x-pad} ${y-pad} ${w+pad*2} ${h+pad*2}`;return `<svg class="shape" viewBox="${box}" role="img" aria-label="${mode==='learn'?s.name:'Mystery state'} silhouette"><path d="${s.path}"/></svg>`;}
function map(s){return `<svg class="map" viewBox="0 0 975 610" role="img" aria-label="${s.name} highlighted on a United States map">${states.map(t=>`<path class="${t.id===s.id?'selected':''}" d="${t.path}"/>`).join('')}</svg>`;}
function seen(s){if(!progress.seen.includes(s.abbr)){progress.seen.push(s.abbr);persist();}}
function learn(){
 const s=states[index];seen(s);$('counter').textContent=`${String(index+1).padStart(2,'0')} / 50`;$('modeLabel').textContent='FLIP & DISCOVER';
 const card=flipped?`<div class="card back-card"><div class="fact-card-heading"><b>★ YOUR FAVORITE FACTS</b><button id="flipBack" class="secondary">↻ Flip back</button></div>${factUI.primary(s)}</div>`:`<button class="card" id="flip" aria-label="Flip card for state facts"><span class="badge">WHAT A GREAT SHAPE!</span>${shape(s)}<span class="hint">↻ Tap to flip!</span></button>`;
 $('game').innerHTML=card+`<div class="state-label"><div class="identity-block"><span>${s.abbr}</span><h2>${s.name}</h2></div><button id="moreFacts" class="secondary">More Facts ＋</button></div><div class="navigation"><button id="prev" aria-label="Previous state">◀ Back</button><label for="stateSelect">Choose state</label><select id="stateSelect">${states.map((t,i)=>`<option value="${i}" ${i===index?'selected':''}>${t.name}</option>`).join('')}</select><button id="next">Next ▶</button></div>`;
 if($('flip'))$('flip').onclick=()=>{if(Date.now()<suppressFlipUntil)return;flipped=true;learn();};
 if($('flipBack'))$('flipBack').onclick=()=>{flipped=false;learn();};
 $('moreFacts').onclick=()=>factUI.more(s);$('prev').onclick=()=>navigate(-1);$('next').onclick=()=>navigate(1);$('stateSelect').onchange=e=>{index=+e.target.value;flipped=false;learn();};
 const surface=document.querySelector('.card');let start;
 surface.onpointerdown=e=>{if(e.target.closest('a,input,select')||(e.target.closest('button')&&e.target.closest('button')!==surface)){start=null;return;}start=[e.clientX,e.clientY];surface.setPointerCapture(e.pointerId);};surface.onpointercancel=()=>{start=null;};surface.onpointerup=e=>{if(start&&Math.abs(e.clientX-start[0])>65&&Math.abs(e.clientY-start[1])<65){e.preventDefault();suppressFlipUntil=Date.now()+350;navigate(e.clientX<start[0]?1:-1);}start=null;};
}
function navigate(delta){index=(index+delta+50)%50;flipped=false;learn();}
function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function question(){
 document.querySelector('.play').classList.remove('celebrate');answered=false;
 if(gameType==='shape'){current=choose(states,progress,current?.abbr);choices=shuffle([current,...shuffle(states.filter(s=>s!==current)).slice(0,3)]);}
 else{mini=makeQuestion(gameType,states,facts,current?.abbr);current=states.find(s=>s.abbr===mini.target);}
 challenge();
}
function challenge(){
 $('counter').textContent=`${score.toLocaleString()} POINTS`;$('modeLabel').textContent=GAME_NAMES[gameType].toUpperCase();
 const options=gameType==='shape'?choices.map(s=>s.abbr):mini.options;
 const selector=`<label>Game <select id="gameSelect">${Object.entries(GAME_NAMES).map(([key,label])=>`<option value="${key}" ${key===gameType?'selected':''}>${label}</option>`).join('')}</select></label>`;
 const answerSelect=gameType==='shape'?`<label>Answer <select id="answerMode"><option value="choice">Multiple choice</option><option value="typed">Postal abbreviation</option></select></label>`:'';
 const visual=gameType==='shape'?shape(current):gameType==='neighbors'?`<span class="question-state">${esc(current.name)}</span>${shape(current)}`:`<div class="duel">${mini.pair.map(a=>{const s=states.find(t=>t.abbr===a);return `<div><img src="assets/flags/${a}.svg" alt="Flag of ${esc(s.name)}">${shape(s)}<b>${esc(s.name)}</b></div>`;}).join('')}</div>`;
 $('game').innerHTML=`<div class="challenge-head game-controls">${selector}${answerSelect}</div><div class="card ${gameType==='shape'?'':'mini-card'}">${visual}<span class="badge">★ ${gameType==='shape'?'SHAPE DETECTIVE':gameType==='neighbors'?'NEXT-DOOR NEIGHBORS':'SHOWDOWN!'}</span></div><div class="answers"><h2>${gameType==='shape'?'Which state is this?':esc(mini.prompt)}</h2>${gameType==='shape'&&answerMode==='typed'?`<form id="answerForm" class="typed"><label for="answerInput" class="empty">Two letters</label><input id="answerInput" aria-label="Two-letter postal abbreviation" maxlength="2" pattern="[A-Za-z]{2}" required autocomplete="off" autocapitalize="characters" inputmode="text" spellcheck="false" enterkeyhint="done" placeholder="e.g. NY"><button class="primary">Check</button></form>`:`<div class="choices">${options.map(a=>`<button data-answer="${a}" aria-label="${a==='NONE'?'None — no neighboring states':esc(facts[a].name)}">${a==='NONE'?'None — no neighboring states':esc(facts[a].name)}</button>`).join('')}</div>`}<p id="feedback" class="feedback" role="status" aria-live="polite">Ready? Pick your answer!</p><button class="primary next" id="nextQuestion" hidden>Next question ▶</button><p class="game-method">${gameType==='shape'?'Missed shapes return more often.':esc(mini.note)}</p></div>`;
 $('gameSelect').onchange=e=>{gameType=e.target.value;question();};
 if($('answerMode')){$('answerMode').value=answerMode;$('answerMode').onchange=e=>{answerMode=e.target.value;if(answered)question();else challenge();};}
 document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>submit(b.dataset.answer));
 if($('answerForm'))$('answerForm').onsubmit=e=>{e.preventDefault();submit($('answerInput').value);};
 $('nextQuestion').onclick=()=>{question();(document.querySelector('[data-answer]')||$('answerInput')).focus();};
}
function submit(value){
 if(answered)return;answered=true;const correct=gameType==='shape'?matches(current,value):value===mini.correct;
 document.querySelector('.play').classList.toggle('celebrate',correct);const points=record(progress,current,correct,score,gameType==='shape');score+=points;persist();$('counter').textContent=`${score.toLocaleString()} POINTS`;
 const answer=gameType==='shape'?current.abbr:mini.correct;
 $('feedback').textContent=gameType==='shape'?(correct?`★ You got it! ${current.name} · +${points} points!`:`Nice try! It’s ${current.name} (${current.abbr}). We’ll practice it again!`):`${correct?`★ You got it! +${points} points!`:'Nice try! Here’s the answer:'} ${mini.explanation}`;
 document.querySelectorAll('[data-answer]').forEach(b=>{b.disabled=true;if(b.dataset.answer===answer)b.classList.add('correct');else if(b.dataset.answer===value)b.classList.add('wrong');});
 if($('answerInput')){$('answerInput').disabled=true;$('answerForm').querySelector('button').disabled=true;}$('nextQuestion').hidden=false;
}
function setMode(next){mode=next;document.body.dataset.view='game';document.body.dataset.mode=mode;$('progressTab').setAttribute('aria-pressed','false');$('learnTab').setAttribute('aria-pressed',mode==='learn');$('challengeTab').setAttribute('aria-pressed',mode==='challenge');$('tip').textContent=mode==='learn'?'Flip any card to discover its capital and find its place on the map. Swipe left or right, or use the arrow buttons.':'A correct answer earns 100 points, plus a streak bonus. Missed states get more chances to become familiar.';if(mode==='learn')learn();else if(!current)question();else if(answered)question();else challenge();}
$('scaleToggle').onchange=e=>{relativeScale=e.target.checked;if(mode==='learn')learn();else if(!answered)challenge();else{document.querySelectorAll('.card .shape').forEach((svg,i)=>{const s=gameType==='shape'||gameType==='neighbors'?current:states.find(s=>s.abbr===mini.pair[i]);svg.outerHTML=shape(s);});}};
function switchMode(next){setMode(next);if(matchMedia('(max-width:760px)').matches)document.querySelector('.play').scrollIntoView({block:'start'});}
$('learnTab').onclick=()=>switchMode('learn');$('challengeTab').onclick=()=>switchMode('challenge');document.addEventListener('keydown',e=>{if(mode==='learn' && !['INPUT','SELECT','BUTTON'].includes(document.activeElement.tagName)){if(e.key==='ArrowRight')navigate(1);if(e.key==='ArrowLeft')navigate(-1);}});persist();setMode('learn');

$('exportSave').onclick=()=>{
 const url=URL.createObjectURL(new Blob([exportProgress(progress)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download='statequest-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
 $('saveStatus').textContent='Save exported. Keep the JSON file somewhere safe.';
};
let pendingImport;
$('importSave').onclick=()=>$('saveFile').click();
$('saveFile').onchange=async e=>{
 const file=e.target.files[0];e.target.value='';if(!file)return;
 try {if(file.size>100000)throw Error('Save is too large. Choose a StateQuest JSON export.');pendingImport=importProgress(await file.text(),states);$('importSummary').textContent=`${pendingImport.seen.length} states explored · best score ${pendingImport.best} · longest streak ${pendingImport.bestStreak}.`;$('importDialog').showModal();}
 catch(error){$('saveStatus').textContent=error.message;pendingImport=undefined;}
};
$('cancelImport').onclick=()=>{pendingImport=undefined;$('importDialog').close();};
$('importDialog').addEventListener('cancel',()=>{pendingImport=undefined;});
$('confirmImport').onclick=()=>{
 if(!pendingImport)return;
 Object.assign(progress,pendingImport);pendingImport=undefined;score=0;current=undefined;persist();setMode(mode);$('importDialog').close();$('saveStatus').textContent='Progress imported. Your current challenge score has restarted.';
};
if('serviceWorker' in navigator){
 navigator.serviceWorker.register('./sw.js').then(async registration=>{
  await navigator.serviceWorker.ready;
  $('offlineStatus').textContent='Ready for offline play after this first load. Install from your browser menu.';
  registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed' && navigator.serviceWorker.controller)$('offlineStatus').textContent='An update is ready. Close all StateQuest windows and reopen to use it.';});});
 }).catch(()=>{$('offlineStatus').textContent=navigator.serviceWorker.controller?'Playing from your saved offline game.':'Offline setup unavailable. Play online and try again later.';});
}else{$('offlineStatus').textContent='Offline installation is unavailable in this browser. You can still play online.';}

// View preferences are separate from learning progress and do not alter saved scores.
let flashDefault=matchMedia('(max-width:760px), (max-height:500px) and (max-width:950px)').matches;
try{const preferred=storage.getItem('statequest.view');if(preferred==='cards' || preferred==='overview')flashDefault=preferred==='cards';}catch{}
function applyCardView(enabled){document.body.classList.toggle('flash',enabled);$('viewToggle').setAttribute('aria-pressed',String(enabled));$('viewToggle').textContent=enabled?'▦ Overview':'▣ Card view';}
applyCardView(flashDefault);
$('viewToggle').onclick=()=>{const enabled=!document.body.classList.contains('flash');applyCardView(enabled);try{storage.setItem('statequest.view',enabled?'cards':'overview');}catch{}};
$('progressTab').onclick=()=>{document.body.dataset.view='progress';for(const id of ['learnTab','challengeTab'])$(id).setAttribute('aria-pressed','false');$('progressTab').setAttribute('aria-pressed','true');};
function fitViewport(){document.documentElement.style.setProperty('--app-height',`${window.visualViewport?.height || window.innerHeight}px`);}
window.visualViewport?.addEventListener('resize',fitViewport);window.addEventListener('resize',fitViewport);fitViewport();
