"""Check the packaged study view against its installed source documents."""
import argparse
import gzip
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import time
import urllib.request

from playwright.sync_api import Error as PlaywrightError, sync_playwright


def main(executable, output):
    library = Path(os.environ["APPDATA"]) / "Poker GTO Advisor/flop-study"
    output.mkdir(parents=True, exist_ok=True)
    results = []
    with tempfile.TemporaryDirectory(dir="artifacts", ignore_cleanup_errors=True) as profile, sync_playwright() as pw:
        local = Path(profile).resolve() / "flop-study"
        local.mkdir()
        for source in library.glob("*.json.gz"):
            os.link(source, local / source.name)
        with socket.socket() as available:
            available.bind(("127.0.0.1", 0))
            port = available.getsockname()[1]
        start = time.perf_counter()
        process = subprocess.Popen([str(executable.resolve()), "--study", f"--user-data-dir={local.parent}",
                                    f"--remote-debugging-port={port}"], stderr=subprocess.DEVNULL)
        endpoint = f"http://127.0.0.1:{port}"
        try:
            while time.perf_counter() - start < 15:
                try:
                    with urllib.request.urlopen(endpoint + "/json/list", timeout=.3) as response:
                        if any(p["url"].startswith("poker://app/") for p in json.load(response)):
                            break
                except OSError:
                    pass
                time.sleep(.04)
            browser = pw.chromium.connect_over_cdp(endpoint)
            page = next(p for p in browser.contexts[0].pages if p.url.startswith("poker://app/"))
            panel = page.get_by_role("region", name="Flopstudie")
            selectors = panel.locator("select")
            rows = panel.locator("tbody tr")
            for board, line in [("AcKdJc","n1"),("6c3d2h","n0"),("6c3d2h","n1"),("6c3d2h","n3"),
                                ("6c3d2h","n5"),("5c4d3h","n1"),("Qc8d2d","n3")]:
                doc = json.loads(gzip.decompress((local / (board + ".json.gz")).read_bytes()))
                if results:
                    start = time.perf_counter()
                    selectors.nth(0).select_option(board)
                    selectors.nth(1).select_option(line)
                rows.first.wait_for(state="visible")
                assert selectors.nth(0).input_value() == board and selectors.nth(1).input_value() == line
                hand = selectors.nth(2).input_value()
                if not hand:
                    selectors.nth(2).select_option(index=1)
                    hand = selectors.nth(2).input_value()
                cards = panel.locator("[data-card]").evaluate_all("els => els.map(e => e.dataset.card).join('')")
                assert cards == board + hand
                actual = rows.locator("td:last-child").all_text_contents()
                node = doc["nodes"][line]
                expected = node["strategy"][doc["combos"].index(hand)]
                assert len(actual) == len(expected)
                for displayed, probability in zip(actual, expected):
                    if displayed.startswith("<"):
                        assert 0 < 100 * probability < .01
                    elif displayed.startswith(">"):
                        assert 99.99 < 100 * probability < 100
                    else:
                        assert abs(float(displayed.split()[0].replace(",", ".")) - 100 * probability) < .00501
                page.evaluate("new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))")
                results.append(dict(board=board, line=line, hand=hand, ms=round(1000*(time.perf_counter()-start)),
                                    actions=rows.locator("td:first-child").all_text_contents(), frequencies=actual))
                if board == "AcKdJc":
                    panel.screenshot(path=str(output / "study.png"))
            (output / "study.json").write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
            try:
                browser.new_browser_cdp_session().send("Browser.close")
            except PlaywrightError:
                # Electron can acknowledge shutdown by closing the CDP socket first.
                if process.wait(timeout=3) != 0:
                    raise
        finally:
            try:
                process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                process.terminate()
                process.wait(timeout=5)


if __name__ == "__main__":
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument("executable", type=Path)
    args.add_argument("output", type=Path)
    options = args.parse_args()
    main(options.executable, options.output)
