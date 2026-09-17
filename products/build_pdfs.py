"""Builds the two product PDFs. Run from anywhere: python products/build_pdfs.py"""
import os
from PIL import Image, ImageDraw
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Flowable

R = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(R, "artwork", "pdf")
TMP = os.path.join(ART, "_derived"); os.makedirs(TMP, exist_ok=True)
BRAND = "22nd Century Marketing  ·  Roemer AI Solutions"

# ---------- fonts (Avenir Next from the system TTC) ----------
AV = "/System/Library/Fonts/Avenir Next.ttc"
for name, idx in [("Av", 7), ("AvM", 5), ("AvD", 2), ("AvB", 0), ("AvH", 8), ("AvI", 4), ("AvBI", 1)]:
    pdfmetrics.registerFont(TTFont(name, AV, subfontIndex=idx))
pdfmetrics.registerFontFamily("Av", normal="Av", bold="AvD", italic="AvI", boldItalic="AvBI")
try:
    pdfmetrics.registerFont(TTFont("Mono", "/System/Library/Fonts/Menlo.ttc", subfontIndex=0)); MONO = "Mono"
except Exception:
    MONO = "Courier"

INK = colors.HexColor("#1b1917"); ORANGE = colors.HexColor("#c2410c"); AMBER = colors.HexColor("#f59e0b")
MUTED = colors.HexColor("#6b6560"); CREAM = colors.HexColor("#faf7f2"); LINE = colors.HexColor("#e5e0d8"); SAND = colors.HexColor("#f3eee6")
W, H = letter; M = 0.85 * inch; CW = W - 2 * M

def st(name, **kw):
    base = dict(fontName="Av", fontSize=10.5, leading=15.5, textColor=INK, spaceAfter=6)
    base.update(kw); return ParagraphStyle(name, **base)
S = {
    "kicker": st("kicker", fontName="AvD", fontSize=8.5, leading=11, textColor=ORANGE, spaceAfter=3),
    "h1": st("h1", fontName="AvH", fontSize=24, leading=28, spaceBefore=2, spaceAfter=8),
    "h2": st("h2", fontName="AvD", fontSize=13.5, leading=17, spaceBefore=12, spaceAfter=4),
    "body": st("body"),
    "lead": st("lead", fontName="AvM", fontSize=12, leading=18, spaceAfter=8),
    "small": st("small", fontSize=8.5, leading=12, textColor=MUTED),
    "quote": st("quote", fontName="AvI", fontSize=11.5, leading=16.5, leftIndent=14, textColor=INK, spaceBefore=4, spaceAfter=8),
    "bullet": st("bullet", leftIndent=14, bulletIndent=2, spaceAfter=3),
    "mono": st("mono", fontName=MONO, fontSize=8.3, leading=12, backColor=SAND, borderPadding=(8, 10, 8, 10), spaceBefore=6, spaceAfter=14),
    "cell": st("cell", fontSize=9.3, leading=12.5, spaceAfter=0),
    "cellb": st("cellb", fontName="AvD", fontSize=9, leading=12, spaceAfter=0, textColor=CREAM),
    "cells": st("cells", fontSize=8.2, leading=10.8, spaceAfter=0),
    "stat": st("stat", fontName="AvH", fontSize=22, leading=25, textColor=INK, spaceAfter=0),
    "statl": st("statl", fontName="AvM", fontSize=8.5, leading=11.5, textColor=MUTED, spaceAfter=0),
    "whitek": st("whitek", fontName="AvD", fontSize=8.5, leading=11, textColor=AMBER, spaceAfter=0),
    "whiteh": st("whiteh", fontName="AvH", fontSize=22, leading=26, textColor=CREAM, spaceAfter=0),
}
def P(t, s="body"): return Paragraph(t, S[s])
def B(items): return [Paragraph(i, S["bullet"], bulletText="•") for i in items]
def hr():
    t = Table([[""]], colWidths=[CW], rowHeights=[1]); t.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.6, LINE)])); return t

def tbl(rows, widths, small=False):
    cs = "cells" if small else "cell"
    data = [[Paragraph(str(c), S["cellb"] if i == 0 else S[cs]) for c in r] for i, r in enumerate(rows)]
    t = Table(data, colWidths=widths, repeatRows=1)
    style = [("VALIGN", (0, 0), (-1, -1), "TOP"), ("BACKGROUND", (0, 0), (-1, 0), INK),
             ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6), ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
             ("LINEBELOW", (0, 1), (-1, -1), 0.4, LINE)]
    for i in range(2, len(rows), 2): style.append(("BACKGROUND", (0, i), (-1, i), SAND))
    t.setStyle(TableStyle(style)); return t

def checklist(items):
    rows = []
    for i in items:
        box = Table([[""]], colWidths=[11], rowHeights=[11]); box.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.9, ORANGE)]))
        rows.append([box, Paragraph(i, S["cell"])])
    t = Table(rows, colWidths=[0.3 * inch, CW - 0.3 * inch])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3), ("LEFTPADDING", (0, 0), (0, -1), 0)])); return t

def fillin(rows):
    data = [[Paragraph(r, S["cell"]), ""] for r in rows]
    t = Table(data, colWidths=[3.1 * inch, CW - 3.1 * inch])
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LINEBELOW", (1, 0), (1, -1), 0.7, ORANGE), ("LINEBELOW", (0, 0), (0, -1), 0.3, LINE),
                           ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)])); return t

def callout(*paras):
    t = Table([[pp] for pp in paras], colWidths=[CW])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), CREAM), ("LINEBEFORE", (0, 0), (0, -1), 4, ORANGE), ("LEFTPADDING", (0, 0), (-1, -1), 16), ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                           ("TOPPADDING", (0, 0), (-1, 0), 13), ("TOPPADDING", (0, 1), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -2), 4), ("BOTTOMPADDING", (0, -1), (-1, -1), 13)]))
    return KeepTogether([t])

def stats(items):
    """Three stat tiles: [(big, label), ...]."""
    cells = [[[Paragraph(b, S["stat"])], [Paragraph(l, S["statl"])]] for b, l in items]
    inner = [Table(c, colWidths=[CW / 3 - 10]) for c in cells]
    for it in inner: it.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 2), ("TOPPADDING", (0, 0), (-1, -1), 2)]))
    t = Table([inner], colWidths=[CW / 3] * 3)
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), SAND), ("LINEABOVE", (0, 0), (-1, 0), 3, ORANGE), ("TOPPADDING", (0, 0), (-1, -1), 14), ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
                           ("LEFTPADDING", (0, 0), (-1, -1), 14), ("LINEAFTER", (0, 0), (1, -1), 0.6, LINE)]))
    return t

# ---------- images ----------
def derive_band(name, h_px=520):
    """Center-crop a 1536x1024 render to a wide band and burn a left-to-right dark gradient so text reads on it."""
    out = os.path.join(TMP, f"{name}-band.jpg")
    if os.path.exists(out): return out
    im = Image.open(os.path.join(ART, f"{name}.png")).convert("RGB"); w, h = im.size
    top = (h - h_px) // 2; im = im.crop((0, top, w, top + h_px))
    grad = Image.new("L", (w, 1))
    for x in range(w): grad.putpixel((x, 0), int(max(0, 215 - x / w * 300)))
    grad = grad.resize((w, h_px)); dark = Image.new("RGB", (w, h_px), (16, 13, 11)); im = Image.composite(dark, im, grad)
    im.save(out, quality=86); return out

def derive_cover(name):
    out = os.path.join(TMP, f"{name}-cover.jpg")
    if os.path.exists(out): return out
    im = Image.open(os.path.join(ART, f"{name}.png")).convert("RGB"); w, h = im.size
    th = int(w * H / W); im = im.crop((0, 0, w, th))  # keep the top, drop the empty bottom
    grad = Image.new("L", (1, th))
    for y in range(th): grad.putpixel((0, y), int(min(240, max(0, (y - th * 0.38) / (th * 0.62) * 260))))
    grad = grad.resize((w, th)); dark = Image.new("RGB", (w, th), (16, 13, 11)); im = Image.composite(dark, im, grad)
    im.save(out, quality=88); return out

class Band(Flowable):
    """Full-width photo band with kicker + title, used to open a section."""
    def __init__(self, image, kicker, title, height=1.5 * inch):
        Flowable.__init__(self); self.img = image; self.kicker = kicker; self.title = title; self.h = height
    def wrap(self, aw, ah): return CW, self.h + 10
    def draw(self):
        c = self.canv; c.drawImage(self.img, 0, 10, width=CW, height=self.h, mask="auto")
        c.setFillColor(AMBER); c.setFont("AvD", 8.5); c.drawString(18, 10 + self.h - 26, self.kicker.upper())
        c.setFillColor(CREAM); c.setFont("AvH", 22); y = 10 + self.h - 54
        for ln in simpleSplit(self.title, "AvH", 22, CW - 36): c.drawString(18, y, ln); y -= 26

def section(band, kicker, title): return [Band(derive_band(band), kicker, title), Spacer(1, 10)]

# ---------- page furniture ----------
def cover_page(canv, doc, image, kicker, title, sub, tag, price):
    canv.saveState(); canv.drawImage(image, 0, 0, width=W, height=H)
    canv.setFillColor(ORANGE); canv.rect(0, 0, 0.32 * inch, H, fill=1, stroke=0)
    x = 0.95 * inch; y = 3.55 * inch
    canv.setFillColor(AMBER); canv.setFont("AvD", 11); canv.drawString(x, y + 0.42 * inch + 46 * len(simpleSplit(title, "AvH", 40, W - x - 0.7 * inch)) , kicker.upper())
    canv.setFillColor(CREAM); canv.setFont("AvH", 40)
    lines = simpleSplit(title, "AvH", 40, W - x - 0.7 * inch); yy = y + 46 * (len(lines) - 1)
    for ln in lines: canv.drawString(x, yy, ln); yy -= 46
    canv.setFillColor(colors.HexColor("#d6cdc4")); canv.setFont("Av", 13); yy = y - 24
    for ln in simpleSplit(sub, "Av", 13, W - x - 0.9 * inch): canv.drawString(x, yy, ln); yy -= 19
    canv.setFillColor(ORANGE); canv.roundRect(x, 1.15 * inch, 1.05 * inch, 0.4 * inch, 6, fill=1, stroke=0)
    canv.setFillColor(CREAM); canv.setFont("AvD", 13); canv.drawCentredString(x + 0.525 * inch, 1.27 * inch, price)
    canv.setFillColor(colors.HexColor("#d6cdc4")); canv.setFont("Av", 10.5); canv.drawString(x + 1.25 * inch, 1.27 * inch, tag)
    canv.setFont("AvM", 9.5); canv.drawRightString(W - 0.6 * inch, 0.62 * inch, BRAND); canv.restoreState()

def footer(text):
    def _f(canv, doc):
        canv.saveState()
        canv.setFillColor(ORANGE); canv.rect(0, H - 5, W, 5, fill=1, stroke=0)
        canv.setFont("AvD", 7.5); canv.setFillColor(ORANGE); canv.drawString(M, H - 0.5 * inch, "22ND CENTURY MARKETING")
        canv.setFont("Av", 7.5); canv.setFillColor(MUTED); canv.drawRightString(W - M, H - 0.5 * inch, text)
        canv.setStrokeColor(LINE); canv.setLineWidth(0.5); canv.line(M, H - 0.58 * inch, W - M, H - 0.58 * inch)
        canv.setFont("Av", 8); canv.drawString(M, 0.55 * inch, "Roemer AI Solutions"); canv.drawRightString(W - M, 0.55 * inch, f"{doc.page}")
        canv.restoreState()
    return _f

def back_page(canv, doc, lines):
    canv.saveState(); canv.setFillColor(INK); canv.rect(0, 0, W, H, fill=1, stroke=0)
    canv.setFillColor(ORANGE); canv.rect(0, 0, 0.32 * inch, H, fill=1, stroke=0)
    x = 0.95 * inch; canv.setFillColor(AMBER); canv.setFont("AvD", 11); canv.drawString(x, H - 1.4 * inch, "22ND CENTURY MARKETING")
    canv.setFillColor(CREAM); canv.setFont("AvH", 30); canv.drawString(x, H - 1.95 * inch, "Roemer AI Solutions")
    canv.setFillColor(colors.HexColor("#d6cdc4")); canv.setFont("Av", 12); y = H - 2.7 * inch
    for ln in lines:
        for l2 in simpleSplit(ln, "Av", 12, W - x - 0.8 * inch): canv.drawString(x, y, l2); y -= 18
        y -= 10
    canv.setFont("Av", 9.5); canv.drawString(x, 0.8 * inch, "Sources for every benchmark and study are in section 20 of the manual."); canv.restoreState()

class BackPage(Flowable):
    def __init__(self, lines): Flowable.__init__(self); self.lines = lines
    def wrap(self, aw, ah): return 0, 0
    def draw(self):
        c = self.canv; ax, ay = c.absolutePosition(0, 0)
        c.saveState(); c.translate(-ax, -ay); back_page(c, None, self.lines); c.restoreState()

def build(path, cover, footer_text, story, back_lines):
    doc = SimpleDocTemplate(path, pagesize=letter, leftMargin=M, rightMargin=M, topMargin=0.95 * inch, bottomMargin=0.9 * inch, title=cover[2], author="Roemer AI Solutions")
    first = lambda c, d: cover_page(c, d, *cover)
    doc.build([Spacer(1, 1), PageBreak()] + story + [PageBreak(), BackPage(back_lines)], onFirstPage=first, onLaterPages=footer(footer_text))

# ---------- content ----------
SALARY = [["Role", "Low", "Medium", "High"], ["Graphic designer", "$55K", "$70K", "$85K"], ["Ad script writer", "$65K", "$83K", "$100K"], ["Copywriter", "$65K", "$80K", "$95K"], ["Video editor", "$65K", "$83K", "$100K"], ["Video producer / videographer", "$75K", "$98K", "$120K"], ["CMO", "$170K", "$250K", "$420K"], ["Media buyer", "$62K", "$83K", "$105K"], ["<b>Total base payroll</b>", "<b>$557K</b>", "<b>$746K</b>", "<b>$1.025M</b>"]]
LOADED = [["Cost level", "Base payroll", "Benefits + employer costs (~43%)", "Total annual cost"], ["Low", "$557,000", "$239,000", "$796,000"], ["Medium", "$746,000", "$320,000", "<b>$1,066,000</b>"], ["High", "$1,025,000", "$439,000", "$1,464,000"]]
KICKOFF_Q = ["When someone becomes a new customer, what are they worth on the first sale?", "Do they come back? Over a year, what's a good customer worth?", "Of that first sale, roughly how much do you keep after direct costs? (gross margin)", "How many new customers a month could you actually handle right now? Where does it break?", "When a lead comes in (form or call), who answers? How fast? What happens at 6 p.m. or on a Saturday?", "Hours, and the area you actually serve?", "What are you offering right now to get someone in the door?", "Have you run ads before? What happened, what did you spend, do you still have the accounts?"]
ACCESS = ["Meta Business Manager, Facebook Page, Instagram, ad account", "Google Ads (or note one must be created)", "Website URL and who controls it", "Logo and brand assets", "Photos and video of the real business, staff, work", "Where the best reviews live"]
BREAKEVEN = [["Gross margin", "Break-even ROAS"], ["25%", "4.0"], ["30%", "3.33"], ["35%", "2.86"], ["40%", "2.5"], ["50%", "2.0"], ["60%", "1.67"], ["70%", "1.43"], ["80%", "1.25"]]
METRICS = [["Metric", "What it is"], ["CPM", "Cost per 1,000 impressions. The price of attention."], ["CTR", "Click-through rate. Whether the ad is compelling."], ["CPC", "Cost per click."], ["CPL", "Cost per lead. Usually your headline number."], ["CVR", "Conversion rate: of those who clicked or saw the form, the share who became a lead."], ["ROAS", "Return on ad spend: revenue divided by spend. 3.0 means $3 back per $1."], ["Hook rate", "3-second video views divided by impressions. ~25% average, 30%+ strong, 40%+ elite, under ~20% the first frame is being scrolled past."], ["Lead", "A person who gave contact info asking to hear from the business. Not a customer."]]
NICHE = [["Niche", "Starter offer", "Meta CPL (2025)", "Google CPC / CPL (2026)", "Usually goes wrong"],
         ["Dentist", "$79 exam + X-rays + cleaning", "~$76.71", "~$8.00 / ~$72.97", "High CPL scares the owner; anchor on lifetime value"],
         ["Med spa", "First Botox visit $9/unit; free consult + $100 credit", "~$51", "~$6.17 / ~$67.36", "Policy flags on skin claims"],
         ["HVAC", "Free estimate + $89 tune-up", "~$41.26", "~$8.33 / ~$90.92", "Seasonal swings; don't over-scale"],
         ["Roofer", "Free inspection + drone report", "~$41.26", "~$8.33 / ~$90.92", "Lead quality; use Higher Intent form"],
         ["Restaurant", "Free appetizer with two entrees", "~$3.16", "~$2.05 / ~$30.57", "Cheap leads not tied to revenue; track redemptions"],
         ["Gym", "7-day trial + free PT session", "~$52.98", "~$6.17-7.17 / ~$54.60-67.36", "Trials that never convert"],
         ["Law firm", "Free case review; no fee unless we win", "~$18.17", "~$9.87 / ~$131.63", "Google is expensive and strict; lean on Meta"],
         ["Real estate", "Free instant home valuation", "~$16.61", "~$3.22 / ~$102.51", "Long time-to-close; set nurture expectations"],
         ["Auto repair", "Free brake inspection; $49 oil change", "track your own", "~$4.35 / ~$29.96", "Low-margin offers need the counter upsell"]]
COPYCHECK = ["Leads with the customer's problem or dream, not the company name", "Follows PAS (Problem, Agitate, Solve) or AIDA: a hook, a reason to care, a clear ask", "Talks about <i>them</i>, not <i>us</i>", "Specific, not vague (\"$79 exam\", \"booked in 48 hours\")", "Has proof: a number, a guarantee, a real review", "The CTA matches what actually happens next", "Nothing that violates platform policy or the brief's hard rules", "Offer in the ad = offer on the instant form = first words of the callback"]
PRELAUNCH = ["Pixel healthy on the dashboard", "Running in the business's own accounts, on their payment method", "Offer in the ad = instant form = callback script", "At least 3-4 distinct creatives approved (several hooks, two formats, image + video)", "Google RSA: full headline coverage, minimal pinning, call + location assets on", "Goal mode: set-budget (move to scale once CPL holds)", "Starting daily budget defensible from customer value and margin", "Review level set: first weeks, see every action before it happens", "Someone ready to call leads back in minutes, with after-hours coverage", "Everything paused; nothing has spent yet"]
SETUP = ["Workspace created (one per brand or client)", "Meta connected: Business Manager, Page, Instagram, ad account", "Google Ads connected", "Brand kit built (logo, colors, assets from kickoff)", "Pixel / tracking healthy on the dashboard", "Payment method is the business's, in the business's accounts", "Slack (or approval channel) connected if you'll use it"]
KICKOFF_PROMPT = """You are the chief marketing officer for a local business that is about to run Meta and Google ads. Before recommending anything, interview me to fill in this kickoff worksheet, a few questions at a time, defining any term the first time you use it:
- customer value on the first sale, and over a year
- gross margin on that first sale
- monthly capacity for new customers, and where it breaks
- who answers a new lead, how fast, and what happens after hours
- hours and service area
- the current offer
- past ad history and account access
Then compute: break-even ROAS (1 divided by gross margin), maximum affordable cost per lead (customer value x close rate x margin, stating the close rate you assumed), and a starting daily budget worked back from value and capacity (floor about $50-$100/day for most local lead gen). Finish with the filled-in worksheet, those three numbers, and a list of what is still missing. Never invent my numbers; ask for ballparks."""

def install_section():
    return [P("Install the cmo-seat skill", "h2"),
            P("The skill is the folder <b>cmo-seat/</b> inside <b>cmo-seat.zip</b> (also provided as <b>cmo-seat.skill</b>, the same zip with the extension Claude.ai expects). It contains SKILL.md, three reference files, and six templates."),
            *B(["<b>Claude.ai (web or desktop):</b> Settings, then Capabilities or Skills, then upload <b>cmo-seat.skill</b>. Once it's on, just talk about your client's ads and Claude will pull it in.",
                "<b>Claude Code:</b> unzip so the folder sits at <b>~/.claude/skills/cmo-seat/</b> (personal) or <b>.claude/skills/cmo-seat/</b> inside a project. Type <b>/cmo-seat</b> or just describe the task.",
                "<b>Cowork or other Claude surfaces:</b> add it wherever that surface lets you add custom skills; it's the same folder.",
                "<b>No skill support at all?</b> Use the prompt pack in this toolkit. Every workflow has a copy-paste prompt."]),
            callout(P("<b>Try it:</b> \"I just signed a roofing company in Tampa. Run the kickoff with me.\" Claude will interview you, do the math, and hand back a filled-in worksheet.", "body"))]

# ---------- FREE KIT ----------
free = []
free += [*section("band-seats", "22nd Century Marketing  ·  Free starter kit", "Start here"),
         P("This kit is the first ten pages of a seat you didn't know you could sit in.", "lead"),
         P("It has four things: the cost of the marketing team you'd otherwise hire, the kickoff script a real chief marketing officer runs before spending a dollar, the three numbers that decide whether ads can work for a business, and the benchmark sheet that tells you what \"good\" looks like. Plus a copy-paste prompt (and a small Claude skill) that runs the kickoff for you."),
         P("Read it once. Then run the kickoff on your own business, or on the first client you're thinking about taking on. If you want the rest of the seat, the offer, the creative standard, Google, launch, the dashboard, troubleshooting, and the weekly report, that's Manual 1. The last page tells you what's in it."),
         Spacer(1, 6), hr(), Spacer(1, 6),
         P("The team you're about to replace", "h1"),
         P("Here's what it costs to hire the people who make and run ads for a business. Seven seats: the folks who design the images, write the scripts, write the copy, shoot and cut the video, buy the media, and sit at the top deciding what to do."),
         stats([("$1,066,000", "a year for a middle-of-the-road seven-seat ad team, fully loaded"), ("$6,000", "a year for the software that now does six of those seven seats"), ("6 of 7", "seats replaced. The seventh, the one that decides, is yours")]),
         PageBreak(),
         P("In-house ad team, base salaries at low, medium, and high market rates", "h2"),
         tbl(SALARY, [2.6 * inch, 1.3 * inch, 1.3 * inch, 1.3 * inch]), Spacer(1, 10),
         P("Base payroll isn't what they cost you. Add benefits and employer costs, which run roughly 43% on top of salary."),
         tbl(LOADED, [1.2 * inch, 1.6 * inch, 2.3 * inch, 1.6 * inch]), Spacer(1, 10),
         callout(P("<b>Call it a million dollars a year</b> for a middle-of-the-road team, before they spend a single dollar on actual ads. The software that now does the work of six of those seven seats runs about $500 a month all-in. About $6,000 a year against $1,066,000.", "body"),
                 P("Six of seven. Not seven. The tool replaces the hands: it draws, writes, edits, shoots, and buys. It does not replace the head, the $250,000 seat that decides what to sell, to whom, and whether it's working. That seat is now yours.", "body")),
         PageBreak(),
         *section("band-worksheets", "Step one", "The kickoff"),
         P("A CMO who doesn't know what a customer is worth is guessing with someone else's money.", "lead"),
         P("So the first thing you do, before you open any software, is collect the numbers. If this is your own business, do this exercise on yourself and be honest. If you're running ads for someone else, this is the kickoff call."),
         P("The script, word for word", "h2"),
         P("\"Before I build anything, I need to understand this business better than the competitors understand theirs. Some of these questions are about money. Be straight with me, because I can't do this well if I'm guessing.\"", "quote"),
         fillin(KICKOFF_Q), Spacer(1, 10),
         P("Access and assets to collect", "h2"), checklist(ACCESS),
         Spacer(1, 16),
         *section("band-numbers", "Step two", "The three numbers"),
         P("Everything downstream is built from these. Fill them in before you write a single ad.", "lead"),
         P("1. Break-even ROAS = 1 divided by gross margin", "h2"),
         P("ROAS is return on ad spend: revenue divided by spend. Break-even is the ROAS where the ads pay for themselves. Above it is profit. Without the margin you can tell a business it's getting leads, not that it's making money."),
         tbl(BREAKEVEN, [2 * inch, 2 * inch]), Spacer(1, 6),
         P("2. Maximum affordable cost per lead", "h2"),
         P("<b>Customer value x close rate x gross margin.</b> A roofer whose average job is $12,000 at 35% margin, closing one lead in five, can pay up to $12,000 x 0.20 x 0.35 = <b>$840 per lead</b> and still break even. A restaurant with a $40 visit at 60% margin closing half its leads can pay $12. Same math, wildly different budgets. That's why you asked. Aim for half the break-even number or less, so the ads make money after the management cost."),
         P("3. Starting daily budget", "h2"),
         P("Work backward from customer value and capacity. If a customer is worth $12,000 and they can take ten more a month, they can afford real budget. If a customer's worth $80 on thin margins, go lean. As a floor, you want enough daily spend to produce a handful of leads a day so the platform has data: for most local lead gen that's somewhere around <b>$50-$100 a day</b> to start, tuned once you see cost per lead against the business's numbers. The right budget is the one where each lead costs less than the profit from the customers those leads become."),
         Spacer(1, 4),
         callout(P("<b>Speed-to-lead: the paragraph that makes or breaks everything.</b> MIT's Lead Response Management Study (2007, 15,000+ leads) found the odds of contacting a lead if you call within five minutes versus thirty drop by 100 times. The Harvard Business Review follow-up (2011) audited 2,241 US companies: average response was 42 hours, and 23% never responded at all.", "body"),
                 P("I can send a perfect lead, and if someone calls it back tomorrow afternoon, it's dead. Someone has to be calling these people in minutes. If that can't happen, it's the first problem to solve, before ads.", "body")),
         Spacer(1, 16),
         *section("band-dashboard", "Step three", "The benchmark sheet"),
         P("Pixel first: if tracking is broken, every other number is a lie.", "lead"),
         P("Then read these, in this order: spend, leads, CPL against your max affordable CPL, CTR and hook rate, CPM, ROAS against break-even."),
         tbl(METRICS, [1.1 * inch, CW - 1.1 * inch]), Spacer(1, 10),
         P("What \"good\" looks like", "h2"),
         P("WordStream by LocaliQ analyzes thousands of real campaigns a year; their averages are medians. Meta 2025 (leads objective): CPL $27.66, CVR 7.72%, CPC $1.92. Google 2026: CPC $5.42, CTR 6.64%, CVR 8.18%, CPL about $66.69. Google leads cost more; that's the price of intent. Directional. Your job is to beat these, not match them."),
         tbl(NICHE, [0.85 * inch, 1.75 * inch, 0.95 * inch, 1.35 * inch, CW - 4.9 * inch], small=True),
         PageBreak(),
         *section("band-mainstreet", "Do it with Claude", "Let Claude run the kickoff for you"),
         P("Two ways. The zip in this download contains a small Claude skill, <b>cmo-kickoff</b>, that interviews you, does the three-number math, and hands back the filled-in worksheet. Or paste the prompt below into Claude or ChatGPT."),
         P("Install the skill", "h2"),
         *B(["<b>Claude.ai:</b> Settings, then Capabilities or Skills, then upload <b>cmo-kickoff.skill</b>.", "<b>Claude Code:</b> unzip so the folder sits at <b>~/.claude/skills/cmo-kickoff/</b>, then say \"run the kickoff for my HVAC client.\""]),
         P("Or paste this prompt", "h2"), Paragraph(KICKOFF_PROMPT.replace("\n", "<br/>"), S["mono"]),
         PageBreak(),
         *section("band-seats", "What's next", "Manual 1: Replace a $1M Marketing Team with One AI Tool"),
         P("The kickoff is the first of twenty sections. The other nineteen are the rest of the CMO seat.", "lead"),
         P("The decisions the software can't make and the standard you judge its work against. Direct response advertising for local businesses, fulfilled with ToMarket.io, though the judgment applies to any AI ad tool."),
         P("Inside the $39 bundle", "h2"),
         *B(["<b>The 20-page manual.</b> Seat by seat, what each person did and what does it now. Setting expectations in writing. The offer (Hormozi's value equation, lead-gen vs direct sale, offer templates by niche). Who the ads are talking to. The research the writers used to do. The opening-frame standard, the copy checklist, approved vs sent back. The Google side. Launch. The rules engine and when not to touch it. What you test by hand, in what order. Reading the dashboard. Troubleshooting by symptom. The weekly report and the monthly ROI sentence that renews a contract. Running several businesses at once and the operator's math. Mistakes that get a CMO fired. The niche quick-reference.",
             "<b>The cmo-seat Claude skill.</b> The whole seat as a skill: kickoff, expectations letter, offer and brief, creative review with approve / send back verdicts, Google RSA builder, launch checklist, dashboard read, troubleshooting, weekly report and ROI math, operator schedule.",
             "<b>The toolkit.</b> Fill-in worksheets and templates for every step: kickoff, expectations letter, offer brief, copy checklist, pre-launch checklist, weekly report.",
             "<b>The prompt pack.</b> Nine copy-paste prompts for every workflow, for people who don't install skills."]),
         Spacer(1, 6),
         callout(P("<b>$39. One-time. Instant download.</b> Grab it from the same store this kit came from. Reply to the email that delivered this kit if you have a question first.", "body"))]
build(os.path.join(R, "cmo-seat-starter-kit", "CMO-Seat-Starter-Kit.pdf"),
      (derive_cover("cover-free"), "22nd Century Marketing  ·  Free starter kit", "The CMO Seat Starter Kit", "The cost table, the kickoff script, the three numbers, and the benchmark sheet. The first step of Manual 1.", "Free. Share it with someone who runs ads.", "FREE"),
      "The CMO Seat Starter Kit", free,
      ["Six of the seven seats at that table are now software. The seventh is you.", "Feed it a real offer built from real research, approve for the hook, let the engine do the ninety percent, read the numbers against the benchmarks, and tell the truth every week.", "Manual 1 is the training for the seat. $39, one-time, in the same store this kit came from."])

# ---------- PAID TOOLKIT ----------
paid = []
paid += [*section("band-seats", "22nd Century Marketing  ·  Manual 1 bundle", "Start here"),
         P("You bought a seat, not a PDF.", "lead"),
         P("The manual teaches the judgment. The skill puts that judgment inside Claude so it does the paperwork with you. The toolkit is the paperwork. Here's the order that works:"),
         *B(["<b>Read the manual once, front to back</b> (about an hour). Don't skip Part B; expectations and speed-to-lead are where most first months die.", "<b>Install the cmo-seat skill</b> (next page). Then run the kickoff on your own business or your first client.", "<b>Use the toolkit pages as you go.</b> Print them or fill them in with Claude. The templates are the same ones inside the skill.", "<b>Keep the prompt pack</b> for when you're on a phone, in ChatGPT, or helping someone who hasn't installed the skill."]),
         P("What's in the download", "h2"),
         tbl([["File", "What it is"], ["Manual-1-Replace-a-1M-Marketing-Team-with-ToMarket.pdf", "The 20-page manual. Parts A-E, twenty sections, sources."], ["Manual-1-Toolkit.pdf", "This file: install guide, worksheets, templates, prompt pack, operator schedule."], ["cmo-seat.zip / cmo-seat.skill", "The companion Claude skill (SKILL.md + references + templates)."]], [3.0 * inch, CW - 3.0 * inch]),
         PageBreak(), *section("band-mainstreet", "Setup", "The cmo-seat skill"), *install_section(),
         PageBreak(),
         *section("band-worksheets", "Worksheet 1", "Kickoff"),
         P("\"Before I build anything, I need to understand this business better than the competitors understand theirs. Some of these questions are about money. Be straight with me, because I can't do this well if I'm guessing.\"", "quote"),
         fillin(["Business / niche / city / service area"] + KICKOFF_Q), Spacer(1, 8),
         P("Access and assets", "h2"), checklist(ACCESS), Spacer(1, 8),
         P("Computed after the call", "h2"),
         fillin(["Gross margin  ->  break-even ROAS (1 / margin)", "Customer value x close rate x margin  ->  break-even CPL (aim for half)", "Starting daily budget, and the one-sentence reason", "Speed-to-lead plan: who calls, within how many minutes, after-hours"]),
         PageBreak(),
         *section("band-mainstreet", "Template 2", "Expectations letter"),
         P("Send this before anything spends.", "lead"),
         P("More marketing relationships die in the first thirty days than at any other time, and almost never because the ads were bad. They die because somebody expected something different than what happened."),
         callout(P("<b>Subject: How the first 30 days will go, [Business]</b>", "body"),
                 P("<b>The first 30 days are a testing period.</b> The platform tries several creatives, angles, and audiences and needs real spend and real results before it knows what works. Early numbers will bounce.", "body"),
                 P("<b>What a lead is.</b> A person who gave us contact information asking to hear from you: a form fill or a call. Not a customer. I'm responsible for leads at a good cost. Turning them into customers is shared, and most of it happens on your side of the phone.", "body"),
                 P("<b>Speed-to-lead.</b> Calling a lead within five minutes instead of thirty makes you 100 times more likely to reach them. I can send a perfect lead, and if someone calls it back tomorrow afternoon, it's dead. We need [name] calling these people back within [X] minutes, including [after-hours plan]. If that can't happen, tell me now.", "body"),
                 P("<b>Whose accounts.</b> The campaigns run in your own Meta and Google ad accounts, on your payment method. You own the account, the pixel data, and the history.", "body"),
                 P("<b>Two money buckets.</b> (1) Management cost: [software / my fee]. (2) Ad budget: what goes to Meta and Google. Nobody takes a cut of the ad budget.", "body"),
                 P("<b>Starting budget.</b> Based on a customer worth $[value] and capacity of [N]/month, we start at about $[X]/day and tune once we see cost per lead.", "body"),
                 P("<b>How you'll hear from me.</b> Three lines every [weekday]: results, what I did, what's next. Monthly, the return in dollars. Reply \"agreed\" and I'll build the department.", "body")),
         PageBreak(),
         *section("band-numbers", "Worksheet 3", "Offer and brief"),
         P("Value = (Dream outcome x Perceived likelihood) / (Time delay x Effort and sacrifice). Raise the top, shrink the bottom. Then brief it like you're briefing a sharp new writer who's never met this business."),
         P("Value-equation check", "h2"),
         fillin(["Dream outcome (not \"HVAC repair\": a cool house tonight)", "Perceived likelihood (reviews, guarantees, \"we've done 4,000 of these\")", "Time delay (same-day, this week)", "Effort and sacrifice (free estimate, no obligation, we handle the paperwork)", "Lead-gen offer or direct sale? Why?"]), Spacer(1, 8),
         P("The brief", "h2"),
         fillin(["Business: [name], a [niche] in [city], serving [area]", "The offer (with the number in it)", "Who it's for (one line)", "Why us / proof", "How fast", "The ask (CTA)", "What happens after they respond: who calls, how fast", "Hard rules: service area, things the business won't say, compliance words to avoid"]), Spacer(1, 8),
         callout(P("<b>Consistency check.</b> Offer in the ad = offer on the instant form = first words of the callback. When all three say the same thing, cost per lead drops and leads stop feeling like strangers.", "body")),
         PageBreak(),
         *section("band-dashboard", "Checklist 4", "Creative review"),
         P("Ogilvy: the headline is eighty cents of your dollar. On social video the headline is the first three seconds.", "lead"),
         P("Approve <i>for</i> hook rate (~25% average, 30%+ strong, 40%+ elite). Does this frame stop a thumb? A logo doesn't. A person mid-sentence saying something surprising does."),
         P("The copy checklist", "h2"), checklist(COPYCHECK), Spacer(1, 8),
         P("Approved vs sent back (dentist)", "h2"),
         tbl([["Sent back", "Approved"], ["Opening frame: the practice logo. Copy: \"Smith Family Dental, serving [town] for 20 years. Call us today!\" Leads with the company, no hook, no offer.", "Opening frame: a real patient mid-sentence, caption: \"I hadn't smiled in photos for years.\" Copy: \"Hate your smile? New patients get a full exam, X-rays, and cleaning for $79 this month. Most people book same-week. Tap to grab a spot.\" Problem, dream, speed, offer, ask."]], [CW / 2, CW / 2]), Spacer(1, 8),
         P("Google responsive search ads", "h2"),
         P("15 headlines (up to 30 characters) and 4 descriptions (up to 90); Google assembles the combination per search. Coverage, not repetition: service, location, offer, proof, call to action, urgency, a question. Pin only what must appear. Call and location assets on, always, for local. Review against the search intent, not against your Meta creative."),
         PageBreak(),
         *section("band-seats", "Checklist 5", "Setup and launch"),
         P("Once it's live, leave it alone.", "lead"),
         P("New CMOs see a scary number on day three and rip everything apart. The platforms need a learning period, and so does the engine. Yank the wheel and you reset the learning every time. The fastest way to a bad result is not leaving it alone long enough to get a good one. So get the checklist right, then let it run."),
         P("Setup", "h2"), checklist(SETUP), Spacer(1, 8),
         P("Pre-launch", "h2"), checklist(PRELAUNCH),
         PageBreak(),
         *section("band-numbers", "Template 6", "Weekly report and monthly ROI"),
         P("Three lines, same day every week, no exceptions. Consistency beats depth.", "lead"),
         callout(P("<b>Week of [date], [Business]</b>", "body"), P("1. <b>Results:</b> [X] leads at $[Y] each. Spend: $[Z]. Pixel: healthy.", "body"), P("2. <b>What I did:</b> [tested a new hook / switched to Higher Intent form / raised budget / retired two losers].", "body"), P("3. <b>What's next:</b> [what I'm testing or watching].", "body")),
         Spacer(1, 10), P("The monthly ROI sentence", "h2"),
         P("Leads x close rate x average customer value, against spend, against break-even:"),
         P("\"We spent $2,000, generated 48 leads, closed 9, at $1,200 each that's $10,800. Break-even was 2.0, we're at 5.4.\"", "quote"),
         P("That sentence renews a contract by itself. Use their real numbers."),
         P("Scaling check (both must be true)", "h2"), checklist(["CPL holding at or under target for several weeks", "The business has capacity for more customers"]),
         P("Then it's math: \"Leads at $34, you're closing them, you said you can take ten more a month. If we add $30 a day we should see roughly N more. Turn it up?\" This is also when goal mode moves from set-budget to scale-while-KPIs-hold."),
         P("Testing order when something's off", "h2"),
         P("1. Offer  ·  2. Angle / hook  ·  3. Format  ·  4. Headline  ·  5. Audience  ·  6. Small stuff. If leads are expensive, suspect the offer, not the headline. Check the non-ad causes first: pixel, speed-to-lead, and whether ad, form, and callback match."),
         PageBreak(),
         *section("band-mainstreet", "Template 7", "Running several departments at once"),
         P("One CMO can run marketing for many businesses, because the six seats under them are software. Batch by task, not by client.", "lead"),
         tbl([["Day", "What you do"], ["Monday", "All weekly reports."], ["Tuesday - Wednesday", "Creative day. Generate and approve new variants across every workspace. Preview widely, unlock narrowly."], ["Thursday", "Numbers across every dashboard; troubleshooting by symptom."], ["Friday", "Budget and scaling decisions; monthly ROI calls that are due."], ["Throughout", "The engine runs the 90%; approvals as they come."]], [1.5 * inch, CW - 1.5 * inch]), Spacer(1, 10),
         stats([("~$1M", "what an owner would pay to hire this department"), ("$3,000", "a month, what they'll pay you for the result"), ("$500", "a month in software and credits to deliver it")]),
         Spacer(1, 8),
         P("The operator's math", "h2"),
         P("Roughly $2,500 a month in gross margin per business, from a seat you can run for several businesses at once. The tool made the department cheap. The CMO seat, yours, is what the owner is actually paying for."),
         P("Mistakes that get a CMO fired", "h2"),
         tbl([["", ""], ["Overriding the rules engine on day three", "Approving one ad"], ["Launching with a weak offer", "Sloppy credits: unlocking everything"], ["Not defining \"lead\" up front", "Mismatched offer across ad, form, and callback"], ["Ignoring speed-to-lead", "Scaling past capacity"], ["Going silent", "Blaming the ads, or the business, when it's the follow-up or the offer"]], [CW / 2, CW / 2]),
         PageBreak(),
         *section("band-dashboard", "Prompt pack", "Nine prompts, one per workflow"),
         P("For Claude without the skill, ChatGPT, or a phone. Paste, then paste your notes underneath. Each prompt tells the model to ask for what it doesn't have rather than invent it.")]
PROMPTS = [("1. Kickoff", KICKOFF_PROMPT),
           ("2. Expectations letter", "Write a short expectations note to the owner of [business] before their ads start. Cover: the first 30 days are a testing period and early numbers bounce; what a lead is (contact info, not a customer); speed-to-lead with the MIT and HBR research and a named person calling back within minutes including after-hours; that campaigns run in the business's own ad accounts on their payment method; two separate money buckets (management cost vs ad budget, nobody takes a cut of the ad budget); the starting daily budget and why; and a three-line weekly report on a fixed day. Plain language, under 400 words, end with 'Reply agreed.'"),
           ("3. Offer and brief", "Act as CMO for [business, niche, city]. Customer value $[X], margin [Y]%, capacity [N]/month. Propose three offers using the value equation (dream outcome x perceived likelihood, divided by time delay x effort). Say whether this should be a lead-gen offer or a direct sale and why. Pick the one to launch first. Then write a creative brief with: business, exact offer, who it's for, dream outcome, why us / proof, how fast, the ask, what happens after they respond, and hard rules (service area, things we won't say, compliance words to avoid). Ask me for anything you don't have."),
           ("4. Creative review", "Review these ad creatives as a direct-response CMO. For each one give a verdict, APPROVED or SENT BACK, with one or two sentences against this standard: leads with the customer's problem or dream (not the company name or logo); follows PAS or AIDA; talks about them not us; specific numbers; proof; the CTA matches what happens next; no policy or brief violations; the offer matches the instant form and callback. For anything sent back, rewrite the opening line or first three seconds. Remember Meta is interruption (name the problem first) and Google is intent (match the search). Creatives: [paste]"),
           ("5. Google RSA", "Write a Google responsive search ad for [business, offer, city]. 15 headlines of up to 30 characters covering distinct angles (service, location, offer, proof, call to action, urgency, a question), not fifteen versions of one idea; 4 descriptions of up to 90 characters. Show the character count next to each. Tell me what, if anything, to pin, and remind me to turn on call and location assets."),
           ("6. Launch check", "Walk me through a pre-launch checklist for [business] and don't let me skip an item: pixel healthy; running in the business's own accounts; offer in ad = form = callback; at least 3-4 distinct approved creatives; RSA coverage with minimal pinning and call/location assets; goal mode set-budget; a starting daily budget defensible from customer value $[X] and margin [Y]%; review level for the first weeks; a named person calling leads back within minutes; everything paused. Ask me each item and record my answer."),
           ("7. Read the dashboard", "Here are this week's numbers for [business]: spend $[ ], leads [ ], CPL $[ ], CTR [ ]%, hook rate [ ]%, CPM $[ ], pixel [status]. Customer value $[X], margin [Y]%, close rate [Z]%. Read them like a CMO: pixel first, then CPL against my target CPL (half of value x close rate x margin), creative health (CTR, hook rate), CPM, ROAS against break-even (1 / margin). Compare to WordStream medians for [niche], saying they're directional. Give one verdict: let it run, feed a challenger (which lever, in the order offer, hook, format, headline, audience, small stuff), or stop-work."),
           ("8. Troubleshoot", "Symptom: [high CPM / low CTR / clicks but no leads / junk leads / leads nobody calls / a winner dying / disapprovals / pixel red]. Business: [niche, offer, form type]. Before touching the ads, check the non-ad causes with me: is the pixel healthy, is someone calling leads back within minutes (ask for timestamps), do the ad, instant form, and callback say the same thing. Then diagnose the likely cause and the single next test, using the order offer, angle/hook, format, headline, audience, small stuff. Don't rebuild the campaign."),
           ("9. Weekly report and ROI", "Write my three-line weekly report for [business], week of [date]: 1. Results: [X] leads at $[Y], spend $[Z]. 2. What I did: [ ]. 3. What's next: [ ]. Then, if it's month end, write the one-sentence ROI line: leads x close rate x customer value against spend against break-even (1 / margin), using: [numbers]. If CPL has held at target and the business has capacity, draft the budget-raise ask with the math; if not, say which condition is missing.")]
for t, p in PROMPTS: paid += [KeepTogether([P(t, "h2"), Paragraph(p.replace("\n", "<br/>"), S["mono"])])]
build(os.path.join(R, "manual-1", "Manual-1-Toolkit.pdf"),
      (derive_cover("cover-paid"), "22nd Century Marketing  ·  Manual 1", "Replace a $1M Marketing Team with One AI Tool", "The Toolkit. Install guide for the cmo-seat skill, worksheets and templates for every step of the CMO seat, and the nine-prompt pack.", "Companion to the manual. Keep it open while you work.", "$39"),
      "Manual 1 Toolkit", paid,
      ["You're sitting in the seat now. Feed it a real offer built from real research, approve for the hook, let the engine do the ninety percent, read the numbers against the benchmarks, and tell the truth every week.", "Do that and you're running a million-dollar marketing department for the price of a phone bill.", "Questions, or a case you want a second pair of eyes on: reply to the email that delivered this bundle."])
print("pdfs ok")
