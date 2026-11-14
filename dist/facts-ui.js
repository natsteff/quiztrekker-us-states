import {facts} from './facts.js';
import {FACT_GROUPS,DEFAULT_FACTS,factPreferences,escapeHtml as esc,formatStatehood} from './facts-core.js';
const num=n=>n.toLocaleString('en-US');
export function createFactsUI({storage,onChange,renderMap}){
 let selected;try{selected=factPreferences(JSON.parse(storage.getItem('statequest.facts')));}catch{selected=[...DEFAULT_FACTS];}
 const $=id=>document.getElementById(id);
 function content(key,s){const f=facts[s.abbr];switch(key){
  case 'capital':return esc(s.capital);
  case 'flag':return `<img class="state-flag" src="assets/flags/${s.abbr}.svg" alt="Flag of ${esc(s.name)}">`;
  case 'nickname':return esc(f.nickname);
  case 'statehood':return `${esc(formatStatehood(f.statehood_date))}<small>State #${f.statehood_order}</small>`;
  case 'population':return `${num(f.population)}<small>#${f.population_rank} of 50 · July 1, 2025 estimate</small>`;
  case 'area':return `${num(f.area_sq_mi)} sq mi<small>#${f.area_rank} total area · land + water</small><small>Land: ${num(f.land_sq_mi)} · Water: ${num(f.water_sq_mi)} sq mi (2010)</small>`;
  case 'bird':return esc(f.bird);
  case 'flower':return esc(f.flower);
  case 'motto':return esc(f.motto);
  case 'location':return renderMap(s)+'<small>Alaska and Hawaii inset; Alaska reduced.</small>';
 }}
 function tile(key,s){return `<section class="fact-tile" data-fact="${key}"><h3>${FACT_GROUPS[key]}</h3><div class="fact-value">${content(key,s)}</div></section>`;}
 function primary(s){return `<div class="facts-grid">${selected.map(key=>tile(key,s)).join('')||'<p>Choose up to four favorite facts in My Progress → Card Facts.</p>'}</div><p class="fact-source">Population: Census 2025 · Area: Census 2010 · <a href="credits.html">Sources</a></p>`;}
 function more(s){const f=facts[s.abbr];$('moreTitle').textContent=`${s.name} — More Facts`;
 const placeNote=s.abbr==='HI'?'Hawaii CDPs · 2020–2024 ACS 5-year estimates (different period/method from 2025 estimates).':s.abbr==='RI'?'Rhode Island cities and towns · Census 2025 municipal estimates (SUMLEV 061).':'Census 2025 incorporated-place estimates · July 1, 2025. Includes legally consolidated city balances, not metropolitan areas.';
 $('moreContent').innerHTML=Object.keys(FACT_GROUPS).filter(key=>!selected.includes(key)).map(key=>tile(key,s)).join('')+`<section class="fact-tile"><h3>Largest cities and communities</h3><p class="fact-source">${esc(placeNote)}</p><ol class="city-list">${f.top_ten_places.map(p=>`<li><span>${esc(p.name)}</span><b>${num(p.population)}</b></li>`).join('')}</ol></section><section class="fact-tile"><h3>A landmark to discover</h3><ul>${f.landmarks.map(l=>`<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.name)}</a></li>`).join('')}</ul><small>Selected National Park Service site; links need a connection.</small></section><section class="fact-tile"><h3>Neighboring states</h3><p>${f.neighbors.length?f.neighbors.map(a=>esc(facts[a].name)).join(', '):'No neighboring U.S. states.'}</p><small>Shared border segments, including water; corner-only contact excluded.</small></section><a href="credits.html">Image/Data Credits &amp; methods</a>`;
 $('moreDialog').showModal();
 }
 function settings(){const controls=$('factChoices');controls.innerHTML=Object.entries(FACT_GROUPS).map(([key,label])=>`<label><input type="checkbox" value="${key}" ${selected.includes(key)?'checked':''} ${selected.length>=4&&!selected.includes(key)?'disabled':''}>${label}</label>`).join('');
 controls.querySelectorAll('input').forEach(input=>input.onchange=()=>{selected=[...controls.querySelectorAll('input:checked')].map(el=>el.value);store();settings();controls.querySelector(`input[value="${input.value}"]`).focus();onChange();});$('factCount').textContent=`${selected.length} of 4 selected. Uncheck one to choose another.`;}
 function store(){try{storage.setItem('statequest.facts',JSON.stringify(selected));$('factSaveStatus').textContent='Card choices saved on this device.';}catch{$('factSaveStatus').textContent='Choices work for this visit; browser storage is unavailable.';}}
 $('restoreFacts').onclick=()=>{selected=[...DEFAULT_FACTS];store();settings();onChange();};$('closeMore').onclick=()=>$('moreDialog').close();settings();
 return {primary,more};
}
