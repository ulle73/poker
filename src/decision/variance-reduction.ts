/** Eq. 9 in Schmid et al. (2019), as used by OpenSpiel outcome sampling.
 * Baselines must be fixed before drawing the current action. They are control
 * variates, not replacement terminal utilities or strategy priors.
 */
export function baselineCorrectedValues(
  baselines: readonly number[],
  selected: number,
  child: number,
  sampleProbability: number,
): number[] {
  if (
    !baselines.length ||
    !baselines.every(Number.isFinite) ||
    !Number.isFinite(child) ||
    !Number.isInteger(selected) ||
    selected < 0 ||
    selected >= baselines.length ||
    !Number.isFinite(sampleProbability) ||
    sampleProbability <= 0 ||
    sampleProbability > 1
  )
    throw new Error("Invalid baseline outcome estimate.");
  const values = [...baselines];
  values[selected] += (child - baselines[selected]) / sampleProbability;
  if (!values.every(Number.isFinite))
    throw new Error("Nonfinite baseline outcome estimate.");
  return values;
}

/** Only the next control variate is bounded. The sampled estimate used in regret
 * updates remains unaltered, preserving the estimator's expectation.
 */
export function learnedBaseline(
  previous: number,
  child: number,
  lower: number,
  upper: number,
): number {
  if (![previous, child, lower, upper].every(Number.isFinite) || lower > upper)
    throw new Error("Invalid learned baseline update.");
  const target = Math.min(upper, Math.max(lower, child));
  return 0.5 * previous + 0.5 * target;
}

/** At opponent nodes sampling equals policy, so p[selected]/q[selected]=1.
 * Cancel it analytically rather than dividing by a potentially tiny number.
 */
export function baselinePolicyValue(
  policy: readonly number[],
  baselines: readonly number[],
  selected: number,
  child: number,
): number {
  if (
    !policy.length ||
    policy.length !== baselines.length ||
    !policy.every((p) => Number.isFinite(p) && p >= 0 && p <= 1) ||
    !baselines.every(Number.isFinite) ||
    !Number.isFinite(child) ||
    !Number.isInteger(selected) ||
    selected < 0 ||
    selected >= policy.length ||
    policy[selected] <= 0
  )
    throw new Error("Invalid baseline policy estimate.");
  const mean = policy.reduce((sum, p, a) => sum + p * baselines[a], 0);
  const value = mean + child - baselines[selected];
  if (!Number.isFinite(value))
    throw new Error("Nonfinite baseline policy estimate.");
  return value;
}
