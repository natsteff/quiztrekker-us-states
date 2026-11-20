// Wyoming and Colorado need geographic context; do not name the highlighted answer.
export function shapeWithLocator(state,silhouette,locations){
 if(!['WY','CO'].includes(state.abbr))return silhouette;
 return `<div class="game-shape-layout"><div class="game-silhouette">${silhouette}</div><div class="game-locator"><b>On the map</b><svg viewBox="0 0 975 610" role="img" aria-label="Location clue on the U.S. map">${locations.map(s=>`<path fill-rule="evenodd" class="${s.abbr===state.abbr?'clue-highlight':''}" d="${s.path}"/>`).join('')}</svg><small>U.S. · AK/HI inset</small></div></div>`;
}
