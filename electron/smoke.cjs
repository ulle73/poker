const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
exports.run = async (win) => {
  const errors = [];
  win.webContents.on("console-message", (event) => {
    if (event.level === "error") errors.push(event.message);
  });
  const poll = async (script, timeout = 15000) => {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (await win.webContents.executeJavaScript(script)) return;
      await wait(100);
    }
    throw new Error(`Timed out: ${script}`);
  };
  await poll(
    `document.querySelector('.connection')?.textContent.includes('DOM synkroniserad') && document.querySelector('.recommendation')?.textContent.includes('Call')`,
  );
  const before = await win.webContents.executeJavaScript(
    `({origin:location.origin,node:typeof window.require,ready:document.querySelector('.connection').textContent,frequency:document.querySelector('.action-mix').innerText,storage:JSON.parse(localStorage.getItem('poker-trainer-session-v1')).records.length,iframeScroll:(()=>{const d=document.querySelector('iframe').contentDocument;return {height:d.documentElement.clientHeight,scroll:d.documentElement.scrollHeight}})()})`,
  );
  assert.equal(before.origin, "poker://app");
  assert.equal(before.node, "undefined");
  await win.webContents.executeJavaScript(
    `document.querySelector('iframe').contentDocument.querySelectorAll('.table-actions button')[1].click()`,
  );
  await poll(`!!document.querySelector('.feedback')`);
  const after = await win.webContents.executeJavaScript(
    `JSON.parse(localStorage.getItem('poker-trainer-session-v1')).records.length`,
  );
  assert.equal(after, before.storage + 1);
  await win.webContents.executeJavaScript(
    `document.querySelector('.feedback button').click()`,
  );
  await poll(
    `document.querySelector('iframe').contentDocument.body.innerText.includes('Övningshanden är avslutad')`,
  );
  await win.webContents.reload();
  await poll(
    `document.querySelector('.connection')?.textContent.includes('DOM synkroniserad')`,
  );
  const reloaded = await win.webContents.executeJavaScript(
    `JSON.parse(localStorage.getItem('poker-trainer-session-v1')).records.length`,
  );
  assert.equal(reloaded, after);
  const drills = [
    "Fånga bluffen",
    "Ta betalt med set",
    "Välj dina bluffar",
    "När motståndaren checkar",
    "Överpar under press",
    "Draget som missade",
  ];
  const scenarios = [];
  for (const title of drills) {
    await win.webContents.executeJavaScript(
      `Array.from(document.querySelectorAll('.drill-list button')).find(b=>b.innerText.includes(${JSON.stringify(title)})).click()`,
    );
    await poll(
      `document.querySelector('.table-panel h2')?.textContent===${JSON.stringify(title)} && document.querySelector('.connection')?.textContent.includes('DOM synkroniserad') && !!document.querySelector('.recommendation')`,
    );
    scenarios.push(
      await win.webContents.executeJavaScript(
        `({title:document.querySelector('.table-panel h2').textContent,advice:document.querySelector('.recommendation').innerText,actions:document.querySelector('iframe').contentDocument.querySelectorAll('.table-actions button').length})`,
      ),
    );
  }
  await win.webContents.executeJavaScript(
    `document.querySelector('.drill-list button').click()`,
  );
  await poll(
    `document.querySelector('.table-panel h2')?.textContent==='Fånga bluffen' && !!document.querySelector('.recommendation')`,
  );
  const output = path.resolve(process.env.POKER_SMOKE_OUTPUT || "artifacts");
  await fs.mkdir(output, { recursive: true });
  const layouts = [];
  win.setMinimumSize(320, 400);
  for (const width of [1440, 768, 390]) {
    win.setContentSize(width, width === 390 ? 844 : 900);
    await wait(150);
    const layout = await win.webContents.executeJavaScript(
      `({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,tableHeight:document.querySelector('iframe').contentDocument.documentElement.clientHeight,tableScroll:document.querySelector('iframe').contentDocument.documentElement.scrollHeight})`,
    );
    assert.equal(layout.overflow, false, `page overflow at ${width}`);
    assert.equal(
      layout.tableHeight,
      layout.tableScroll,
      `table scroll at ${width}`,
    );
    layouts.push(layout);
    const image = await win.webContents.capturePage();
    await fs.writeFile(
      path.join(output, `desktop-${width}.png`),
      image.toPNG(),
    );
  }
  win.setContentSize(1440, 900);
  // Expected CSP failures below are evidence, not runtime defects.
  const runtimeErrors = [...errors];
  errors.length = 0;
  const remote = await win.webContents.executeJavaScript(
    `fetch('https://example.com').then(()=>false).catch(()=>true)`,
  );
  assert.equal(remote, true);
  const image = await win.webContents.capturePage();
  await fs.writeFile(path.join(output, "desktop-smoke.png"), image.toPNG());
  assert.equal(runtimeErrors.length, 0, "unexpected renderer errors");
  require("electron").session.defaultSession.flushStorageData();
  const report = {
    verifiedAt: new Date().toISOString(),
    packaged: require("electron").app.isPackaged,
    electron: process.versions.electron,
    origin: before.origin,
    nodeIntegrationExposed: before.node,
    dom: before.ready,
    frequencies: before.frequency,
    decisionSaved: true,
    savedCountBeforeLaunch: before.storage,
    savedCountAfter: after,
    persistedAfterReload: reloaded === after,
    remoteFetchBlocked: remote,
    iframe: before.iframeScroll,
    scenarios,
    layouts,
    consoleErrors: runtimeErrors,
    expectedBlockedNetworkErrors: errors,
  };
  await fs.writeFile(
    path.join(output, "desktop-smoke.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
};
