// Independent verifier for the restricted equal-stack, river check/jam fixture.
// Uses exported mixed strategies only, never exported CFVs/EVs/terminal payoffs.
// A best response is chosen per own hand and observed public history, after
// aggregating all compatible opponent tuples: it cannot see opponents' cards.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { evaluate7 } from "./river-oracle.mjs";

const directory = path.dirname(fileURLToPath(import.meta.url));
const spotPath = path.resolve(
  process.argv[2] ??
    path.join(directory, "../docs/evidence/multiway-3p-spot.json"),
);
const solutionPath = path.resolve(
  process.argv[3] ??
    path.join(directory, "../docs/evidence/multiway-3p-solution.json"),
);
const spot = JSON.parse(fs.readFileSync(spotPath, "utf8"));
const solution = JSON.parse(fs.readFileSync(solutionPath, "utf8"));
const n = spot.players.length;
assert.equal(
  n,
  3,
  "This oracle intentionally verifies the three-player fixture only.",
);
assert.equal(spot.street, "river");
assert.equal(spot.rake, 0);
assert.equal(new Set(spot.stacks).size, 1, "Equal stacks required.");
assert.equal(
  new Set(spot.contributions).size,
  1,
  "Equal contributions required.",
);
assert.equal(
  spot.stacks[0],
  spot.gross_pot * 0.5,
  "Fixture bet must coincide with all-in.",
);
assert.deepEqual(spot.betting_policy.fixed_pot_fractions, [0.5]);
assert.deepEqual(solution.players, spot.players);
assert.deepEqual(solution.board, spot.board);
const cards = (hand) => hand.match(/../g);
const key = (hand) => cards(hand).sort().join("");
const ranges = spot.ranges.map((range) =>
  range.split(",").map((token) => {
    const [hand, weight = "1"] = token.trim().split(":");
    assert.match(
      hand,
      /^[2-9TJQKA][shdc][2-9TJQKA][shdc]$/,
      "Exact combos required.",
    );
    assert.equal(new Set(cards(hand)).size, 2);
    return {
      hand,
      key: key(hand),
      cards: cards(hand),
      weight: Number(weight),
      rank: evaluate7([...spot.board, ...cards(hand)]),
    };
  }),
);
const tuples = [];
function enumerate(seat, chosen, used, weight) {
  if (seat === n) {
    tuples.push({ hands: chosen, weight });
    return;
  }
  for (const hand of ranges[seat]) {
    if (hand.cards.some((card) => used.has(card))) continue;
    enumerate(
      seat + 1,
      [...chosen, hand],
      new Set([...used, ...hand.cards]),
      weight * hand.weight,
    );
  }
}
enumerate(0, [], new Set(spot.board), 1);
const chanceMass = tuples.reduce((sum, tuple) => sum + tuple.weight, 0);
assert.ok(chanceMass > 0, "Ranges must contain a jointly feasible deal.");
const nodes = new Map(
  solution.solved_nodes.map((node) => [node.node_id, node]),
);
const states = new Map();
let decisions = 0,
  terminals = 0;
const initial = {
  committed: [...spot.contributions],
  stacks: [...spot.stacks],
  folded: Array(n).fill(false),
  pending: Array(n).fill(true),
  actor: spot.players.indexOf(spot.root_actor),
};
function terminal(state) {
  return (
    state.folded.filter((folded) => !folded).length === 1 ||
    !state.pending.some(Boolean)
  );
}
function labels(state) {
  return Math.max(...state.committed) > state.committed[state.actor]
    ? ["fold", "call"]
    : ["check", "all_in"];
}
function apply(state, action) {
  const next = structuredClone(state),
    actor = state.actor;
  next.pending[actor] = false;
  if (action === "fold") next.folded[actor] = true;
  else if (action === "call" || action === "all_in") {
    const paid =
      action === "all_in"
        ? next.stacks[actor]
        : Math.min(
            next.stacks[actor],
            Math.max(...next.committed) - next.committed[actor],
          );
    next.committed[actor] += paid;
    next.stacks[actor] -= paid;
    if (action === "all_in")
      next.pending = next.stacks.map(
        (stack, seat) => seat !== actor && !next.folded[seat] && stack > 0,
      );
  }
  if (!terminal(next)) {
    let found = false;
    for (let offset = 1; offset <= n; offset++) {
      const candidate = (actor + offset) % n;
      if (
        next.pending[candidate] &&
        !next.folded[candidate] &&
        next.stacks[candidate] > 0
      ) {
        next.actor = candidate;
        found = true;
        break;
      }
    }
    assert.ok(found, "Independent betting state must have a next actor.");
  }
  return next;
}
function validateTree(id, state) {
  assert.ok(!states.has(id), "Expected a tree, not a merged graph.");
  states.set(id, state);
  const node = nodes.get(id);
  assert.ok(node, "Referenced node must exist.");
  assert.equal(
    node.kind === "terminal",
    terminal(state),
    `Independent terminal mismatch at ${id}`,
  );
  if (terminal(state)) {
    terminals++;
    return;
  }
  decisions++;
  assert.equal(node.acting_seat, state.actor);
  assert.equal(
    node.actions.length,
    2,
    "Fixture has exactly two legal actions at each decision.",
  );
  node.actions.forEach((action, i) => {
    assert.equal(action.action_index, i);
    assert.ok(
      action.action === String(i) || action.action === labels(state)[i],
    );
    validateTree(action.child_node_id, apply(state, labels(state)[i]));
  });
}
validateTree(solution.root_node_id, initial);
assert.equal(states.size, nodes.size, "All exported nodes must be reachable.");
function policy(node, hand) {
  const row = node.strategy_rows.find((row) => key(row.hand) === hand.key);
  assert.ok(
    row,
    `Missing own-hand strategy for acting seat ${node.acting_seat}, hand ${hand.hand}, node ${node.node_id}`,
  );
  assert.equal(row.strategy.length, node.actions.length);
  const weights = row.strategy.map((action, i) => {
    assert.ok(
      action.action === String(i) ||
        action.action === labels(states.get(node.node_id))[i],
    );
    assert.ok(Number.isFinite(action.frequency) && action.frequency >= 0);
    return action.frequency;
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-5, "Policy must sum to one.");
  return weights.map((weight) => weight / sum); // Only remove float export roundoff.
}
function payoff(state, tuple, hero) {
  const live = state.folded
    .map((folded, seat) => (folded ? -1 : seat))
    .filter((seat) => seat >= 0);
  const best = Math.max(...live.map((seat) => tuple.hands[seat].rank));
  const winners = live.filter((seat) => tuple.hands[seat].rank === best);
  const pot = state.committed.reduce((a, b) => a + b, 0);
  return (
    -state.committed[hero] + (winners.includes(hero) ? pot / winners.length : 0)
  );
}
let infosetChoices = 0;
function value(id, belief, hero, ownHand, bestResponse, purePolicy) {
  const node = nodes.get(id),
    state = states.get(id);
  if (node.kind === "terminal")
    return belief.reduce(
      (sum, tuple) => sum + tuple.weight * payoff(state, tuple, hero),
      0,
    );
  if (node.acting_seat === hero) {
    const childValues = node.actions.map((action) =>
      value(
        action.child_node_id,
        belief,
        hero,
        ownHand,
        bestResponse,
        purePolicy,
      ),
    );
    if (purePolicy) return childValues[purePolicy.get(id)];
    if (bestResponse) {
      infosetChoices++;
      return Math.max(...childValues);
    }
    const frequencies = policy(node, ownHand);
    return childValues.reduce(
      (sum, child, i) => sum + frequencies[i] * child,
      0,
    );
  }
  return node.actions.reduce((sum, action, index) => {
    const childBelief = belief.map((tuple) => ({
      ...tuple,
      weight: tuple.weight * policy(node, tuple.hands[node.acting_seat])[index],
    }));
    return (
      sum +
      value(
        action.child_node_id,
        childBelief,
        hero,
        ownHand,
        bestResponse,
        purePolicy,
      )
    );
  }, 0);
}
const players = ranges.map((range, hero) => {
  let baseline = 0,
    bestResponse = 0;
  const hands = range.map((ownHand) => {
    const belief = tuples.filter(
      (tuple) => tuple.hands[hero].key === ownHand.key,
    );
    const mass = belief.reduce((sum, tuple) => sum + tuple.weight, 0);
    const current = value(solution.root_node_id, belief, hero, ownHand, false);
    const best = value(solution.root_node_id, belief, hero, ownHand, true);
    // Independent second method: exhaust every pure public-history policy for
    // this fixed private hand (4 infosets => 16 strategies in this fixture).
    const ownNodes = [...nodes.values()].filter(
      (node) => node.kind === "player" && node.acting_seat === hero,
    );
    assert.ok(ownNodes.length <= 12, "Keep exhaustive self-check bounded.");
    let exhaustiveBest = -Infinity;
    for (let mask = 0; mask < 2 ** ownNodes.length; mask++) {
      const pure = new Map(
        ownNodes.map((node, index) => [node.node_id, (mask >> index) & 1]),
      );
      exhaustiveBest = Math.max(
        exhaustiveBest,
        value(solution.root_node_id, belief, hero, ownHand, false, pure),
      );
    }
    assert.ok(
      Math.abs(best - exhaustiveBest) < 1e-8,
      "Belief-state BR must match exhaustive pure-strategy enumeration.",
    );
    baseline += current;
    bestResponse += best;
    return {
      hand: ownHand.hand,
      compatibleChanceMass: mass,
      baselineEV: current / mass,
      bestResponseEV: best / mass,
      gain: (best - current) / mass,
    };
  });
  return {
    seat: hero,
    player: spot.players[hero],
    baselineEV: baseline / chanceMass,
    bestResponseEV: bestResponse / chanceMass,
    gain: (bestResponse - baseline) / chanceMass,
    hands,
  };
});
const sumBaselineEV = players.reduce(
  (sum, player) => sum + player.baselineEV,
  0,
);
assert.ok(
  Math.abs(sumBaselineEV) < 1e-7,
  "Independent zero-rake profile payoffs must sum to zero.",
);
players.forEach((player) =>
  assert.ok(player.gain >= -1e-7, "Best response must not lose to baseline."),
);
const nashConv = players.reduce((sum, player) => sum + player.gain, 0);
console.log(
  JSON.stringify(
    {
      scope:
        "Exact best responses against exported mixed profile in this restricted three-player river check/jam game only; no general NLHE claim.",
      solution: solutionPath,
      iterations: solution.solver.iterations,
      compatibleTuples: tuples.length,
      chanceMass,
      decisions,
      terminals,
      infosetChoices,
      exhaustivePurePolicyCrossCheck:
        "passed for every player and private hand",
      sumBaselineEV,
      nashConv,
      nashConvPotFraction: nashConv / spot.gross_pot,
      maxUnilateralGain: Math.max(...players.map((player) => player.gain)),
      maxUnilateralGainPotFraction:
        Math.max(...players.map((player) => player.gain)) / spot.gross_pot,
      players,
    },
    null,
    2,
  ),
);
