const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {shapeWithLocator}=vm.runInNewContext(fs.readFileSync('dist/shape-clue.js','utf8').replaceAll('export ','')+';({shapeWithLocator})');
const states=JSON.parse(fs.readFileSync('dist/states.js','utf8').replace('export const states = ','').trim().replace(/;$/,''));
for(const state of states){const svg='<svg class="shape">silhouette</svg>',html=shapeWithLocator(state,svg,states);if(['WY','CO'].includes(state.abbr)){assert(html.includes('game-locator'));assert.equal((html.match(/class="clue-highlight"/g)||[]).length,1);assert(html.includes(`class="clue-highlight" d="${state.path}"`));assert(!html.includes(state.name));assert(!html.includes('<title>'));assert(!html.includes('aria-label="'+state.abbr));assert(html.includes(svg));}else assert.equal(html,svg);}
console.log('Only WY/CO receive a locator, with one correct highlight and no named-answer leak');
