"""Install the pinned, public PokerNow heads-up sample for local study."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import tarfile
import tempfile
from urllib.request import Request, urlopen

REVISION = "3cffd72966c933949c253bfb24ee4de3e4d5d2db"
ARCHIVE_HASH = "566491de46565bd74251e06aa24e4febaa512adc505457ea99445847cdf66069"
URL = f"https://raw.githubusercontent.com/RubberDucke825/PokerNow-Analysis-and-Trainer/{REVISION}/data/fixtures/library_sample.tar.gz"
RELEASE = "https://github.com/RubberDucke825/PokerNow-Analysis-and-Trainer/releases/download/library-v1"
CATALOG_DIR = Path(__file__).resolve().parents[1] / "electron"


def write_board(path, data, digest):
    if hashlib.sha256(data).hexdigest() != digest:
        raise ValueError(f"Fel data för {path.name}")
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as out:
        out.write(data)
    Path(out.name).replace(path)


def install(archive, destination):
    if hashlib.sha256(archive).hexdigest() != ARCHIVE_HASH:
        raise ValueError("Fel källarkiv eller ofullständig hämtning.")
    catalog = json.loads((CATALOG_DIR / "flop-study-boards.json").read_text())
    extra = json.loads((CATALOG_DIR / "flop-study-release.json").read_text())
    destination.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as source:
        boards = json.load(source.extractfile("hu_flop_library.json"))["matchups"]["6047a0236facd814"]["boards"]
        if boards.keys() != catalog.keys() - extra.keys():
            raise ValueError("Källans brädor avviker från katalogen.")
        for board in boards:
            data = source.extractfile(boards[board]["key"] + ".json.gz").read()
            write_board(destination / (board + ".json.gz"), data, catalog[board])
    for board, entry in extra.items():
        path = destination / (board + ".json.gz")
        if path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest() == catalog[board]:
            continue
        start = entry["offset"]
        end = start + entry["length"] - 1
        url = f"{RELEASE}/library-{entry['part']:03d}.tar?board-range={start}-{end}"
        request = Request(url, headers={"Range": f"bytes={start}-{end}"})
        with urlopen(request, timeout=30) as response:
            if response.status != 206 or not response.headers.get("Content-Range", "").startswith(f"bytes {start}-{end}/"):
                raise ValueError(f"Utgivaren kunde inte leverera brädan {board}.")
            write_board(path, response.read(entry["length"] + 1), catalog[board])
    print(f"{len(catalog)} floppar installerade i {destination}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", nargs="?", type=Path)
    parser.add_argument("--directory", type=Path)
    args = parser.parse_args()
    if args.archive:
        archive = args.archive.read_bytes()
    else:
        with urlopen(URL, timeout=60) as response:
            archive = response.read(5_000_000)
    install(archive, args.directory or Path(os.environ["APPDATA"]) / "Poker GTO Advisor" / "flop-study")
