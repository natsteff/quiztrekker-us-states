"""Build the optional geography pack from pinned government boundary extracts.

All coordinates remain WGS84 in the inputs. Canada uses a shared equirectangular
frame at 55N; island areas use a local equirectangular frame. These are educational
outlines, not navigational boundaries. UM is nine separate normalized insets.
"""
import json,math

def project(lon,lat,reference=55):
    return [(lon+180)*10*math.cos(math.radians(reference)),(90-lat)*10]

def path_and_bounds(rings):
    points=[p for ring in rings for p in ring]
    xs,ys=zip(*points)
    return (''.join('M'+'L'.join(f'{x:.6f},{y:.6f}' for x,y in ring)+'Z' for ring in rings),[min(xs),min(ys),max(xs)-min(xs),max(ys)-min(ys)])

def build_expansion(root):
    locations=json.loads((root/'data/extra-locations.json').read_text())
    geo={f['properties']['abbr']:f['geometry']['coordinates'] for f in json.loads((root/'data/expansion-boundaries.geojson').read_text())['features']}
    islands=json.loads((root/'data/um-islands.json').read_text())
    for s in locations:
        if s['abbr']=='UM':
            rings=[]
            for i,(name,group) in enumerate(islands.items()):
                lat=sum(p[1] for r in group for p in r)/sum(map(len,group))
                local=[[project(lon,la,lat) for lon,la in r] for r in group]
                _,(x,y,w,h)=path_and_bounds(local)
                scale=min(140/w,90/h);ox=(i%3)*170+(150-w*scale)/2;oy=(i//3)*120+(100-h*scale)/2
                rings.extend([[[ox+(px-x)*scale,oy+(py-y)*scale] for px,py in r] for r in local])
        else:
            coordinates=geo[s['abbr']]
            ref=55 if s['country']=='CA' else sum(p[1] for poly in coordinates for r in poly for p in r)/sum(len(r) for poly in coordinates for r in poly)
            rings=[[project(lon,lat,ref) for lon,lat in r] for poly in coordinates for r in poly]
            if s.get('capital_lonlat'):
                lon,lat=s['capital_lonlat'];x,y=project(lon,lat,ref)
                s['capitalPoint']={'lon':lon,'lat':lat,'x':round(x,6),'y':round(y,6)}
        path,bounds=path_and_bounds(rings)
        s.update(path=path,bounds=[round(v,6) for v in bounds])
    assert len(locations)==20 and len({s['abbr'] for s in locations})==20
    facts=json.loads((root/'data/extra-facts.json').read_text())
    (root/'dist/extra-locations.js').write_text('export const extraLocations = '+json.dumps(locations,ensure_ascii=False,separators=(',',':'))+';\nexport const extraFacts = '+json.dumps(facts,ensure_ascii=False,separators=(',',':'))+';\n')
    return locations
