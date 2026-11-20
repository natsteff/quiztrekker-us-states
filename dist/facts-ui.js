import {comparePopulation} from './result-rules.js';
import {facts as baseFacts} from './facts.js';
import {FACT_GROUPS,DEFAULT_FACTS,factPreferences,escapeHtml as esc,formatStatehood,placeDisplayName} from './facts-core.js';
const num=n=>n.toLocaleString('en-US');
export function createFactsUI({storage,onChange,renderMap,facts=baseFacts,locations=[]}){
 let selected;try{selected=factPreferences(JSON.parse(storage.getItem('statequest.facts')));}catch{selected=[...DEFAULT_FACTS];}
 const $=id=>document.getElementById(id);
 function content(key,s){const f=facts[s.abbr];switch(key){
  case 'flag':return `<img class="state-flag" src="${f.flag||`assets/flags/${s.abbr}.svg`}" alt="Flag of ${esc(s.name)}">`;
  case 'capital':return esc(s.capital||s.capital_note||'No common capital');
  case 'cities':return f.top_ten_places?.map(p=>`${esc(placeDisplayName(p.name))}: ${num(p.population)}`).join('<br>')||'';
  case 'landmarks':return f.landmarks?.map(l=>esc(l.name)).join('<br>')||'';
  case 'neighbors':return f.neighbors.map(a=>esc(facts[a]?.name||a)).join(', ')||'No supported neighbors';
  case 'nickname':return esc(f.nickname);
  case 'statehood':return `${esc(formatStatehood(f.statehood_date))}<strong class="fact-rank">State #${f.statehood_order}</strong>`;
  case 'population':return Number.isFinite(f.population)?`${num(f.population)}${f.population_rank?`<strong class="fact-rank">#${f.population_rank} of 50 U.S. states</strong><small>July 1, 2025 estimate</small>`:`<small>${esc(f.population_label+' · '+f.population_as_of)}</small>`}`:esc(f.population_note||'No comparable population total.');
  case 'area':return `${num(f.area_sq_mi)} sq mi${f.area_rank?`<strong class="fact-rank">#${f.area_rank} of 50 U.S. states</strong>`:`<small>${esc(f.area_label)}</small>`}<small>Land: ${num(f.land_sq_mi)} sq mi</small><small>Water: ${Number.isFinite(f.water_sq_mi)?num(f.water_sq_mi)+' sq mi':'not reported'}${s.group?'':' (2010)'}</small>`;
  case 'bird':return esc(f.bird);
  case 'flower':return esc(f.flower);
  case 'motto':return esc(f.motto);
  case 'highest':return `${esc(f.highest_point.name)}<small>About ${num(f.highest_point.elevation_ft)} ft · ${num(f.highest_point.elevation_m)} m above sea level</small>`;
 }}
 function tile(key,s){return `<section class="fact-tile" data-fact="${key}" role="button" tabindex="0" aria-label="Compare ${esc(FACT_GROUPS[key])} across locations"><h3>${s.group&&key==='population'?'Population':s.group&&key==='area'?'Area':FACT_GROUPS[key]}</h3><div class="fact-value">${content(key,s)}</div></section>`;}
 function applicable(key,s){const f=facts[s.abbr];return key==='flag'||key==='highest'&&!!f.highest_point||key==='population'||key==='area'&&Number.isFinite(f.area_sq_mi)||key==='statehood'&&!!f.statehood_date||['nickname','bird','flower','motto'].includes(key)&&!!f[key];}
 function source(s){const f=facts[s.abbr];return `<p class="fact-source">${s.group?esc([f.population_label,f.area_label].filter(Boolean).join(' · ')||'See Image/Data Credits for sources.'):'Population: Census 2025 · Area: Census 2010'} · <a href="credits.html">Sources</a></p>`;}
 function primary(s){return `<div class="facts-grid">${selected.filter(key=>applicable(key,s)).map(key=>tile(key,s)).join('')||(selected.length?'<p>Your selected facts do not apply here. More Facts has the available details.</p>':'<p>Choose up to four favorite facts in Options → Card Facts.</p>')}</div>${source(s)}`;}
 function more(s){const f=facts[s.abbr];$('moreTitle').textContent=`${s.name} — More Facts`;
 const placeNote=s.abbr==='HI'?'Hawaii CDPs · 2020–2024 ACS 5-year estimates (different period/method from 2025 estimates).':s.abbr==='RI'?'Rhode Island cities and towns · Census 2025 municipal estimates (SUMLEV 061).':'Census 2025 incorporated-place estimates · July 1, 2025. Includes legally consolidated city balances, not metropolitan areas.';
 $('moreContent').innerHTML=Object.keys(FACT_GROUPS).filter(key=>!selected.includes(key)&&applicable(key,s)).map(key=>tile(key,s)).join('')+`${f.top_ten_places?`<section class="fact-tile" data-fact="cities" role="button" tabindex="0"><h3>Largest cities and communities</h3><p class="fact-source">${esc(placeNote)}</p><ol class="city-list">${f.top_ten_places.map(p=>`<li><span>${esc(placeDisplayName(p.name))}</span><b>${num(p.population)}</b></li>`).join('')}</ol></section>`:''}${f.landmarks?`<section class="fact-tile" data-fact="landmarks" role="button" tabindex="0"><h3>A landmark to discover</h3><ul>${f.landmarks.map(l=>`<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.name)}</a></li>`).join('')}</ul><small>Selected National Park Service site; links need a connection.</small></section>`:''}${s.group?`<section class="fact-tile"><h3>About this location</h3><p>${esc(s.kind)} · ${s.abbr}</p>${s.capital_note?`<p>${esc(s.capital_note)}</p>`:''}${f.description?`<p>${esc(f.description)}</p>`:''}${s.shape_note?`<p>${esc(s.shape_note)}</p>`:''}${s.inset_names?`<ul>${s.inset_names.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:''}<p>${(f.sources||[]).map((u,i)=>`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">Source ${i+1}</a>`).join(' · ')}</p></section>`:''}<section class="fact-tile" data-fact="neighbors" role="button" tabindex="0"><h3>Neighboring locations</h3><p>${f.neighbors.length?f.neighbors.map(a=>esc(facts[a].name)).join(', '):'No shared land or river borders with the supported locations.'}</p><small>Shared land and river borders only; lake-only, ocean-only and corner-only contacts excluded. Quiz answers use enabled locations only.</small></section><a href="credits.html">Image/Data Credits &amp; methods</a>`;
 $('moreDialog').showModal();
 }
 function settings(){const controls=$('factChoices');controls.innerHTML=Object.entries(FACT_GROUPS).map(([key,label])=>`<label><input type="checkbox" value="${key}" ${selected.includes(key)?'checked':''} ${selected.length>=4&&!selected.includes(key)?'disabled':''}>${label}</label>`).join('');
 controls.querySelectorAll('input').forEach(input=>input.onchange=()=>{selected=[...controls.querySelectorAll('input:checked')].map(el=>el.value);store();settings();controls.querySelector(`input[value="${input.value}"]`).focus();onChange();});$('factCount').textContent=`${selected.length} of 4 selected. Uncheck one to choose another.`;}
 function store(){try{storage.setItem('statequest.facts',JSON.stringify(selected));$('factSaveStatus').textContent='Card choices saved on this device.';}catch{$('factSaveStatus').textContent='Choices work for this visit; browser storage is unavailable.';}}
 $('restoreFacts').onclick=()=>{selected=[...DEFAULT_FACTS];store();settings();onChange();};$('closeMore').onclick=()=>$('moreDialog').close();settings();
 let comparing;
 const labels={...FACT_GROUPS,flag:'Flag',capital:'Capital',cities:'Largest cities and communities',landmarks:'Landmarks',neighbors:'Neighbors'};
 const numeric={population:f=>f.population,area:f=>f.area_sq_mi,statehood:f=>f.statehood_order,highest:f=>f.highest_point?.elevation_ft};
 function compare(key){comparing=key;$('compareTitle').textContent=`${labels[key]} — all locations`;$('compareOrder').value=numeric[key]?'rank':'alpha';$('compareOrder').querySelector('[value="rank"]').disabled=!numeric[key];drawComparison();$('compareDialog').showModal();}
 function drawComparison(){const key=comparing;let pool=locations.filter(s=>(!numeric[key]||Number.isFinite(numeric[key](facts[s.abbr])))&&(['capital','neighbors','flag'].includes(key)||key==='cities'?key!=='cities'||!!facts[s.abbr].top_ten_places:key==='landmarks'?!!facts[s.abbr].landmarks:applicable(key,s)));
 pool.sort((a,b)=>{if($('compareOrder').value==='alpha')return a.name.localeCompare(b.name);const fa=facts[a.abbr],fb=facts[b.abbr];if(key==='population')return comparePopulation(a,b,facts);return (key==='statehood'?1:-1)*(numeric[key](fa)-numeric[key](fb))||a.name.localeCompare(b.name);});
 $('compareContent').innerHTML=pool.map(s=>`<section class="fact-tile"><h3>${esc(s.name)}</h3><div class="fact-value">${content(key,s)}</div></section>`).join('');}
 $('compareOrder').onchange=drawComparison;$('closeCompare').onclick=()=>$('compareDialog').close();
 document.addEventListener('click',e=>{if(e.target.closest('#compareDialog,a'))return;const ref=e.target.closest('[data-compare]');if(ref){compare(ref.dataset.compare);return;}const tile=e.target.closest('[data-fact]');if(tile){compare(tile.dataset.fact);return;}if(e.target.closest('.back-card .state-flag')){compare('flag');return;}if(e.target.closest('.back-card .capital-map'))compare('capital');});
 document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-fact],[data-compare]')){e.preventDefault();compare(e.target.dataset.fact||e.target.dataset.compare);}});
 return {primary,more,flag:s=>`<span data-compare="flag" role="button" tabindex="0" aria-label="Compare flags">${content('flag',s)}</span>`};
}
