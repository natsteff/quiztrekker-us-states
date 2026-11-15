import {states} from './states.js';
import {facts} from './facts.js';
import {createFactsUI} from './facts-ui.js';
import {escapeHtml as esc,formatStatehood} from './facts-core.js';
import {GAME_NAMES,makeQuestion,makeTimeline,timelineCorrect,sameAnswers} from './games.js';
import {createDecks} from './decks.js';
import {startUpdates} from './update-client.js';
import {load,save,matches,record,exportProgress,importProgress} from './core.js';
const $ = id=>document.getElementById(id);
let storage;try{storage=window.localStorage;}catch{}
const progress=load(storage);
progress.seen=progress.seen.filter(a=>states.some(s=>s.abbr===a));
let mode='learn', index=0, flipped=false, answerMode='choice', current, answered=false, score=0, choices=[], relativeScale=false, suppressFlipUntil=0, gameType='shape', mini, neighborMode='one', selectedAnswers=new Set(), timelineOrder=[], questionPosition;
const decks=createDecks(states,storage);
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
 document.querySelector('.play').classList.remove('celebrate');answered=false;selectedAnswers=new Set();timelineOrder=[];questionPosition=undefined;
 if(gameType==='shape'){const a=decks.current('shape');current=states.find(s=>s.abbr===a);questionPosition=decks.position('shape');choices=shuffle([current,...shuffle(states.filter(s=>s!==current)).slice(0,3)]);}
 else if(gameType==='timeline'){mini=makeTimeline(states,facts);current=states.find(s=>s.abbr===mini.target);}
 else{const settings=gameType==='neighbors'?{target:decks.current('neighbors'),neighborMode}:{};mini=makeQuestion(gameType,states,facts,current?.abbr,Math.random,settings);current=states.find(s=>s.abbr===mini.target);if(gameType==='neighbors')questionPosition=decks.position('neighbors');}
 challenge();$('game').scrollTop=0;
}
function challenge(){
 const all=gameType==='neighbors'&&neighborMode==='all',timeline=gameType==='timeline';
 document.body.dataset.game=all?'neighbors-all':gameType;
 $('counter').textContent=`${score.toLocaleString()} POINTS`;$('modeLabel').textContent=GAME_NAMES[gameType].toUpperCase();
 const options=gameType==='shape'?choices.map(s=>s.abbr):mini.options;
 const selector=`<label>Game <select id="gameSelect" aria-label="Game">${Object.entries(GAME_NAMES).map(([key,label])=>`<option value="${key}" ${key===gameType?'selected':''}>${label}</option>`).join('')}</select></label>`;
 const answerSelect=gameType==='shape'?`<label>Answer <select id="answerMode" aria-label="Answer"><option value="choice">Multiple choice</option><option value="typed">Postal abbreviation</option></select></label>`:gameType==='neighbors'?`<label>Find <select id="neighborMode" aria-label="Neighbor mode"><option value="one">ONE neighbor</option><option value="all">ALL neighbors</option></select></label>`:'';
 const badge=questionPosition?`ROUND ${questionPosition.round} · STATE ${questionPosition.number} / 50`:gameType==='timeline'?'★ TIME TRAVEL':'★ SHOWDOWN!';
 const visual=gameType==='shape'?shape(current):gameType==='neighbors'?`<span class="question-state">${esc(current.name)}${all?` <small class="cycle-count">${questionPosition.number} / 50</small>`:''}</span>${shape(current)}`:timeline?'':`<div class="duel">${mini.pair.map(a=>{const s=states.find(t=>t.abbr===a);return `<button class="duel-card" data-answer="${a}" aria-label="Choose ${esc(s.name)}"><span class="tap-prompt">Tap to choose!</span><img src="assets/flags/${a}.svg" alt="Flag of ${esc(s.name)}">${shape(s)}<b>${esc(s.name)}</b></button>`;}).join('')}</div>`;
 const answerMarkup=timeline?`<div class="choices timeline-choices">${options.map(a=>`<button data-pick="${a}" ${timelineOrder.includes(a)?'disabled':''} aria-label="${timelineOrder.includes(a)?`${timelineOrder.indexOf(a)+1}. ${esc(facts[a].name)} selected`:`Add ${esc(facts[a].name)} to timeline`}">${timelineOrder.includes(a)?`<span class="pick-number" aria-hidden="true">${timelineOrder.indexOf(a)+1}</span>`:''}${esc(facts[a].name)}</button>`).join('')}</div><p class="timeline-progress" role="status" aria-live="polite">${timelineOrder.length} of ${mini.options.length} selected</p><div class="selection-actions"><button id="undoTimeline" class="secondary" ${timelineOrder.length?'':'disabled'}>↶ Undo</button><button id="clearTimeline" class="secondary" ${timelineOrder.length?'':'disabled'}>Clear</button><button id="checkTimeline" class="primary" ${timelineOrder.length===options.length?'':'disabled'}>Check timeline ✓</button></div>`:['population','area'].includes(gameType)?'':gameType==='shape'&&answerMode==='typed'?`<form id="answerForm" class="typed"><label for="answerInput" class="empty">Two letters</label><input id="answerInput" aria-label="Two-letter postal abbreviation" maxlength="2" pattern="[A-Za-z]{2}" required autocomplete="off" autocapitalize="characters" inputmode="text" spellcheck="false" enterkeyhint="done" placeholder="e.g. NY"><button class="primary">Check</button></form>`:`<div class="choices ${all?'all-neighbors':''}">${options.map(a=>`<button data-answer="${a}" ${all?`aria-pressed="${selectedAnswers.has(a)}" class="${selectedAnswers.has(a)?'selected-answer':''}"`:''} aria-label="${a==='NONE'?'None — no neighboring states':esc(facts[a].name)}">${a==='NONE'?'None — no neighboring states':esc(facts[a].name)}</button>`).join('')}</div>${all?`<button class="primary check-selection" id="checkNeighbors" ${selectedAnswers.size?'':'disabled'}>Check ALL neighbors ✓</button>`:''}`;
 $('game').innerHTML=`<div class="challenge-head game-controls">${selector}${answerSelect}</div><h2 class="game-question">${gameType==='shape'?'Which state is this?':esc(mini.prompt)}</h2>${timeline?'':`<div class="card ${gameType==='shape'?'':'mini-card'}">${visual}<span class="badge">${badge}</span></div>`}<div class="answers ${timeline?'timeline-answers':''}">${answerMarkup}<p id="feedback" class="feedback" role="status" aria-live="polite">${all?'Select all neighbors, then tap Check.':timeline?'Undo lets you change your mind.':'Ready? Pick your answer!'}</p><button class="primary next" id="nextQuestion" hidden>Next question ▶</button><p class="game-method">${gameType==='shape'?'All 50 states, once each, then a fresh shuffle.':esc(mini.note)}</p></div>`;
 $('gameSelect').onchange=e=>{gameType=e.target.value;question();};
 if($('answerMode')){$('answerMode').value=answerMode;$('answerMode').onchange=e=>{answerMode=e.target.value;if(answered)question();else challenge();};}
 if($('neighborMode')){$('neighborMode').value=neighborMode;$('neighborMode').onchange=e=>{neighborMode=e.target.value;question();};}
 document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>all?toggleNeighbor(b.dataset.answer):submit(b.dataset.answer));
 if($('checkNeighbors'))$('checkNeighbors').onclick=()=>finishAnswer(sameAnswers([...selectedAnswers],mini.correctSet),mini.correctSet,mini.explanation);
 if(timeline){
  const redraw=()=>{challenge();(document.querySelector('[data-pick]:not(:disabled)')||$('checkTimeline')).focus();};
  document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{if(!answered&&!timelineOrder.includes(b.dataset.pick)){timelineOrder.push(b.dataset.pick);redraw();}});
  $('undoTimeline').onclick=()=>{timelineOrder.pop();redraw();};$('clearTimeline').onclick=()=>{timelineOrder=[];redraw();};
  $('checkTimeline').onclick=()=>{const explanation=mini.solution.map(a=>`${facts[a].name}: ${formatStatehood(facts[a].statehood_date)}`).join(' → ');finishAnswer(timelineCorrect(timelineOrder,mini.options,facts),[],explanation);};
 }
 if($('answerForm'))$('answerForm').onsubmit=e=>{e.preventDefault();submit($('answerInput').value);};
 $('nextQuestion').onclick=()=>{question();const heading=document.querySelector('.game-question');heading.tabIndex=-1;heading.focus({preventScroll:true});};
}
function toggleNeighbor(value){
 if(answered)return;
 if(selectedAnswers.has(value))selectedAnswers.delete(value);else{if(value==='NONE')selectedAnswers.clear();else selectedAnswers.delete('NONE');selectedAnswers.add(value);}
 document.querySelectorAll('[data-answer]').forEach(b=>{const chosen=selectedAnswers.has(b.dataset.answer);b.setAttribute('aria-pressed',String(chosen));b.classList.toggle('selected-answer',chosen);});
 $('checkNeighbors').disabled=selectedAnswers.size===0;
}
function submit(value){
 const correct=gameType==='shape'?matches(current,value):value===mini.correct;
 finishAnswer(correct,[gameType==='shape'?current.abbr:mini.correct],gameType==='shape'?`${current.name} (${current.abbr})`:mini.explanation,value);
}
function finishAnswer(correct,correctAnswers,explanation,value){
 if(answered)return;answered=true;
 document.querySelector('.play').classList.toggle('celebrate',correct);const points=record(progress,current,correct,score,gameType==='shape');score+=points;
 if(gameType==='shape'||gameType==='neighbors')decks.complete(gameType,current.abbr);
 persist();$('counter').textContent=`${score.toLocaleString()} POINTS`;
 $('feedback').textContent=`${correct?`★ You got it! +${points} points!`:'Nice try! Here’s the answer:'} ${explanation}`;
 document.querySelectorAll('[data-answer]').forEach(b=>{b.disabled=true;if(correctAnswers.includes(b.dataset.answer))b.classList.add('correct');else if(b.dataset.answer===value||selectedAnswers.has(b.dataset.answer))b.classList.add('wrong');});
 document.querySelectorAll('[data-pick],#undoTimeline,#clearTimeline,#checkTimeline,#checkNeighbors').forEach(b=>b.disabled=true);
 if($('answerInput')){$('answerInput').disabled=true;$('answerForm').querySelector('button').disabled=true;}$('nextQuestion').hidden=false;
}
function setMode(next){mode=next;document.body.dataset.view='game';document.body.dataset.mode=mode;$('progressTab').setAttribute('aria-pressed','false');$('learnTab').setAttribute('aria-pressed',mode==='learn');$('challengeTab').setAttribute('aria-pressed',mode==='challenge');$('tip').textContent=mode==='learn'?'Flip any card to discover its capital and find its place on the map. Swipe left or right, or use the arrow buttons.':'Earn points and build a streak! Shape Challenge and Neighbors visit all 50 states before shuffling again.';if(mode==='learn')learn();else if(!current)question();else if(answered)question();else challenge();}
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
startUpdates({storage,document,navigator,location});

// View preferences are separate from learning progress and do not alter saved scores.
let flashDefault=matchMedia('(max-width:760px), (max-height:500px) and (max-width:950px)').matches;
try{const preferred=storage.getItem('statequest.view');if(preferred==='cards' || preferred==='overview')flashDefault=preferred==='cards';}catch{}
function applyCardView(enabled){document.body.classList.toggle('flash',enabled);$('viewToggle').setAttribute('aria-pressed',String(enabled));$('viewToggle').textContent=enabled?'▦ Overview':'▣ Card view';}
applyCardView(flashDefault);
$('viewToggle').onclick=()=>{const enabled=!document.body.classList.contains('flash');applyCardView(enabled);try{storage.setItem('statequest.view',enabled?'cards':'overview');}catch{}};
$('progressTab').onclick=()=>{document.body.dataset.view='progress';for(const id of ['learnTab','challengeTab'])$(id).setAttribute('aria-pressed','false');$('progressTab').setAttribute('aria-pressed','true');};
function fitViewport(){document.documentElement.style.setProperty('--app-height',`${window.visualViewport?.height || window.innerHeight}px`);}
window.visualViewport?.addEventListener('resize',fitViewport);window.addEventListener('resize',fitViewport);fitViewport();
