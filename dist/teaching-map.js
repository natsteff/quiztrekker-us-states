import {contextGeometry} from './context-geometry.js';
import {escapeHtml as esc} from './facts-core.js';
export function teachingMap({locations,target,neighbors=[],chosen=[],mode='reveal',eligible=[],all=false}){
 const cross=[target,...neighbors,...chosen].some(a=>locations.find(s=>s.abbr===a)?.group);
 const geometry=cross?contextGeometry:locations.filter(s=>!s.group);
 const relevant=geometry.filter(s=>[target,...neighbors,...chosen].includes(s.abbr));
 let box='0 0 975 610';
 if(mode!=='quest'&&relevant.length){const x=Math.min(...relevant.map(s=>s.bounds[0])),y=Math.min(...relevant.map(s=>s.bounds[1])),r=Math.max(...relevant.map(s=>s.bounds[0]+s.bounds[2])),b=Math.max(...relevant.map(s=>s.bounds[1]+s.bounds[3]));const pad=Math.max(r-x,b-y)*.12+3;box=`${x-pad} ${y-pad} ${r-x+2*pad} ${b-y+2*pad}`;}
 const status=a=>a===target?'target':neighbors.includes(a)?(all&&eligible.includes(a)&&!chosen.includes(a)?'missed':chosen.includes(a)?'correct':'neighbor'):chosen.includes(a)?'wrong':'background';
 return `<svg class="teaching-map" viewBox="${box}" role="group" aria-label="${mode==='quest'?'Choose a state on the U.S. map':`Map of ${esc(locations.find(s=>s.abbr===target)?.name||target)} and surrounding locations`}">${geometry.map(s=>{const name=locations.find(l=>l.abbr===s.abbr)?.name||s.abbr,active=mode==='quest'&&eligible.includes(s.abbr);return `<path d="${s.path}" fill-rule="evenodd" class="map-region ${mode==='quest'?'background':status(s.abbr)}" ${active?`data-map-answer="${s.abbr}" role="button" tabindex="0" aria-label="${esc(name)}"`:''}><title>${esc(name)}</title></path>`;}).join('')}${mode==='quest'?'':relevant.map(s=>{const [x,y,w,h]=s.bounds;return `<text x="${x+w/2}" y="${y+h/2}" class="region-label" style="font-size:${Number(box.split(' ')[2])/32}px">${s.abbr}</text>`;}).join('')}</svg>`;
}
