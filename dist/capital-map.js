import {escapeHtml as esc} from './facts-core.js';
// Fit the outline and its sourced point with one shared affine transform.
// Only the label moves for readability; the star always marks the source point.
export function capitalLayout(s,width,height,relative=false){
 const [x,y,w,h]=s.bounds,pad=12,side=760;
 const box=relative&&!s.group?[x+w/2-side/2,y+h/2-side/2,side,side]:[x,y,w,h];
 const scale=Math.min((width-pad*2)/box[2],(height-56)/box[3]);
 const tx=(width-box[2]*scale)/2-box[0]*scale,ty=12+(height-56-box[3]*scale)/2-box[1]*scale;
 return {scale,tx,ty,x:s.capitalPoint?tx+s.capitalPoint.x*scale:null,y:s.capitalPoint?ty+s.capitalPoint.y*scale:null,labelX:width/2,labelY:height-15};
}
export function capitalMap(s,compact=false){return `<span class="capital-map ${compact?'compact-capital':''}" data-capital="${s.abbr}"><svg role="img" aria-label="${esc(s.name)}; ${s.capitalPoint?`star marks ${esc(s.capital)}, the capital`:esc(s.capital_note||s.capital||(s.abbr==='DC'?'U.S. national capital':'No common capital'))}"></svg></span>`;}
let observer;
export function mountCapitalMaps(states,relative){
 observer?.disconnect();
 const draw=el=>{
  const s=states.find(s=>s.abbr===el.dataset.capital),svg=el.querySelector('svg');
  const {width,height}=el.getBoundingClientRect();if(!width||!height)return;
  const p=capitalLayout(s,width,height,relative);
  const star=s.capitalPoint?Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,r=i%2?3.8:9;return `${p.x+r*Math.cos(a)},${p.y+r*Math.sin(a)}`;}).join(' '):'';
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  svg.innerHTML=`<path class="capital-outline" fill-rule="evenodd" transform="translate(${p.tx} ${p.ty}) scale(${p.scale})" d="${s.path}"/>${s.capitalPoint?`<path class="capital-leader" d="M${p.x},${p.y} L${p.labelX},${p.labelY-18}"/><polygon class="capital-star" points="${star}" data-x="${s.capitalPoint.x}" data-y="${s.capitalPoint.y}"/>`:''}<text class="capital-name" x="${p.labelX}" y="${p.labelY}" text-anchor="middle">${esc(s.capital||(s.abbr==='DC'?'U.S. national capital':'No common capital'))}</text>${s.shape_note?`<text class="capital-inset-note" x="${p.labelX}" y="${height-1}" text-anchor="middle">9 groups · Insets not to scale or position</text>`:''}`;
 };
 observer=new ResizeObserver(entries=>entries.forEach(e=>draw(e.target)));
 document.querySelectorAll('[data-capital]').forEach(el=>{draw(el);observer.observe(el);});
}
