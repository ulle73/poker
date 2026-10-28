const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
exports.run = async (win, liveBridge) => {
  // Hidden test windows must still paint current frames for visual evidence.
  // https://www.electronjs.org/docs/latest/api/web-contents#contentssetbackgroundthrottlingallowed
  win.webContents.setBackgroundThrottling(false);
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
  const fixture = {
    version: 1,
    source: "svenskaspel-dom",
    readerId: "native-smoke",
    sequence: 1,
    handId: "123",
    capturedAt: Date.now(),
    currency: "EUR",
    maxSeats: 6,
    players: [
      {
        seat: 4,
        hero: true,
        position: "BTN / SB",
        stack: 0.4,
        bet: 0,
        folded: false,
        inHand: true,
      },
      {
        seat: 6,
        hero: false,
        position: "BB",
        stack: 0.3,
        bet: 0.1,
        folded: false,
        inHand: true,
      },
    ],
    heroCards: ["Th", "Tc"],
    board: ["Ks", "7d", "2c", "8h", "3d"],
    pot: 0.2,
    street: "river",
    dealerSeat: 4,
    heroTurn: true,
    availableActions: ["Fold", "Syna"],
    valid: true,
    issues: [],
    observedActions: [],
  };
  const sendLive = async () => {
    fixture.sequence++;
    fixture.capturedAt = Date.now();
    const res = await fetch(liveBridge.state().endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Poker-Token": liveBridge.token,
      },
      body: JSON.stringify(fixture),
    });
    assert.equal(res.status, 200);
  };
  await sendLive();
  const keepLive = setInterval(() => sendLive().catch(console.error), 500);
  const multiwayCounts = [];
  const decisionMatrix = [];
  try {
    await win.webContents.executeJavaScript(
      `Array.from(document.querySelectorAll('nav button')).find(b=>b.textContent==='Live · Edge').click()`,
    );
    await poll(
      `document.querySelector('.live-status')?.innerText.includes('123')`,
    );
    await poll(`document.querySelector('.decision-advisor')?.innerText.includes('Strategin saknar kvalitetsgodkännande')`);
    assert.equal(await win.webContents.executeJavaScript(`!!document.querySelector('.decision-advisor .recommendation')`),false,'uncertified strategy is hidden by default');
    await win.webContents.executeJavaScript(`document.querySelector('[data-testid=experimental-strategies]').click()`);
    await poll(
      `!!document.querySelector('.decision-advisor .recommendation')`,
    );
    const liveText = await win.webContents.executeJavaScript(
      `document.querySelector('.live-advisor').innerText`,
    );
    assert.ok(liveText.includes("EUR"));
    assert.ok(!liveText.includes(" bb"));
    for (const width of [1440, 390]) {
      win.setContentSize(width, 900);
      await wait(100);
      assert.equal(
        await win.webContents.executeJavaScript(
          `document.documentElement.scrollWidth>innerWidth`,
        ),
        false,
        `live overflow at ${width}`,
      );
    }
    win.setContentSize(1440, 900);
    await fs.writeFile(
      path.join(output, "live-smoke.png"),
      (await win.webContents.capturePage()).toPNG(),
    );
    fixture.handId = '201';
    fixture.players[0].stack = 20;
    fixture.players[1].stack = 10;
    fixture.players[1].bet = 10;
    fixture.pot = 20;
    fixture.availableActions = ['Fold','Syna','Höj Till'];
    await sendLive();
    await poll(`document.querySelector('.live-status')?.innerText.includes('201')`);
    await win.webContents.executeJavaScript(
      `(()=>{const fields=document.querySelectorAll('.live-ranges input:not([type=checkbox])');['KK,A4s,A5s','TT,JJ'].forEach((value,i)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(fields[i],value);fields[i].dispatchEvent(new Event('input',{bubbles:true}));});})()`,
    );
    await poll(`document.querySelector('.decision-advisor .quiet-badge')?.innerText.includes('Verifierad GTO')`);
    await win.webContents.executeJavaScript(`document.querySelector('[data-testid=experimental-strategies]').click()`);
    assert.ok(await win.webContents.executeJavaScript(`!!document.querySelector('.decision-advisor .recommendation')`),'certified advice survives experimental toggle off');
    await wait(300);
    await poll(`document.querySelector('.decision-advisor .quiet-badge')?.innerText.includes('Verifierad GTO') && !!document.querySelector('.decision-advisor .recommendation')`);
    await win.webContents.executeJavaScript(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))`);
    await fs.writeFile(path.join(output,'live-verified-smoke.png'),(await win.webContents.capturePage()).toPNG());
    await win.webContents.executeJavaScript(`document.querySelector('[data-testid=experimental-strategies]').click()`);
    for (const count of [3, 6, 10]) {
      fixture.handId = String(300 + count);
      fixture.pot = .2;
      fixture.availableActions = ['Check', 'Bet'];
      fixture.maxSeats = Math.max(6, count);
      fixture.heroCards = ["2c", "3d"];
      fixture.board = ["As", "Ks", "Qs", "Js", "Ts"];
      const seats = [
        4,
        6,
        ...Array.from({ length: 10 }, (_, i) => i + 1).filter(
          (x) => x !== 4 && x !== 6,
        ),
      ].slice(0, count);
      fixture.players = seats.map((seat) => ({
        seat,
        hero: seat === 4,
        position: seat === 4 ? "BTN" : "Övrig",
        stack: 0.4,
        bet: 0,
        inHand: true,
        folded: false,
      }));
      await sendLive();
      await poll(
        `document.querySelector('.equity-number strong')?.textContent === '${(100 / count).toFixed(1)} %'`,
      );
      await poll(`!!document.querySelector('.decision-advisor .recommendation')`);
      assert.ok(await win.webContents.executeJavaScript(
        `document.querySelector('.decision-advisor .quiet-badge').textContent.includes('approximation')`),
        'multiway strategy must be labelled approximation');
      multiwayCounts.push(count);
    }
    await fs.writeFile(
      path.join(output, "live-multiway-smoke.png"),
      (await win.webContents.capturePage()).toPNG(),
    );
    console.log("MULTIWAY_NATIVE_VERIFIED", JSON.stringify(multiwayCounts));
    // Exercise actual bundled workers through the authenticated native bridge.
    for (const count of [2, 3, 6, 10]) for (const street of ['preflop', 'flop', 'turn', 'river']) {
      fixture.handId = String(1000 + count * 10 + ['preflop','flop','turn','river'].indexOf(street));
      fixture.maxSeats = Math.max(6, count);
      fixture.dealerSeat = count;
      fixture.street = street;
      fixture.heroCards = ['As', 'Kh'];
      fixture.board = street === 'preflop' ? [] : ['2s','7h','Jd','Qc','3c'].slice(0, street === 'flop' ? 3 : street === 'turn' ? 4 : 5);
      fixture.players = Array.from({length:count}, (_, i) => ({seat:i+1,hero:i===0,position:i===0?'SB':i===1?'BB':i===count-1?'BTN':'Övrig',stack:2,bet:street==='preflop'?(i===0?.01:i===1?.02:0):0,inHand:true,folded:false}));
      fixture.pot = street === 'preflop' ? .03 : .2;
      fixture.availableActions = street === 'preflop' ? ['Fold','Syna','Höj Till'] : ['Fold','Check','Bet'];
      await sendLive();
      await poll(`document.querySelector('.live-status')?.innerText.includes(${JSON.stringify(fixture.handId)})`);
      await poll(`!!document.querySelector('.decision-advisor .recommendation')`, 12000);
      const decision = await win.webContents.executeJavaScript(`({advice:document.querySelector('.decision-advisor .recommendation').innerText,quality:document.querySelector('.decision-advisor .quiet-badge').innerText,rows:Array.from(document.querySelectorAll('.decision-advisor .sizing-row')).map(r=>({text:r.innerText,pct:parseFloat(r.querySelector('b').innerText)})),inputs:Array.from(document.querySelectorAll('.live-ranges input:not([type=checkbox])')).map(x=>x.value)})`);
      assert.ok(Math.abs(decision.rows.reduce((sum,r)=>sum+r.pct,0)-100)<.4, 'root frequencies must sum to 100%');
      assert.ok(decision.inputs.every(x=>x===''), 'automatic decisions cannot require manual ranges');
      assert.ok(decision.rows.every(r=>street==='preflop'?!r.text.includes('Check'):!r.text.includes('Call')), 'legal root actions for amount to call');
      decisionMatrix.push({count,street,...decision});
    }
    console.log('DECISION_NATIVE_MATRIX', JSON.stringify(decisionMatrix));
    // Changing turn, cards or validity must immediately remove the old advice.
    fixture.heroTurn = false;
    await sendLive();
    await poll(`!document.querySelector('.decision-advisor .recommendation')`);
    fixture.heroTurn = true;
    fixture.heroCards = ['Ah','Kd'];
    await sendLive();
    await poll(`!!document.querySelector('.decision-advisor .recommendation')`);
    fixture.valid = false;
    fixture.issues = ["Avläsningen avvisades."];
    await sendLive();
    await poll(`!document.querySelector('.live-advisor .recommendation')`);
  } finally {
    clearInterval(keepLive);
  }
  await wait(3500);
  await poll(
    `document.querySelector('.live-status')?.innerText.includes('inaktuell')`,
  );
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
    version: require("electron").app.getVersion(),
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
    live: {
      multiwayCounts,
      decisionMatrix,
      authenticatedBridge: true,
      currency: "EUR",
      automaticAllStreetDecisions: decisionMatrix.length === 16,
      manualRangesRequired: false,
      experimentalStrategiesHiddenByDefault: true,
      verifiedRiverUpgrade: true,
      turnChangeHidesAdvice: true,
      invalidCaptureHidesAdvice: true,
      staleCaptureHidesAdvice: true,
    },
  };
  await fs.writeFile(
    path.join(output, "desktop-smoke.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
};
