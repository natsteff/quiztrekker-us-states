const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/gamepad.js','utf8').replaceAll('export ','');
const {createPadInput,nearestControl,startGamepad}=vm.runInNewContext(source+';({createPadInput,nearestControl,startGamepad})');
assert.equal(typeof startGamepad({navigator:{}}),'function');
const poll=createPadInput(),pad={index:0,buttons:Array.from({length:16},()=>({pressed:false})),axes:[0,0]};
assert.equal(poll(pad,0).length,0);
for(const [i,name] of [[0,'activate'],[1,'faceB'],[2,'flip'],[3,'submit'],[4,'previous'],[5,'next'],[6,'leftTrigger'],[7,'rightTrigger'],[8,'back'],[9,'start']]){pad.buttons[i].pressed=true;assert.equal(poll(pad,10).join(','),name);assert.equal(poll(pad,1000).length,0);pad.buttons[i].pressed=false;poll(pad,1001);}
pad.buttons[15].pressed=true;assert.equal(poll(pad,1100).join(','),'right');assert.equal(poll(pad,1499).length,0);assert.equal(poll(pad,1500).join(','),'right');poll(null,1700);assert.equal(poll(pad,1800).length,0);pad.buttons[15].pressed=false;pad.axes=[0,-.7];assert.equal(poll(pad,1801).join(','),'nav-up');
const cells=[[0,0],[100,0],[0,100],[100,100]].map(([x,y])=>({getBoundingClientRect:()=>({x,y,width:80,height:50})}));assert.equal(nearestControl(cells,cells[0],'right'),cells[1]);assert.equal(nearestControl(cells,cells[0],'down'),cells[2]);assert.equal(nearestControl(cells,cells[0],'up'),cells[0]);
// Exercise direct routes, without browser globals or a physical controller.
let frame,ids={},answers=[],calls=[];
const document={hidden:false,activeElement:null,body:{dataset:{mode:'challenge',view:'game',game:'shape'},classList:{add(){},remove(){},toggle(){}}},querySelector:()=>null,getElementById:id=>ids[id]||null,querySelectorAll:selector=>selector==='dialog[open]'?[]:selector==='[data-sprint-answer],[data-pick],[data-answer]'?answers:Object.values(ids).concat(answers)};
function element(id,x=0){return {id,hidden:false,disabled:false,getAttribute:()=>null,closest:()=>null,getClientRects:()=>[{}],getBoundingClientRect:()=>({x,y:0,width:80,height:50}),querySelector:()=>null,matches:()=>false,focus(){document.activeElement=this;},scrollIntoView(){},click(){calls.push(id);}};}
const controller={index:0,connected:true,mapping:'standard',buttons:Array.from({length:16},()=>({pressed:false})),axes:[0,0]};
const stop=startGamepad({window:{getComputedStyle:()=>({visibility:'visible'}),requestAnimationFrame:fn=>(frame=fn,1),cancelAnimationFrame(){}},document,navigator:{getGamepads:()=>[controller]}});
let time=0;frame(time++);function press(i){controller.buttons[i].pressed=true;frame(time++);controller.buttons[i].pressed=false;frame(time++);}
answers=[0,1,2,3].map(i=>element('answer'+i));for(let i=0;i<4;i++)press(i);assert.equal(calls.join(','),'answer0,answer1,answer2,answer3');
controller.buttons[0].pressed=true;frame(time++);frame(time+1000);assert.equal(calls.filter(s=>s==='answer0').length,2);controller.buttons[0].pressed=false;frame(time++);
ids.nextQuestion=element('next');press(0);assert.equal(calls.at(-1),'answer0');press(7);assert.equal(calls.at(-1),'next');delete ids.nextQuestion;
ids.learnTab=element('learn');ids.challengeTab=element('play');ids.progressTab=element('progress');press(5);assert.equal(calls.at(-1),'progress');press(4);assert.equal(calls.at(-1),'learn');
document.body.dataset.mode='learn';ids.flip=element('flip');ids.moreFacts=element('facts');ids.prev=element('prev');ids.next=element('nextCard');ids.mapView=element('map');press(0);press(2);press(6);press(7);press(3);assert.equal(calls.slice(-5).join(','),'facts,flip,prev,nextCard,map');
ids.settingsButton=element('settings');press(9);assert.equal(calls.at(-1),'settings');
// All-neighbor choices use focus + A, not B/X/Y answer shortcuts.
document.body.dataset.mode='challenge';document.body.dataset.game='neighbors-all';document.activeElement=answers[2];press(1);assert.equal(calls.at(-1),'settings');press(0);assert.equal(calls.at(-1),'answer2');
// Connection while held never answers; disconnect and foreground reset edges.
controller.connected=false;frame(time++);controller.buttons[0].pressed=true;controller.connected=true;frame(time++);assert.equal(calls.at(-1),'answer2');stop();
console.log('Direct four-choice actions, Learn triggers, tab shoulders, result safety, adapted multi-select, held input and reconnect passed');
const {bindingPressed,cleanPadProfiles}=vm.runInNewContext(source+';({bindingPressed,cleanPadProfiles})');
const analogPad={index:1,buttons:Array.from({length:16},()=>({pressed:false,value:0})),axes:[0,0,-1]};
const analogPoll=createPadInput();analogPoll(analogPad,0);analogPad.buttons[6].value=.8;assert.equal(analogPoll(analogPad,1).join(','),'leftTrigger');analogPad.buttons[6].value=.4;assert.equal(analogPoll(analogPad,2).length,0);analogPad.buttons[6].value=.1;analogPoll(analogPad,3);analogPad.buttons[6].value=.8;assert.equal(analogPoll(analogPad,4).join(','),'leftTrigger');
const binding={type:'axis',index:2,rest:-1,direction:1},custom={rightTrigger:binding};const axisPoll=createPadInput();axisPoll(analogPad,0,custom);analogPad.axes[2]=.8;assert.equal(axisPoll(analogPad,1,custom).join(','),'rightTrigger');assert(bindingPressed(analogPad,binding));analogPad.axes[2]=-1;assert(!bindingPressed(analogPad,binding));
const cleaned=cleanPadProfiles({test:{enabled:true,bindings:{rightTrigger:binding,previous:{type:'button',index:10},bad:{type:'button',index:1},next:{type:'button',index:999},left:{type:'axis',index:2,rest:NaN,direction:1}}}});assert.equal(Object.keys(cleaned.test.bindings).sort().join(','),'previous,rightTrigger');assert(cleaned.test.enabled);
// Expanded Settings uses document order, including controls at the same visual position.
calls=[];answers=[];ids={};document.body.dataset.view='options';
const summary=element('summary'),checkbox=element('checkbox'),update=element('checkUpdates');summary.parentElement={open:true,matches:()=>false};summary.matches=s=>s==='summary';let checked=false;checkbox.matches=s=>s.includes('input')&&!s.includes('not([type])')&&!s.includes('[type=text]');checkbox.click=()=>{checked=!checked;calls.push('checkbox');};
const panel={querySelectorAll:()=>[summary,checkbox,update]};document.querySelector=s=>s==='.save-tools'?panel:null;document.activeElement=summary;controller.buttons.forEach(b=>b.pressed=false);controller.axes=[0,0];
const stopPanel=startGamepad({window:{getComputedStyle:()=>({visibility:'visible'}),requestAnimationFrame:fn=>(frame=fn,1),cancelAnimationFrame(){}},document,navigator:{getGamepads:()=>[controller]}});frame(time++);press(13);assert.equal(document.activeElement,checkbox);press(0);assert(checked);press(13);assert.equal(document.activeElement,update);press(0);assert.equal(calls.at(-1),'checkUpdates');press(12);assert.equal(document.activeElement,checkbox);press(12);assert.equal(document.activeElement,summary);press(14);assert.equal(summary.parentElement.open,false);press(15);assert.equal(summary.parentElement.open,true);stopPanel();
console.log('Analog-value hysteresis, axis trigger overrides, profile validation and expanded Settings/checkbox/update navigation passed');
// Independent reading-scroll inputs repeat, and assigned trigger axes cannot also scroll.
const scrollPad={index:3,id:'scroll',buttons:[],axes:[0,0,0,0]},scrollPoll=createPadInput();scrollPoll(scrollPad,0);scrollPad.axes[3]=.8;assert.equal(scrollPoll(scrollPad,10).join(','),'scrollDown');assert.equal(scrollPoll(scrollPad,200).length,0);assert.equal(scrollPoll(scrollPad,410).join(','),'scrollDown');scrollPad.axes[3]=0;scrollPoll(scrollPad,420);scrollPad.axes[3]=-.8;assert.equal(scrollPoll(scrollPad,430).join(','),'scrollUp');
const reservedPoll=createPadInput(),reservedBinding={rightTrigger:{type:'axis',index:3,rest:0,direction:1}};scrollPad.axes[3]=0;reservedPoll(scrollPad,0,reservedBinding);scrollPad.axes[3]=.9;assert.equal(reservedPoll(scrollPad,10,reservedBinding).join(','),'rightTrigger');
// Right stick and panel triggers scroll reading content without changing focus or clicking controls.
let scrollEvents=[];const readingPane={scrollHeight:1200,clientHeight:400,scrollTop:0,parentElement:null,querySelector:()=>null,contains:()=>false,scrollBy({top}){this.scrollTop=Math.max(0,Math.min(800,this.scrollTop+top));scrollEvents.push(top);}};
document.querySelector=s=>s==='.progress-scroll'?readingPane:null;document.body.dataset.view='progress';document.activeElement=summary;controller.buttons.forEach(b=>b.pressed=false);controller.axes=[0,0,0,0];ids={};
const stopReading=startGamepad({window:{getComputedStyle:()=>({visibility:'visible',overflowY:'auto'}),requestAnimationFrame:fn=>(frame=fn,1),cancelAnimationFrame(){}},document,navigator:{getGamepads:()=>[controller]}});frame(time++);press(7);assert(readingPane.scrollTop>0);assert.equal(document.activeElement,summary);press(6);assert.equal(readingPane.scrollTop,0);controller.axes[3]=.9;frame(time++);assert(readingPane.scrollTop>0);controller.axes[3]=0;frame(time++);readingPane.scrollTop=800;press(7);assert.equal(readingPane.scrollTop,800);stopReading();
console.log('Reading scroll repeats, trigger-axis conflict protection, panel LT/RT scrolling, bounds and focus preservation passed');
// At a modal's scroll boundary, scrolling must never move the page behind it.
const background={...readingPane,scrollTop:0,scrollBy(){throw Error('Scrolled behind modal');}},modal={...readingPane,scrollTop:800,parentElement:background,querySelectorAll:()=>[]};
const originalQuery=document.querySelectorAll;document.querySelectorAll=s=>s==='dialog[open]'?[modal]:[];controller.axes=[0,0,0,0];controller.buttons.forEach(b=>b.pressed=false);
const stopModal=startGamepad({window:{getComputedStyle:()=>({visibility:'visible',overflowY:'auto'}),requestAnimationFrame:fn=>(frame=fn,1),cancelAnimationFrame(){}},document,navigator:{getGamepads:()=>[controller]}});frame(time++);press(7);assert.equal(modal.scrollTop,800);stopModal();document.querySelectorAll=originalQuery;
console.log('Modal scroll boundaries keep the background page fixed');
