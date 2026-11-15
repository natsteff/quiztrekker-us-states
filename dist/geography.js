// Keep legacy progress/preferences keys intact; optional scope has its own setting.
export const GEOGRAPHY_KEY='statequest.geography.v1';
export const GEOGRAPHY_OPTIONS={usExtras:'Include U.S. Territories & Washington, D.C.',canadaProvinces:'Include Canadian Provinces',canadaTerritories:'Include Canadian Territories'};
export function geographyPreferences(raw){return Object.fromEntries(Object.keys(GEOGRAPHY_OPTIONS).map(k=>[k,raw?.[k]===true]));}
export function readGeography(storage){try{return geographyPreferences(JSON.parse(storage.getItem(GEOGRAPHY_KEY)));}catch{return geographyPreferences();}}
export function selectedLocations(base,extras,prefs){return [...base,...Object.keys(GEOGRAPHY_OPTIONS).flatMap(group=>prefs[group]===true?extras.filter(s=>s.group===group):[])];}
export function deckStorageKey(locations){return locations.length===50&&!locations.some(s=>s.group)?'statequest.decks.v1':'statequest.decks.v1:'+locations.map(s=>s.abbr).sort().join('-');}
export function mergeFacts(base,extra){
 const result=Object.fromEntries(Object.entries({...base,...extra}).map(([a,f])=>[a,{...f,neighbors:[...f.neighbors]}]));
 for(const [a,f] of Object.entries(extra))for(const b of f.neighbors)if(result[b]&&!result[b].neighbors.includes(a))result[b].neighbors.push(a);
 return result;
}
export function eligibleLocations(type,locations,facts){
 if(type==='timeline')return locations.filter(s=>facts[s.abbr]?.statehood_date);
 if(type==='population')return locations.filter(s=>Number.isFinite(facts[s.abbr]?.population));
 if(type==='area')return locations.filter(s=>Number.isFinite(facts[s.abbr]?.land_sq_mi)&&Number.isFinite(facts[s.abbr]?.area_sq_mi));
 return locations;
}
