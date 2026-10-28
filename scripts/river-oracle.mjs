// Deliberately independent, slow 5-of-7 evaluator and scalar river best response.
// This does not call the Rust evaluator, CFR traversal or best-response code.
const rank = "23456789TJQKA";
function score5(cards) {
  const values = cards.map((c) => rank.indexOf(c[0]) + 2).sort((a, b) => b - a),
    count = new Map();
  values.forEach((v) => count.set(v, (count.get(v) || 0) + 1));
  const groups = [...count].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = cards.every((c) => c[1] === cards[0][1]);
  const unique = [...new Set(values)],
    straight =
      unique.length === 5
        ? unique[0] - unique[4] === 4
          ? unique[0]
          : unique.join(",") === "14,5,4,3,2"
            ? 5
            : 0
        : 0;
  let category, kickers;
  if (flush && straight) {
    category = 8;
    kickers = [straight];
  } else if (groups[0][1] === 4) {
    category = 7;
    kickers = groups.map((g) => g[0]);
  } else if (groups[0][1] === 3 && groups[1][1] === 2) {
    category = 6;
    kickers = groups.map((g) => g[0]);
  } else if (flush) {
    category = 5;
    kickers = values;
  } else if (straight) {
    category = 4;
    kickers = [straight];
  } else if (groups[0][1] === 3) {
    category = 3;
    kickers = groups.map((g) => g[0]);
  } else if (groups[0][1] === 2 && groups[1][1] === 2) {
    category = 2;
    kickers = groups.map((g) => g[0]);
  } else if (groups[0][1] === 2) {
    category = 1;
    kickers = groups.map((g) => g[0]);
  } else {
    category = 0;
    kickers = values;
  }
  return [category, ...kickers, ...Array(5 - kickers.length).fill(0)].reduce(
    (s, v) => s * 15 + v,
    0,
  );
}
export function evaluate7(cards) {
  let best = -1;
  for (let a = 0; a < 7; a++)
    for (let b = a + 1; b < 7; b++)
      best = Math.max(best, score5(cards.filter((_, i) => i !== a && i !== b)));
  return best;
}
export function independentRiverReport(result) {
  const byId = new Map(result.nodes.map((n) => [n.id, n]));
  const parse = (s) => s.match(/../g),
    key = (s) => parse(s).sort().join("");
  const rankCache = new Map();
  for (const range of result.rootRanges)
    for (const h of range)
      rankCache.set(
        h.cards,
        evaluate7([...result.nodes[0].board, ...parse(h.cards)]),
      );
  const strategy = new Map(
    result.nodes
      .filter((n) => n.kind === "decision")
      .map((n) => [
        n.id,
        new Map(n.hands.map((h) => [key(h.cards), h.frequencies])),
      ]),
  );
  const rootMass = result.rootRanges[0].reduce(
    (sum, a) =>
      sum +
      a.weight *
        result.rootRanges[1]
          .filter(
            (b) => !parse(b.cards).some((c) => parse(a.cards).includes(c)),
          )
          .reduce((s, b) => s + b.weight, 0),
    0,
  );
  function value(hero, maximize) {
    let total = 0;
    for (const h of result.rootRanges[hero]) {
      const cards = parse(h.cards),
        opponents = result.rootRanges[1 - hero].filter(
          (o) => !parse(o.cards).some((c) => cards.includes(c)),
        );
      function visit(id, weights) {
        const n = byId.get(id);
        if (n.kind === "terminal")
          return opponents.reduce(
            (sum, o, i) =>
              sum +
              (weights[i] *
                (n.terminal.kind === "fold"
                  ? n.terminal.folder === hero
                    ? -1
                    : 1
                  : Math.sign(
                      rankCache.get(h.cards) - rankCache.get(o.cards),
                    )) *
                n.terminal.pot) /
                2,
            0,
          );
        if (n.player === hero) {
          const vals = n.actions.map((a) => visit(a.child, weights));
          if (maximize) return Math.max(...vals);
          const frequencies = strategy.get(id).get(key(h.cards));
          return vals.reduce((s, v, i) => s + v * frequencies[i], 0);
        }
        return n.actions.reduce(
          (sum, a, i) =>
            sum +
            visit(
              a.child,
              weights.map(
                (w, j) => w * strategy.get(id).get(key(opponents[j].cards))[i],
              ),
            ),
          0,
        );
      }
      total +=
        h.weight *
        visit(
          0,
          opponents.map((o) => o.weight),
        );
    }
    return total / rootMass;
  }
  const ev = [value(0, false), value(1, false)],
    bestResponse = [value(0, true), value(1, true)];
  return {
    ev,
    bestResponse,
    gains: bestResponse.map((v, i) => v - ev[i]),
    exploitabilityChips: bestResponse[0] + bestResponse[1],
  };
}
