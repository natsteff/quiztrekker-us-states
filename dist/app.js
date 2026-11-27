import {startSharing} from './sharing.js';
import {capitalLocations,makeCapitalQuestion} from './capitals.js';
import {kioskRequested} from './kiosk.js';
import {startGamepad} from './gamepad.js';
import {shapeWithLocator} from './shape-clue.js';
import {progressResults} from './progress-ui.js';
import {createSprint} from './sprint.js';
import {startWelcome} from './welcome.js';
import {mountMapQuest} from './map-quest.js';
import {timelinePrefix,neighborResult,neighborLegend} from './result-rules.js';
import {teachingMap} from './teaching-map.js';
import {toggleMastery,masteryMisses,toggleOrder,failedLocations} from './mastery.js';
import {capitalMap,mountCapitalMaps} from './capital-map.js';
import {states as baseStates} from './states.js';
import {extraLocations,extraFacts} from './extra-locations.js';
import {GEOGRAPHY_OPTIONS,GEOGRAPHY_KEY,readGeography,selectedLocations,deckStorageKey,mergeFacts} from './geography.js';
import {facts as baseFacts} from './facts.js';
import {createFactsUI} from './facts-ui.js';
import {escapeHtml as esc,formatStatehood} from './facts-core.js';
import {GAME_NAMES,makeQuestion,makeTimeline,timelineCorrect,sameAnswers} from './games.js';
import {createDecks} from './decks.js';
import {startUpdates} from './update-client.js';
import {load,save,matches,record,exportProgress,importProgress,trackGame,trackSprint,trackSprintAnswer,sprintStatsFor} from './core.js';
document.addEventListener('keydown',e=>{if(['Tab','Enter',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))document.body.classList.add('keyboard-focus');});
document.addEventListener('pointerdown',()=>document.body.classList.remove('keyboard-focus'));
const $ = id=>document.getElementById(id);
const kioskMode=kioskRequested(location.search);document.body.classList.toggle('kiosk',kioskMode);
let storage;try{storage=window.localStorage;}catch{}
const allLocations=[...baseStates,...extraLocations],facts=mergeFacts(baseFacts,extraFacts);
let geography=readGeography(storage),states=selectedLocations(baseStates,extraLocations,geography);
const progress=load(storage);
if(!progress.sprintMigrated){try{for(let i=0;i<Math.min(storage.length,1000);i++){const key=storage.key(i),prefix='statequest.sprintBest.v1.';if(!key?.startsWith(prefix))continue;const ids=key.slice(prefix.length).split('-').sort(),best=JSON.parse(storage.getItem(key));if(ids.length&&ids.length<=70&&new Set(ids).size===ids.length&&ids.every(a=>allLocations.some(s=>s.abbr===a))&&Number.isSafeInteger(best)&&best>=0&&!sprintStatsFor(progress,'quiz',ids))sprintStatsFor(progress,'quiz',ids,true).bestCorrect=best;}}catch{}progress.sprintMigrated=true;}

let excludeMastered=false;try{excludeMastered=storage.getItem('statequest.excludeMastered')==='true';}catch{}
const enabledLocations=()=>selectedLocations(baseStates,extraLocations,geography);
const practiceLocations=()=>enabledLocations().filter(s=>!excludeMastered||!progress.mastered.includes(s.abbr));
states=practiceLocations();
progress.mastered=progress.mastered.filter(a=>allLocations.some(s=>s.abbr===a));
progress.seen=progress.seen.filter(a=>allLocations.some(s=>s.abbr===a));
let learnDefault='shape';try{learnDefault=storage.getItem('statequest.learnDefault')==='map'?'map':'shape';}catch{}
let learnView=learnDefault,optionsReturn='game';
let mode='learn', index=0, flipped=false, answerMode='choice', current, answered=false, gameRunScore=0,gameRunKey='', choices=[], relativeScale=false, suppressFlipUntil=0, gameType='shape', mini, neighborMode='one', selectedAnswers=new Set(), timelineOrder=[], questionPosition;
let capitalMode;try{capitalMode=storage.getItem('statequest.capitalMode');}catch{}if(!['forward','reverse','typed'].includes(capitalMode))capitalMode='forward';
let capitalChoosing=true;
const capitalGameKey=()=>capitalMode==='forward'?'capitals':`capitals-${capitalMode}`;
let capitalDeck,capitalDeckKey,questMap,sprint,sprintTimer,sprintChoices=[],sprintTarget=null,sprintReview=[],sprintMode='quiz',sprintPool=[],sprintSaved=false;
let decks=createDecks(states,storage,Math.random,deckStorageKey(states));
const factUI=createFactsUI({storage,onChange:()=>{if(mode==='learn')learn();},renderMap:map,facts,locations:allLocations});
function persist(){ const ok=save(storage,progress);document.querySelector('.local').textContent=ok?'● Saved on this device':'● Session only';$('storageNote').textContent=ok?'Your progress stays in this browser. No account, no leaderboard, just you and the map.':'Browser storage is unavailable. You can still play, but progress will only last for this visit.';stats(); }
function stats(){ if($('gameResults'))$('gameResults').innerHTML=progressResults(progress,allLocations,practiceLocations().map(s=>s.abbr),baseStates.map(s=>s.abbr));const enabled=enabledLocations();if($('masteredList')){$('masteredList').innerHTML=progress.mastered.map(a=>`<button class="secondary" data-unmaster="${a}">Remove ${esc(facts[a]?.name||a)} from Mastered</button>`).join('')||'<p>No mastered locations yet.</p>';document.querySelectorAll('[data-unmaster]').forEach(b=>b.onclick=()=>{toggleMastery(progress,b.dataset.unmaster);persist();repool();});}for(const [kind,ids] of [['explored',progress.seen],['mastered',progress.mastered]]){if($(kind+'Total')){$(kind+'Total').textContent=`${ids.filter(a=>enabled.some(s=>s.abbr===a)).length} / ${enabled.length}`;$(kind+'Bar').max=enabled.length;$(kind+'Bar').value=ids.filter(a=>enabled.some(s=>s.abbr===a)).length;}} $('introMessage').textContent=states.length===50?'Tap, flip, and play your way across all 50 states!':`Tap, flip, and play across ${states.length} enabled locations!`;const displayIds=progress.masteryDisplay?progress.mastered:progress.seen;$('exploredLabel').textContent=progress.masteryDisplay?'locations mastered':'locations explored';$('seenCount').textContent=`${displayIds.filter(a=>enabled.some(s=>s.abbr===a)).length} / ${enabled.length}`;$('explored').setAttribute('aria-label',progress.masteryDisplay?'Locations mastered':'Locations explored');$('explored').max=enabled.length;$('explored').value=displayIds.filter(a=>enabled.some(s=>s.abbr===a)).length;$('lifetimePoints').textContent=progress.lifetimePoints.toLocaleString(); }
function shape(s){const [x,y,w,h]=s.bounds;const pad=s.group?Math.max(w,h)*.045:12;const side=760;const box=relativeScale&&!s.group?`${x+w/2-side/2} ${y+h/2-side/2} ${side} ${side}`:`${x-pad} ${y-pad} ${w+pad*2} ${h+pad*2}`;return `<svg class="shape" viewBox="${box}" role="img" aria-label="${mode==='learn'?s.name:'Mystery location'} silhouette"><path fill-rule="evenodd" d="${s.path}"/></svg>`;}
function gameShape(s){return shapeWithLocator(s,shape(s),baseStates);}
function map(s){
 if(s.country==='CA'){
  const ca=extraLocations.filter(t=>t.country==='CA'),xs=ca.map(t=>t.bounds[0]),ys=ca.map(t=>t.bounds[1]);const x=Math.min(...xs),y=Math.min(...ys),right=Math.max(...ca.map(t=>t.bounds[0]+t.bounds[2])),bottom=Math.max(...ca.map(t=>t.bounds[1]+t.bounds[3]));
  return `<svg class="map" viewBox="${x-8} ${y-8} ${right-x+16} ${bottom-y+16}" role="img" aria-label="${esc(s.name)} highlighted in Canada">${ca.map(t=>`<path fill-rule="evenodd" class="${t.abbr===s.abbr?'selected':''}" d="${t.path}"/>`).join('')}</svg>`;
 }
 if(s.group)return shape(s)+`<small>${esc(s.shape_note||s.kind)} · ${esc(s.name)}</small>`;
 return `<svg class="map" viewBox="0 0 975 610" role="img" aria-label="${s.name} highlighted on a United States map">${baseStates.map(t=>`<path class="${t.id===s.id?'selected':''}" d="${t.path}"/>`).join('')}</svg>`;
}
function seen(s){if(!progress.seen.includes(s.abbr)){progress.seen.push(s.abbr);persist();}}
function learn(){
 if(sprint&&!sprint.snapshot().paused)sprint.pause();
 questMap?.destroy();questMap=null;
 if(!states.length){emptyPool();return;}
 const s=states[index];seen(s);$('counter').textContent=`${String(index+1).padStart(2,'0')} / ${states.length}`;$('modeLabel').textContent='FLIP & DISCOVER';
 const viewControls=`<div class="learn-view-toggle" role="group" aria-label="Learning view"><button id="shapeView" aria-pressed="${learnView==='shape'}">Shape</button><button id="mapView" aria-pressed="${learnView==='map'}">On the Map</button></div>`;
 const card=flipped?`<div class="card back-card"><div class="fact-card-heading"><b>★ ${esc(s.kind||'U.S. state')}</b><button id="flipBack" class="secondary">↻ Flip back</button></div><div class="card-visuals">${capitalMap(s,true).replace('data-capital=','data-compare="capital" role="button" tabindex="0" aria-label="Compare capitals" data-capital=')}<div class="card-flag">${factUI.flag(s)}</div></div><div class="back-facts">${factUI.primary(s)}</div></div>`:`${viewControls}<button class="card learn-front ${learnView==='map'?'map-front':''}" id="flip" aria-label="Flip card for facts">${learnView==='shape'?`<span class="learn-visuals">${capitalMap(s)}<span class="locator"><b>On the Map</b>${map(s)}<small>${s.country==='CA'?'Canada':s.group?'Location outline':'U.S. · AK/HI inset'}</small></span></span>`:`<span class="large-locator">${map(s)}<small>${s.country==='CA'?'Canada':s.group?esc(s.shape_note||s.kind):'Alaska and Hawaii inset; Alaska reduced.'}</small></span><span class="map-capital">${capitalMap(s,true)}</span>`}<span class="hint">↻ Tap to flip!</span></button>`;
 $('game').innerHTML=card+`<div class="state-label"><button id="masterState" class="master-control secondary" aria-pressed="${progress.mastered.includes(s.abbr)}">🏆<small>${progress.mastered.includes(s.abbr)?'Mastered ✓':'Mark as Mastered'}</small></button><div class="identity-block"><span>${s.abbr}</span><h2>${s.name}</h2>${s.group?`<small>${esc(s.kind)}</small>`:''}</div><button id="moreFacts" class="secondary">More Facts ＋</button></div><div class="navigation"><button id="prev" aria-label="Previous location">◀ Back</button><label for="stateSelect">Choose ${states.length===50?'state':'location'}</label><select id="stateSelect">${states.map((t,i)=>`<option value="${i}" ${i===index?'selected':''}>${t.name}</option>`).join('')}</select><button id="next">Next ▶</button></div>`;
 if($('shapeView'))$('shapeView').onclick=()=>{learnView='shape';learn();};
 if($('mapView'))$('mapView').onclick=()=>{learnView='map';learn();};
 mountCapitalMaps(states,relativeScale);
 if($('flip'))$('flip').onclick=()=>{if(Date.now()<suppressFlipUntil)return;flipped=true;learn();};
 if($('flipBack'))$('flipBack').onclick=()=>{flipped=false;learn();};
 $('masterState').onclick=()=>{const mark=()=>{toggleMastery(progress,s.abbr);persist();repool(s.abbr);};if(!progress.mastered.length&&!progress.mastered.includes(s.abbr)){askMastery('Mark as Mastered?','Mark this location as mastered and show Mastered progress in Learn? Both Explored and Mastered remain in My Progress.','Mark as Mastered',()=>{progress.masteryDisplay=true;mark();});}else mark();};
 $('moreFacts').onclick=()=>factUI.more(s);$('prev').onclick=()=>navigate(-1);$('next').onclick=()=>navigate(1);$('stateSelect').onchange=e=>{index=+e.target.value;flipped=false;learn();};
 const surface=document.querySelector('.card');let start;
 surface.onpointerdown=e=>{if(e.target.closest('a,input,select,[data-fact],[data-compare]')||(e.target.closest('button')&&e.target.closest('button')!==surface)){start=null;return;}start=[e.clientX,e.clientY];surface.setPointerCapture(e.pointerId);};surface.onpointercancel=()=>{start=null;};surface.onpointerup=e=>{if(start&&Math.abs(e.clientX-start[0])>65&&Math.abs(e.clientY-start[1])<65){e.preventDefault();suppressFlipUntil=Date.now()+350;navigate(e.clientX<start[0]?1:-1);}start=null;};
}
function navigate(delta){index=(index+delta+states.length)%states.length;flipped=false;learn();}
function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function question(){
 if(gameType==='capitals'&&capitalChoosing){capitalChooser();return;}
 const key=gameType==='shape'?`shape-${answerMode}`:gameType==='neighbors'?`neighbors-${neighborMode}`:gameType==='capitals'?capitalGameKey():gameType;if(gameRunKey!==key){gameRunScore=0;gameRunKey=key;}
 if(gameType==='sprint'){startSprint();return;}
 stopSprint();
 const minimum=gameType==='capitals'?2:gameType==='timeline'?4:['population','area'].includes(gameType)?2:1;
 const eligible=gameType==='capitals'?capitalLocations(states):gameType==='timeline'||gameType==='mapquest'?states.filter(s=>!s.group):states;
 if(eligible.length<minimum){emptyPool('Not enough unmastered locations for this game.');return;}
 if(['population','area'].includes(gameType)){const key=gameType==='population'?'population':states.some(s=>s.group)?'land_sq_mi':'area_sq_mi';if(!states.some(a=>Number.isFinite(facts[a.abbr][key])&&states.some(b=>b!==a&&Number.isFinite(facts[b.abbr][key])&&facts[a.abbr][key]!==facts[b.abbr][key]&&(gameType!=='population'||facts[a.abbr].population_as_of===facts[b.abbr].population_as_of)))){emptyPool('No comparable pair remains.');return;}}
 document.querySelector('.play').classList.remove('celebrate');answered=false;selectedAnswers=new Set();timelineOrder=[];questionPosition=undefined;
 if(gameType==='mapquest'){mini={note:'U.S. states only. Preview your choice, then submit. Alaska and Hawaii are inset.'};current=shuffle(eligible.filter(s=>s.abbr!==current?.abbr).length?eligible.filter(s=>s.abbr!==current?.abbr):eligible)[0];}
 else if(gameType==='shape'){const a=decks.current('shape');current=states.find(s=>s.abbr===a);questionPosition=decks.position('shape');choices=shuffle([current,...shuffle(states.filter(s=>s!==current)).slice(0,3)]);}
 else if(gameType==='capitals'){const key=deckStorageKey(eligible)+':capitals:'+capitalMode;if(key!==capitalDeckKey){capitalDeck=createDecks(eligible,storage,Math.random,key);capitalDeckKey=key;}const a=capitalDeck.current('shape');current=eligible.find(s=>s.abbr===a);mini=makeCapitalQuestion(eligible,a,Math.random,capitalMode);questionPosition=capitalDeck.position('shape');}
 else if(gameType==='timeline'){mini=makeTimeline(states,facts);current=states.find(s=>s.abbr===mini.target);}
 else{const settings=gameType==='neighbors'?{target:decks.current('neighbors'),neighborMode,answerLocations:enabledLocations()}:{};mini=makeQuestion(gameType,states,facts,current?.abbr,Math.random,settings);current=states.find(s=>s.abbr===mini.target);if(gameType==='neighbors')questionPosition=decks.position('neighbors');}
 challenge();$('game').scrollTop=0;
}
function challenge(){
 if(gameType==='capitals'&&capitalChoosing){capitalChooser();return;}
 if(gameType==='sprint'){if(!sprint)startSprint();else renderSprint();return;}
 questMap?.destroy();questMap=null;
 const all=gameType==='neighbors'&&neighborMode==='all',timeline=gameType==='timeline';
 document.body.dataset.game=all?'neighbors-all':gameType;
 $('counter').textContent=`${progress.lifetimePoints.toLocaleString()} POINTS`;$('modeLabel').textContent=(gameType==='neighbors'?(neighborMode==='all'?'All my Neighbors':'One of my Neighbors'):gameType==='shape'?(answerMode==='typed'?'Postal Pro':'Shape Spotter'):GAME_NAMES[gameType]).toUpperCase();
 const options=gameType==='mapquest'?[]:gameType==='shape'?choices.map(s=>s.abbr):mini.options;
 const selector=gameSelector()+(gameType==='capitals'?`<div class="capital-mode-heading"><b>${capitalMode==='forward'?'Name the Capital':capitalMode==='reverse'?'Name the State':'Type the Postal Code'}</b><button id="changeCapitalMode" class="secondary">Change mode</button></div>`:'');
 const badge=questionPosition?`ROUND ${questionPosition.round} · LOCATION ${questionPosition.number} / ${questionPosition.total}`:gameType==='timeline'?'★ TIME TRAVEL':'★ SHOWDOWN!';
 const visual=gameType==='mapquest'?`<div class="quest-map"><div class="quest-zoom-controls" role="group" aria-label="Map zoom"><button class="secondary" data-zoom="in" aria-label="Zoom in">Zoom +</button><button class="secondary" data-zoom="out" aria-label="Zoom out">Zoom −</button><button class="secondary" data-zoom="reset">Full map</button></div>${teachingMap({locations:allLocations,mode:'quest',eligible:states.filter(s=>!s.group).map(s=>s.abbr)})}<p data-quest-legend class="map-legend" hidden>🟩 Correct · 🟥 Incorrect choice · 🟨 Intended target</p></div>`:(gameType==='shape'||gameType==='capitals'&&capitalMode==='forward')?gameShape(current):gameType==='capitals'?'':gameType==='neighbors'?`<span class="question-state">${esc(current.name)}</span>${gameShape(current)}`:timeline?'':`<div class="duel">${mini.pair.map(a=>{const s=states.find(t=>t.abbr===a);return `<button class="duel-card" data-answer="${a}" aria-label="Choose ${esc(s.name)}"><span class="tap-prompt">Tap to choose!</span><img src="${facts[a].flag||`assets/flags/${a}.svg`}" alt="Flag of ${esc(s.name)}">${gameShape(s)}<b>${esc(s.name)}</b></button>`;}).join('')}</div>`;
 const answerMarkup=gameType==='mapquest'?'<div id="questAnswerControls"><p>Tap a state to preview it, then Submit answer. Double-tap to zoom; drag to move.</p><button id="submitMapAnswer" class="primary quest-submit" disabled>Submit answer</button></div>':timeline?`<div class="choices timeline-choices">${options.map(a=>`<button data-pick="${a}" aria-pressed="${timelineOrder.includes(a)}" aria-label="${timelineOrder.includes(a)?`${timelineOrder.indexOf(a)+1}. ${esc(facts[a].name)} selected`:`Add ${esc(facts[a].name)} to timeline`}">${timelineOrder.includes(a)?`<span class="pick-number" aria-hidden="true">${timelineOrder.indexOf(a)+1}</span>`:''}${esc(facts[a].name)}</button>`).join('')}</div><p class="timeline-progress" role="status" aria-live="polite">${timelineOrder.length} of ${mini.options.length} selected</p><div class="selection-actions"><button id="undoTimeline" class="secondary" ${timelineOrder.length?'':'disabled'}>↶ Undo</button><button id="clearTimeline" class="secondary" ${timelineOrder.length?'':'disabled'}>Clear</button><button id="checkTimeline" class="primary" ${timelineOrder.length===options.length?'':'disabled'}>Check timeline ✓</button></div>`:['population','area'].includes(gameType)?'':(gameType==='shape'&&answerMode==='typed'||gameType==='capitals'&&capitalMode==='typed')?`<form id="answerForm" class="typed"><label for="answerInput" class="empty">Two letters</label><input id="answerInput" aria-label="Two-letter abbreviation" maxlength="2" pattern="[A-Za-z]{2}" required autocomplete="off" autocapitalize="characters" inputmode="text" spellcheck="false" enterkeyhint="done" placeholder="e.g. NY"><button class="primary">Check</button></form>`:`<div class="choices ${all?'all-neighbors':''}">${options.map(a=>`<button data-answer="${a}" ${all?`aria-pressed="${selectedAnswers.has(a)}" class="${selectedAnswers.has(a)?'selected-answer':''}"`:''} aria-label="${a==='NONE'?'None — no enabled neighbors':esc(gameType==='capitals'?mini.labels[a]:facts[a].name)}">${a==='NONE'?'None — no enabled neighbors':esc(gameType==='capitals'?mini.labels[a]:facts[a].name)}</button>`).join('')}</div>${all?`<button class="primary check-selection" id="checkNeighbors" ${selectedAnswers.size?'':'disabled'}>Check neighbors ✓</button>`:''}`;
 $('game').innerHTML=`<div class="challenge-head game-controls">${selector}</div><h2 class="game-question">${gameType==='mapquest'?`Find ${esc(current.name)} on the map.`:gameType==='shape'?`Which ${states.length===50?'state':'location'} is this?`:esc(mini.prompt)}</h2>${gameType==='capitals'&&capitalMode!=='forward'?`<p class="question-round">${badge}</p>`:timeline?'':`<div class="card ${gameType==='shape'?'':'mini-card'}">${visual}${current.shape_note?`<small class="shape-note">Insets not to scale or geographic position</small>`:''}<span class="badge">${badge}</span></div>`}<div class="answers ${timeline?'timeline-answers':''}">${answerMarkup}<div id="feedback" class="feedback" role="status" aria-live="polite" aria-atomic="true">${all||gameType==='mapquest'?'':timeline?'Tap a selected state to remove it, or use Undo.':'Ready? Pick your answer!'}</div><button class="primary next" id="nextQuestion" hidden>Next question ▶</button><p class="game-method" ${all?'hidden':''}>${gameType==='shape'?`All ${states.length} ${states.length===50?'states':'locations'}, once each, then a fresh shuffle.`:esc(mini.note)}</p></div>`;
 bindGameSelector();if($('changeCapitalMode'))$('changeCapitalMode').onclick=()=>{capitalChoosing=true;capitalChooser();};
 document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>all?toggleNeighbor(b.dataset.answer):submit(b.dataset.answer));
 if($('checkNeighbors'))$('checkNeighbors').onclick=()=>finishAnswer(sameAnswers([...selectedAnswers],mini.correctSet),mini.correctSet,mini.explanation);
 if(timeline){
  const redraw=()=>{challenge();(document.querySelector('[data-pick]:not(:disabled)')||$('checkTimeline')).focus();};
  document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{if(!answered){timelineOrder=toggleOrder(timelineOrder,b.dataset.pick);redraw();}});
  $('undoTimeline').onclick=()=>{timelineOrder.pop();redraw();};$('clearTimeline').onclick=()=>{timelineOrder=[];redraw();};
  $('checkTimeline').onclick=()=>{const explanation=mini.solution.map(a=>`${facts[a].name}: ${formatStatehood(facts[a].statehood_date)}`).join(' → ');finishAnswer(timelineCorrect(timelineOrder,mini.options,facts),[],explanation);};
 }
 if(gameType==='mapquest')questMap=mountMapQuest(document.querySelector('.quest-map'),{states:baseStates,onAnswer:submit,submitButton:$('submitMapAnswer')});
 if($('answerForm'))$('answerForm').onsubmit=e=>{e.preventDefault();submit($('answerInput').value);};
 $('nextQuestion').onclick=()=>{question();const heading=document.querySelector('.game-question');heading.tabIndex=-1;heading.focus({preventScroll:true});};
}
function capitalChooser(){
 stopSprint();questMap?.destroy();questMap=null;document.body.dataset.game='capitals';$('modeLabel').textContent='CAPITAL CITIES';$('counter').textContent=`${progress.lifetimePoints.toLocaleString()} POINTS`;
 $('game').innerHTML=`<div class="challenge-head game-controls">${gameSelector()}</div><section class="capital-chooser sprint-panel"><h2>Choose your Capital Cities mode</h2>${[['forward','Name the Capital','See a location and choose its capital.'],['reverse','Name the State','See a capital and choose its location.'],['typed','Type the Postal Code','See a capital and type its two-letter code. Keyboard required.']].map(([key,label,description])=>`<button class="secondary capital-mode" data-capital-mode="${key}" aria-pressed="${capitalMode===key}"><b>${label}</b><small>${description}</small>${capitalMode===key?'<small>Last played</small>':''}</button>`).join('')}</section>`;
 bindGameSelector();document.querySelectorAll('[data-capital-mode]').forEach(b=>b.onclick=()=>{capitalMode=b.dataset.capitalMode;capitalChoosing=false;try{storage.setItem('statequest.capitalMode',capitalMode);}catch{}question();});
}
function gameSelector(){
 const entries=[['shape-choice','Shape Spotter'],['shape-typed','Postal Pro'],['sprint','State Sprint'],['mapquest','Map Quest'],['capitals','Capital Cities'],['population',GAME_NAMES.population],['area',GAME_NAMES.area],['timeline',GAME_NAMES.timeline],['neighbors-one','One of my Neighbors'],['neighbors-all','All my Neighbors']];
 const selected=gameType==='shape'?`shape-${answerMode}`:gameType==='neighbors'?`neighbors-${neighborMode}`:gameType;
 return `<label>Game <select id="gameSelect" aria-label="Game">${entries.map(([key,label])=>`<option value="${key}" ${key===selected?'selected':''}>${label}</option>`).join('')}</select></label>`;
}
function bindGameSelector(){$('gameSelect').onchange=e=>{stopSprint();const [type,variant]=e.target.value.split('-');gameType=type;if(type==='capitals')capitalChoosing=true;if(type==='shape')answerMode=variant;if(type==='neighbors')neighborMode=variant;question();};}
function stopSprint(){clearInterval(sprintTimer);sprintTimer=undefined;sprint=undefined;sprintChoices=[];sprintTarget=null;sprintReview=[];}
function startSprint(variant='quiz'){
 stopSprint();sprintMode=variant;sprintPool=variant==='challenge'?[...baseStates]:[...states];questMap?.destroy();questMap=null;
 answered=false;sprintSaved=false;sprint=createSprint({ids:sprintPool.map(s=>s.abbr),duration:sprintMode==='challenge'?120000:60000,finite:sprintMode==='challenge',onAnswer:r=>{const record=progress.records[r.target]||={correct:0,missed:0};record[r.correct?'correct':'missed']++;if(!r.correct)sprintReview.push(...masteryMisses(progress,[r.target]));trackSprintAnswer(progress,sprintMode,r.earned);persist();},onChange:renderSprint});
 renderSprint();sprintTimer=setInterval(()=>{if(!sprint)return;const active=!document.hidden&&document.body.dataset.view==='game'&&mode==='challenge'&&!document.querySelector('dialog[open]');if(!active&&!sprint.snapshot().paused)sprint.pause();const state=sprint.tick();if(mode==='challenge'&&document.body.dataset.view==='game')syncSprint(state);},100);
}
function syncSprint(state){if($('sprintClock'))$('sprintClock').textContent=`${Math.ceil(state.remaining/1000)}s`;$('counter').textContent=`${progress.lifetimePoints.toLocaleString()} POINTS`;if($('sprintCountdown'))$('sprintCountdown').textContent=Math.max(1,Math.ceil(state.countdown/1000));}
function renderSprint(){
 if(!sprint)return;const state=sprint.snapshot(),challengeMode=sprintMode==='challenge',duration=challengeMode?120:60,poolIds=sprintPool.map(s=>s.abbr);document.body.dataset.game='sprint';$('modeLabel').textContent=`STATE SPRINT · ${duration}s`;
 if(state.phase==='finished'&&!sprintSaved){sprintSaved=true;trackSprint(progress,sprintMode,poolIds,state);persist();}
 const header=`<div class="challenge-head game-controls">${gameSelector()}</div>`;
 let content='';
 if(state.phase==='idle')content=`<section class="sprint-panel"><h2>Choose your Sprint</h2><p>Match shapes to names. Earn 100 points + streak bonus.</p><section class="sprint-option"><h3>60-second Quiz</h3><p>Practice ${states.length} locations. The deck reshuffles after each pass.</p><button id="startQuiz" class="primary" ${states.length?'':'disabled'}>Start 60-second Quiz</button></section><section class="sprint-option"><h3>120-second Challenge</h3><p>Find all 50 U.S. states in 120 seconds. No repeats.</p><button id="startChallenge" class="primary">Start 120-second Challenge</button></section></section>`;
 else if(state.phase==='finished'){
 const best=sprintStatsFor(progress,sprintMode,poolIds);
 content=`<section class="sprint-panel" role="status"><h2>${state.completed?(state.correct===50?'Perfect 50/50!':'All 50 completed!'):'Time’s up!'}</h2><p class="sprint-total">${state.correct} correct${challengeMode?' of 50':` in ${duration} seconds`}</p><p>${state.correct} / ${state.attempted} answered · ${state.attempted?Math.round(state.correct/state.attempted*100):0}% accuracy</p><p>${state.points.toLocaleString()} points · longest streak ${state.longest}</p><p>${state.completed?`All 50 answered in ${(state.elapsedMs/1000).toFixed(1)} seconds.`:challengeMode?`${50-state.attempted} states unanswered.`:''}</p><p>Personal best for this ${challengeMode?'Challenge':'Quiz location pool'}: <strong>${best.bestCorrect} correct</strong></p><button id="startSprint" class="primary">Play again</button><button id="chooseSprint" class="secondary">Choose Sprint mode</button></section>`;
 }else if(state.paused)content=`<section class="sprint-panel"><h2>Sprint paused</h2><p>${Math.ceil(state.remaining/1000)} seconds left · ${state.correct} correct</p><button id="resumeSprint" class="primary">Resume Sprint</button></section>`;
 else if(state.phase==='countdown')content=`<section class="sprint-panel sprint-countdown"><h2>Get ready!</h2><strong id="sprintCountdown" class="sprint-total">${Math.max(1,Math.ceil(state.countdown/1000))}</strong><button id="pauseSprint" class="secondary">Pause</button></section>`;
 else{
 current=sprintPool.find(s=>s.abbr===state.target);
 if(state.phase==='playing'&&sprintTarget!==state.target){sprintChoices=shuffle([current,...shuffle(sprintPool.filter(s=>s!==current)).slice(0,3)]);sprintTarget=state.target;}
 const result=state.result;
 content=`<div class="sprint-status"><strong id="sprintClock">${Math.ceil(state.remaining/1000)}s</strong><span>${state.correct} correct · ${state.attempted} answered</span><button id="pauseSprint" class="secondary">Pause</button></div><div class="sprint-feedback ${result?(result.correct?'sprint-correct':'sprint-wrong'):''}" role="status">${result?`${result.correct?'★ Correct!':'Answer:'} ${esc(current.name)} · ${result.earned} points${result.correct?` (100 + ${result.earned-100} streak bonus)`:''}`:''}</div><h2 class="game-question">Which ${challengeMode||sprintPool.length===50?'state':'location'} is this?</h2><div class="card sprint-card">${gameShape(current)}${current.shape_note?'<small>Insets not to scale or geographic position</small>':''}</div><div class="answers"><div class="choices">${sprintChoices.map(s=>`<button data-sprint-answer="${s.abbr}" ${result?'disabled':''} class="${result?(s.abbr===result.target?'correct':s.abbr===result.choice?'wrong':''):''}">${esc(s.name)}</button>`).join('')}</div></div>`;
 }
 $('game').innerHTML=header+content;bindGameSelector();syncSprint(state);if(state.result||state.phase==='finished')$('game').scrollTop=0;
 if($('startSprint'))$('startSprint').onclick=()=>{sprintSaved=false;sprintTarget=null;sprint.start();};
 if($('startQuiz'))$('startQuiz').onclick=()=>{startSprint('quiz');sprint.start();};
 if($('startChallenge'))$('startChallenge').onclick=()=>{startSprint('challenge');sprint.start();};
 if($('chooseSprint'))$('chooseSprint').onclick=()=>startSprint();
 if($('pauseSprint'))$('pauseSprint').onclick=()=>{sprint.pause();};
 if($('resumeSprint'))$('resumeSprint').onclick=()=>{if(document.hidden||document.querySelector('dialog[open]'))return;sprint.resume();};
 document.querySelectorAll('[data-sprint-answer]').forEach(b=>b.onclick=()=>sprint?.answer(b.dataset.sprintAnswer));
 if(state.phase==='playing'&&!state.paused&&document.body.classList.contains('keyboard-focus'))document.querySelector('[data-sprint-answer]')?.focus({preventScroll:true});
 if(state.phase==='finished'&&sprintReview.length){const review=[...new Set(sprintReview)];sprintReview=[];const show=()=>{const a=review.shift();if(a)askMastery('Still mastered?',`${facts[a].name} has had 3 more wrong answers since it was marked mastered. Would you like to remove it from Mastered?`,'Remove mastery',()=>{toggleMastery(progress,a);persist();show();},show);};show();}
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&sprint&&!sprint.snapshot().paused)sprint.pause();});
function toggleNeighbor(value){
 if(answered)return;
 if(selectedAnswers.has(value))selectedAnswers.delete(value);else{if(value==='NONE')selectedAnswers.clear();else selectedAnswers.delete('NONE');selectedAnswers.add(value);}
 document.querySelectorAll('[data-answer]').forEach(b=>{const chosen=selectedAnswers.has(b.dataset.answer);b.setAttribute('aria-pressed',String(chosen));b.classList.toggle('selected-answer',chosen);});
 $('checkNeighbors').disabled=selectedAnswers.size===0;
}
function submit(value){
 const correct=(['shape','mapquest'].includes(gameType)||gameType==='capitals'&&capitalMode==='typed')?matches(current,value):value===mini.correct;
 finishAnswer(correct,[['shape','mapquest'].includes(gameType)?current.abbr:mini.correct],['shape','mapquest'].includes(gameType)?`${current.name} (${current.abbr})`:mini.explanation,value);
}
function finishAnswer(correct,correctAnswers,explanation,value){
 if(answered)return;answered=true;
 document.querySelector('.play').classList.toggle('celebrate',correct);const points=record(progress,current,correct,gameRunScore,gameType==='shape'||gameType==='capitals');gameRunScore+=points;trackGame(progress,gameType==='shape'?`shape-${answerMode}`:gameType==='neighbors'?`neighbors-${neighborMode}`:gameType==='capitals'?capitalGameKey():gameType,correct,points,Date.now(),gameType==='timeline'?mini.options.map(a=>facts[a].name).join(', '):['population','area'].includes(gameType)?mini.pair.map(a=>facts[a].name).join(' vs '):current.name,gameRunScore);
 if(gameType==='capitals')capitalDeck.complete('shape',current.abbr);
 if(gameType==='shape'||gameType==='neighbors')decks.complete(gameType,current.abbr);
 persist();$('counter').textContent=`${progress.lifetimePoints.toLocaleString()} POINTS`;
 const roundComplete=questionPosition&&questionPosition.number===questionPosition.total;
 const milestone=correct&&progress.streak%5===0;
 const feedback=$('feedback');feedback.className=`feedback result-banner ${correct?'result-correct':'result-wrong'}${milestone||roundComplete?' result-milestone':''}`;
 feedback.innerHTML=`<strong class="result-title">${correct?'★ Correct!':'Keep exploring!'}</strong>${correct?`<span class="result-points">+${points} points</span><span class="result-breakdown">100 for the answer + ${points-100} streak bonus</span>`:'<span class="result-breakdown">Here’s the answer · 0 points · streak reset</span>'}<span class="result-explanation">${esc(explanation)}</span>${milestone?`<strong class="result-achievement">🌟 ${progress.streak} correct in a row!</strong>`:''}${roundComplete?`<strong class="result-achievement">🏁 Round complete! You practiced all ${questionPosition.total} locations.</strong>`:''}`;

 if(gameType==='neighbors'){
 const neighbors=facts[current.abbr].neighbors;
 const chosen=neighborMode==='all'?[...selectedAnswers].filter(a=>a!=='NONE'):[value].filter(a=>a&&a!=='NONE');
 const quizNeighbors=neighborMode==='all'?mini.correctSet.filter(a=>a!=='NONE'):neighbors.filter(a=>states.some(s=>s.abbr===a));
 feedback.insertAdjacentHTML('beforeend',`<section class="neighbor-reveal"><h3>Where the neighbors fit</h3>${teachingMap({locations:allLocations,target:current.abbr,neighbors,chosen,eligible:quizNeighbors,all:neighborMode==='all'})}<p class="map-legend">${neighborLegend(neighborMode==='all')}</p><p>${[current.abbr,...neighbors,...chosen].filter((a,i,arr)=>arr.indexOf(a)===i).map(a=>`${a}: ${esc(facts[a]?.name||a)}`).join(' · ')}</p><small>All supported neighbors shown. ALL mode includes every neighbor in your enabled geography, even if mastered. Disabled geography is shown for reference only. U.S.-only maps use Alaska/Hawaii insets; cross-border maps show geographic positions.</small></section>`);
 }
 if(gameType==='mapquest'){questMap?.showResult(current.abbr,value,correct);$('questAnswerControls').hidden=true;document.querySelector('.game-method').hidden=true;}
 const failures=failedLocations(gameType,correct,current,mini,timelineOrder,facts);
 const review=masteryMisses(progress,failures);persist();
 const showReview=()=>{const a=review.shift();if(!a)return;askMastery('Still mastered?',`${facts[a].name} has had 3 more wrong answers since it was marked mastered. Would you like to remove it from Mastered?`,'Remove mastery',()=>{toggleMastery(progress,a);persist();showReview();},showReview);};showReview();

 if(gameType==='timeline'){
 const result=timelinePrefix(timelineOrder,mini.options,facts);
 feedback.querySelector('.result-title').insertAdjacentHTML('afterend',`<strong class="timeline-summary">You got the first ${result.prefix} of ${mini.options.length} in order.</strong>`);
 document.querySelectorAll('[data-pick]').forEach(b=>{const status=result.statuses[timelineOrder.indexOf(b.dataset.pick)],label=status==='correct'?'Correct starting position':status==='wrong'?'First mistake':'After first mistake';b.classList.add(`timeline-${status}`);b.insertAdjacentHTML('beforeend',`<small class="timeline-result-note">${label}</small>`);b.setAttribute('aria-label',`${b.getAttribute('aria-label')}. ${label}`);});
 }
 document.querySelectorAll('[data-answer]').forEach(b=>{
 b.disabled=true;
 if(gameType==='neighbors'&&neighborMode==='all'){
  const status=neighborResult(b.dataset.answer,correctAnswers,[...selectedAnswers]);
  b.classList.remove('selected-answer');b.classList.add(`answer-${status}`);
  if(status!=='neutral'){const label={correct:'Correctly selected',missed:'Missed',wrong:'Incorrect choice'}[status];b.insertAdjacentHTML('beforeend',`<small class="answer-result-note">${label}</small>`);b.setAttribute('aria-label',`${b.getAttribute('aria-label')}. ${label}`);}
 }else if(correctAnswers.includes(b.dataset.answer))b.classList.add('correct');else if(b.dataset.answer===value||selectedAnswers.has(b.dataset.answer))b.classList.add('wrong');
 });
 document.querySelectorAll('[data-pick],#undoTimeline,#clearTimeline,#checkTimeline,#checkNeighbors').forEach(b=>b.disabled=true);
 if($('answerInput')){$('answerInput').disabled=true;$('answerForm').querySelector('button').disabled=true;}$('nextQuestion').hidden=false;
 const reveal=document.createElement('section');reveal.className='game-results';reveal.setAttribute('aria-label','Answer result');reveal.append($('nextQuestion'),feedback);document.querySelector('.game-controls').after(reveal);
 $('nextQuestion').focus({preventScroll:true});$('game').scrollTop=0;document.querySelector('.play').scrollIntoView({block:'start'});
}
function setMode(next){if(next==='learn'&&sprint&&!sprint.snapshot().paused)sprint.pause();$('settingsButton').setAttribute('aria-pressed','false');mode=next;if(mode==='learn')delete document.body.dataset.game;document.body.dataset.view='game';document.body.dataset.mode=mode;$('progressTab').setAttribute('aria-pressed','false');$('learnTab').setAttribute('aria-pressed',mode==='learn');$('challengeTab').setAttribute('aria-pressed',mode==='challenge');if(mode==='learn')learn();else if(gameType==='sprint'&&sprint)renderSprint();else if(!current)question();else if(answered)question();else challenge();}
$('scaleToggle').onchange=e=>{relativeScale=e.target.checked;if(gameType==='sprint'&&mode==='challenge'){if(sprint)renderSprint();return;}if(mode==='learn')learn();else if(!answered)challenge();else{document.querySelectorAll('.card .shape').forEach((svg,i)=>{const s=gameType==='shape'||gameType==='neighbors'||gameType==='capitals'?current:states.find(s=>s.abbr===mini.pair[i]);(svg.closest('.game-shape-layout')||svg).outerHTML=gameShape(s);});}};
function switchMode(next){setMode(next);if(matchMedia('(max-width:760px)').matches)document.querySelector('.play').scrollIntoView({block:'start'});}
$('learnTab').onclick=()=>switchMode('learn');$('challengeTab').onclick=()=>switchMode('challenge');document.addEventListener('keydown',e=>{if(mode==='learn' && !['INPUT','SELECT','BUTTON'].includes(document.activeElement.tagName)){if(e.key==='ArrowRight')navigate(1);if(e.key==='ArrowLeft')navigate(-1);}});persist();setMode('learn');

$('exportSave').onclick=()=>{
 const url=URL.createObjectURL(new Blob([exportProgress(progress)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download='quiztrekker-us-states-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
 $('saveStatus').textContent='Save exported. Keep the JSON file somewhere safe.';
};
let pendingImport;
$('importSave').onclick=()=>$('saveFile').click();
$('saveFile').onchange=async e=>{
 const file=e.target.files[0];e.target.value='';if(!file)return;
 try {if(file.size>100000)throw Error('Save is too large. Choose a QuizTrekker - US States JSON export.');pendingImport=importProgress(await file.text(),allLocations);$('importSummary').textContent=`${pendingImport.seen.length} locations explored · ${pendingImport.mastered.length} mastered · lifetime points ${pendingImport.lifetimePoints.toLocaleString()}.`;$('importDialog').showModal();}
 catch(error){$('saveStatus').textContent=error.message;pendingImport=undefined;}
};
$('cancelImport').onclick=()=>{pendingImport=undefined;$('importDialog').close();};
$('importDialog').addEventListener('cancel',()=>{pendingImport=undefined;});
$('confirmImport').onclick=()=>{
 if(!pendingImport)return;
 stopSprint();Object.assign(progress,pendingImport);pendingImport=undefined;gameRunScore=0;gameRunKey='';current=undefined;persist();setMode(mode);$('importDialog').close();$('saveStatus').textContent='Progress imported. Your lifetime points and game results have been restored.';
};
startUpdates({storage,document,navigator,location});

// View preferences are separate from learning progress and do not alter saved scores.
const mobileView=matchMedia('(max-width:760px), (max-height:500px) and (max-width:950px), (pointer:coarse) and (hover:none)').matches;
let showSwitcher=false,preferredView;
try{showSwitcher=storage.getItem('statequest.viewSwitcher')==='true';preferredView=storage.getItem('statequest.view');}catch{}
function applyCardView(enabled){enabled=kioskMode||enabled;document.body.classList.toggle('flash',enabled);$('viewToggle').setAttribute('aria-pressed',String(enabled));$('viewToggle').textContent=enabled?'▦ Overview':'▣ Card view';}
function applyViewSwitcher(){
 $('showViewSwitcher').checked=showSwitcher;$('viewToggle').hidden=kioskMode||mobileView&&!showSwitcher;$('showViewSwitcher').disabled=kioskMode;
 if(mobileView&&!showSwitcher)applyCardView(true);
}
applyCardView(mobileView&&!showSwitcher?true:preferredView?preferredView==='cards':mobileView);
applyViewSwitcher();
$('showViewSwitcher').onchange=e=>{showSwitcher=e.target.checked;try{storage.setItem('statequest.viewSwitcher',String(showSwitcher));}catch{}applyViewSwitcher();};
$('viewToggle').onclick=()=>{if(kioskMode)return;const enabled=!document.body.classList.contains('flash');applyCardView(enabled);try{storage.setItem('statequest.view',enabled?'cards':'overview');}catch{}};
function panelView(view){if(sprint&&!sprint.snapshot().paused)sprint.pause();window.scrollTo(0,0);document.body.dataset.view=view;$('settingsButton').setAttribute('aria-pressed',String(view==='options'));for(const id of ['learnTab','challengeTab'])$(id).setAttribute('aria-pressed','false');$('progressTab').setAttribute('aria-pressed',String(view==='progress'));document.querySelector('.progress-scroll').scrollTop=0;}
function returnToGame(){document.body.dataset.view='game';$('settingsButton').setAttribute('aria-pressed','false');$('progressTab').setAttribute('aria-pressed','false');$('learnTab').setAttribute('aria-pressed',String(mode==='learn'));$('challengeTab').setAttribute('aria-pressed',String(mode==='challenge'));}
function closeOptions(){if(optionsReturn==='progress')panelView('progress');else returnToGame();}
$('settingsButton').onclick=()=>{if(document.body.dataset.view==='options'){closeOptions();return;}optionsReturn=document.body.dataset.view==='progress'?'progress':'game';panelView('options');$('optionsTitle').focus({preventScroll:true});};
$('closeOptions').onclick=closeOptions;
$('progressTab').onclick=()=>{if(document.body.dataset.view==='progress')returnToGame();else panelView('progress');};
$('learnDefault').value=learnDefault;
$('learnDefault').onchange=e=>{learnDefault=e.target.value;learnView=learnDefault;try{storage.setItem('statequest.learnDefault',learnDefault);}catch{}if(mode==='learn')learn();};
function fitViewport(){document.documentElement.style.setProperty('--app-height',`${window.visualViewport?.height || window.innerHeight}px`);}
window.visualViewport?.addEventListener('resize',fitViewport);window.addEventListener('resize',fitViewport);fitViewport();

function askMastery(title,message,yes,onYes,onNo=()=>{}){$('masteryTitle').textContent=title;$('masteryMessage').textContent=message;$('masteryYes').textContent=yes;$('masteryNo').textContent=title==='Still mastered?'?'Keep mastered':'Cancel';$('masteryDialog').showModal();$('masteryYes').onclick=()=>{$('masteryDialog').close();onYes();};$('masteryNo').onclick=()=>{$('masteryDialog').close();onNo();};$('masteryDialog').oncancel=()=>onNo();}
function repool(previous=states[index]?.abbr){stopSprint();states=practiceLocations();decks=createDecks(states,storage,Math.random,deckStorageKey(states));index=Math.max(0,states.findIndex(s=>s.abbr===previous));current=undefined;answered=false;stats();if(mode==='learn')learn();else question();}
function emptyPool(message='All enabled locations are mastered.'){$('game').innerHTML=`<div class="empty-pool"><h2>${esc(message)}</h2><p>Include mastered locations again, or change the game/location options.</p><button id="includeMastered">Include mastered locations</button></div>`;$('includeMastered').onclick=()=>{excludeMastered=false;$('excludeMastered').checked=false;try{storage.setItem('statequest.excludeMastered','false');}catch{}repool();};}
$('masteryDisplay').checked=!!progress.masteryDisplay;$('masteryDisplay').onchange=e=>{progress.masteryDisplay=e.target.checked;persist();};
$('excludeMastered').checked=excludeMastered;$('excludeMastered').onchange=e=>{excludeMastered=e.target.checked;try{storage.setItem('statequest.excludeMastered',String(excludeMastered));}catch{}repool();};
// Geography is independent of card preferences, progress, and each saved deck.
function geographySettings(){
 $('geographyChoices').innerHTML=Object.entries(GEOGRAPHY_OPTIONS).map(([key,label])=>`<label class="scale-setting"><input type="checkbox" data-geography="${key}" ${geography[key]?'checked':''}> ${label} (${key==='usExtras'?7:key==='canadaProvinces'?10:3})</label>`).join('');
 $('geographyCount').textContent=`${states.length} locations enabled. The 50 U.S. states are always included.`;
 document.querySelectorAll('[data-geography]').forEach(input=>input.onchange=()=>{
  const previous=states[index]?.abbr,key=input.dataset.geography;geography[input.dataset.geography]=input.checked;
  try{storage.setItem(GEOGRAPHY_KEY,JSON.stringify(geography));$('geographyStatus').textContent='Geography choices saved on this device.';}catch{$('geographyStatus').textContent='Choices work for this visit; storage is unavailable.';}
  stopSprint();states=practiceLocations();decks=createDecks(states,storage,Math.random,deckStorageKey(states));index=Math.max(0,states.findIndex(s=>s.abbr===previous));flipped=false;current=undefined;answered=false;
  stats();geographySettings();document.querySelector(`[data-geography="${key}"]`).focus();if(mode==='learn')learn();else question();
 });
}
geographySettings();

startWelcome({storage,document,window,navigator,mobile:mobileView&&!kioskMode});

startSharing({document,navigator,onOpen:()=>{if(sprint&&!sprint.snapshot().paused)sprint.pause();}});

startGamepad({window,document,navigator});
