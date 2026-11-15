export const FACT_GROUPS={flag:'Flag',nickname:'Nickname',statehood:'U.S. statehood',population:'Population + rank',area:'Area + rank',bird:'Bird',flower:'Floral emblem',motto:'Motto',location:'Location map'};
export const DEFAULT_FACTS=['flag','nickname','statehood','population'];
export function factPreferences(value){return Array.isArray(value)&&value.length<=4&&value.every(k=>typeof k==='string'&&(k==='capital'||Object.hasOwn(FACT_GROUPS,k)))?[...new Set(value.filter(k=>k!=='capital'))]:[...DEFAULT_FACTS];}
export function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function formatStatehood(iso){return new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(iso+'T00:00:00Z'));}

export function placeDisplayName(name){return name.replace(/ city(?: and borough)?(?=$| \(balance\)$)/,'');}
