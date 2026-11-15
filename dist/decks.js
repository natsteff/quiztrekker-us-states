const DECK_KEY='statequest.decks.v1';
export function createDecks(states,storage,random=Math.random,storageKey=DECK_KEY){
 const ids=states.map(s=>s.abbr),valid=new Set(ids);let decks={};
 try{const raw=JSON.parse(storage.getItem(storageKey));for(const key of ['shape','neighbors']){const d=raw?.[key];if(d&&Array.isArray(d.order)&&d.order.length===ids.length&&new Set(d.order).size===ids.length&&d.order.every(a=>valid.has(a))&&Number.isInteger(d.cursor)&&d.cursor>=0&&d.cursor<=ids.length)decks[key]={order:[...d.order],cursor:d.cursor,round:Number.isSafeInteger(d.round)&&d.round>0?d.round:1};}}catch{}
 function persist(){try{storage.setItem(storageKey,JSON.stringify(decks));}catch{}}
 function ensure(key){if(!['shape','neighbors'].includes(key))throw Error('Unknown deck');let d=decks[key];if(!d||d.cursor===ids.length){const previous=d?.order.at(-1),order=[...ids];for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}if(order[0]===previous)[order[0],order[1]]=[order[1],order[0]];d=decks[key]={order,cursor:0,round:d?d.round+1:1};persist();}return d;}
 return {
  current(key){const d=ensure(key);return d.order[d.cursor];},
  position(key){const d=ensure(key);return {number:d.cursor+1,total:ids.length,round:d.round};},
  complete(key,abbr){const d=decks[key];if(!d||d.cursor>=ids.length||d.order[d.cursor]!==abbr)return false;d.cursor++;persist();return true;}
 };
}
