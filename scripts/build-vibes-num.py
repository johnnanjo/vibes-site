import math, sys
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools import subset
from pathops import Path, op, PathOp
WT=sys.argv[1] if len(sys.argv)>1 else '900'
SRC='node_modules/@fontsource/urbanist/files/urbanist-latin-%s-normal.woff2'%WT
f=TTFont(SRC); gs=f.getGlyphSet(); cmap=f.getBestCmap(); glyf=f['glyf']; hm=f['hmtx']
def gpath(name):
    p=Path(); gs[name].draw(p.getPen(glyphSet=gs)); return p
def poly(pts):
    p=Path(); pen=p.getPen(); pen.moveTo(pts[0]); [pen.lineTo(q) for q in pts[1:]]; pen.closePath(); return p
def circle(cx,cy,r):
    k=0.5522847498*r; p=Path(); pen=p.getPen(); pen.moveTo((cx+r,cy)); pen.curveTo((cx+r,cy+k),(cx+k,cy+r),(cx,cy+r)); pen.curveTo((cx-k,cy+r),(cx-r,cy+k),(cx-r,cy)); pen.curveTo((cx-r,cy-k),(cx-k,cy-r),(cx,cy-r)); pen.curveTo((cx+k,cy-r),(cx+r,cy-k),(cx+r,cy)); pen.closePath(); return p
U=lambda a,b: op(a,b,PathOp.UNION,fix_winding=True); D=lambda a,b: op(a,b,PathOp.DIFFERENCE,fix_winding=True); I=lambda a,b: op(a,b,PathOp.INTERSECTION,fix_winding=True)
def setg(name,path):
    tp=TTGlyphPen(None); path.draw(Cu2QuPen(tp,1.0,reverse_direction=True)); glyf[name]=tp.glyph()
# ---- zero: slash through the counter ----
z=gpath('zero'); outer=circle(0,0,1)  # placeholder
bp=BoundsPen(gs); gs['zero'].draw(bp); x0,y0,x1,y1=bp.bounds
solid=Path(); pen=solid.getPen()
# outer contour only = union of glyph with its own counter: take the hull by filling the bbox-clipped glyph outline
from fontTools.pens.recordingPen import RecordingPen
rp=RecordingPen(); gs['zero'].draw(rp)
conts=[]; cur=[]
for c in rp.value:
    cur.append(c)
    if c[0]=='closePath': conts.append(cur); cur=[]
def cpath(cont):
    p=Path(); pen=p.getPen()
    for n,a in cont: getattr(pen,n)(*a)
    return p
def area(p):
    b=p.bounds; return (b[2]-b[0])*(b[3]-b[1])
cps=sorted([cpath(c) for c in conts], key=area, reverse=True); zouter=cps[0]
b7=RecordingPen(); gs['seven'].draw(b7); ST=1400-sorted(set(p[1] for n,a in b7.value for p in a))[-2]
print('stem',ST)
T=ST*0.57
ax,ay,bx,by=x0+ST+30,y0+ST-24,x1-ST-30,y1-ST+24; dx,dy=bx-ax,by-ay; L=math.hypot(dx,dy); nx,ny=-dy/L*T/2,dx/L*T/2
ex,ey=dx/L*200,dy/L*200
slash=poly([(ax-ex+nx,ay-ey+ny),(bx+ex+nx,by+ey+ny),(bx+ex-nx,by+ey-ny),(ax-ex-nx,ay-ey-ny)])
setg('zero',U(z,I(slash,zouter)))
# ---- three: flat top, straight diagonal, round bowl ----
b3=BoundsPen(gs); gs['three'].draw(b3); tx0,ty0,tx1,ty1=b3.bounds; ro=(tx1-tx0)/2; cx=(tx0+tx1)/2; cy=ty0+ro; ri=ro-ST; rm=ro-ST/2
ring=D(circle(cx,cy,ro),circle(cx,cy,ri))
A1=128   # where the bowl starts (deg)
far=3000; a=math.radians(A1)
wedge=poly([(cx,cy),(cx+far*math.cos(a),cy+far*math.sin(a)),(cx-far,cy+far),(cx-far,cy)])
bowl=D(ring,wedge)
BR=tx1-16; bar=poly([(tx0+36,1400-ST),(tx0+36,1400),(BR,1400),(BR,1400-ST)])
# diagonal: from under the bar's right end to the top-left of the bowl
jx,jy=cx+rm*math.cos(math.radians(112)),cy+rm*math.sin(math.radians(112))   # centre-line landing point on the bowl
tx,ty=BR-ST*0.683,1400-ST                                                             # centre of the diagonal where it leaves the bar
dx,dy=jx-tx,jy-ty; L=math.hypot(dx,dy); ux,uy=dx/L,dy/L; nx,ny=-uy*ST/2,ux*ST/2
diag=poly([(tx-ux*260+nx,ty-uy*260+ny),(tx-ux*260-nx,ty-uy*260-ny),(jx+ux*40-nx,jy+uy*40-ny),(jx+ux*40+nx,jy+uy*40+ny)])
diag=I(diag,poly([(-200,-200),(1400,-200),(1400,1400),(-200,1400)]))
setg('three',U(U(bar,diag),bowl))
# ---- tabular digits ----
names=[cmap[ord(c)] for c in '0123456789']
W=max(glyf[n].xMax-glyf[n].xMin for n in names if not glyf[n].recalcBounds(glyf))+70
for n in names:
    g=glyf[n]; g.recalcBounds(glyf); shift=round((W-(g.xMax-g.xMin))/2-g.xMin)
    if shift:
        coords=g.coordinates; coords.translate((shift,0)); g.recalcBounds(glyf)
    hm[n]=(W,g.xMin)
for t in ('GSUB','GPOS','GDEF','STAT','prep','gasp'):
    if t in f: del f[t]
for rec in f['name'].names:
    if rec.nameID in (1,4,16): rec.string='VIBES Labo Numerals'
    if rec.nameID==6: rec.string='VIBESLaboNumerals'
f.save('tmp.ttf')
opt=subset.Options(); opt.flavor='woff2'; opt.layout_features=[]; opt.name_IDs=[0,1,2,3,4,5,6,13,14]; opt.notdef_outline=True
s=subset.Subsetter(opt); ff=TTFont('tmp.ttf'); s.populate(unicodes=[ord(c) for c in '0123456789:.,-/ ']); s.subset(ff); ff.flavor='woff2'; ff.save('vibes-num-%s.woff2'%WT)
import os; print('ok',os.path.getsize('vibes-num-%s.woff2'%WT))
