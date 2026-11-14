export const FACT_GROUPS={capital:'Capital',flag:'State flag',nickname:'Nickname',statehood:'Statehood',population:'Population + rank',area:'Area + rank',bird:'State bird',flower:'State flower',motto:'State motto',location:'Location map'};
export const DEFAULT_FACTS=['capital','flag','nickname','statehood'];
export function factPreferences(value){return Array.isArray(value)&&value.length<=4&&value.every(k=>typeof k==='string'&&Object.hasOwn(FACT_GROUPS,k))?[...new Set(value)]:[...DEFAULT_FACTS];}
export function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function formatStatehood(iso){return new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(iso+'T00:00:00Z'));}
