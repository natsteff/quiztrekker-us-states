export function capitalLocations(locations){return locations.filter(s=>typeof s.capital==='string'&&s.capital.trim());}
export function makeCapitalQuestion(locations,target,random=Math.random){
 const pool=capitalLocations(locations),current=pool.find(s=>s.abbr===target);if(!current)throw Error('Capital target unavailable');
 const names=new Set([current.capital.toLocaleLowerCase('en-US')]),other=[];
 const shuffled=[...pool];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
 for(const s of shuffled){const name=s.capital.toLocaleLowerCase('en-US');if(!names.has(name)){names.add(name);other.push(s);if(other.length===3)break;}}
 const options=[current,...other];for(let i=options.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[options[i],options[j]]=[options[j],options[i]];}
 return {target:current.abbr,correct:current.abbr,options:options.map(s=>s.abbr),labels:Object.fromEntries(options.map(s=>[s.abbr,s.capital])),prompt:`What is the capital of ${current.name}?`,explanation:`${current.capital} is the capital of ${current.name}.`,note:'Choose the capital city. Each eligible location appears once before reshuffling.'};
}
