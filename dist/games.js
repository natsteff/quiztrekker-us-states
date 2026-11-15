export const GAME_NAMES={shape:'Shape Challenge',population:'Population Showdown',area:'Size Showdown',neighbors:'Neighboring States',timeline:'Statehood Timeline'};
function pick(a,r){return a[Math.min(a.length-1,Math.floor(r()*a.length))];}
function shuffled(a,r){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
export function makeQuestion(type,states,facts,previous,random=Math.random,settings={}){
 const expanded=states.some(s=>s.group);
 if(['population','area'].includes(type))states=states.filter(s=>Number.isFinite(facts[s.abbr][type==='population'?'population':expanded?'land_sq_mi':'area_sq_mi']));
 const target=settings.target?states.find(s=>s.abbr===settings.target):pick(states.filter(s=>s.abbr!==previous),random),f=facts[target.abbr];
 if(type==='neighbors'){
  const neighbors=f.neighbors.filter(a=>states.some(s=>s.abbr===a));
  const other=states.filter(s=>s.abbr!==target.abbr&&!neighbors.includes(s.abbr));
  if(settings.neighborMode==='all'){
   const count=Math.min(states.length,Math.max(...states.map(s=>facts[s.abbr].neighbors.filter(a=>states.some(t=>t.abbr===a)).length))+2);
   const options=shuffled([...neighbors,'NONE',...shuffled(other,random).slice(0,count-neighbors.length-1).map(s=>s.abbr)],random);
   return {type,target:target.abbr,all:true,correctSet:neighbors.length?[...neighbors]:['NONE'],options,prompt:`Select all ${expanded?'enabled ':''}neighbors of ${target.name}.`,note:'Select every neighbor, then Check. Choose None if there are no neighbors among enabled locations. Shared borders include water; corner-only contact does not. Answers use enabled locations only.',explanation:neighbors.length?`${target.name} borders ${neighbors.map(a=>facts[a].name).join(', ')}.`:`${target.name} has no neighbors among enabled locations.`};
  }
  const correct=neighbors.length?pick(neighbors,random):'NONE';
  const options=shuffled([correct,...shuffled(other,random).slice(0,3).map(s=>s.abbr)],random);
  return {type,target:target.abbr,correct,options,prompt:`Which ${expanded?'location':'state'} borders ${target.name}?`,note:'Shared borders include water. Touching only at a corner does not count.',explanation:neighbors.length?`${target.name} borders ${neighbors.map(a=>facts[a].name).join(', ')}.`:`${target.name} has no neighbors among enabled locations.`};
 }
 if(!['population','area'].includes(type))throw Error('Unsupported game');
 const key=type==='population'?'population':expanded?'land_sq_mi':'area_sq_mi';
 const other=pick(states.filter(s=>s.abbr!==target.abbr&&facts[s.abbr][key]!==f[key]&&(type!=='population'||facts[s.abbr].population_as_of===f.population_as_of)),random);
 const pair=shuffled([target.abbr,other.abbr],random);
 const correct=f[key]>facts[other.abbr][key]?target.abbr:other.abbr;
 const unit=type==='population'?'people':'sq mi';
 return {type,target:target.abbr,correct,options:pair,pair,prompt:type==='population'?`Which ${expanded?'location':'state'} has more people?`:expanded?'Which location has more land area?':'Which state is larger by total area?',note:type==='population'?(expanded?`${f.population_label||'Census estimate'} · ${f.population_as_of} · same-date comparison`:'Census population estimates · July 1, 2025'):expanded?'Land area only · Census / Atlas of Canada; source vintages differ.':'Census 2010 total area · land + water',explanation:pair.map(a=>`${facts[a].name}: ${facts[a][key].toLocaleString('en-US')} ${unit}${expanded?` (${type==='population'?facts[a].population_label||'2025 Census estimate':facts[a].area_label||'Census 2010 land'})`:''}`).join(' · ')};
}

export function sameAnswers(selected,expected){return selected.length===expected.length&&new Set(selected).size===selected.length&&selected.every(a=>expected.includes(a));}
export function makeTimeline(states,facts,random=Math.random,count=4){
 const options=shuffled(states.filter(s=>facts[s.abbr]?.statehood_date),random).slice(0,count).map(s=>s.abbr);
 const solution=[...options].sort((a,b)=>facts[a].statehood_date.localeCompare(facts[b].statehood_date)||facts[a].statehood_order-facts[b].statehood_order);
 return {type:'timeline',target:options[0],options,solution,prompt:'Pick the states in the order they were admitted to the Union.',note:'Earliest first. States admitted on the same date can go either way.',explanation:solution.map(a=>`${facts[a].name}: ${facts[a].statehood_date}`).join(' → ')};
}
export function timelineCorrect(order,options,facts){return sameAnswers(order,options)&&order.every((a,i)=>i===0||facts[order[i-1]].statehood_date<=facts[a].statehood_date);}
