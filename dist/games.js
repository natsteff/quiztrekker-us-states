export const GAME_NAMES={shape:'Shape Challenge',population:'Population Showdown',area:'Size Showdown',neighbors:'Neighboring States'};
function pick(a,r){return a[Math.min(a.length-1,Math.floor(r()*a.length))];}
function shuffled(a,r){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
export function makeQuestion(type,states,facts,previous,random=Math.random){
 const target=pick(states.filter(s=>s.abbr!==previous),random),f=facts[target.abbr];
 if(type==='neighbors'){
  const neighbors=f.neighbors;
  const other=states.filter(s=>s.abbr!==target.abbr&&!neighbors.includes(s.abbr));
  const correct=neighbors.length?pick(neighbors,random):'NONE';
  const options=shuffled([correct,...shuffled(other,random).slice(0,3).map(s=>s.abbr)],random);
  return {type,target:target.abbr,correct,options,prompt:`Which state borders ${target.name}?`,note:'Shared borders include water. Touching only at a corner does not count.',explanation:neighbors.length?`${target.name} borders ${neighbors.map(a=>facts[a].name).join(', ')}.`:`${target.name} has no neighboring U.S. states.`};
 }
 if(!['population','area'].includes(type))throw Error('Unsupported game');
 const key=type==='population'?'population':'area_sq_mi';
 const other=pick(states.filter(s=>s.abbr!==target.abbr&&facts[s.abbr][key]!==f[key]),random);
 const pair=shuffled([target.abbr,other.abbr],random);
 const correct=f[key]>facts[other.abbr][key]?target.abbr:other.abbr;
 const unit=type==='population'?'people':'sq mi';
 return {type,target:target.abbr,correct,options:pair,pair,prompt:type==='population'?'Which state has more people?':'Which state is larger by total area?',note:type==='population'?'Census population estimates · July 1, 2025':'Census 2010 total area · land + water',explanation:pair.map(a=>`${facts[a].name}: ${facts[a][key].toLocaleString('en-US')} ${unit}`).join(' · ')};
}
