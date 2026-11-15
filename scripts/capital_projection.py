"""Spherical Albers USA point projection matching US Atlas 3.0.1's map frame.
Parameters follow d3-geo 3.1.1. No runtime dependency or hand-positioned points.
"""
import math

def _conic(lon,lat,parallels,rotate,center,scale,translate):
    p0,p1=map(math.radians,parallels)
    n=(math.sin(p0)+math.sin(p1))/2
    c=math.cos(p0)**2+2*n*math.sin(p0)
    r0=math.sqrt(c)/n
    def raw(lam,phi):
        rho=math.sqrt(c-2*n*math.sin(phi))/n
        return rho*math.sin(n*lam),r0-rho*math.cos(n*lam)
    x,y=raw(math.radians(lon+rotate),math.radians(lat))
    cx,cy=raw(math.radians(center[0]),math.radians(center[1]))
    return [translate[0]+scale*(x-cx),translate[1]-scale*(y-cy)]

def project_capital(lon,lat,abbr):
    k=1300;x=487.5;y=305
    if abbr=='AK':return _conic(lon,lat,(55,65),154,(-2,58.5),k*.35,(x-.307*k,y+.201*k))
    if abbr=='HI':return _conic(lon,lat,(8,18),157,(-3,19.9),k,(x-.205*k,y+.212*k))
    return _conic(lon,lat,(29.5,45.5),96,(-.6,38.7),k,(x,y))
