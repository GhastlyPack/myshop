"""Compose thumbnails (1000x1000) and banners (1600x900) from the raw GPT Image 2.5 renders."""
from PIL import Image, ImageDraw, ImageFont
import os
R=os.path.dirname(os.path.abspath(__file__)); F="/System/Library/Fonts/Supplemental/"
CREAM=(250,247,242); ORANGE=(194,65,12); AMBER=(245,158,11); MUTED=(214,205,196)
BRAND="22nd Century Marketing  ·  Roemer AI Solutions"
def font(n,s): return ImageFont.truetype(F+n,s)
def wrap(d,t,f,mw):
    out=[];cur=""
    for w in t.split():
        c=(cur+" "+w).strip()
        if d.textlength(c,font=f)<=mw: cur=c
        else: out.append(cur); cur=w
    if cur: out.append(cur)
    return out
def compose(src, size, kicker, title, sub, tag, out, crop=None):
    im=Image.open(os.path.join(R,src)).convert("RGB")
    if crop: im=im.crop(crop)
    im=im.resize(size, Image.LANCZOS); W,H=size
    grad=Image.new("L",(1,H))
    for y in range(H): grad.putpixel((0,y), int(min(255, max(0,(y-H*0.30)/(H*0.70)*235))))
    grad=grad.resize((W,H)); dark=Image.new("RGB",(W,H),(18,14,12)); im=Image.composite(dark, im, grad)
    d=ImageDraw.Draw(im); pad=int(W*0.07)
    d.rectangle([0,0,int(W*0.022),H], fill=ORANGE)
    kf=font("Arial Bold.ttf", int(W*0.028)); tf=font("Arial Black.ttf", int(W*0.078)); sf=font("Arial.ttf", int(W*0.03)); pf=font("Arial Bold.ttf", int(W*0.03))
    tl=wrap(d,title,tf,W-2*pad); sl=wrap(d,sub,sf,W-2*pad); lh_t=int(W*0.088); lh_s=int(W*0.04)
    total=int(W*0.04)+len(tl)*lh_t+int(W*0.015)+len(sl)*lh_s+int(W*0.03)+int(W*0.055); y=H-pad-total
    d.text((pad,y), kicker.upper(), font=kf, fill=AMBER); y+=int(W*0.045)
    for ln in tl: d.text((pad-int(W*0.004),y), ln, font=tf, fill=CREAM); y+=lh_t
    y+=int(W*0.012)
    for ln in sl: d.text((pad,y), ln, font=sf, fill=MUTED); y+=lh_s
    y+=int(W*0.03); tw=d.textlength(tag,font=pf); ph=int(W*0.055)
    d.rounded_rectangle([pad,y,pad+tw+int(W*0.04),y+ph], radius=int(W*0.012), fill=ORANGE); d.text((pad+int(W*0.02), y+int(ph*0.2)), tag, font=pf, fill=CREAM)
    af=font("Arial.ttf", int(W*0.022)); d.text((W-pad-d.textlength(BRAND,font=af), y+int(ph*0.32)), BRAND, font=af, fill=MUTED)
    im.save(os.path.join(R,out), optimize=True); print(out, im.size)
compose("raw-free-square.png",(1000,1000),"Free starter kit","The CMO Seat Starter Kit","The cost table, the kickoff script, the three numbers, and the benchmark sheet.","FREE","free-thumb.png")
compose("raw-free-wide.png",(1600,900),"Free starter kit","The CMO Seat Starter Kit","Run the kickoff like a real CMO before you spend on ads.","FREE","free-banner.png",crop=(0,80,1536,944))
compose("raw-paid-square.png",(1000,1000),"22nd Century Marketing · Manual 1","Replace a $1M Marketing Team with One AI Tool","The 20-page manual, the cmo-seat Claude skill, worksheets, and the prompt pack.","$39","paid-thumb.png")
compose("raw-paid-wide.png",(1600,900),"22nd Century Marketing · Manual 1","Replace a $1M Marketing Team with One AI Tool","Direct response advertising for local businesses, fulfilled with ToMarket.io.","$39","paid-banner.png",crop=(0,80,1536,944))
