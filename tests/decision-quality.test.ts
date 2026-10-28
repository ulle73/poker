import { expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { prepareDecision } from "../src/decision/adapter";
import { solveDecision } from "../src/decision/mccfr";
import type { LiveSnapshot } from "../src/live/types";
// Explicit diagnostic, not an assertion that any hand has a known optimal mix.
// $env:POKER_QUALITY_PROBE='1'; npx vitest run tests/decision-quality.test.ts --pool=threads --maxWorkers=1
it.skipIf(process.env.POKER_QUALITY_PROBE !== "1")(
  "records full-range reliability limitations without certifying an equilibrium",
  () => {
    const runs = [];
    for (const count of [2, 10])
      for (const seed of [19, 395])
        for (const heroCards of [
          ["As", "Kh"],
          ["7s", "2h"],
        ]) {
          const s: LiveSnapshot = {
            version: 1,
            source: "svenskaspel-dom",
            readerId: "quality-probe",
            sequence: 1,
            handId: "1",
            capturedAt: Date.now(),
            currency: "EUR",
            maxSeats: count,
            players: Array.from({ length: count }, (_, i) => ({
              seat: i + 1,
              hero: i === 0,
              position:
                i === 0
                  ? count === 2
                    ? "BTN / SB"
                    : "SB"
                  : i === 1
                    ? "BB"
                    : i === count - 1
                      ? "BTN"
                      : "Övrig",
              stack: 2,
              bet: i === 0 ? 0.01 : 0.02,
              folded: false,
              inHand: true,
            })),
            heroCards,
            board: [],
            pot: 0.01 + (count - 1) * 0.02,
            street: "preflop",
            dealerSeat: count === 2 ? 1 : count,
            heroTurn: true,
            availableActions: ["Fold", "Syna", "Höj Till"],
            valid: true,
            issues: [],
            observedActions: [],
          };
          const input = prepareDecision(s, { minBet: 2 });
          const result = solveDecision(input, { seed, timeBudgetMs: 1500 });
          expect(result.quality).toBe("approximation");
          expect(result.exploitabilityPct).toBeNull();
          runs.push({
            count,
            seed,
            heroCards,
            input: {
              stacks: input.state.stacks,
              bets: input.state.bets,
              minBet: 2,
              ranges: input.ranges,
              rules: input.rules,
              chipUnit: input.chipUnit,
            },
            result,
          });
        }
    writeFileSync(
      "docs/evidence/decision-quality.json",
      JSON.stringify(
        {
          verifiedAt: new Date().toISOString(),
          qualityAssessment: "failed-reliability-audit",
          goalReady: false,
          observedConcern:
            "Strong-hand shove frequencies are systematically extreme in this 100bb model; no independently evaluated best-response certificate exists for these full-range results.",
          mechanism:
            "Full-range private/public information sets receive sparse training. Table/depth/deadline cuts use unconditional check/call continuation. The root can exploit unfinished/artificial responses.",
          interpretation:
            "This diagnostic records an observed failure of validation. It does not assert an externally solved optimal mix for these fixtures. The ten-player fixture represents earlier limps to SB; those ranges remain uniform assumptions, not a derived limping strategy.",
          releaseDecision:
            "Experimental provider hidden by default. Only separately certified matched HU river trees may show production recommendations.",
          runs,
        },
        null,
        2,
      ),
    );
  },
  30000,
);
