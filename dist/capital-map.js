import {escapeHtml as esc} from './facts-core.js';
// Fit the outline and its surveyed point with one shared affine transform.
// Only the label moves for readability; the star always marks the source point.
export function capitalLayout(s,width,height,relative=false){
 const [x,y,w,h]=s.bounds,pad=12,side=760;
 const box=relative?[x+w/2-side/2,y+h/2-side/2,side,side]:[x,y,w,h];
 const scale=Math.min((width-pad*2)/box[2],(height-56)/box[3]);
 const tx=(width-box[2]*scale)/2-box[0]*scale,ty=12+(height-56-box[3]*scale)/2-box[1]*scale;
 return {scale,tx,ty,x:tx+s.capitalPoint.x*scale,y:ty+s.capitalPoint.y*scale,labelX:width/2,labelY:height-15};
}
export function capitalMap(s,compact=false){return `<span class="capital-map ${compact?'compact-capital':''}" data-capital="${s.abbr}"><svg role="img" aria-label="${esc(s.name)}; star marks ${esc(s.capital)}, the capital"></svg></span>`;}
let observer;
export function mountCapitalMaps(states,relative){
 observer?.disconnect();
 const draw=el=>{
  const s=states.find(s=>s.abbr===el.dataset.capital),svg=el.querySelector('svg');
  const {width,height}=el.getBoundingClientRect();if(!width||!height)return;
  const p=capitalLayout(s,width,height,relative);
  const star=Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,r=i%2?3.8:9;return `${p.x+r*Math.cos(a)},${p.y+r*Math.sin(a)}`;}).join(' ');
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  svg.innerHTML=`<path class="capital-outline" transform="translate(${p.tx} ${p.ty}) scale(${p.scale})" d="${s.path}"/><path class="capital-leader" d="M${p.x},${p.y} L${p.labelX},${p.labelY-18}"/><polygon class="capital-star" points="${star}" data-x="${s.capitalPoint.x}" data-y="${s.capitalPoint.y}"/><text class="capital-name" x="${p.labelX}" y="${p.labelY}" text-anchor="middle">${esc(s.capital)}</text>`;
 };
 observer=new ResizeObserver(entries=>entries.forEach(e=>draw(e.target)));
 document.querySelectorAll('[data-capital]').forEach(el=>{draw(el);observer.observe(el);});
}
