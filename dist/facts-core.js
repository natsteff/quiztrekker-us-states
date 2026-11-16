export const FACT_GROUPS={nickname:'Nickname',statehood:'U.S. statehood',population:'Population + rank',area:'Area + rank',bird:'Bird',flower:'Floral emblem',motto:'Motto',highest:'Highest point'};
export const DEFAULT_FACTS=['statehood','nickname','population','area'];
export function factPreferences(value){
 if(!Array.isArray(value)||value.length>5||!value.every(k=>typeof k==='string'&&(k==='capital'||k==='flag'||k==='location'||Object.hasOwn(FACT_GROUPS,k))))return [...DEFAULT_FACTS];
 const selected=[...new Set(value.filter(k=>k!=='capital'&&k!=='flag').map(k=>k==='location'?'highest':k))];
 if(value.includes('flag')&&!selected.includes('area'))selected.push('area');
 return selected.length<=4?selected:[...DEFAULT_FACTS];
}
export function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function formatStatehood(iso){return new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(iso+'T00:00:00Z'));}

export function placeDisplayName(name){return name.replace(/ city(?: and borough)?(?=$| \(balance\)$)/,'');}
