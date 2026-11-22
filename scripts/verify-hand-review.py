"""Replay play-money hands into an isolated packaged receiver and verify the painted review."""
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from playwright.sync_api import sync_playwright


def opening(number, count, hero):
    seats = []
    for i in range(count):
        bet = [.01, .02][i] if i < 2 else 0
        pos = "SB" if i == 0 else "BB" if i == 1 else "BTN" if i == count-1 else "CO"
        seats.append(dict(seat=i+1, hero=i+1==hero, position=pos, stack=2-bet,
                          bet=bet, folded=False, inHand=True))
    return dict(source="svenskaspel-dom", version=1, variant="holdem", readerId="review-replay",
                handId=str(number), street="preflop", currency="EUR", maxSeats=6, dealerSeat=count,
                players=seats, board=[], heroCards=["Kh","7c"], pot=.03, issues=[], valid=True,
                heroTurn=False, observedActions=[], availableActions=[])


def replay(exe, out):
    out.mkdir(parents=True, exist_ok=True)
    results = []
    with tempfile.TemporaryDirectory(dir="artifacts", ignore_cleanup_errors=True) as tmp, sync_playwright() as pw:
        profile = Path(tmp).resolve()
        (profile/"flop-study").mkdir()
        library = Path(os.environ["APPDATA"])/"Poker GTO Advisor/flop-study"
        os.link(library/"AcKdJc.json.gz", profile/"flop-study/AcKdJc.json.gz")
        with socket.socket() as sock:
            sock.bind(("127.0.0.1",0))
            port = sock.getsockname()[1]
        proc = subprocess.Popen([str(exe.resolve()),"--verify-review","--live",
                                 f"--user-data-dir={profile}",f"--remote-debugging-port={port}"],
                                stderr=subprocess.DEVNULL)
        try:
            endpoint = f"http://127.0.0.1:{port}"
            for _ in range(200):
                try:
                    with urllib.request.urlopen(endpoint+"/json/list",timeout=.5) as r:
                        if any(page["url"].startswith("poker://app/") for page in json.load(r)):
                            break
                except OSError:
                    pass
                time.sleep(.05)
            browser = pw.chromium.connect_over_cdp(endpoint)
            page = next(p for p in browser.contexts[0].pages if p.url.startswith("poker://app/"))
            pair = json.loads((profile/"live-connection.json").read_text())
            sequence = 0
            def send(s):
                nonlocal sequence
                sequence += 1
                s.update(sequence=sequence,capturedAt=round(time.time()*1000))
                request = urllib.request.Request(pair["endpoint"], data=json.dumps(s).encode(),
                    headers={"Content-Type":"application/json","X-Poker-Token":pair["token"]})
                with urllib.request.urlopen(request,timeout=3) as r:
                    assert r.status == 200
            for i in range(9):
                count = i+1 if 2 <= i <= 5 else 6
                s = opening(2000+i,count,6 if i==0 else 2)
                start=time.perf_counter()
                send(s)
                if i<3:
                    assert page.locator("[data-reviewed-hand]").count()==0
                    code=page.evaluate("fetch('/hand-review?id=2000&reader=review-replay').then(r=>r.status)")
                    assert code==404
                else:
                    old=i-3
                    hand=page.locator(f'[data-reviewed-hand="{2000+old}"]')
                    hand.wait_for(timeout=10000)
                    expected = "TexasSolver · källreferens" if old<2 else "Matematiskt avgjort mot alla lagliga händer"
                    hand.get_by_text(expected,exact=True).first.wait_for(timeout=10000)
                    page.evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))")
                    ms=round((time.perf_counter()-start)*1000)
                    assert ms<10000
                    if old==0:
                        hand.get_by_text("87,16 %",exact=True).wait_for()
                        hand.get_by_text("Syna 9,14 BB",exact=True).wait_for()
                    if old==1: hand.get_by_text("Höj till 10,96 BB",exact=True).wait_for()
                    if old>=2: hand.get_by_text(f"En källstrategi för öppet flopspel med {old+1} aktiva",exact=False).first.wait_for()
                    results.append(dict(hand=2000+old,active=2 if old<2 else old+1,
                                        releaseHand=2000+i,ms=ms,review=hand.inner_text()))
                if i<2:
                    for p in s["players"]:
                        if p["seat"] not in (2,6):p.update(folded=True,inHand=False)
                    s["players"][5].update(bet=.05,stack=1.95)
                    s["pot"]=.08
                    send(s)
                    s["players"][1].update(bet=.05,stack=1.95)
                    s["pot"]=.11
                    send(s)
                    for p in s["players"]: p["bet"]=0
                    s.update(street="flop",board=["Ac","Kd","Jc"],heroTurn=i==0,
                             availableActions=["Check","Satsa"] if i==0 else [])
                    send(s)
                    for seat,amount,total,turn in [(6,.04,.15,i==1),(2,.22,.37,i==0)]:
                        s["players"][seat-1].update(bet=amount,stack=round(1.95-amount,2))
                        s.update(pot=total,heroTurn=turn,availableActions=["Fold","Syna","Höj"] if turn else [])
                        send(s)
                elif i<=5:
                    for p in s["players"]: p.update(bet=0,stack=.4 if not p["hero"] else 1.6)
                    s.update(street="flop",board=["Ac","Ad","Kc"],heroCards=["Ah","As"],
                             heroTurn=True,pot=.4,availableActions=["Check","Satsa"])
                    send(s)
                    for p in s["players"]:
                        p.update(bet=0 if p["hero"] else .4,stack=1.6 if p["hero"] else 0)
                    s.update(street="flop",board=["Ac","Ad","Kc"],heroCards=["Ah","As"],
                             heroTurn=True,pot=round(.4*count,2),availableActions=["Fold","Syna"])
                    send(s)
            (out/"windows.json").write_text(json.dumps(results,indent=2,ensure_ascii=False),encoding="utf8")
        except Exception:
            if "page" in locals() and not page.is_closed():
                panel=page.get_by_role("region",name="Automatisk efteranalys")
                if panel.count(): (out/"replay-failure.txt").write_text(panel.inner_text(),encoding="utf8")
            raise
        finally:
            proc.terminate()
            proc.wait(timeout=10)


if __name__=="__main__":
    replay(Path(sys.argv[1]),Path(sys.argv[2]))
