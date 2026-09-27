#!/usr/bin/env python3
"""Build the weekly LifeCharter Program handouts (HTML -> PDF via headless Chrome).

Usage: python3 build.py            # build every week in WEEKS
       python3 build.py 1          # build one week
Output: html/week-NN.html and pdf/LifeCharter-Week-NN-<Title>.pdf
"""
import html, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
e = html.escape

CSS = """
@page { size: 8.5in 11in; margin: 0; }
:root {
  --ivory:#FBF8F1; --paper:#FFFDF8; --ink:#2E3A3F; --soft:#5B6A6F; --line:#D9CDBA;
  --teal:#0F5B63; --ocean:#4EA7A1; --mist:#DDE9E7; --terra:#C76F56; --blush:#F5D8CF;
  --gold:#D4AF63; --sand:#EADFCF; --sage:#9CAF8B;
}
* { box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
html, body { margin:0; padding:0; background:#ccc; }
body { font-family:"Lora", Georgia, serif; color:var(--ink); font-size:11pt; line-height:1.5; }
.page { width:8.5in; height:11in; background:var(--ivory); position:relative; overflow:hidden;
  padding:0.7in 0.75in 0.85in; margin:0 auto 0.3in; page-break-after:always; break-after:page;
  display:flex; flex-direction:column; gap:14pt; }
.page:last-child { page-break-after:auto; break-after:auto; margin-bottom:0; }
@media print { html, body { background:none; } .page { margin:0; } }
.wash { position:absolute; inset:0; pointer-events:none; z-index:0;
  background:
    radial-gradient(40% 30% at 0% 0%, rgba(78,167,161,.20), transparent 70%),
    radial-gradient(35% 28% at 100% 0%, rgba(245,216,207,.75), transparent 70%),
    radial-gradient(45% 30% at 100% 100%, rgba(240,181,139,.22), transparent 70%); }
.page > *:not(.wash) { position:relative; z-index:1; }
.foot { position:absolute !important; left:0.75in; right:0.75in; bottom:0.4in; display:flex; justify-content:space-between;
  font:500 7.5pt "Montserrat", Arial, sans-serif; letter-spacing:.08em; text-transform:uppercase; color:var(--soft);
  border-top:0.6pt solid var(--gold); padding-top:6pt; white-space:nowrap; gap:12pt; }
.kicker { font:700 8pt "Montserrat", Arial, sans-serif; letter-spacing:.18em; text-transform:uppercase; color:var(--terra); margin:0; }
h1, h2, h3 { font-family:"EB Garamond", Garamond, Georgia, serif; font-weight:500; margin:0; color:var(--teal); line-height:1.1; }
h2 { font-size:26pt; }
h3 { font-size:15pt; color:var(--ink); font-weight:600; }
p { margin:0; }
.intro { color:var(--soft); font-size:10.5pt; max-width:6.2in; }
.head { display:flex; flex-direction:column; gap:4pt; padding-bottom:8pt; border-bottom:0.6pt solid var(--sand); }

/* cover */
.cover { justify-content:center; align-items:center; text-align:center; gap:18pt; padding-top:0.9in; }
.cover .logo { width:3.4in; }
.cover .emblem { width:1.5in; opacity:.95; }
.cover h1 { font-size:46pt; }
.cover .stage { font:600 10pt "Montserrat", Arial, sans-serif; letter-spacing:.2em; text-transform:uppercase; color:var(--terra); }
.cover .quote { font-family:"EB Garamond", Georgia, serif; font-style:italic; font-size:16pt; color:var(--teal); max-width:5.2in; line-height:1.35; }
.cover .fields { display:grid; grid-template-columns:1fr 1fr; gap:16pt; width:5.4in; margin-top:6pt; }
.field { font:600 8pt "Montserrat", Arial, sans-serif; letter-spacing:.14em; text-transform:uppercase; color:var(--soft); text-align:left;
  border-bottom:0.8pt solid var(--ink); padding-bottom:16pt; }
.glance { width:6.2in; display:grid; grid-template-columns:repeat(4,1fr); gap:8pt; margin-top:6pt; }
.glance div { background:var(--paper); border-radius:9pt; padding:9pt 8pt; box-shadow:0 1pt 2pt rgba(46,58,63,.08), 0 5pt 12pt rgba(46,58,63,.08);
  font:500 8pt/1.35 "Montserrat", Arial, sans-serif; color:var(--soft); }
.glance b { display:block; font:600 11pt "EB Garamond", Georgia, serif; color:var(--teal); margin-bottom:2pt; }

/* blocks */
.card { background:var(--paper); border-radius:11pt; padding:12pt 14pt;
  box-shadow:0 1pt 2pt rgba(46,58,63,.07), 0 6pt 16pt rgba(46,58,63,.08); display:flex; flex-direction:column; gap:6pt; }
.card.warm { background:#FCEFEA; }
.label { font:600 9pt "Montserrat", Arial, sans-serif; color:var(--ink); }
.label small { font-weight:500; color:var(--soft); }
.lines { display:flex; flex-direction:column; }
.lines i { display:block; height:0.34in; border-bottom:0.6pt solid var(--line); }
.scale { display:flex; gap:7pt; align-items:center; }
.scale span { width:0.3in; height:0.3in; border-radius:50%; border:0.8pt solid var(--ocean); display:grid; place-items:center;
  font:600 8pt "Montserrat", Arial, sans-serif; color:var(--teal); }
.scale em { font:italic 8.5pt "Lora", serif; color:var(--soft); }
.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12pt; }
table.sorter { width:100%; border-collapse:collapse; font-size:9pt; }
table.sorter th { font:600 7.5pt "Montserrat", Arial, sans-serif; letter-spacing:.1em; text-transform:uppercase; color:var(--soft); text-align:left; padding:0 6pt 5pt; border-bottom:0.8pt solid var(--gold); }
table.sorter td { height:0.36in; border-bottom:0.6pt solid var(--line); padding:0 6pt; font:500 8pt "Montserrat", Arial, sans-serif; color:var(--soft); white-space:nowrap; }
table.sorter td:first-child { width:62%; }
.examples { font-size:9pt; color:var(--soft); columns:2; column-gap:18pt; }
.examples li { margin-bottom:2pt; }
.log { display:grid; grid-template-columns:0.7in 1fr; row-gap:0; }
.log b { font:600 8pt "Montserrat", Arial, sans-serif; letter-spacing:.1em; text-transform:uppercase; color:var(--terra);
  height:0.38in; display:flex; align-items:flex-end; padding-bottom:4pt; border-bottom:0.6pt solid var(--line); }
.log i { height:0.38in; border-bottom:0.6pt solid var(--line); display:block; }
.snap { display:grid; grid-template-columns:1.75in 1fr; row-gap:5pt; align-items:center; }
.snap .dim { font:600 8.5pt "Montserrat", Arial, sans-serif; }
.snap .grp { grid-column:1 / -1; font:700 7pt "Montserrat", Arial, sans-serif; letter-spacing:.16em; text-transform:uppercase; color:var(--terra); margin-top:5pt; border-bottom:0.6pt solid var(--sand); padding-bottom:2pt; }
.snap .scale span { width:0.25in; height:0.25in; font-size:7pt; }
.path { display:grid; grid-template-columns:repeat(5,1fr); gap:8pt; }
.path div { background:var(--paper); border-radius:9pt; padding:9pt; font-size:8.5pt; line-height:1.4;
  box-shadow:0 1pt 2pt rgba(46,58,63,.07), 0 5pt 12pt rgba(46,58,63,.07); }
.path b { display:block; font:600 12pt "EB Garamond", Georgia, serif; color:var(--teal); }
.path small { display:block; font:600 7pt "Montserrat", Arial, sans-serif; letter-spacing:.12em; text-transform:uppercase; color:var(--terra); margin-bottom:3pt; }
.moves { display:grid; grid-template-columns:1fr 1fr; gap:6pt 14pt; font-size:9pt; }
.moves b { color:var(--teal); font-family:"EB Garamond", Georgia, serif; font-size:12pt; font-weight:600; }
.closing { text-align:center; margin-top:auto; display:flex; flex-direction:column; align-items:center; gap:6pt; }
.closing img { width:0.55in; }
.closing .sig { font-family:"EB Garamond", Georgia, serif; font-style:italic; font-size:15pt; color:var(--teal); }
.charter { border:1.2pt solid var(--gold); outline:0.5pt solid var(--gold); outline-offset:-0.28in; }
.charter .card { gap:3pt; padding:9pt 13pt; }
.charter .lines i { height:0.3in; }
.bank { font:500 9pt/1.9 "Montserrat", Arial, sans-serif; color:var(--teal); letter-spacing:.02em; }
.care { width:6.2in; text-align:left; font-size:8.5pt; line-height:1.45; color:var(--soft); border:0.8pt solid var(--gold); border-radius:9pt; padding:8pt 11pt; }
.care b { display:block; font:700 7.5pt "Montserrat", Arial, sans-serif; letter-spacing:.14em; text-transform:uppercase; color:var(--terra); margin-bottom:2pt; }
.wk0 { font:500 7pt "Montserrat", Arial, sans-serif; color:var(--soft); margin-left:4pt; }
.small { font-size:9pt; line-height:1.45; color:var(--soft); }
.signing { flex:1; justify-content:center; display:flex; flex-direction:column; align-items:center; text-align:center; gap:10pt; }
.signing .logo { width:2.4in; }
.signing h2 { font-size:34pt; }
.signing .decl { font-family:"EB Garamond", Georgia, serif; font-size:13.5pt; line-height:1.5; max-width:5.9in; color:var(--ink); }
.signing .blank { display:inline-block; width:2.4in; border-bottom:0.8pt solid var(--ink); }
.signing .card { width:100%; text-align:left; }
.chapters { list-style:none; padding:0; margin:0; width:100%; display:grid; grid-template-columns:repeat(3,1fr); gap:4pt 10pt; text-align:left;
  font:500 8.5pt "Montserrat", Arial, sans-serif; color:var(--teal); }
.chapters li { display:flex; align-items:center; gap:6pt; }
.chapters .box { width:9pt; height:9pt; border:0.8pt solid var(--gold); border-radius:2pt; display:inline-block; flex:none; }
.sigs { width:100%; display:grid; grid-template-columns:1fr 1fr; gap:18pt 22pt; margin-top:6pt; }
.signing .sig { font-family:"EB Garamond", Georgia, serif; font-style:italic; font-size:15pt; color:var(--teal); }
.fill { flex:1; display:flex; flex-direction:column; }
.fill .ruled { flex:1; min-height:0.7in; background:repeating-linear-gradient(to bottom, transparent 0, transparent calc(0.34in - 0.6pt), var(--line) calc(0.34in - 0.6pt), var(--line) 0.34in); }
"""

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,500;0,600;1,500'
         '&family=Lora:ital,wght@0,400;0,600;1,400&family=Montserrat:wght@500;600;700&display=swap">')

# ---------- building blocks ----------
def lines(n): return '<div class="lines">' + "<i></i>" * n + "</div>"
def label(t, hint=""): return f'<p class="label">{e(t)}' + (f' <small>{e(hint)}</small>' if hint else "") + "</p>"
def prompt(t, n=3, hint=""): return label(t, hint) + lines(n)
def card(inner, cls=""): return f'<div class="card {cls}">{inner}</div>'
def scale(lo="", hi=""):
    s = "".join(f"<span>{i}</span>" for i in range(1, 11))
    return f'<div class="scale">{"<em>" + e(lo) + "</em>" if lo else ""}{s}{"<em>" + e(hi) + "</em>" if hi else ""}</div>'
def head(kicker, title, intro=""):
    return f'<div class="head"><p class="kicker">{e(kicker)}</p><h2>{e(title)}</h2>' + (f'<p class="intro">{e(intro)}</p>' if intro else "") + "</div>"

def page(body, foot, cls=""):
    return f'<section class="page {cls}"><div class="wash"></div>{body}<div class="foot"><span>{e(foot)}</span><span>© 2026 Sacred Kaleidoscope Community LLC</span></div></section>'

def cover(w):
    glance = "".join(f"<div><b>{e(a)}</b>{e(b)}</div>" for a, b in w["glance"])
    return page(
        '<img class="logo" src="../assets/logo.png" alt="LifeCharter">'
        f'<p class="stage">Week {w["n"]} · {e(w["stage"])}</p>'
        f'<h1>{e(w["title"])}</h1>'
        '<img class="emblem" src="../assets/emblem.png" alt="">'
        f'<p class="quote">{e(w["quote"])}</p>'
        f'<div class="glance">{glance}</div>'
        '<div class="fields"><div class="field">Name</div><div class="field">Week of</div></div>' +
        (f'<div class="care"><b>{e(w.get("care_label", "A word of care"))}</b>{e(w["care"])}</div>' if w.get("care") else ""),
        f'The LifeCharter Program · Week {w["n"]}', "cover")

def closing(text="Head up. Wings out."):
    return f'<div class="closing"><img src="../assets/emblem.png" alt=""><p class="sig">{e(text)}</p></div>'

# ---------- the seven movements, reused for weeks 1–12 ----------
def dimension_pages(w):
    f = f'LifeCharter Program · Week {w["n"]} · {w["title"]}'
    d = w["title"].lower() if w.get("lower", True) else w["title"]
    pages = []
    pages.append(page(
        head("Movement 1", "The Air I'm In", w["air_intro"]) +
        card(label(f"My {d} today", "circle one") + scale("empty", "thriving")) +
        card(prompt(w.get("air_words", "Three words that describe it right now"), 1)) +
        card(prompt(w["air_q1"], 3)) + card(prompt(w["air_q2"], 3)) +
        (card(label(w["air_grid_label"], "1 to 10") + '<div class="snap">' + "".join(f'<div class="dim">{e(x)}</div>{scale()}' for x in w["air_grid"]) + "</div>")
         if w.get("air_grid") else card(prompt(w.get("air_q3", "Looking back at my Week 0 snapshot, what's shifted already?"), 2))),
        f))
    rows = "".join("<tr><td></td><td>mine · handed</td><td>lifts · weighs</td></tr>" for _ in range(6))
    pages.append(page(
        head("Movement 2", "My Truth", "Look at each belief you carry about this part of your life. Is it true for me? Is it mine, or was it handed to me? Does it lift me, or weigh me down?") +
        card('<p class="label">Beliefs people sometimes carry <small>(which feel familiar?)</small></p><ul class="examples">' +
             "".join(f"<li>{e(x)}</li>" for x in w["beliefs"]) + "</ul>") +
        card(label("My belief sorter", "write each belief, then circle") +
             f'<table class="sorter"><tr><th>The belief</th><th>Whose is it?</th><th>Effect</th></tr>{rows}</table>') +
        '<div class="card warm fill">' + label("My Truth", "3–5 sentences, present tense, the beliefs I choose to live by") + '<div class="ruled"></div></div>',
        f))
    pages.append(page(
        head("Movement 3", "My Horizon", w["horizon_intro"]) +
        (card(label(w["wordbank_label"], "circle up to five, or add your own") + '<p class="bank">' + " · ".join(e(x) for x in w["wordbank"]) + "</p>" + lines(1)) if w.get("wordbank") else "") +
        '<div class="card warm fill">' + label(w.get("horizon_label", f"My {d} when it's thriving"), "present tense, specific enough to picture") + '<div class="ruled"></div></div>' +
        (card(prompt(*w["horizon_extra"]), "warm") if w.get("horizon_extra") else "") +
        head("Movement 4", "My Why") +
        card(prompt(w.get("why_label", f"A thriving {d} matters to me because…"), 2) + prompt("The people who will feel the difference are…", 1) +
             prompt("If nothing changes here, what it costs me is…", 1)),
        f))
    fp = "".join(card(prompt(a, 3, b)) for a, b in w["flight"])
    pages.append(page(
        head("Movement 5", "My Flight Plan", "Wing-sized: practices, choices and boundaries sized to the life you actually have. Two or three you'll keep beat ten you'll drop by Thursday.") +
        f'<div class="grid2">{fp}</div>' +
        head("Movement 6", "My Next Right Movement") +
        '<div class="card warm">' + prompt("This week, I will…", 2) +
        '<div class="grid2">' + prompt("When", 1) + prompt("How I'll know I did it", 1) + "</div></div>",
        f))
    days = "".join(f"<b>Day {i}</b><i></i>" for i in range(1, 8))
    pages.append(page(
        head("Movement 7 · Soul Challenge", w["soul_title"], w["soul_intro"]) +
        (card(label("Feeling words", "if you need help naming it") + '<p class="bank">' + " · ".join(e(x) for x in w["soul_bank"]) + "</p>") if w.get("soul_bank") else "") +
        card(f'<div class="log">{days}</div>') +
        card(prompt("Reading all seven lines together, I notice…", 2 if w.get("soul_bank") else 3)) +
        card(prompt(f"To bring to this week's Gathering: {w['gathering']}", 1 if w.get("soul_bank") else 2), "warm") +
        closing(),
        f))
    pages.append(chapter_page(w, d, f))
    return pages

def chapter_page(w, d, f, rows=None, intro=None):
    """The page that goes into the member's own LifeCharter, one per dimension."""
    rows = rows or [("My Truth", "the beliefs I choose to live by", 3), ("My Horizon", "my " + d + " thriving", 4),
                    ("My Why", "why it matters to me", 3), ("My Flight Plan", "the anchors, rhythms and boundaries I'm keeping", 3)]
    chap = "".join(card(label(a, b) + lines(n)) for a, b, n in rows)
    return page(
        head(f"My LifeCharter · Dimension {w['n']} of 12", w["title"],
             intro or ("Your final words from this week, copied clean. This page becomes your " + w["title"] + " chapter. You'll sign all twelve in Week 12.")) +
        chap + '<div class="grid2">' + card(prompt("Completed on", 1)) + card(prompt("My initials", 1)) + "</div>",
        f, "charter")

# ---------- week content ----------
DIMS = [("The Cocoon", ["Spiritual Life", "Character", "Emotional Life"]),
        ("The Vessel", ["Health & Fitness", "Intellectual Life"]),
        ("The Circle", ["Love Relationship", "Parenting", "Social Life"]),
        ("The Flight", ["Financial Life", "Career", "Quality of Life"]),
        ("Wings Out", ["Life Vision"])]

def week0():
    w = dict(n=0, stage="Orientation", title="Head Up",
             quote="I don't need a perfect wing. I need enough clarity to see the next right movement, and enough courage to extend my wings into it.",
             glance=[("Watch", "Orientation lesson"), ("Write", "Your starting snapshot"), ("Commit", "Your weekly time"), ("Gather", "Meet your fellow travelers")])
    f = "LifeCharter Program · Week 0 · Orientation"
    snap = ""
    for grp, dims in DIMS:
        snap += f'<div class="grp">{e(grp)}</div>' + "".join(f'<div class="dim">{e(d)}</div>{scale()}' for d in dims)
    path = "".join(
        f'<div><small>{e(s)}</small><b>{e(t)}</b>{e(x)}</div>' for s, t, x in [
            ("Weeks 1–3", "The Cocoon", "Spiritual Life, Character, Emotional Life. The inside first."),
            ("Weeks 4–5", "The Vessel", "Health & Fitness, Intellectual Life. Body and mind."),
            ("Weeks 6–8", "The Circle", "Love Relationship, Parenting, Social Life. Your people."),
            ("Weeks 9–11", "The Flight", "Financial Life, Career, Quality of Life."),
            ("Week 12", "Wings Out", "Life Vision, then you sign your Charter.")])
    moves = "".join(f"<div><b>{i}. {e(a)}</b><br>{e(b)}</div>" for i, (a, b) in enumerate([
        ("The Air I'm In", "An honest look at where this part of life is today."),
        ("My Truth", "The beliefs I choose to live by."),
        ("My Horizon", "This part of life thriving, in the present tense."),
        ("My Why", "Why it matters: the lift under my wings."),
        ("My Flight Plan", "Wing-sized practices, choices and boundaries."),
        ("My Next Right Movement", "One action for this week."),
        ("Soul Challenge", "A practice to live the week, not just think it.")], 1))
    return w, [
        cover(w),
        page(head("Your path", "Thirteen weeks, one dimension at a time",
                  "Purpose is head up. Clarity is honest sight of the air you're in. Aligned Action is wings out. We bring all three into each dimension of your life.") +
             f'<div class="path">{path}</div>' +
             head("Every week", "The seven movements") + card(f'<div class="moves">{moves}</div>') +
             card(label("Your weekly rhythm") + '<p style="font-size:9.5pt">Watch the lesson · write your Charter pages · live the Soul Challenge · join the live Weekly LifeCharter Gathering · share in the Collective.</p>'),
             f),
        page(head("Pause & write", "My Starting Snapshot",
                  "Rate each dimension from 1 (this part of my life hurts or feels empty) to 10 (thriving exactly as I'd want). Honest, not harsh. We'll do this again in Week 12.") +
             card(f'<div class="snap">{snap}</div>') +
             '<div class="grid2">' + card(prompt("Most alive right now, and why", 3)) +
             card(prompt("Heaviest right now, and why", 3)) + "</div>", f),
        page(head("Pause & write", "Why I'm Here") +
             card(prompt("What made me say yes to this program now?", 5)) +
             card(prompt("If these thirteen weeks go beautifully, what will be different in me?", 5)) +
             card(prompt("What might get in my way, and what will I do when it shows up?", 5)),
             f),
        page(head("Pause & write", "My Commitment") +
             '<div class="card warm">' + label("For the next thirteen weeks, I commit to…") + lines(5) +
             '<div class="grid2">' + prompt("My Charter time each week (day)", 1) + prompt("Time", 1) + "</div></div>" +
             card(label("Agreements for traveling this well") +
                  '<ul style="margin:0;padding-left:1.1em;font-size:9.5pt;display:grid;gap:3pt">'
                  "<li>You can't do this wrong. Pages or three lines, both count.</li>"
                  "<li>Keep a pace you can sustain. If a week gets away from you, do the next right movement and keep going.</li>"
                  "<li>Some dimensions won't fit your life right now. You'll still find something in those weeks.</li>"
                  "<li>Tell the truth. Your Charter is private unless you choose to share it.</li>"
                  "<li>Come to the Gatherings, live or on replay.</li></ul>") +
             card(prompt("Signed", 1)) + closing(), f),
    ]

def week1():
    w = dict(n=1, stage="The Cocoon", title="Spiritual Life",
             quote="You can only renegotiate with air you're willing to see.",
             glance=[("Watch", "Spiritual Life lesson"), ("Write", "Your seven movements"), ("Live", "Find the Lift, 7 days"), ("Gather", "Bring your notes")],
             air_intro="Your relationship with whatever is larger than you, however you name it, and what it gives your life: meaning, direction, a place to rest. Any faith or none.",
             air_q1="When do I feel most connected to something larger than me?",
             air_q2="When do I feel furthest away?",
             beliefs=["I have to earn my place.", "Doubt means I'm doing it wrong.", "My spiritual life is private, so I don't need anyone.",
                      "I'm too busy for this right now.", "I'm held, even when I can't feel it.", "There's a purpose in my being here."],
             horizon_intro="Picture an ordinary day a year from now. How do you begin it? Where do you find stillness? How do you meet a hard moment? Who shares this part of life with you? What do you give back?",
             flight=[("My daily anchor(s)", "stillness, prayer, gratitude, reading, nature, music, whatever connects you"),
                     ("My weekly rhythm", "community, worship, service, longer reflection"),
                     ("One boundary that protects this", "what I'll protect, and what I'll say no to"),
                     ("Who travels this with me", "or who I'll invite")],
             soul_title="Find the Lift",
             soul_intro="Once a day for seven days, stop for two minutes and ask: where is the lift in this moment? A kindness, some beauty, a feeling of being held, a breath that finally slowed. Write one line.",
             gathering="What did Find the Lift show you?")
    return w, [cover(w)] + dimension_pages(w)

def week2():
    w = dict(n=2, stage="The Cocoon", title="Character",
             quote="Character is who you are when no one's watching, and who you're becoming, one choice at a time.",
             glance=[("Watch", "Character lesson"), ("Write", "Your seven movements"), ("Live", "The Unseen Choice"), ("Gather", "Bring your notes")],
             air_intro="Clear sight, not self-punishment. How closely do my everyday actions match what I say matters to me?",
             air_words="Three words the people closest to me would use to describe me",
             air_q1="Where do I show up as my best self?",
             air_q2="Where, or with whom, do I slip?",
             air_q3="Under what pressures do I most often slip: tired, scared, rushed, criticized?",
             beliefs=["I am who I am. People don't really change.", "Being kind means being a pushover.",
                      "If I make a mistake, it proves I'm not a good person.", "My worth depends on what other people think of me.",
                      "Who I am is built in small, unseen choices.", "I can grow at any age, from any starting point."],
             horizon_intro="Picture the person you're becoming. How do you handle conflict? How do you treat people under pressure? What do you do when you get it wrong? What's it like to be around you?",
             wordbank_label="The qualities I choose to live by",
             wordbank=["honest", "courageous", "kind", "generous", "patient", "loyal", "humble", "fair", "joyful", "grateful",
                       "faithful", "compassionate", "disciplined", "forgiving", "curious", "dependable", "gentle", "bold", "present", "resilient"],
             horizon_label="Me at my best, living these qualities",
             why_label="Living these qualities matters to me because…",
             flight=[("My daily check-in", "where did I live my qualities today, where did I miss, what will I do tomorrow"),
                     ("My \"when this happens\" plan", "when ___ happens, I will ___"),
                     ("How I'll repair when I get it wrong", "character isn't never failing"),
                     ("Who helps me see myself clearly", "one trusted person who tells me the truth, kindly")],
             soul_title="The Unseen Choice",
             soul_intro="Each day for seven days, make one small choice that lives out one of your qualities, when no one is watching and no one will ever know. Write the quality and the choice.",
             gathering="Which unseen choice surprised you?")
    return w, [cover(w)] + dimension_pages(w)

def week3():
    w = dict(n=3, stage="The Cocoon", title="Emotional Life",
             quote="Feelings are information, not instructions. You can't stop the wind, but you can learn to fly with it.",
             glance=[("Watch", "Emotional Life lesson"), ("Write", "Your seven movements"), ("Live", "Name the Weather"), ("Gather", "Bring your notes")],
             care="This program is for reflection and growth. It isn't therapy or a substitute for professional care. If something heavy comes up, reach out to someone you trust or a counselor. In a crisis, contact local emergency services; in the US, call or text 988.",
             air_intro="Your emotions are the air you fly through: lift, headwind, sometimes storm. No judgment here. Every habit you have with feelings made sense at some point.",
             air_words="The three feelings that visit me most often these days",
             air_q1="When a hard feeling shows up, what I usually do is…",
             air_q2="Is there an old hurt I'm still carrying? (Name it, or just note that it's there.)",
             air_q3="Growing up, which feelings seemed not to be allowed?",
             beliefs=["Strong people don't cry.", "If I let myself feel it, I'll fall apart.", "Other people are responsible for how I feel.",
                      "Anger is always bad.", "Feelings are information, not instructions.", "Healing isn't linear, and it's allowed to take time."],
             horizon_intro="Not a life without hard feelings: a life where you feel what you feel, understand what it's telling you, and respond instead of react. How do you meet a hard day? Express anger or hurt? How much room is there for joy?",
             horizon_extra=("The weight I'm ready to begin setting down", 2, "optional; \"not yet\" is an honest answer"),
             flight=[("My daily weather check", "once or twice a day, name what I'm feeling in one word"),
                     ("My plan for storms", "pause, three slow breaths, name it, ask what I need"),
                     ("My healthy outlets", "writing, music, prayer, outdoors, talking, creating, crying"),
                     ("My support", "the people I'll reach for; healing happens in connection")],
             soul_title="Name the Weather",
             soul_intro="Three times a day, pause for one breath and ask: What am I feeling (one word)? Where do I feel it in my body? What is it asking for? Write one line each day.",
             soul_bank=["peaceful", "hopeful", "joyful", "grateful", "loved", "proud", "curious", "tender", "tired", "restless", "anxious", "afraid",
                        "frustrated", "angry", "hurt", "lonely", "sad", "grieving", "ashamed", "overwhelmed", "numb", "relieved"],
             gathering="What pattern did you notice?")
    return w, [cover(w)] + dimension_pages(w)

def week4():
    w = dict(n=4, stage="The Vessel", title="Health & Fitness",
             quote="Your body isn't an ornament, a project, or the enemy. It's the vessel that carries your life.",
             glance=[("Watch", "Health & Fitness lesson"), ("Write", "Your seven movements"), ("Live", "Thank the Vessel"), ("Gather", "Bring your notes")],
             care="This is for reflection and planning, not medical advice. Before changing your exercise, what you eat, or your medications or treatment, talk with your doctor or care team. This week is for every body.",
             air_intro="Health is care: daily, practical, patient care of the vessel you actually have. Fitness is capacity: the strength and energy to live the life in your Charter.",
             air_words="Three words that describe my relationship with my body right now",
             air_q1="What my body has been trying to tell me lately…",
             air_q2="What gets in the way of caring for my body…",
             air_grid_label="Six parts of care",
             air_grid=["Energy", "Sleep & rest", "Nourishment", "Movement", "Medical care", "How I speak to my body"],
             beliefs=["My body has let me down.", "Health is for people with more time and money than I have.", "If I can't do it perfectly, why bother?",
                      "Exercise has to hurt to count.", "My body deserves care, exactly as it is today.", "Small, steady care changes everything."],
             horizon_intro="Thriving for your body, not anyone else's. How do you feel when you wake? What does your energy carry you through? What movement does your body enjoy? How do you rest? How do you speak to your body?",
             horizon_label="My health & fitness thriving, for my body",
             why_label="Caring for my vessel matters to me because…",
             flight=[("Nourishment", "one or two changes that help me feel well"),
                     ("Movement my body can enjoy", "whatever movement is available to me; start where I am"),
                     ("Rest & sleep", "a bedtime, a wind-down, rest before I crash"),
                     ("My care team", "doctor, therapist, trainer, caregivers, a friend; the appointment I've put off")],
             soul_title="Thank the Vessel",
             soul_intro="Each day for seven days: one act of care for your body, and one thank-you to a part of your body for something it did today. Write one line: the care, and the thank-you.",
             gathering="What did your body tell you this week?")
    return w, [cover(w)] + dimension_pages(w)

def week5():
    w = dict(n=5, stage="The Vessel", title="Intellectual Life",
             quote="A butterfly doesn't fly by strength alone. It reads the air. Your mind does that for you.",
             glance=[("Watch", "Intellectual Life lesson"), ("Write", "Your seven movements"), ("Live", "Follow the Question"), ("Gather", "Bring your notes")],
             air_intro="Not your IQ or your degrees: your curiosity, what you feed your mind, how well you think, and whether you're still growing. This week is for every kind of mind.",
             air_words="Three words that describe my mind these days",
             air_q1="What I've been curious about lately…",
             air_q2="The inputs that drain my mind…",
             air_grid_label="My mind's diet",
             air_grid=["Reading", "Learning something new", "Stretching conversations", "Creative expression", "Rest from noise", "Focus"],
             beliefs=["I'm not smart. I was never a school person.", "I'm too old to learn that now.", "I don't have time to read.",
                      "If I'm not good at it right away, I'm not meant to do it.", "My mind grows with use, at any age.", "Curiosity is a form of courage."],
             horizon_intro="What are you reading? What are you learning, and how does it feel to be a beginner again? Who makes you think? How clear and focused is your mind? What have you created?",
             horizon_extra=("Three things I'd love to learn or explore in the next year", 3, "anything at all; it doesn't have to be practical"),
             why_label="A growing mind matters to me because…",
             flight=[("What I'll feed my mind", "a daily or weekly input"),
                     ("What I'll stop feeding it", "limits on news, scrolling, noise"),
                     ("My learning project", "one thing from my list, and its first step"),
                     ("My thinking partners", "people, groups, books or communities that stretch me")],
             soul_title="Follow the Question",
             soul_intro="Each day for seven days, notice one thing you wonder about, then give it ten minutes: look it up, read, ask someone. Write the question and what you found.",
             gathering="Which question led you somewhere unexpected?")
    return w, [cover(w)] + dimension_pages(w)

def week6():
    w = dict(n=6, stage="The Circle", title="Love Relationship",
             quote="A good partner doesn't carry your wings. You fly alongside each other, choosing again and again to stay in the same sky.",
             glance=[("Watch", "Love Relationship lesson"), ("Write", "Your seven movements"), ("Live", "Say What You See"), ("Gather", "Bring your notes")],
             care="This week is for everyone: partnered, single, divorced, widowed or \"it's complicated\". If you feel unsafe, afraid or controlled in a relationship, reach out. In the US: National Domestic Violence Hotline 1-800-799-7233, or text START to 88788. In danger now, call 911.",
             air_intro="Clear sight, not judgment. Partnered: look at your relationship as it is. Single: look at how you give and receive love, and the love you're ready for.",
             air_words="Three words that describe my love life right now",
             air_q1="What's going well that I don't want to lose…",
             air_q2="What's hurting, or missing…",
             air_grid_label="Six parts of partnership (optional if single)",
             air_grid=["Friendship", "Communication", "Affection & intimacy", "Trust", "Fun & play", "Shared direction"],
             beliefs=["If it's right, it should just be easy.", "I have to lose myself to keep someone.", "It's too late for me to find love, or to rebuild it.",
                      "Conflict means we're failing.", "Love is a choice I make every day.", "I deserve to be loved well, and I can learn to love well."],
             horizon_intro="Partnered: your relationship at its best. How you greet each other, handle disagreements, show affection, dream together. Single: what it feels like to be with the love you're ready for.",
             horizon_label="Love thriving in my life",
             horizon_extra=("What I bring, and the partner I'm becoming", 3, "for everyone"),
             why_label="A thriving love life matters to me because…",
             flight=[("Time together", "rituals that protect our connection"),
                     ("How we talk and repair", "listening, raising hard things, coming back after conflict"),
                     ("Affection & appreciation", "love shown the way it's received; appreciation said out loud"),
                     ("Support", "counselor, mentor couple, class, faith community, friends")],
             soul_title="Say What You See",
             soul_intro="Each day for seven days, notice one specific thing you appreciate about your partner and tell them. Single? Do it with someone you love, and add one thing you appreciate about yourself. Write what you noticed and how they responded.",
             gathering="How did they respond, and how did it change you?")
    return w, [cover(w)] + dimension_pages(w)

def week7():
    w = dict(n=7, stage="The Circle", title="Parenting",
             quote="Strong enough to hold them while they grow. Open enough to let them fly on their own wings.",
             glance=[("Watch", "Parenting lesson"), ("Write", "Your seven movements"), ("Live", "Catch Them Shining"), ("Gather", "Bring your notes")],
             care="Three ways through this week, choose one or more: raising children (any kind, any age) · influencing young lives · reparenting the child you once were. If this week touches grief around children, be gentle with yourself, take what serves you, and reach out for support.",
             air_intro="How you help young lives grow, including your own younger self. No perfect parents, only present ones. Reparenting? Rate how you treat the child within.",
             air_words="Three words the young people in my life would use to describe me",
             air_q1="The young people in my circle of care are… (reparenting? include you at age ___)",
             air_q2="What weighs on me here…",
             air_grid_label="Six parts of parenting",
             air_grid=["Connection", "Presence", "Guidance & boundaries", "Encouragement", "Modeling", "Letting them be them"],
             beliefs=["I have to be a perfect parent.", "My child's choices are a report card on me.", "It's too late to repair things with my children.",
                      "I don't have children, so this isn't for me.", "Repair matters more than perfection.", "The child I was still deserves care."],
             horizon_intro="Raising children: your home, how you talk, how you handle hard moments, your relationship when they're grown. Influencing: the presence you are for them. Reparenting: how you speak to and comfort yourself.",
             horizon_label="This part of my life thriving",
             horizon_extra=("What I most want them to carry from me", 3, "values, memories, a way of being in the world"),
             why_label="This part of my life matters to me because…",
             flight=[("Presence", "rituals of undistracted time"),
                     ("Guidance & boundaries", "the one or two limits that matter most, held with love"),
                     ("Encouragement & repair", "what I'll say out loud; how I'll make it right"),
                     ("My village", "co-parent, family, friends, group, counselor, mentor")],
             soul_title="Catch Them Shining",
             soul_intro="Each day for seven days, notice a young person doing something good, especially character (kindness, effort, honesty, courage), and tell them specifically. Reparenting? Catch yourself shining. Write who, what you saw, and what you said.",
             gathering="What did you see when you looked for it?")
    return w, [cover(w)] + dimension_pages(w)

def week8():
    w = dict(n=8, stage="The Circle", title="Social Life",
             quote="Monarchs don't winter alone. Even the most beautiful wings need company to make it through the cold.",
             glance=[("Watch", "Social Life lesson"), ("Write", "Your seven movements"), ("Live", "Seven Reaches"), ("Gather", "Bring your notes")],
             care_label="Before you begin",
             care="Introverts welcome: this week is about depth, not a crowded calendar. If you feel lonely right now, that's very common and not a flaw in you. Circles shrink in some seasons, and they can grow again.",
             air_intro="Your friendships, your community, and the people you choose to travel with. No one should have to travel their path alone.",
             air_words="Three words that describe my social life right now",
             air_q1="The people I'd call if everything fell apart…",
             air_q2="Where I feel lonely or left out…",
             air_grid_label="Six parts of my social life",
             air_grid=["Close friendships", "Time together", "Belonging", "Showing up for others", "Fun & play", "Letting people in"],
             beliefs=["I'm too busy for friends right now.", "People don't really want me around.", "Making friends as an adult is impossible.",
                      "I have to be the strong one. I don't need anyone.", "It's worth reaching out first.", "I can be a good friend and still have boundaries."],
             horizon_intro="Who's around your table? How often do you laugh? Who do you call on a hard day, and who calls you? Where do you belong? How do you contribute to the people and places you love?",
             horizon_extra=("The kind of friend I'm becoming", 3, "who I am to the people in my circle"),
             flight=[("Nurture", "the two or three friendships I'll invest in on purpose"),
                     ("Reach out", "one new connection, or an old friendship to rekindle"),
                     ("Belong", "a community where I'm known over time, like the Collective"),
                     ("Boundaries", "what drains me, and what I'll protect")],
             soul_title="Seven Reaches",
             soul_intro="Each day for seven days, reach toward one person on purpose: a thinking-of-you text, a call, an invitation, a thank-you, a check-in, a hello to someone new. Write who, and what happened.",
             gathering="Who reached back, and what surprised you?")
    return w, [cover(w)] + dimension_pages(w)

def week9():
    w = dict(n=9, stage="The Flight", title="Financial Life",
             quote="Money is fuel for the flight: not a measure of your worth, and not the point of your life.",
             glance=[("Watch", "Financial Life lesson"), ("Write", "Your seven movements"), ("Live", "Follow the Flow"), ("Gather", "Bring your notes")],
             care="This is for reflection and planning. It isn't financial, legal or tax advice. For decisions about investments, debt, taxes or benefits, talk with a qualified professional. If money stress feels overwhelming, a nonprofit credit counselor is a good first call.",
             air_intro="Look without shame. Shame keeps us from looking, and we can't change what we won't look at. Thriving here means enough, clarity and peace.",
             air_words="Three words that describe my relationship with money",
             air_q1="How I feel when I check my balance…",
             air_q2="The money story I grew up with…",
             air_grid_label="Six parts of my financial life",
             air_grid=["Knowing my numbers", "Spending on purpose", "Cushion", "Handling debt", "Giving", "Peace about money"],
             beliefs=["I'm just bad with money.", "There will never be enough.", "Wanting more money makes me greedy.",
                      "If I don't look, it isn't real.", "Money is a tool that can serve what I love.", "I can learn to handle money well, one small step at a time."],
             horizon_intro="A real, grounded picture. How do you feel checking your accounts? What worries are gone? What cushion do you have? What debt is cleared? How do you give? What money talks have become easy?",
             horizon_extra=("What I want my money to make possible", 3, "security, freedom, rest, generosity, experiences, legacy"),
             why_label="Peace with money matters to me because…",
             flight=[("Know my numbers", "a regular money date: what came in, went out, is coming"),
                     ("Spend on purpose", "a simple plan that sends money toward what matters"),
                     ("Cushion & debt", "one step: start a fund, list debts, choose the first"),
                     ("Generosity & support", "how I'll give; who helps me with money")],
             soul_title="Follow the Flow",
             soul_intro="Each day for seven days, notice one money moment (a purchase, bill, gift, worry, or moment of enough). Write what it was, whether it matched what matters, how it felt, and one thank-you for something that provided for you.",
             gathering="What did your money tell you about what you value?")
    return w, [cover(w)] + dimension_pages(w)

def week10():
    w = dict(n=10, stage="The Flight", title="Career",
             quote="Your career is the flight. Your calling is the compass that keeps you oriented when the path twists.",
             glance=[("Watch", "Career lesson"), ("Write", "Your seven movements"), ("Live", "Lift and Drag"), ("Gather", "Bring your notes")],
             care_label="Before you begin",
             care="Career means your work and contribution in every form: employed, business owner, caregiver, homemaker, volunteer, student, retired, between jobs, or unable to work. Building a business? Book a complimentary Next Chapter Call: app.globalcontrol.io/appointment-booking/next-chapter-call",
             air_intro="Bigger than a job title: what you give your time, skill and energy to. When work lines up with your calling, even hard days have meaning.",
             air_words="Three words that describe my work life right now",
             air_q1="The parts of my work that light me up…",
             air_q2="The parts that drain me…",
             air_grid_label="Six parts of my work life",
             air_grid=["Meaning", "Using my strengths", "Growth", "Workload & energy", "Relationships at work", "Fair reward"],
             beliefs=["Work is supposed to be hard. Enjoying it is a luxury.", "It's too late for me to change direction.", "My worth is measured by how productive I am.",
                      "I have to choose between meaningful work and paying the bills.", "My work can be an expression of who I am.", "Every season of work can teach me something."],
             horizon_intro="What are you doing, and for whom? Which strengths are you using? What does a good workday feel like? How much do you work and rest? What are you known for? What do you receive in return?",
             horizon_extra=("The difference I want my work to make", 3, "in one life, my community, or the world"),
             why_label="Work aligned with my calling matters to me because…",
             flight=[("Strengths", "using more of what I'm good at and love doing"),
                     ("Growth", "one skill, course, credential or experience"),
                     ("Boundaries & energy", "hours, rest, and the no's that make my pace sustainable"),
                     ("Allies & next steps", "mentor, manager, coach, network; the next conversation")],
             soul_title="Lift and Drag",
             soul_intro="Each workday for seven days, notice one task that gave you lift (energized you) and one that created drag (drained you). Not in paid work? Use whatever you gave your energy to. Write one line: lift, and drag.",
             gathering="What gave you lift, and what created drag?")
    return w, [cover(w)] + dimension_pages(w)

def week11():
    w = dict(n=11, stage="The Flight", title="Quality of Life",
             quote="Butterflies bask. Rest, warmth and delight aren't a reward after the flight. They're what make the flight possible.",
             glance=[("Watch", "Quality of Life lesson"), ("Write", "Your seven movements"), ("Live", "Bask"), ("Gather", "Bring your notes")],
             care_label="Before Week 12",
             care="Next week is Wings Out: Life Vision and your Charter Signing. Gather all eleven of your \"My LifeCharter\" chapter pages so far and bring them with you.",
             air_intro="How do your days actually feel? Joy doesn't depend on money, travel, mobility or perfect health. Small joys count as much as big adventures.",
             air_words="Three words that describe how my days feel",
             air_q1="An ordinary day in my life right now looks like…",
             air_q2="What steals joy from my days…",
             air_grid_label="Six parts of my quality of life",
             air_grid=["Joy & delight", "Rest & renewal", "Beauty around me", "Play & creativity", "Adventure", "Time for what I love"],
             beliefs=["Joy is a reward I have to earn first.", "Rest is lazy.", "I'll enjoy life once things settle down.",
                      "The good things in life need lots of money, or perfect health.", "Small joys, noticed, make a big life.", "Rest makes flight possible."],
             horizon_intro="Not a vacation: an ideal ordinary day. How do you wake? What do you eat, and with whom? What fills your morning, afternoon, evening? Where's the beauty and laughter? How do you rest?",
             horizon_label="My ideal ordinary day, morning to night",
             horizon_extra=("Experiences I want to have, big and small", 3, "a trip, a concert, a garden, a sunrise, one table full of people I love"),
             why_label="Days that feel good to live matter to me because…",
             flight=[("Daily joy", "one small delight built into every day"),
                     ("Rest & renewal", "a true day off, breaks, a protected bedtime, time away"),
                     ("My space", "one change: more beautiful, peaceful or accessible"),
                     ("Adventure", "one experience on the calendar to look forward to")],
             soul_title="Bask",
             soul_intro="Each day for seven days, give yourself ten minutes to savor something good with nothing competing for your attention. No phone, no multitasking. Write what you basked in, and how it felt.",
             gathering="What did you find when you slowed down to savor?")
    return w, [cover(w)] + dimension_pages(w)

def week12():
    w = dict(n=12, stage="Wings Out", title="Life Vision",
             quote="You don't need a perfect wing or a windless day. You have enough clarity to see your next right movement, and the courage to extend your wings into it.",
             glance=[("Watch", "Wings Out lesson"), ("Write", "Your Life Vision"), ("Sign", "Your LifeCharter"), ("Gather", "The Charter Signing")],
             care_label="Bring to the Charter Signing",
             care="All twelve of your \"My LifeCharter\" chapter pages, your Charter Statement, and the signing page at the end of this handout.")
    f = "LifeCharter Program · Week 12 · Wings Out"
    cov = cover(w).replace("<h1>Life Vision</h1>", "<h1>Life Vision</h1><p class=\"stage\" style=\"margin-top:-8pt\">&amp; Charter Signing</p>")
    snap = ""
    for grp, dims in DIMS:
        snap += f'<div class="grp">{e(grp)}</div>' + "".join(
            f'<div class="dim">{e(d)} <small class="wk0">Wk 0: ____</small></div>{scale()}' for d in dims)
    days = "".join(f"<b>Day {i}</b><i></i>" for i in range(1, 8))
    chapters = "".join(f'<li><span class="box"></span>{i}. {e(d)}</li>' for i, d in enumerate(
        [d for _, ds in DIMS for d in ds], 1))
    pages = [
        cov,
        page(head("Look how far you've traveled", "My Ending Snapshot",
                  "Rate all twelve today, honestly. Then copy your Week 0 scores beside them. Some numbers moved a lot; some barely moved because you finally saw them clearly. All of it is growth.") +
             card(f'<div class="snap">{snap}</div>') +
             '<div class="grid2">' + card(prompt("Where I've grown the most", 3)) + card(prompt("What surprised me", 3)) + "</div>", f),
        page(head("Movement 1", "The Themes in My Charter", "Read all eleven chapter pages slowly. What keeps showing up?") +
             card(prompt("Words and values that show up again and again", 2)) +
             card(prompt("A dream that keeps surfacing", 2)) +
             card(prompt("Where my chapters pull against each other, and need to make peace", 2)) +
             head("Movement 2", "My Life Truth") +
             '<div class="card warm fill">' + label("My Life Truth", "3–5 sentences, present tense: the truths that run through every chapter") + '<div class="ruled"></div></div>', f),
        page(head("Movement 3 · My Horizon", "A Letter from My Future Self",
                  "It's the day of your third Charter Renewal, three years from now. Your future self writes back to you today. What happened across all twelve dimensions? What are they glad you started? What do they want you to know about the air ahead?") +
             '<div class="card warm fill">' + label("Dear me,") + '<div class="ruled"></div></div>', f),
        page(head("Movement 4", "My Charter Statement", "What is my life for? It might begin \"I am here to…\" or \"My life is about…\" Write a few versions. Keep the one that makes something in you say yes.") +
             card(prompt("Drafts", 2)) +
             '<div class="card warm">' + label("My Charter Statement") + lines(2) + "</div>" +
             head("Movement 5", "My Flight Plan: Keeping the Charter Alive") +
             card(label("My three priorities for the next 90 days", "the ones that would give me the most lift") +
                  "".join(f'<p class="label" style="margin-top:4pt">{i}.</p>' + lines(1) for i in (1, 2, 3))) +
             '<div class="grid2">' + card(prompt("Weekly · monthly rhythm", 1)) + card(prompt("My Charter Renewal date", 1, "one year out; in my calendar")) + "</div>", f),
        page(head("Movement 6", "My Next Right Movement") +
             '<div class="card warm">' + prompt("This week, I will…", 2) + '<div class="grid2">' + prompt("When", 1) + prompt("How I'll know I did it", 1) + "</div></div>" +
             head("Movement 7 · Soul Challenge", "Wings Out",
                  "Each morning for seven days, read your Charter Statement out loud. Choose one moment that day to live it on purpose, and write one line. Share your statement with someone at least once.") +
             card(f'<div class="log">{days}</div>') +
             card(prompt("Who I shared my Charter Statement with, and what happened", 2), "warm"), f),
        chapter_page(w, "life", f, rows=[("My Life Truth", "the truths that run through every chapter", 3),
                                         ("My Horizon", "the heart of my letter from my future self", 4),
                                         ("My Charter Statement", "what my life is for", 3),
                                         ("My Flight Plan", "three 90-day priorities and my rhythm", 3)],
                     intro="Your Life Vision, copied clean. This is the twelfth and final chapter of your LifeCharter."),
        page('<div class="signing">'
             '<img class="logo" src="../assets/logo.png" alt="LifeCharter">'
             '<p class="kicker">The founding document of the life I am choosing on purpose</p>'
             '<h2>My LifeCharter</h2>'
             '<p class="decl">I, <span class="blank"></span>, have traveled the twelve dimensions of my life with honesty and courage. '
             'These pages hold my Truth, my Horizon, my Why and my Flight Plan. I adopt them as my LifeCharter. '
             'I will keep it alive, return to it when the air changes, and renew it every year.</p>'
             '<div class="card">' + label("My Charter Statement") + lines(3) + '</div>'
             f'<ul class="chapters">{chapters}</ul>'
             '<div class="sigs"><div class="field">Signature</div><div class="field">Date</div>'
             '<div class="field">Witness (optional)</div><div class="field">Charter Renewal date</div></div>'
             '<p class="sig">Head up. Wings out.</p></div>', f, "charter"),
        page(head("Graduation", "What comes next", "You've signed your LifeCharter. It's a living document, and you're just getting started.") +
             '<div class="grid2">' +
             card(label("Your Charter Renewal") + '<p class="small">Every year on your signing anniversary: rate your twelve dimensions again and update each chapter for the year ahead.</p>') +
             card(label("The LifeCharter Collective") + '<p class="small">Stay connected to your fellow travelers as an alumnus. Share your Charter Statement, your wins and your renewals.</p>') +
             card(label("Your Next Chapter Call") + '<p class="small">A complimentary 30-minute call with Babs about where you\'re flying next.<br><b>app.globalcontrol.io/appointment-booking/next-chapter-call</b></p>') +
             card(label("Building something?") + '<p class="small">Graduates who enroll in LifeCharter Command Suite implementation within 30 days of graduating receive a $500 alumni credit (code LCALUMNI500). We\'ll talk about it on your Next Chapter Call.</p>') +
             "</div>" +
             card(prompt("A note to myself on graduation day", 7), "warm") +
             closing("Head up - Wings out · Babs 🦋").replace('<p class="sig">', '<p class="small">I\'m so honored to have traveled this path beside you.</p><p class="sig">'), f),
    ]
    return w, pages

WEEKS = {0: week0, 1: week1, 2: week2, 3: week3, 4: week4, 5: week5, 6: week6, 7: week7, 8: week8, 9: week9, 10: week10, 11: week11, 12: week12}

def build(n):
    w, pages = WEEKS[n]()
    slug = re.sub(r"[^A-Za-z0-9]+", "-", w["title"]).strip("-")
    doc = (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>LifeCharter Week {n} Handout · {e(w["title"])}</title>'
           f'{FONTS}<style>{CSS}</style></head><body>{"".join(pages)}</body></html>')
    hp = ROOT / "html" / f"week-{n:02d}.html"
    hp.write_text(doc)
    pdf = ROOT / "pdf" / f"LifeCharter-Week-{n:02d}-{slug}.pdf"
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=8000",
                    f"--print-to-pdf={pdf}", hp.as_uri()], check=True, capture_output=True)
    print(f"week {n}: {len(pages)} pages -> {pdf.name}")

def export_json(path):
    """Write the per-week prompts used by the app's digital Charter pages."""
    import json
    keep = ["n", "stage", "title", "quote", "care", "care_label", "air_intro", "air_words", "air_q1", "air_q2", "air_q3",
            "air_grid_label", "air_grid", "beliefs", "horizon_intro", "horizon_label", "horizon_extra", "why_label",
            "wordbank_label", "wordbank", "flight", "soul_title", "soul_intro", "soul_bank", "gathering"]
    out = {}
    for n in sorted(WEEKS):
        w, _ = WEEKS[n]()
        out[n] = {k: w[k] for k in keep if k in w}
    Path(path).write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print("wrote", path)

if __name__ == "__main__":
    if sys.argv[1:2] == ["--json"]:
        export_json(sys.argv[2])
    else:
        for n in ([int(a) for a in sys.argv[1:]] or sorted(WEEKS)):
            build(n)
