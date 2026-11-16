export const KEY = 'statequest.v1';
const integer = n => Number.isSafeInteger(n) && n >= 0;
export function clean(raw) {
  const result = {seen:[], records:{}, best:0, streak:0, bestStreak:0,mastered:[],masteryFailures:{}};
  if (!raw || typeof raw !== 'object') return result;
  result.seen = [...new Set(Array.isArray(raw.seen) ? raw.seen.filter(x=>/^[A-Z]{2}$/.test(x)) : [])];
  for (const key of ['best','streak','bestStreak']) if(integer(raw[key])) result[key]=raw[key];
  if(raw.records && typeof raw.records === 'object') for(const [key,value] of Object.entries(raw.records)) {
    if(/^[A-Z]{2}$/.test(key) && value && integer(value.correct) && integer(value.missed)) result.records[key]={correct:value.correct,missed:value.missed};
  }
  result.masteryDisplay=raw?.masteryDisplay===true;
  result.mastered=[...new Set(Array.isArray(raw?.mastered)?raw.mastered.filter(a=>/^[A-Z]{2}$/.test(a)):[])];
  result.masteryFailures={};for(const [a,n] of Object.entries(raw?.masteryFailures||{}))if(result.mastered.includes(a)&&integer(n))result.masteryFailures[a]=n;
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
  return clean(p);
}
