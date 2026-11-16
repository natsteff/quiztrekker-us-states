export function toggleMastery(progress,abbr){progress.mastered||=[];progress.masteryFailures||={};const has=progress.mastered.includes(abbr);progress.mastered=has?progress.mastered.filter(a=>a!==abbr):[...progress.mastered,abbr];delete progress.masteryFailures[abbr];return !has;}
export function masteryMisses(progress,ids){progress.masteryFailures||={};const review=[];for(const a of new Set(ids)){if(!progress.mastered?.includes(a))continue;const count=(progress.masteryFailures[a]||0)+1;progress.masteryFailures[a]=count;if(count%3===0)review.push(a);}return review;}
export function toggleOrder(order,abbr){return order.includes(abbr)?order.filter(a=>a!==abbr):[...order,abbr];}
export function failedLocations(type,correct,current,mini,order,facts){
 if(correct)return [];
 if(type==='timeline')return mini.options.filter(a=>{const i=order.indexOf(a);return i<0||order.some((b,j)=>(j<i&&facts[b].statehood_date>facts[a].statehood_date)||(j>i&&facts[b].statehood_date<facts[a].statehood_date));});
 return ['population','area'].includes(type)?mini.pair:[current.abbr];
}
