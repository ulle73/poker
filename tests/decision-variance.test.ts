import { expect, it } from "vitest";
import {
  baselineCorrectedValues,
  learnedBaseline,
  baselinePolicyValue,
} from "../src/decision/variance-reduction";

it("preserves every action expectation under a nonuniform sampling policy and deliberately poor baselines", () => {
  const truth = [3, -2, 10],
    baseline = [100, -20, 7],
    sampling = [0.2, 0.3, 0.5],
    policy = [0.6, 0, 0.4];
  const expectation = [0, 0, 0];
  let mean = 0;
  for (let selected = 0; selected < 3; selected++) {
    const estimate = baselineCorrectedValues(
      baseline,
      selected,
      truth[selected],
      sampling[selected],
    );
    estimate.forEach((v, a) => {
      expectation[a] += sampling[selected] * v;
    });
    mean +=
      sampling[selected] * estimate.reduce((s, v, a) => s + policy[a] * v, 0);
  }
  expectation.forEach((v, a) => expect(v).toBeCloseTo(truth[a], 12));
  expect(mean).toBeCloseTo(5.8, 12);
});

it("has zero action-sampling variance for exact deterministic continuation baselines", () => {
  const truth = [3, -2, 10],
    sampling = [0.2, 0.3, 0.5],
    policy = [0.6, 0, 0.4];
  for (let selected = 0; selected < 3; selected++) {
    const estimate = baselineCorrectedValues(
      truth,
      selected,
      truth[selected],
      sampling[selected],
    );
    expect(estimate).toEqual(truth);
    expect(estimate.reduce((s, v, a) => s + policy[a] * v, 0)).toBeCloseTo(
      5.8,
      14,
    );
  }
});

it("bounds only future baseline targets while retaining large corrected utility estimates", () => {
  const future = learnedBaseline(0, 1e6, -5, 8);
  expect(future).toBe(4);
  expect(baselineCorrectedValues([future, 0], 0, 1e6, 0.5)[0]).toBe(1999996);
  expect(learnedBaseline(0, -1e6, -5, 8)).toBe(-2.5);
});

it("computes opponent policy returns without dividing tiny sampled action probabilities", () => {
  expect(baselinePolicyValue([1, Number.MIN_VALUE], [0, 0], 1, 10)).toBe(10);
  expect(baselinePolicyValue([1, 0], [7, 9], 0, 3)).toBe(3);
});

it.each([0, -1, Infinity, NaN, 1.1])(
  "rejects invalid selected sample probability %s",
  (q) => {
    expect(() => baselineCorrectedValues([1, 2], 0, 4, q)).toThrow();
  },
);

it("rejects nonfinite corrected values instead of normalizing them into advice", () => {
  expect(() =>
    baselineCorrectedValues([0, 1], 0, Number.MAX_VALUE, 0.1),
  ).toThrow(/nonfinite/i);
});
