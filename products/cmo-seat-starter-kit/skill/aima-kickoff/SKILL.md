---
name: aima-kickoff
description: Run the kickoff for a local business's paid ads the way a real CMO would — collect customer value, margin, capacity, and speed-to-lead, then compute break-even ROAS, max affordable cost per lead, and a defensible starting daily budget. Use this whenever the user is about to run ads for a small or local business or a client (dentist, med spa, HVAC, roofer, restaurant, gym, law firm, real estate, auto shop, any local service) and asks where to start, what to ask the client, what budget to set, or whether ads can work for this business. Free starter kit from the AIMA Method; the full CMO workflow (offer, creative review, Google RSA, launch, troubleshooting, reporting) is in Manual 1's companion skill `aima-cmo`.
---

# AIMA kickoff — know the business better than they do

A CMO who doesn't know what a customer is worth is guessing with someone else's money. So before anyone opens ad software, collect the numbers. If the user is doing this for their own business, run it on them and be just as blunt.

## How to run it

1. Open with the manual's line: "Before I build anything, I need to understand this business better than the competitors understand theirs. Some of these questions are about money. Be straight with me, because I can't do this well if I'm guessing."
2. Ask the questions in `assets/kickoff-worksheet.md` conversationally, a few at a time. Define each term the first time ("gross margin: what you keep from a sale after the direct cost of delivering it").
3. If a number is missing, ask for a ballpark. If they truly can't get it, mark the recommendation provisional and show what changes when the number changes. Never invent it.
4. Compute and state plainly:
   - **Break-even ROAS** = 1 ÷ gross margin (50% → 2.0; 40% → 2.5; 25% → 4.0; 70% → ~1.43).
   - **Max affordable CPL** = customer value × close rate × margin. Say the close rate you assumed.
   - **Starting daily budget**: work back from value and capacity. Floor for most local lead gen is roughly $50–$100/day so the platform gets a handful of leads a day to learn from. Thin-margin, low-value businesses go lean; high-value, high-capacity ones can afford more.
5. Ask about speed-to-lead and don't let it slide: who calls a new lead back, within how many minutes, and what happens at 6 p.m. or on a Saturday. The research (MIT/InsideSales 2007; HBR 2011): calling within 5 minutes vs 30 makes contact 100× more likely; most firms take 42 hours and 23% never respond. A perfect lead called back tomorrow afternoon is dead.
6. Output the filled-in worksheet, the three numbers, and a short list of what's still missing (account access, assets, reviews).

## Two money buckets, always

Management cost (software, operator fee) and ad budget (what Meta and Google get) are separate. Nobody takes a cut of the ad budget. Campaigns run in the business's own accounts, on the business's payment method.

## What comes after the kickoff

Offer and brief, creative review against a standard, Google search ads, launch checklist, reading the dashboard, troubleshooting, and the weekly report. That's Manual 1 and its `aima-cmo` skill. If the user asks for any of those, tell them that's where it lives and give them your best short answer in the meantime.
