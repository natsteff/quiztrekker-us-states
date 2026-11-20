export const KEY = 'statequest.v1';
const integer = n => Number.isSafeInteger(n) && n >= 0;
export function clean(raw) {
  const result = {seen:[], records:{}, best:0, streak:0, bestStreak:0,mastered:[],masteryFailures:{},gameStats:{},sprintStats:[],sprintMigrated:false,lifetimePoints:0,legacyPoints:0,sprintTotals:{quiz:{points:0,bestScore:0},challenge:{points:0,bestScore:0}}};
  if (!raw || typeof raw !== 'object') return result;
  result.seen = [...new Set(Array.isArray(raw.seen) ? raw.seen.filter(x=>/^[A-Z]{2}$/.test(x)) : [])];
  for (const key of ['best','streak','bestStreak']) if(integer(raw[key])) result[key]=raw[key];
  if(raw.records && typeof raw.records === 'object') for(const [key,value] of Object.entries(raw.records)) {
    if(/^[A-Z]{2}$/.test(key) && value && integer(value.correct) && integer(value.missed)) result.records[key]={correct:value.correct,missed:value.missed};
  }
  result.masteryDisplay=raw?.masteryDisplay===true;
  result.mastered=[...new Set(Array.isArray(raw?.mastered)?raw.mastered.filter(a=>/^[A-Z]{2}$/.test(a)):[])];
  result.masteryFailures={};for(const [a,n] of Object.entries(raw?.masteryFailures||{}))if(result.mastered.includes(a)&&integer(n))result.masteryFailures[a]=n;
  result.sprintMigrated=raw.sprintMigrated===true;result.gameStats=cleanGameStats(raw.gameStats);result.sprintStats=cleanSprintStats(raw.sprintStats);
  for(const mode of ['quiz','challenge']){const old=result.sprintStats.filter(s=>s.mode===mode),recovered=cleanSprintStats(raw.sprintStats,true).filter(s=>s.mode===mode).reduce((sum,s)=>sum+Math.max(s.bestPoints,(s.history||[]).reduce((n,r)=>n+r.points,0)),0),saved=raw.sprintTotals?.[mode];result.sprintTotals[mode]={points:integer(saved?.points)?saved.points:recovered,bestScore:Math.max(integer(saved?.bestScore)?saved.bestScore:0,...old.map(s=>s.bestPoints))};}
  const gamePoints=Object.values(result.gameStats).reduce((n,g)=>n+g.points,0);result.legacyPoints=integer(raw.legacyPoints)?raw.legacyPoints:Math.max(0,result.best-gamePoints);result.lifetimePoints=Math.max(integer(raw.lifetimePoints)?raw.lifetimePoints:0,gamePoints+result.legacyPoints+result.sprintTotals.quiz.points+result.sprintTotals.challenge.points);
  return result;
}
export function load(storage) {try {return clean(JSON.parse(storage.getItem(KEY)));} catch {return clean();}}
export function save(storage, progress) {try {storage.setItem(KEY,JSON.stringify(progress));return true;} catch {return false;}}
export function matches(state, input) { return state.abbr === input.trim().toUpperCase(); }
export function weight(progress, state) { const r=progress.records[state.abbr]; return 1 + (r ? Math.min(6, Math.max(0,r.missed*2-r.correct)) : 0); }
export function choose(states, progress, previous, random=Math.random) {
  const pool=states.filter(s=>s.abbr!==previous);
  let value=random()*pool.reduce((sum,s)=>sum+weight(progress,s),0);
  return pool.find(s=>(value-=weight(progress,s))<0) || pool.at(-1);
}
export function record(progress, state, correct, score, trackState=true) {
  if(trackState){const r=progress.records[state.abbr] ||= {correct:0,missed:0};r[correct?'correct':'missed']++;}
  progress.streak=correct?progress.streak+1:0;
  progress.bestStreak=Math.max(progress.bestStreak,progress.streak);
  const points=correct?100+Math.min(100,(progress.streak-1)*10):0;
  progress.best=Math.max(progress.best,score+points);
  return points;
}

export function exportProgress(progress) {
  return JSON.stringify({app:'QuizTrekker - US States',version:1,progress:clean(progress)},null,2);
}
export function importProgress(text, states) {
  if (text.length>100000) throw Error('Save is too large. Choose a QuizTrekker - US States JSON export.');
  let data;try {data=JSON.parse(text);} catch {throw Error('This file is not valid JSON.');}
  if(!['QuizTrekker - US States','StateQuest'].includes(data?.app) || data.version!==1 || !data.progress || typeof data.progress!=='object') throw Error('Choose a supported QuizTrekker - US States or StateQuest save (version 1).');
  const p=data.progress, valid=new Set(states.map(s=>s.abbr));
  if(!Array.isArray(p.seen) || p.seen.some(a=>!valid.has(a)) || !p.records || Array.isArray(p.records) || typeof p.records!=='object' || ['best','streak','bestStreak'].some(k=>!integer(p[k])) || p.streak>p.bestStreak) throw Error('Save contains invalid progress.');
  for(const [key,r] of Object.entries(p.records)) if(!valid.has(key) || !r || !integer(r.correct) || !integer(r.missed)) throw Error('Save contains invalid state records.');
  if(p.mastered!==undefined&&(!Array.isArray(p.mastered)||p.mastered.some(a=>!valid.has(a))))throw Error('Save contains invalid mastery records.');
  if(p.masteryFailures!==undefined&&(!p.masteryFailures||typeof p.masteryFailures!=='object'||Array.isArray(p.masteryFailures)||Object.entries(p.masteryFailures).some(([a,n])=>!valid.has(a)||!integer(n)||!p.mastered?.includes(a))))throw Error('Save contains invalid mastery failures.');
  for(const [key,cleaner] of [['gameStats',cleanGameStats],['sprintStats',cleanSprintStats]])if(p[key]!==undefined&&JSON.stringify(canonical(p[key]))!==JSON.stringify(canonical(cleaner(p[key],true))))throw Error('Save contains invalid game results.');
  if((p.sprintStats||[]).some(s=>s.pool.some(a=>!valid.has(a))))throw Error('Save contains unknown Sprint locations.');
  for(const key of ['lifetimePoints','legacyPoints'])if(p[key]!==undefined&&!integer(p[key]))throw Error('Save contains invalid points.');
  if(p.sprintTotals!==undefined&&(!p.sprintTotals||['quiz','challenge'].some(k=>!p.sprintTotals[k]||!integer(p.sprintTotals[k].points)||!integer(p.sprintTotals[k].bestScore))))throw Error('Save contains invalid Sprint totals.');
  const restored=clean(p);restored.sprintMigrated=true;return restored;
}

const GAME_KEYS=['shape-choice','shape-typed','mapquest','population','area','timeline','neighbors-one','neighbors-all'];
const validPool=p=>Array.isArray(p)&&p.length>0&&p.length<=70&&new Set(p).size===p.length&&p.every(a=>/^[A-Z]{2}$/.test(a));
const stamp=n=>integer(n)&&n>0&&n<=8640000000000000;
export function cleanGameStats(raw,keepHistory=false){
 const out={};for(const key of GAME_KEYS){const g=raw?.[key];if(!g||g.bestScore!==undefined&&(!integer(g.bestScore)||g.bestScore>g.points)||!['answered','correct','streak','bestStreak','points'].every(k=>integer(g[k]))||g.correct>g.answered||g.streak>g.bestStreak||g.bestStreak>g.correct)continue;
 out[key]={answered:g.answered,correct:g.correct,streak:g.streak,bestStreak:g.bestStreak,points:g.points,...(g.bestScore!==undefined||!keepHistory?{bestScore:integer(g.bestScore)?g.bestScore:0}:{}),...(keepHistory&&g.history!==undefined?{history:(Array.isArray(g.history)?g.history:[]).filter(r=>r&&stamp(r.date)&&typeof r.correct==='boolean'&&integer(r.points)).slice(0,10).map(r=>({date:r.date,correct:r.correct,points:r.points,label:typeof r.label==='string'?r.label.slice(0,200):''}))}: {})};}return out;
}
export function cleanSprintStats(raw,keepHistory=false){
 if(!Array.isArray(raw))return [];const seen=new Set();return raw.filter(s=>{
 if(!s||!['quiz','challenge'].includes(s.mode)||!validPool(s.pool)||!['runs','bestCorrect','bestPoints','bestStreak'].every(k=>integer(s[k]))||![s.fastestMs,s.perfectMs].every(n=>n===null||integer(n)&&n<=120000))return false;
 if(s.bestStreak>s.bestCorrect||s.mode==='quiz'&&(s.fastestMs!==null||s.perfectMs!==null)||s.perfectMs!==null&&(s.fastestMs===null||s.perfectMs<s.fastestMs))return false;
 if(s.mode==='challenge'&&(s.pool.length!==50||s.bestCorrect>50))return false;const key=s.mode+':'+[...s.pool].sort().join('-');if(seen.has(key))return false;seen.add(key);return true;
 }).slice(0,12).map(s=>({mode:s.mode,pool:[...s.pool].sort(),runs:s.runs,bestCorrect:s.bestCorrect,bestPoints:s.bestPoints,bestStreak:s.bestStreak,fastestMs:s.fastestMs,perfectMs:s.perfectMs,...(keepHistory&&s.history!==undefined?{history:(Array.isArray(s.history)?s.history:[]).filter(r=>r&&stamp(r.date)&&['correct','attempted','points','longest','elapsedMs'].every(k=>integer(r[k]))&&r.correct<=r.attempted&&r.longest<=r.correct&&r.points<=r.attempted*200&&(s.mode!=='challenge'||r.attempted<=50)&&r.elapsedMs<=(s.mode==='quiz'?60000:120000)&&typeof r.completed==='boolean'&&(!r.completed||s.mode==='challenge'&&r.attempted===s.pool.length)).slice(0,20).map(r=>({date:r.date,correct:r.correct,attempted:r.attempted,points:r.points,longest:r.longest,elapsedMs:r.elapsedMs,completed:r.completed}))}:{})}));
}
export function awardPoints(progress,points){progress.lifetimePoints=(progress.lifetimePoints||0)+points;}
export function trackSprintAnswer(progress,mode,points){progress.sprintTotals||={quiz:{points:0,bestScore:0},challenge:{points:0,bestScore:0}};progress.sprintTotals[mode].points+=points;awardPoints(progress,points);}
export function trackGame(progress,key,correct,points,date=Date.now(),label='',runScore=points){
 if(!GAME_KEYS.includes(key))return;progress.gameStats||={};const g=progress.gameStats[key]||={answered:0,correct:0,streak:0,bestStreak:0,points:0,bestScore:0};g.answered++;g.correct+=Number(correct);g.streak=correct?g.streak+1:0;g.bestStreak=Math.max(g.bestStreak,g.streak);g.points+=points;g.bestScore=Math.max(g.bestScore||0,runScore);awardPoints(progress,points);
}
export function sprintStatsFor(progress,mode,pool,create=false){
 progress.sprintStats||=[];const ids=[...pool].sort(),key=ids.join('-');let s=progress.sprintStats.find(s=>s.mode===mode&&s.pool.join('-')===key);if(!s&&create){s={mode,pool:ids,runs:0,bestCorrect:0,bestPoints:0,bestStreak:0,fastestMs:null,perfectMs:null};progress.sprintStats.unshift(s);progress.sprintStats=progress.sprintStats.slice(0,12);}return s;
}
export function trackSprint(progress,mode,pool,result,date=Date.now()){
 const s=sprintStatsFor(progress,mode,pool,true);progress.sprintTotals||={quiz:{points:0,bestScore:0},challenge:{points:0,bestScore:0}};progress.sprintTotals[mode].bestScore=Math.max(progress.sprintTotals[mode].bestScore,result.points);s.runs++;s.bestCorrect=Math.max(s.bestCorrect,result.correct);s.bestPoints=Math.max(s.bestPoints,result.points);s.bestStreak=Math.max(s.bestStreak,result.longest);const elapsedMs=Math.round(result.elapsedMs);if(mode==='challenge'&&result.completed){s.fastestMs=s.fastestMs===null?elapsedMs:Math.min(s.fastestMs,elapsedMs);if(result.correct===pool.length)s.perfectMs=s.perfectMs===null?elapsedMs:Math.min(s.perfectMs,elapsedMs);}
 // Keep recently played pools, including their all-time summaries, ahead of old pools.
 progress.sprintStats=[s,...progress.sprintStats.filter(t=>t!==s)].slice(0,12);return s;
}
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
