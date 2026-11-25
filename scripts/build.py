"""Decode pinned TopoJSON to SVG paths without third-party build dependencies."""
import json, pathlib, hashlib, shutil, math
from pwa import icons, worker
from expansion import build_expansion
from capital_projection import project_capital
ROOT = pathlib.Path(__file__).resolve().parents[1]
def build():
    topo = json.loads((ROOT/'data/states-albers-10m.json').read_text())
    transform = topo['transform']
    arcs = []
    for arc in topo['arcs']:
        x = y = 0
        points = []
        for dx, dy in arc:
            x += dx; y += dy
            points.append([x*transform['scale'][0]+transform['translate'][0], y*transform['scale'][1]+transform['translate'][1]])
        arcs.append(points)
    metadata = {}
    for line in (ROOT/'data/states.tsv').read_text().splitlines():
        key, abbr, name, capital = line.split('\t')
        metadata[key] = dict(id=key, abbr=abbr, name=name, capital=capital)
    capitals = {c["state"]:c for c in json.loads((ROOT/"data/capital-coordinates.json").read_text())}
    states = []
    for geometry in topo['objects']['states']['geometries']:
        if geometry['id'] not in metadata: continue
        polygons = geometry['arcs'] if geometry['type']=='MultiPolygon' else [geometry['arcs']]
        rings = []
        for polygon in polygons:
            for ring in polygon:
                points = []
                for index in ring:
                    segment = arcs[index] if index >= 0 else list(reversed(arcs[~index]))
                    points.extend(segment if not points else segment[1:])
                rings.append(points)
        points = [p for ring in rings for p in ring]
        xs, ys = zip(*points)
        bounds = [min(xs), min(ys), max(xs)-min(xs), max(ys)-min(ys)]
        path = ''.join('M'+'L'.join(f'{x:.3f},{y:.3f}' for x,y in ring)+'Z' for ring in rings)
        state=metadata[geometry['id']]
        c=capitals[state['name']]
        px,py=project_capital(c['lon'],c['lat'],state['abbr'])
        states.append({**state, 'path':path, 'bounds':bounds, 'capitalPoint':{'lon':c['lon'],'lat':c['lat'],'x':round(px,6),'y':round(py,6)}})
    states.sort(key=lambda s:s['name'])
    assert len(states)==50
    (ROOT/'dist/states.js').write_text('export const states = '+json.dumps(states,separators=(',',':'))+';\n')
    facts=json.loads((ROOT/'data/state-facts.json').read_text())
    for line in (ROOT/'data/highest-points.tsv').read_text().splitlines():
        abbr,name,feet=line.split('\t')
        facts[abbr]['highest_point']={'name':name,'elevation_ft':int(feet),'elevation_m':round(int(feet)*0.3048)}
    (ROOT/'dist/facts.js').write_text('export const facts = '+json.dumps(facts,ensure_ascii=False,separators=(',',':'))+';\n')
    extras=build_expansion(ROOT)
    from context_geometry import context_geometry
    (ROOT/'dist/context-geometry.js').write_text('export const contextGeometry = '+json.dumps(context_geometry(states,ROOT),separators=(',',':'))+';\n')
    shutil.copytree(ROOT/'public/assets/extra-flags',ROOT/'dist/assets/extra-flags',dirs_exist_ok=True)
    shutil.copytree(ROOT/'public/assets/flags',ROOT/'dist/assets/flags',dirs_exist_ok=True)
    (ROOT/'dist/version.js').write_text("export const VERSION='0.14.2';\n")
    icons(ROOT/'dist')
    worker(ROOT/'dist')
    assets = sorted(p for p in (ROOT/'dist').rglob('*') if p.is_file() and p.name!='build.json')
    digest = hashlib.sha256(b''.join(p.read_bytes() for p in assets)).hexdigest()
    (ROOT/'dist/build.json').write_text(json.dumps({'version':'0.14.2','sha256':digest},indent=2)+'\n')
    print(f'QuizTrekker - US States 0.14.2: {len(states)} state paths; build {digest[:12]}')
    return states
if __name__=='__main__': build()
