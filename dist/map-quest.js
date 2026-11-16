const FULL=[0,0,975,610];
export function zoomBox(box,point,factor){const w=Math.max(975/12,Math.min(975,box[2]/factor)),h=w*610/975;return [Math.max(0,Math.min(975-w,point[0]-w/2)),Math.max(0,Math.min(610-h,point[1]-h/2)),w,h];}
export function fitQuestBox(states,ids){const bounds=states.filter(s=>ids.includes(s.abbr)).map(s=>s.bounds);if(!bounds.length)return [...FULL];const x=Math.min(...bounds.map(b=>b[0])),y=Math.min(...bounds.map(b=>b[1])),r=Math.max(...bounds.map(b=>b[0]+b[2])),bottom=Math.max(...bounds.map(b=>b[1]+b[3]));const w=Math.max(975/12,(r-x)*1.5+20,(bottom-y)*1.5*975/610+20);return zoomBox(FULL,[(x+r)/2,(y+bottom)/2],975/w);}
export function createMapTap({onPreview,onZoom,onIdle=()=>{},setTimer=setTimeout,clearTimer=clearTimeout,now=()=>Date.now()}){
 let last,timer;
 function cancel(){clearTimer(timer);timer=undefined;last=undefined;}
 return {cancel,begin(){clearTimer(timer);timer=undefined;},tap(event){if(last&&now()-last.time<340&&Math.hypot(event.screen[0]-last.screen[0],event.screen[1]-last.screen[1])<35){cancel();onZoom(event.point);return;}cancel();last={...event,time:now()};timer=setTimer(()=>{const state=last?.state;cancel();if(state)onPreview(state);else onIdle();},350);}};
}
export function createMapSelection(onSubmit){
 let selected=null,locked=false;
 return {get selected(){return selected;},get locked(){return locked;},preview(a){if(!locked)selected=a;},clear(){if(!locked)selected=null;},submit(){if(locked||!selected)return false;locked=true;onSubmit(selected);return true;}};
}
export function mountMapQuest(root,{states,onAnswer,submitButton,selectionLabel,clearButton}){
 const svg=root.querySelector('svg'),selection=createMapSelection(onAnswer);let box=[...FULL],finished=false,down,dragged=false;
 function draw(next){box=next;svg.setAttribute('viewBox',box.join(' '));root.querySelector('[data-zoom="out"]').disabled=box[2]>=975;svg.querySelectorAll('.quest-label').forEach(el=>el.style.fontSize=`${box[2]/28}px`);}
 function point(x,y,inverse=svg.getScreenCTM().inverse()){const p=svg.createSVGPoint();p.x=x;p.y=y;const q=p.matrixTransform(inverse);return [q.x,q.y];}
 function sync(){const a=selection.selected;submitButton.disabled=finished||selection.locked||!a;clearButton.hidden=finished||!a;selectionLabel.textContent=finished?'Answer submitted.':a?'Press Submit answer to check your selected region.':'No state selected.';svg.querySelectorAll('[data-map-answer]').forEach(el=>{const chosen=el.dataset.mapAnswer===a;el.classList.toggle('quest-preview',chosen);el.setAttribute('aria-pressed',String(chosen));});}
 function preview(a){if(!finished){selection.preview(a);sync();}}
 const tap=createMapTap({onPreview:preview,onIdle:sync,onZoom:p=>{draw(zoomBox(box,p,2));sync();}});
 submitButton.onclick=()=>{tap.cancel();if(!finished)selection.submit();sync();};clearButton.onclick=()=>{tap.cancel();selection.clear();sync();};sync();
 function pointerDown(e){if(!e.isPrimary){down=null;tap.cancel();sync();return;}tap.begin();submitButton.disabled=true;down={x:e.clientX,y:e.clientY,box:[...box],inverse:svg.getScreenCTM().inverse(),state:e.target.closest('[data-map-answer]')?.dataset.mapAnswer};dragged=false;svg.setPointerCapture(e.pointerId);}
 function pointerMove(e){if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)<8)return;dragged=true;tap.cancel();if(down.box[2]<975){e.preventDefault();const a=point(down.x,down.y,down.inverse),b=point(e.clientX,e.clientY,down.inverse);draw([Math.max(0,Math.min(975-box[2],down.box[0]+a[0]-b[0])),Math.max(0,Math.min(610-box[3],down.box[1]+a[1]-b[1])),box[2],box[3]]);}}
 function pointerUp(e){if(!down)return;const state=down.state;if(!dragged)tap.tap({state:finished?null:state,screen:[e.clientX,e.clientY],point:point(e.clientX,e.clientY)});else sync();down=null;}
 function key(e){const a=e.target.closest('[data-map-answer]');if(a&&(e.key==='Enter'||e.key===' ')){e.preventDefault();tap.cancel();preview(a.dataset.mapAnswer);}}
 svg.addEventListener('pointerdown',pointerDown);svg.addEventListener('pointermove',pointerMove);svg.addEventListener('pointerup',pointerUp);svg.addEventListener('pointercancel',()=>{down=null;tap.cancel();sync();});svg.addEventListener('keydown',key);svg.addEventListener('dblclick',e=>e.preventDefault());
 root.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>{tap.cancel();sync();if(b.dataset.zoom==='reset')draw([...FULL]);else draw(zoomBox(box,[box[0]+box[2]/2,box[1]+box[3]/2],b.dataset.zoom==='in'?2:.5));});draw(box);
 return {destroy(){tap.cancel();},showResult(target,chosen,correct){finished=true;tap.cancel();sync();svg.querySelectorAll('.quest-preview').forEach(el=>el.classList.remove('quest-preview'));svg.setAttribute('aria-label',correct?`Correct: ${states.find(s=>s.abbr===target)?.name}`:`Intended target: ${states.find(s=>s.abbr===target)?.name}; incorrect choice: ${states.find(s=>s.abbr===chosen)?.name}`);
  svg.querySelectorAll('[data-quest-region]').forEach(el=>{const name=states.find(s=>s.abbr===el.dataset.questRegion)?.name||'Map region';el.setAttribute('aria-label',name);const title=document.createElementNS('http://www.w3.org/2000/svg','title');title.textContent=name;el.append(title);});
  svg.querySelectorAll('[data-map-answer]').forEach(el=>{const a=el.dataset.mapAnswer;el.dataset.questState=a;el.removeAttribute('data-map-answer');el.removeAttribute('role');el.classList.remove('background');el.classList.add(a===target?(correct?'correct':'target'):a===chosen?'wrong':'background');el.setAttribute('aria-disabled','true');el.setAttribute('tabindex','-1');});
  // A mastered/excluded state is still present as context, but never an answer.
  root.querySelector('[data-quest-legend]').hidden=false;
  const focus=root.querySelector('[data-quest-focus]');focus.innerHTML=`<button class="secondary" data-focus-state="${target}">Zoom target</button>${correct?'':`<button class="secondary" data-focus-state="${chosen}">Zoom your choice</button>`}`;
  focus.querySelectorAll('[data-focus-state]').forEach(b=>b.onclick=()=>draw(fitQuestBox(states,[b.dataset.focusState])));
  const ids=[...new Set([target,chosen])];for(const a of ids){const s=states.find(s=>s.abbr===a);if(!s)continue;const t=document.createElementNS('http://www.w3.org/2000/svg','text');t.setAttribute('x',s.bounds[0]+s.bounds[2]/2);t.setAttribute('y',s.bounds[1]+s.bounds[3]/2);t.setAttribute('class','region-label quest-label');t.textContent=a;svg.append(t);}
  const small=ids.some(a=>{const b=states.find(s=>s.abbr===a)?.bounds;return b&&Math.max(b[2]/975,b[3]/610)<.12;});draw(small?fitQuestBox(states,ids):box);
 }};
}
