"""Export the root tables of the two audited flop profiles, without training."""

import base64
import hashlib
import json
import math
from pathlib import Path
import struct
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "docs/evidence"
THREE = EVIDENCE / "chance-sampled-three-way-flop-2026-11-22"
FOUR = EVIDENCE / "chance-sampled-four-to-six-2026-11-22/4-flop"
AUDIT = EVIDENCE / "four-way-flop-verification-2026-11-22"


def read(path):
    return json.loads(path.read_text(encoding="utf8"))


def digest(data):
    return hashlib.sha256(data).hexdigest()


def export(folder, proof_hash, bounds):
    report = read(folder / "training.json")
    model = report["input"]
    assert len(bounds) == len(model["seats"]) and all(0 <= b <= 2.1 for b in bounds)
    with ZipFile(folder / "profile.zip") as archive:
        raw = archive.read("manifest.json")
        manifest = json.loads(raw)
        assert digest(raw) == proof_hash == report["artifact"]["manifestSha256"]
        identity = {key: model[key] for key in ("hero", "board", "seats", "ranges", "state", "rules")}
        identity["rootKinds"] = model.get("rootKinds")
        assert digest(json.dumps(identity, separators=(",", ":")).encode()) == manifest["modelSha256"]
        assert manifest["encoding"] == "rank-24-flush-draw-v1"
        [(index, table)] = [(i, t) for i, t in enumerate(manifest["tables"])
                            if t["history"] == model["state"]["history"]]
        data = archive.read(f"{index}.bin")
    actions = report["heroRow"]["actions"]
    assert digest(data) == table["sha256"]
    assert [action["id"] for action in actions] == table["actionIds"]
    rows = list(struct.iter_unpack("<" + "d" * (len(actions) + 1), data))
    assert len(rows) == table["rowCount"] == 1176
    assert sorted({row[0] for row in rows}) == [row[0] for row in rows]
    assert all(key.is_integer() and abs(sum(row) - 1) < 1e-12
               and all(math.isfinite(x) and 0 <= x <= 1 for x in row)
               for key, *row in rows)
    return dict(board=model["board"], state=model["state"], rules=model["rules"], actions=actions,
                manifest=proof_hash, upperPct=max(bounds), rows=base64.b64encode(data).decode())


if __name__ == "__main__":
    three = read(THREE / "family-adjusted-upper.json")
    four = read(AUDIT / "archived-seats-adjusted.json")
    extra = [read(AUDIT / f"card-grid-seat-{seat}.json") for seat in (1, 2)]
    assert three["passesUpperGate"] and all(r["passesSeat"] for r in [*four["seats"], *extra])
    assert all(r["manifestSha256"] == four["manifestSha256"] for r in extra)
    profiles = [
        export(THREE, three["manifestSha256"], [r["increasedUpperPct"] for r in three["seats"]]),
        export(FOUR, four["manifestSha256"], [r["upperBoundPct"] for r in [*four["seats"], *extra]]),
    ]
    for n, profile in zip((3, 4), profiles, strict=True):
        (ROOT / f"src/flop/qualified-{n}-way.json").write_text(
            json.dumps(profile, indent=2) + "\n", encoding="utf8")
