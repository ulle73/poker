// Synthetic IO smoke only. Outputs are never eligible as recommendation models.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const project = fileURLToPath(new URL("../", import.meta.url));
const exe = resolve(project, ".research/noregrets/target/release/pluribus.exe");
const output = resolve(project, ".research/noregrets-smoke-models");
mkdirSync(output, { recursive: true });
const sha = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const upstream = spawnSync("git", ["-C", ".research/noregrets", "rev-parse", "HEAD"], {
  cwd: project, encoding: "utf8",
});
if (upstream.status !== 0 || upstream.stdout.trim() !== "757f7692738069522195d2b486eec60a8b010c0c")
  throw new Error("Research source revision changed; re-audit before probing.");
const patches = [
  { file: "research/noregrets/advisor-joint-sampling.patch",
    paths: ["src/abstraction.rs", "src/bot.rs", "src/cfr.rs", "src/engine.rs", "src/search.rs"] },
];
const sourcePatches = patches.map(p => ({ file: p.file, sha256: sha(resolve(project, p.file)) }));
function verifySource() {
  const changed = spawnSync("git", ["-C", ".research/noregrets", "diff", "--name-only"], {
    cwd: project, encoding: "utf8",
  });
  const expected = patches.flatMap(p => p.paths).sort().join("\n");
  if (changed.status !== 0 || changed.stdout.trim().split(/\r?\n/).sort().join("\n") !== expected)
    throw new Error("Unexpected research source changes; re-audit before probing.");
  for (const [i, p] of patches.entries()) {
    const diff = spawnSync("git", ["-C", ".research/noregrets", "diff", "--no-ext-diff", "--binary", "--", ...p.paths], {
      cwd: project,
    });
    const saved = resolve(project, p.file);
    if (diff.status !== 0 || !readFileSync(saved).equals(diff.stdout) || sha(saved) !== sourcePatches[i].sha256)
      throw new Error("Research source no longer matches the saved patches.");
  }
}
verifySource();
// Build from the checked source so a stale executable cannot pass this probe.
const buildArgs = ["scripts/native-research-cargo.mjs", "build", "--manifest-path",
  ".research/noregrets/Cargo.toml", "--release", "--locked", "-j", "4"];
const built = spawnSync(process.execPath, buildArgs, {cwd:project, encoding:"utf8", timeout:300000});
const buildLog = "docs/evidence/noregrets-joint-build.log";
writeFileSync(resolve(project, buildLog), (built.stdout + built.stderr).replace(/\r\n/g,"\n").trimEnd() + "\n");
if (built.status !== 0) throw new Error(`Research build failed: ${built.error?.message || built.stderr || built.status}`);
verifySource();
const runs = [];
for (let players = 2; players <= 10; players++) {
  const model = resolve(output, `smoke-${players}.bin`);
  const args = ["train", "--players", String(players), "--iters", "20", "--buckets", "2",
    "--stack", "10000", "--menu", "pluribus", "--train-seed", "395",
    "--raw-buckets", "--rollouts", "2", "--runouts", "1", "--no-prune", "--threads", "2", "--out", model];
  const trained = spawnSync(exe, args, { cwd: project, encoding: "utf8", timeout: 60000 });
  if (trained.status !== 0) throw new Error(`Synthetic ${players}-seat training failed: ${trained.error?.message || trained.stderr || trained.status}`);
  const inspected = spawnSync(exe, ["inspect", "--blueprint", model], { cwd: project, encoding: "utf8", timeout: 30000 });
  if (inspected.status !== 0) throw new Error(`Synthetic model inspection failed: ${inspected.error?.message || inspected.stderr || inspected.status}`);
  if (Number(inspected.stdout.match(/players:\s+(\d+)/)?.[1]) !== players ||
    Number(inspected.stdout.match(/trained iterations:\s+(\d+)/)?.[1]) !== 20)
    throw new Error("Loaded model identity differs from the synthetic request.");
  runs.push({ players, args, training: trained.stdout, inspection: inspected.stdout,
    bytes: statSync(model).size, sha256: sha(model), eligibleForAdvice: false });
  console.log(`${players} seats: trained and loaded synthetic smoke model`);
}
writeFileSync(resolve(project, "docs/evidence/noregrets-joint-training-smoke.json"), JSON.stringify({
  verifiedAt: new Date().toISOString(), goalReady: false, eligibleForAdvice: false,
  scope: "Twenty-traversal synthetic file-IO smoke, all seat counts 2-10. No strategy-quality certification; candidate has known failing strategy tests and artifact-binding gaps.",
  upstreamRevision: upstream.stdout.trim(), sourcePatches,
  build: {args:buildArgs, exitCode:built.status, log:buildLog, logSha256:sha(resolve(project,buildLog))},
  engineSha256: sha(exe), runs,
}, null, 2) + "\n");
