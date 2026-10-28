import { describe, expect, it } from "vitest";
import { normalizeCards, handKey } from "../src/core/cards";
import { validateConfig, configToToml } from "../src/core/config";
import { DRILLS } from "../src/core/drills";
import { actionCost, adviceFor, validateSnapshot } from "../src/core/strategy";
import { readTableDom } from "../src/table/dom-adapter";

describe("cards and solve configuration", () => {
  it("normalizes ranks/suits and rejects duplicates, garbage and oversized input", () => {
    expect(normalizeCards("aH 10d kc")).toEqual(["Ah", "Td", "Kc"]);
    expect(handKey(["Kh", "Ah"])).toBe(handKey(["Ah", "Kh"]));
    expect(() => normalizeCards("Ah Ah")).toThrow(/dubb/i);
    expect(() => normalizeCards("AX")).toThrow();
    expect(() => normalizeCards("Ah".repeat(2000))).toThrow();
  });
  it("validates every drill and produces explicit, bounded river configuration", () => {
    for (const drill of DRILLS) {
      expect(validateConfig(drill.config)).toEqual(drill.config);
      expect(configToToml(drill.config)).toContain("raise_cap = 1");
    }
    expect(() =>
      validateConfig({ ...DRILLS[0].config, board: ["Ah", "Kd", "Qc"] }),
    ).toThrow(/river/i);
    expect(() => validateConfig({ ...DRILLS[0].config, pot: 0 })).toThrow();
    expect(() =>
      validateConfig({ ...DRILLS[0].config, stack: Infinity }),
    ).toThrow();
    expect(() =>
      validateConfig({ ...DRILLS[0].config, oopRange: 'AA"\nfoo=1' }),
    ).toThrow();
  });
});

const node = {
  id: 5,
  kind: "decision" as const,
  player: 0,
  pot: 30,
  stacks: [40, 30],
  board: ["Ks", "7d", "2c", "8h", "3d"],
  street: "river",
  actions: [
    {
      label: "fold",
      child: 6,
      amount_to: null,
      text: "Fold",
      percent_of_pot: null,
    },
    {
      label: "call",
      child: 7,
      amount_to: null,
      text: "Call",
      percent_of_pot: null,
    },
    {
      label: "raise",
      child: 8,
      amount_to: 35,
      text: "Raise",
      percent_of_pot: 50,
    },
  ],
  hands: [
    {
      cards: "ThTc",
      weight: 1,
      compatibleMass: 1,
      ev: 0,
      frequencies: [0.2, 0.8, 0],
      actionEvs: [-10, 2, -3],
    },
  ],
};
describe("strategy identity and sizing", () => {
  it("separates call cost from raise total and handles previously invested chips", () => {
    expect(actionCost(node, node.actions[1], 40)).toBe(10);
    expect(actionCost(node, node.actions[2], 40)).toBe(35);
    expect(actionCost({ ...node, stacks: [35, 20] }, node.actions[2], 40)).toBe(
      30,
    );
  });
  it("returns actual mixed strategy only for reachable compatible combos", () => {
    expect(adviceFor(node, ["Tc", "Th"])?.frequencies).toEqual([0.2, 0.8, 0]);
    expect(adviceFor(node, ["Ah", "Ad"])).toBeNull();
    expect(
      adviceFor({ ...node, hands: [{ ...node.hands[0], weight: 0 }] }, [
        "Th",
        "Tc",
      ]),
    ).toBeNull();
    expect(
      adviceFor({ ...node, hands: [{ ...node.hands[0], compatibleMass: 0 }] }, [
        "Th",
        "Tc",
      ]),
    ).toBeNull();
  });
  it("rejects mismatched identity, duplicate cards and chip state", () => {
    const snapshot = {
      version: 1,
      source: "local-training-dom",
      token: "secret",
      handId: "h1",
      revision: 1,
      configKey: "k",
      nodeId: 5,
      hero: 0,
      heroCards: ["Th", "Tc"],
      board: node.board,
      pot: 30,
      stacks: node.stacks,
      street: "river",
      history: [],
      capturedAt: Date.now(),
    };
    expect(
      validateSnapshot(snapshot, {
        token: "secret",
        handId: "h1",
        configKey: "k",
        node,
      }),
    ).toBe(true);
    expect(
      validateSnapshot(
        { ...snapshot, pot: 31 },
        { token: "secret", handId: "h1", configKey: "k", node },
      ),
    ).toBe(false);
    expect(
      validateSnapshot(
        { ...snapshot, heroCards: ["Ks", "Th"] },
        { token: "secret", handId: "h1", configKey: "k", node },
      ),
    ).toBe(false);
    expect(
      validateSnapshot(
        { ...snapshot, token: "other" },
        { token: "secret", handId: "h1", configKey: "k", node },
      ),
    ).toBe(false);
    expect(
      validateSnapshot(
        { ...snapshot, capturedAt: Date.now() - 10000 },
        { token: "secret", handId: "h1", configKey: "k", node },
      ),
    ).toBe(false);
  });
});

describe("DOM extraction", () => {
  it("reads rendered elements and ignores hidden placeholder cards", () => {
    document.body.innerHTML = `<main data-poker-table data-token="t" data-hand-id="h" data-revision="2" data-config-key="k" data-node-id="0" data-hero="0" data-street="river">
      <div data-board><i data-card="Ks"></i><i data-card="7d"></i><i data-card="2c"></i><i data-card="8h"></i><i data-card="3d"></i><i data-card="5c" hidden></i><i style="visibility:hidden" data-card="Ac"></i></div>
      <div data-hole><i data-card="Th"></i><i data-card="Tc"></i></div><span data-pot>10</span>
      <span data-stack="0">40</span><span data-stack="1">40</span>
      <ol data-history><li data-player="1" data-street="turn" data-action="check" data-amount="0">IP check</li></ol>
    </main>`;
    const s = readTableDom(document);
    expect(s?.board).toEqual(["Ks", "7d", "2c", "8h", "3d"]);
    expect(s?.pot).toBe(10);
    expect(s?.history[0].street).toBe("turn");
    document.querySelector("[data-pot]")!.textContent = "NaN";
    expect(() => readTableDom(document)).toThrow();
  });
});
