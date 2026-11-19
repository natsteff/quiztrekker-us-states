// Result presentation never changes whole-round scoring or mastery attribution.
export function timelinePrefix(order,options,facts){
 const dates=options.map(a=>facts[a].statehood_date).sort();let prefix=0,broken=false;
 const statuses=order.map((a,i)=>{if(broken)return 'neutral';if(facts[a]?.statehood_date===dates[i]){prefix++;return 'correct';}broken=true;return 'wrong';});
 return {prefix,statuses};
}
export function neighborResult(abbr,expected,selected){
 return expected.includes(abbr)?selected.includes(abbr)?'correct':'missed':selected.includes(abbr)?'wrong':'neutral';
}
export function comparePopulation(a,b,facts){return facts[b.abbr].population-facts[a.abbr].population||a.name.localeCompare(b.name);}

export function neighborLegend(all){return `🟨 Target · 🟩 Correct selection · 🟥 Incorrect selection · 🟦 ${all?'Missed neighbor (other neighbors for reference)':'Other neighbors for reference'}`;}
