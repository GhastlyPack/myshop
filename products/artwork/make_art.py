from PIL import Image, ImageDraw, ImageFont
import os
R = os.path.dirname(os.path.abspath(__file__))
F = "/System/Library/Fonts/Supplemental/"
INK=(27,25,23); ORANGE=(194,65,12); CREAM=(250,247,242); MUTED=(160,152,144); AMBER=(245,158,11)
def font(name, size): return ImageFont.truetype(F+name, size)
def wrap(draw, text, fnt, maxw):
    words=text.split(); lines=[]; cur=""
    for w in words:
        t=(cur+" "+w).strip()
        if draw.textlength(t, font=fnt) <= maxw: cur=t
        else: lines.append(cur); cur=w
    if cur: lines.append(cur)
    return lines
def cover(size, kicker, title, sub, tag, out, bg=INK, fg=CREAM, accent=ORANGE):
    W,H=size; im=Image.new("RGB",size,bg); d=ImageDraw.Draw(im)
    pad=int(W*0.07); stripe=int(W*0.035)
    d.rectangle([0,0,stripe,H], fill=accent)
    d.rectangle([stripe,0,stripe+int(W*0.006),H], fill=AMBER)
    kf=font("Arial Bold.ttf", int(W*0.03)); d.text((pad+stripe, pad), kicker.upper(), font=kf, fill=accent)
    tf=font("Arial Black.ttf", int(W*0.085)); y=pad+int(W*0.07)
    for ln in wrap(d, title, tf, W-pad*2-stripe):
        d.text((pad+stripe-int(W*0.004), y), ln, font=tf, fill=fg); y+=int(W*0.095)
    sf=font("Arial.ttf", int(W*0.034)); y+=int(W*0.02)
    for ln in wrap(d, sub, sf, W-pad*2-stripe):
        d.text((pad+stripe, y), ln, font=sf, fill=MUTED); y+=int(W*0.045)
    tf2=font("Arial Bold.ttf", int(W*0.03))
    tw=d.textlength(tag, font=tf2); bx=pad+stripe; by=H-pad-int(W*0.06)
    d.rounded_rectangle([bx,by,bx+tw+int(W*0.04),by+int(W*0.055)], radius=int(W*0.012), fill=accent)
    d.text((bx+int(W*0.02), by+int(W*0.011)), tag, font=tf2, fill=CREAM)
    af=font("Arial.ttf", int(W*0.026)); a="The AIMA Method  ·  Bowsky"
    d.text((W-pad-d.textlength(a,font=af), H-pad-int(W*0.05)+int(W*0.01)), a, font=af, fill=MUTED)
    im.save(os.path.join(R,out), optimize=True)
# Free
cover((1000,1000),"Free starter kit","The CMO Seat Starter Kit","The cost table, the kickoff script, the three numbers, and the benchmark sheet from Manual 1.","FREE","free-thumb.png")
cover((1600,900),"Free starter kit","The CMO Seat Starter Kit","Run the kickoff like a real CMO before you spend a dollar on ads.","FREE","free-banner.png")
# Paid
cover((1000,1000),"The AIMA Method · Manual 1","Replace a $1M Marketing Team with One AI Tool","The 20-page manual, the aima-cmo Claude skill, worksheets, and the prompt pack.","$39","paid-thumb.png", bg=(250,247,242), fg=INK, accent=ORANGE)
cover((1600,900),"The AIMA Method · Manual 1","Replace a $1M Marketing Team with One AI Tool","Direct response advertising for local businesses, fulfilled with ToMarket.io.","$39","paid-banner.png", bg=(250,247,242), fg=INK, accent=ORANGE)
print("art ok")
