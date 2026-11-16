import {mountMapQuest} from './map-quest.js';
import {timelinePrefix,neighborResult} from './result-rules.js';
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
import {load,save,matches,record,exportProgress,importProgress} from './core.js';
document.addEventListener('keydown',e=>{if(['Tab','Enter',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))document.body.classList.add('keyboard-focus');});
document.addEventListener('pointerdown',()=>document.body.classList.remove('keyboard-focus'));
const $ = id=>document.getElementById(id);
let storage;try{storage=window.localStorage;}catch{}
const allLocations=[...baseStates,...extraLocations],facts=mergeFacts(baseFacts,extraFacts);
let geography=readGeography(storage),states=selectedLocations(baseStates,extraLocations,geography);
const progress=load(storage);
let excludeMastered=false;try{excludeMastered=storage.getItem('statequest.excludeMastered')==='true';}catch{}
const enabledLocations=()=>selectedLocations(baseStates,extraLocations,geography);
const practiceLocations=()=>enabledLocations().filter(s=>!excludeMastered||!progress.mastered.includes(s.abbr));
states=practiceLocations();
progress.mastered=progress.mastered.filter(a=>allLocations.some(s=>s.abbr===a));
progress.seen=progress.seen.filter(a=>allLocations.some(s=>s.abbr===a));
let learnDefault='shape';try{learnDefault=storage.getItem('statequest.learnDefault')==='map'?'map':'shape';}catch{}
let learnView=learnDefault,optionsReturn='game';
let mode='learn', index=0, flipped=false, answerMode='choice', current, answered=false, score=0, choices=[], relativeScale=false, suppressFlipUntil=0, gameType='shape', mini, neighborMode='one', selectedAnswers=new Set(), timelineOrder=[], questionPosition;
let questMap;
let decks=createDecks(states,storage,Math.random,deckStorageKey(states));
const factUI=createFactsUI({storage,onChange:()=>{if(mode==='learn')learn();},renderMap:map,facts,locations:allLocations});
function persist(){ const ok=save(storage,progress);document.querySelector('.local').textContent=ok?'● Saved on this device':'● Session only';$('storageNote').textContent=ok?'Your progress stays in this browser. No account, no leaderboard, just you and the map.':'Browser storage is unavailable. You can still play, but progress will only last for this visit.';stats(); }
function stats(){ const enabled=enabledLocations();if($('masteredList')){$('masteredList').innerHTML=progress.mastered.map(a=>`<button class="secondary" data-unmaster="${a}">Remove ${esc(facts[a]?.name||a)} from Mastered</button>`).join('')||'<p>No mastered locations yet.</p>';document.querySelectorAll('[data-unmaster]').forEach(b=>b.onclick=()=>{toggleMastery(progress,b.dataset.unmaster);persist();repool();});}for(const [kind,ids] of [['explored',progress.seen],['mastered',progress.mastered]]){if($(kind+'Total')){$(kind+'Total').textContent=`${ids.filter(a=>enabled.some(s=>s.abbr===a)).length} / ${enabled.length}`;$(kind+'Bar').max=enabled.length;$(kind+'Bar').value=ids.filter(a=>enabled.some(s=>s.abbr===a)).length;}} $('introMessage').textContent=states.length===50?'Tap, flip, and play your way across all 50 states!':`Tap, flip, and play across ${states.length} enabled locations!`;const displayIds=progress.masteryDisplay?progress.mastered:progress.seen;$('exploredLabel').textContent=progress.masteryDisplay?'locations mastered':'locations explored';$('seenCount').textContent=`${displayIds.filter(a=>enabled.some(s=>s.abbr===a)).length} / ${enabled.length}`;$('explored').setAttribute('aria-label',progress.masteryDisplay?'Locations mastered':'Locations explored');$('explored').max=enabled.length;$('explored').value=displayIds.filter(a=>enabled.some(s=>s.abbr===a)).length;for(const id of ['best','streak','bestStreak']) $(id).textContent=progress[id].toLocaleString(); }
function shape(s){const [x,y,w,h]=s.bounds;const pad=s.group?Math.max(w,h)*.045:12;const side=760;const box=relativeScale&&!s.group?`${x+w/2-side/2} ${y+h/2-side/2} ${side} ${side}`:`${x-pad} ${y-pad} ${w+pad*2} ${h+pad*2}`;return `<svg class="shape" viewBox="${box}" role="img" aria-label="${mode==='learn'?s.name:'Mystery location'} silhouette"><path fill-rule="evenodd" d="${s.path}"/></svg>`;}
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
 const minimum=gameType==='timeline'?4:['population','area'].includes(gameType)?2:1;
 const eligible=gameType==='timeline'||gameType==='mapquest'?states.filter(s=>!s.group):states;
 if(eligible.length<minimum){emptyPool('Not enough unmastered locations for this game.');return;}
 if(['population','area'].includes(gameType)){const key=gameType==='population'?'population':states.some(s=>s.group)?'land_sq_mi':'area_sq_mi';if(!states.some(a=>Number.isFinite(facts[a.abbr][key])&&states.some(b=>b!==a&&Number.isFinite(facts[b.abbr][key])&&facts[a.abbr][key]!==facts[b.abbr][key]&&(gameType!=='population'||facts[a.abbr].population_as_of===facts[b.abbr].population_as_of)))){emptyPool('No comparable pair remains.');return;}}
 document.querySelector('.play').classList.remove('celebrate');answered=false;selectedAnswers=new Set();timelineOrder=[];questionPosition=undefined;
 if(gameType==='mapquest'){mini={note:'U.S. states only. Preview your choice, then submit. Alaska and Hawaii are inset.'};current=shuffle(eligible.filter(s=>s.abbr!==current?.abbr).length?eligible.filter(s=>s.abbr!==current?.abbr):eligible)[0];}
 else if(gameType==='shape'){const a=decks.current('shape');current=states.find(s=>s.abbr===a);questionPosition=decks.position('shape');choices=shuffle([current,...shuffle(states.filter(s=>s!==current)).slice(0,3)]);}
 else if(gameType==='timeline'){mini=makeTimeline(states,facts);current=states.find(s=>s.abbr===mini.target);}
 else{const settings=gameType==='neighbors'?{target:decks.current('neighbors'),neighborMode,answerLocations:enabledLocations()}:{};mini=makeQuestion(gameType,states,facts,current?.abbr,Math.random,settings);current=states.find(s=>s.abbr===mini.target);if(gameType==='neighbors')questionPosition=decks.position('neighbors');}
 challenge();$('game').scrollTop=0;
}
function challenge(){
 questMap?.destroy();questMap=null;
 const all=gameType==='neighbors'&&neighborMode==='all',timeline=gameType==='timeline';
 document.body.dataset.game=all?'neighbors-all':gameType;
 const neighborTitle=states.length===50?GAME_NAMES.neighbors:'Neighboring Locations';
 $('counter').textContent=`${score.toLocaleString()} POINTS`;$('modeLabel').textContent=(gameType==='neighbors'?neighborTitle:GAME_NAMES[gameType]).toUpperCase();
 const options=gameType==='mapquest'?[]:gameType==='shape'?choices.map(s=>s.abbr):mini.options;
 const gameEntries=[['shape-choice','Shape Challenge (Multiple Choice)'],['shape-typed',`Shape Challenge (${states.length===50?'Postal Abbreviation':'Abbreviation'})`],['population',GAME_NAMES.population],['area',GAME_NAMES.area],['neighbors-one',`${neighborTitle} (One)`],['neighbors-all',`${neighborTitle} (All)`],['timeline',GAME_NAMES.timeline],['mapquest','Map Quest']];
 const selectedGame=gameType==='shape'?`shape-${answerMode}`:gameType==='neighbors'?`neighbors-${neighborMode}`:gameType;
 const selector=`<label>Game <select id="gameSelect" aria-label="Game">${gameEntries.map(([key,label])=>`<option value="${key}" ${key===selectedGame?'selected':''}>${label}</option>`).join('')}</select></label>`;
 const badge=questionPosition?`ROUND ${questionPosition.round} · LOCATION ${questionPosition.number} / ${questionPosition.total}`:gameType==='timeline'?'★ TIME TRAVEL':'★ SHOWDOWN!';
 const visual=gameType==='mapquest'?`<div class="quest-map"><div class="quest-zoom-controls" role="group" aria-label="Map zoom"><button class="secondary" data-zoom="in" aria-label="Zoom in">Zoom +</button><button class="secondary" data-zoom="out" aria-label="Zoom out">Zoom −</button><button class="secondary" data-zoom="reset">Full map</button></div>${teachingMap({locations:allLocations,mode:'quest',eligible:states.filter(s=>!s.group).map(s=>s.abbr)})}<p data-quest-legend class="map-legend" hidden>🟩 Correct · 🟥 Incorrect choice · 🟨 Intended target</p><div class="quest-zoom-controls" data-quest-focus></div></div>`:gameType==='shape'?shape(current):gameType==='neighbors'?`<span class="question-state">${esc(current.name)}</span>${shape(current)}`:timeline?'':`<div class="duel">${mini.pair.map(a=>{const s=states.find(t=>t.abbr===a);return `<button class="duel-card" data-answer="${a}" aria-label="Choose ${esc(s.name)}"><span class="tap-prompt">Tap to choose!</span><img src="${facts[a].flag||`assets/flags/${a}.svg`}" alt="Flag of ${esc(s.name)}">${shape(s)}<b>${esc(s.name)}</b></button>`;}).join('')}</div>`;
 const answerMarkup=gameType==='mapquest'?'<p>Tap a state to preview it, then Submit answer. Double-tap to zoom; drag to move.</p><p id="questSelection" class="quest-selection" role="status" aria-live="polite">No state selected.</p><button id="submitMapAnswer" class="primary quest-submit" disabled>Submit answer</button><button id="clearMapSelection" class="secondary" hidden>Clear selection</button>':timeline?`<div class="choices timeline-choices">${options.map(a=>`<button data-pick="${a}" aria-pressed="${timelineOrder.includes(a)}" aria-label="${timelineOrder.includes(a)?`${timelineOrder.indexOf(a)+1}. ${esc(facts[a].name)} selected`:`Add ${esc(facts[a].name)} to timeline`}">${timelineOrder.includes(a)?`<span class="pick-number" aria-hidden="true">${timelineOrder.indexOf(a)+1}</span>`:''}${esc(facts[a].name)}</button>`).join('')}</div><p class="timeline-progress" role="status" aria-live="polite">${timelineOrder.length} of ${mini.options.length} selected</p><div class="selection-actions"><button id="undoTimeline" class="secondary" ${timelineOrder.length?'':'disabled'}>↶ Undo</button><button id="clearTimeline" class="secondary" ${timelineOrder.length?'':'disabled'}>Clear</button><button id="checkTimeline" class="primary" ${timelineOrder.length===options.length?'':'disabled'}>Check timeline ✓</button></div>`:['population','area'].includes(gameType)?'':gameType==='shape'&&answerMode==='typed'?`<form id="answerForm" class="typed"><label for="answerInput" class="empty">Two letters</label><input id="answerInput" aria-label="Two-letter abbreviation" maxlength="2" pattern="[A-Za-z]{2}" required autocomplete="off" autocapitalize="characters" inputmode="text" spellcheck="false" enterkeyhint="done" placeholder="e.g. NY"><button class="primary">Check</button></form>`:`<div class="choices ${all?'all-neighbors':''}">${options.map(a=>`<button data-answer="${a}" ${all?`aria-pressed="${selectedAnswers.has(a)}" class="${selectedAnswers.has(a)?'selected-answer':''}"`:''} aria-label="${a==='NONE'?'None — no enabled neighbors':esc(facts[a].name)}">${a==='NONE'?'None — no enabled neighbors':esc(facts[a].name)}</button>`).join('')}</div>${all?`<button class="primary check-selection" id="checkNeighbors" ${selectedAnswers.size?'':'disabled'}>Check neighbors ✓</button>`:''}`;
 $('game').innerHTML=`<div class="challenge-head game-controls">${selector}</div><h2 class="game-question">${gameType==='mapquest'?`Find ${esc(current.name)} on the map.`:gameType==='shape'?`Which ${states.length===50?'state':'location'} is this?`:esc(mini.prompt)}</h2>${timeline?'':`<div class="card ${gameType==='shape'?'':'mini-card'}">${visual}${current.shape_note?`<small class="shape-note">Insets not to scale or geographic position</small>`:''}<span class="badge">${badge}</span></div>`}<div class="answers ${timeline?'timeline-answers':''}">${answerMarkup}<div id="feedback" class="feedback" role="status" aria-live="polite" aria-atomic="true">${all?'':timeline?'Tap a selected state to remove it, or use Undo.':'Ready? Pick your answer!'}</div><button class="primary next" id="nextQuestion" hidden>Next question ▶</button><p class="game-method" ${all?'hidden':''}>${gameType==='shape'?`All ${states.length} ${states.length===50?'states':'locations'}, once each, then a fresh shuffle.`:esc(mini.note)}</p></div>`;
 $('gameSelect').onchange=e=>{const [type,variant]=e.target.value.split('-');gameType=type;if(type==='shape')answerMode=variant;if(type==='neighbors')neighborMode=variant;question();};
 document.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>all?toggleNeighbor(b.dataset.answer):submit(b.dataset.answer));
 if($('checkNeighbors'))$('checkNeighbors').onclick=()=>finishAnswer(sameAnswers([...selectedAnswers],mini.correctSet),mini.correctSet,mini.explanation);
 if(timeline){
  const redraw=()=>{challenge();(document.querySelector('[data-pick]:not(:disabled)')||$('checkTimeline')).focus();};
  document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{if(!answered){timelineOrder=toggleOrder(timelineOrder,b.dataset.pick);redraw();}});
  $('undoTimeline').onclick=()=>{timelineOrder.pop();redraw();};$('clearTimeline').onclick=()=>{timelineOrder=[];redraw();};
  $('checkTimeline').onclick=()=>{const explanation=mini.solution.map(a=>`${facts[a].name}: ${formatStatehood(facts[a].statehood_date)}`).join(' → ');finishAnswer(timelineCorrect(timelineOrder,mini.options,facts),[],explanation);};
 }
 if(gameType==='mapquest')questMap=mountMapQuest(document.querySelector('.quest-map'),{states:baseStates,onAnswer:submit,submitButton:$('submitMapAnswer'),selectionLabel:$('questSelection'),clearButton:$('clearMapSelection')});
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
 const correct=['shape','mapquest'].includes(gameType)?matches(current,value):value===mini.correct;
 finishAnswer(correct,[['shape','mapquest'].includes(gameType)?current.abbr:mini.correct],['shape','mapquest'].includes(gameType)?`${current.name} (${current.abbr})`:mini.explanation,value);
}
function finishAnswer(correct,correctAnswers,explanation,value){
 if(answered)return;answered=true;
 document.querySelector('.play').classList.toggle('celebrate',correct);const points=record(progress,current,correct,score,gameType==='shape');score+=points;
 if(gameType==='shape'||gameType==='neighbors')decks.complete(gameType,current.abbr);
 persist();$('counter').textContent=`${score.toLocaleString()} POINTS`;
 const roundComplete=questionPosition&&questionPosition.number===questionPosition.total;
 const milestone=correct&&progress.streak%5===0;
 const feedback=$('feedback');feedback.className=`feedback result-banner ${correct?'result-correct':'result-wrong'}${milestone||roundComplete?' result-milestone':''}`;
 feedback.innerHTML=`<strong class="result-title">${correct?'★ Correct!':'Keep exploring!'}</strong>${correct?`<span class="result-points">+${points} points</span><span class="result-breakdown">100 for the answer + ${points-100} streak bonus</span>`:'<span class="result-breakdown">Here’s the answer · 0 points · streak reset</span>'}<span class="result-explanation">${esc(explanation)}</span>${milestone?`<strong class="result-achievement">🌟 ${progress.streak} correct in a row!</strong>`:''}${roundComplete?`<strong class="result-achievement">🏁 Round complete! You practiced all ${questionPosition.total} locations.</strong>`:''}`;

 if(gameType==='neighbors'){
 const neighbors=facts[current.abbr].neighbors;
 const chosen=neighborMode==='all'?[...selectedAnswers].filter(a=>a!=='NONE'):[value].filter(a=>a&&a!=='NONE');
 const quizNeighbors=neighborMode==='all'?mini.correctSet.filter(a=>a!=='NONE'):neighbors.filter(a=>states.some(s=>s.abbr===a));
 feedback.insertAdjacentHTML('beforeend',`<section class="neighbor-reveal"><h3>Where the neighbors fit</h3>${teachingMap({locations:allLocations,target:current.abbr,neighbors,chosen,eligible:quizNeighbors,all:neighborMode==='all'})}<p class="map-legend">🟨 Target · 🟩 Correct choice · 🟥 Missed / wrong · 🟦 Other neighbor</p><p>${[current.abbr,...neighbors,...chosen].filter((a,i,arr)=>arr.indexOf(a)===i).map(a=>`${a}: ${esc(facts[a]?.name||a)}`).join(' · ')}</p><small>All supported neighbors shown. ALL mode includes every neighbor in your enabled geography, even if mastered. Disabled geography is shown for reference only. U.S.-only maps use Alaska/Hawaii insets; cross-border maps show geographic positions.</small></section>`);
 }
 if(gameType==='mapquest')questMap?.showResult(current.abbr,value,correct);
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
}
function setMode(next){$('settingsButton').setAttribute('aria-pressed','false');mode=next;if(mode==='learn')delete document.body.dataset.game;document.body.dataset.view='game';document.body.dataset.mode=mode;$('progressTab').setAttribute('aria-pressed','false');$('learnTab').setAttribute('aria-pressed',mode==='learn');$('challengeTab').setAttribute('aria-pressed',mode==='challenge');$('tip').textContent=mode==='learn'?'Flip any card to discover its capital and find its place on the map. Swipe left or right, or use the arrow buttons.':'Earn points and build a streak! Shape Challenge and Neighbors visit every enabled location before shuffling again.';if(mode==='learn')learn();else if(!current)question();else if(answered)question();else challenge();}
$('scaleToggle').onchange=e=>{relativeScale=e.target.checked;if(mode==='learn')learn();else if(!answered)challenge();else{document.querySelectorAll('.card .shape').forEach((svg,i)=>{const s=gameType==='shape'||gameType==='neighbors'?current:states.find(s=>s.abbr===mini.pair[i]);svg.outerHTML=shape(s);});}};
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
 try {if(file.size>100000)throw Error('Save is too large. Choose a QuizTrekker - US States JSON export.');pendingImport=importProgress(await file.text(),allLocations);$('importSummary').textContent=`${pendingImport.seen.length} locations explored · ${pendingImport.mastered.length} mastered · best score ${pendingImport.best} · longest streak ${pendingImport.bestStreak}.`;$('importDialog').showModal();}
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
const mobileView=matchMedia('(max-width:760px), (max-height:500px) and (max-width:950px), (pointer:coarse) and (hover:none)').matches;
let showSwitcher=false,preferredView;
try{showSwitcher=storage.getItem('statequest.viewSwitcher')==='true';preferredView=storage.getItem('statequest.view');}catch{}
function applyCardView(enabled){document.body.classList.toggle('flash',enabled);$('viewToggle').setAttribute('aria-pressed',String(enabled));$('viewToggle').textContent=enabled?'▦ Overview':'▣ Card view';}
function applyViewSwitcher(){
 $('showViewSwitcher').checked=showSwitcher;$('viewToggle').hidden=mobileView&&!showSwitcher;
 if(mobileView&&!showSwitcher)applyCardView(true);
}
applyCardView(mobileView&&!showSwitcher?true:preferredView?preferredView==='cards':mobileView);
applyViewSwitcher();
$('showViewSwitcher').onchange=e=>{showSwitcher=e.target.checked;try{storage.setItem('statequest.viewSwitcher',String(showSwitcher));}catch{}applyViewSwitcher();};
$('viewToggle').onclick=()=>{const enabled=!document.body.classList.contains('flash');applyCardView(enabled);try{storage.setItem('statequest.view',enabled?'cards':'overview');}catch{}};
function panelView(view){window.scrollTo(0,0);document.body.dataset.view=view;$('settingsButton').setAttribute('aria-pressed',String(view==='options'));for(const id of ['learnTab','challengeTab'])$(id).setAttribute('aria-pressed','false');$('progressTab').setAttribute('aria-pressed',String(view==='progress'));document.querySelector('.progress-scroll').scrollTop=0;}
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
function repool(previous=states[index]?.abbr){states=practiceLocations();decks=createDecks(states,storage,Math.random,deckStorageKey(states));index=Math.max(0,states.findIndex(s=>s.abbr===previous));current=undefined;answered=false;stats();if(mode==='learn')learn();else question();}
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
  states=practiceLocations();decks=createDecks(states,storage,Math.random,deckStorageKey(states));index=Math.max(0,states.findIndex(s=>s.abbr===previous));flipped=false;current=undefined;answered=false;
  stats();geographySettings();document.querySelector(`[data-geography="${key}"]`).focus();if(mode==='learn')learn();else question();
 });
}
geographySettings();
