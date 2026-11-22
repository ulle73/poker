import { app, BrowserWindow } from "electron";
import { readFileSync, writeFileSync } from "node:fs";
import { cpus, release } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { cardCode } from "phe";
import type { DecisionInput, DecisionPolicy } from "../../src/decision/types";
import { openPrecomputedPolicy } from "./precomputed-policy";

async function measure() {
  const folder = process.env.POKER_RAISED_POSTFLOP_PROFILE;
  const trainingFile = process.env.POKER_RAISED_POSTFLOP_TRAINING_REPORT;
  const output = process.env.POKER_RAISED_POSTFLOP_WINDOWS_OUTPUT;
  if (!folder || !trainingFile || !output || process.platform !== "win32") {
    throw new Error("Run on Windows with the profile, training report and output directory");
  }
  const training = JSON.parse(readFileSync(trainingFile, "utf8")) as {
    input: DecisionInput;
    heroRow: ReturnType<DecisionPolicy["query"]>;
    artifact: { manifestSha256: string };
  };
  const { input, artifact } = training;
  const encode = (card: string) => cardCode(card[0], card[1]);
  const hero = input.heroCards.map(encode), board = input.board.map(encode);
  const window = new BrowserWindow({ show: false, width: 600, height: 340,
    webPreferences: { backgroundThrottling: false, sandbox: true } });
  const streetLabel = { flop: "flop", turn: "turn", river: "river", preflop: "preflop" }[input.state.street];
  const html = `<meta charset="utf-8"><title>Prov av förberäknad ${streetLabel}</title>
    <style>body{font:16px system-ui;margin:26px} pre{line-height:1.55}</style>
    <h1>Förberäknad ${streetLabel}, ${input.seats.length} spelare</h1><p>Lokalt forskningsprov</p><pre id="result"></pre>`;
  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  const runs = [];
  for (let attempt = 0; attempt < 6; attempt++) {
    const requestedAt = performance.now();
    const { policy, manifestSha256 } = openPrecomputedPolicy(folder, input, "root");
    const row = policy.query(input.state, hero, board);
    const lookupMs = performance.now() - requestedAt;
    if (manifestSha256 !== artifact.manifestSha256 || JSON.stringify(row) !== JSON.stringify(training.heroRow)) {
      throw new Error("Windows lookup did not reproduce the archived row");
    }
    const formatter = new Intl.NumberFormat("sv-SE", { style: "percent", maximumFractionDigits: 2 });
    const labels = { fold: "Lägg dig", call: "Syna", raise: "Höj" };
    const text = [
      [...input.heroCards, "mot", ...input.board].join(" "),
      ...row.actions.map(({ kind, to, allIn }, i) =>
        `${labels[kind as keyof typeof labels]}${to ? ` ${to}` : ""}${allIn ? " all-in" : ""}   ${formatter.format(row.frequencies[i])}`),
    ].join("\n");
    const rendered = await window.webContents.executeJavaScript(`{
      const element = document.getElementById('result');
      element.textContent = ${JSON.stringify(text)};
      new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() =>
        resolve(element.getBoundingClientRect().bottom <= window.innerHeight ? element.innerText : null))));
    }`);
    const image = await window.webContents.capturePage();
    const renderedMs = performance.now() - requestedAt;
    if (rendered !== text || image.isEmpty()) throw new Error("Windows did not render the measured hand row");
    runs.push({ mode: attempt === 0 ? "cold-in-process" : "warm", lookupMs, renderedMs });
    if (!attempt) writeFileSync(join(output, "windows-frame.png"), image.toPNG());
  }
  writeFileSync(join(output, "windows-timing.json"), JSON.stringify({ platform: process.platform,
    windows: release(), electron: process.versions.electron, cpu: cpus()[0].model,
    standaloneResearchWindow: true, manifestSha256: artifact.manifestSha256,
    qualityGateEvaluatedByWindow: false, runs, underTenSeconds: runs.every(({ renderedMs }) => renderedMs < 10_000),
  }, null, 2) + "\n");
  window.close();
  app.exit(0);
}

void app.whenReady().then(measure).catch((error) => {
  const output = process.env.POKER_RAISED_POSTFLOP_WINDOWS_OUTPUT;
  if (output) writeFileSync(join(output, "windows-error.txt"), `${String(error)}\n`);
  app.exit(1);
});
