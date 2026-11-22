const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { setTimeout: wait } = require("node:timers/promises");

// Each invocation owns a fresh app, renderer and receiver on an ephemeral port.
exports.run = async function (window, bridge) {
  const count = Number(process.env.POKER_MEASURE_COUNT);
  const street = process.env.POKER_MEASURE_STREET;
  const sixplus = process.env.POKER_MEASURE_VARIANT === "sixplus";
  const checked = process.env.POKER_MEASURE_VARIANT === "checked-to";
  const uncertain = process.env.POKER_MEASURE_VARIANT === "uncertain-seat";
  const closing = process.env.POKER_MEASURE_VARIANT === "closing-all-in";
  if (![2,3,4,5,6].includes(count) || !["preflop","flop","turn","river"].includes(street) || (closing && street === "preflop"))
    throw Error("Invalid benchmark case");
  const pre = street === "preflop";
  const heroSeat = pre && count > 2 ? 3 : 1;
  const targetBB = count === 6 || count === 2 ? 10 : 40;
  const labels = count === 2 ? ["BTN / SB","BB"] : ["SB","BB",...["UTG","HJ","CO","BTN"].slice(6-count)];
  const board = sixplus ? ["Ks","7d","6c","8h","9d"] : ["6h","8s","Jd","4c","Ts"].slice(0, {preflop:0,flop:3,turn:4,river:5}[street]);
  const s = {
    variant: sixplus ? "sixplus" : "holdem", version:1, source:"svenskaspel-dom", readerId:"isolated-measurement",
    sequence:0, handId:"", capturedAt:0, currency:"EUR", maxSeats:6, street,
    dealerSeat:pre && count === 2 ? 1 : count, heroTurn:true, heroCards:pre ? ["As","Ah"] : ["Kh","8d"],
    board, pot:pre ? .03 : .8, valid:true, issues:[], observedActions:[],
    availableActions:pre ? ["Fold","Syna","Höj"] : ["Check","Bet"],
    players: labels.map((position,i) => {
      const bet = pre ? [0.01,0.02][i] ?? 0 : 0;
      return {seat:i+1,hero:i+1===heroSeat,position,stack:pre ? targetBB*.02-bet : 1.6,bet,folded:false,inHand:true};
    }),
  };
  if (count === 2 && street === "turn") {
    s.board=["Td","8s","Ts","7c"]; s.heroCards=["Qd","4h"]; s.pot=.14;
    s.players[0].stack=1.86; s.players[1].stack=3.73;
  }
  if (count === 2 && street === "river") {
    s.heroCards=["Kh","Kd"]; s.board=sixplus ? board : ["Ks","7d","2c","8h","3d"];
    s.pot=10; s.players.forEach(p=>p.stack=20);
  }
  if (count === 2 && street === "flop") {
    s.board=["Qh","Jh","Th"]; s.heroCards=["Ah","Kh"]; s.players[1].bet=.4; s.players[1].stack=0;
    s.availableActions=["Fold","Syna"];
  }
  if (closing) {
    s.heroCards = ["Ah","As"];
    s.board = ["Ac","Ad","Kc","2d","7s"].slice(0, board.length);
    for (const p of s.players.filter(p => !p.hero)) Object.assign(p, {bet:.4,stack:0});
    s.pot = Number((.4 * count).toFixed(2));
    s.availableActions = ["Fold","Syna"];
  }
  if(checked){
    s.players[0].hero=false; s.players[1].hero=true;
    s.players[0].position="BB"; s.players[1].position="BTN / SB";
    s.availableActions=["Fold","Check","Satsa"];
    s.observedActions=[{seat:1,street,action:"check",amount:0}];
    if(street==="flop"){
      s.heroCards=["Kd","7c"]; s.board=["Kh","Ac","Jc"]; s.pot=.09; s.dealerSeat=4;
      s.players=[
        {seat:6,hero:false,position:"SB",stack:.74,bet:0,folded:true,inHand:false},
        {seat:1,hero:false,position:"Står över",stack:2,bet:0,folded:false,inHand:false,sittingOut:true},
        {seat:3,hero:false,position:"BB",stack:1.71,bet:0,folded:false,inHand:true},
        {seat:4,hero:true,position:"BTN",stack:2.18,bet:0,folded:false,inHand:true},
      ];
      s.observedActions[0].seat=3;
    }
  }
  if(uncertain){
    s.heroCards=["Ah","Jd"]; s.board=["2h","8h","Qd"]; s.pot=.13; s.dealerSeat=1;
    s.availableActions=["Fold","Check","Satsa"];
    s.players=[
      {seat:1,position:"BTN",stack:.71,inHand:true},{seat:2,position:"SB",stack:2,folded:true},
      {seat:3,position:"BB",stack:2.03,inHand:true},{seat:4,position:"UTG",stack:2.01,hero:true,inHand:true},
      {seat:5,position:"CO",stack:2},{seat:6,position:"Står över",stack:.74,sittingOut:true},
    ].map(p=>({hero:false,inHand:false,folded:false,bet:0,...p}));
  }
  if(process.env.POKER_MEASURE_CURRENCY==="SEK")s.currency="SEK";
  const output=path.resolve(process.env.POKER_MEASURE_OUTPUT || "artifacts/decision-timings");
  await fs.mkdir(output,{recursive:true});
  const name=(s.currency==="SEK"?"sek-":"")+(closing?"closing-all-in-":uncertain?"uncertain-seat-":checked?"checked-to-":sixplus ? "sixplus-" : "")+street+"-"+count;
  const page=script=>window.webContents.executeJavaScript(script);
  const report={name,hardware:{cpu:os.cpus()[0].model,logicalProcessors:os.cpus().length,ram:os.totalmem(),
    windows:os.release(),electron:process.versions.electron},synthetic:true, runs:[]};
  const send=async(frame)=>{
    const response=await fetch(bridge.state().endpoint,{method:"POST",headers:{"content-type":"application/json","x-poker-token":bridge.token},
      body:JSON.stringify({...frame,sequence:++s.sequence,capturedAt:Date.now()})});
    if (!response.ok) throw Error("Receiver "+response.status);
    return (await response.json()).receivedAt;
  };
  const lag = bridge.state().review.lag;
  let number = 1000;
  for (const mode of ["cold","warm"]) {
    const handId = String(++number);
    const deal = {...s, street:"preflop", board:[], heroTurn:false, availableActions:[], observedActions:[]};
    await send({...deal,handId});
    await send({...s,handId});
    let releaseTime;
    for (let i=0; i<Math.max(1,lag); i++) {
      if (bridge.reviewedHand(handId,s.readerId)) throw Error("För tidig efteranalys");
      releaseTime = await send({...deal,handId:String(++number)});
    }
    const selector = JSON.stringify('[data-reviewed-hand="'+handId+'"] .review-spot');
    let ui;
    do {
      ui = await page(`document.querySelector(${selector})?.innerText`);
      if (ui) break;
      await wait(25);
    } while (Date.now()-releaseTime<15000);
    if (!ui) throw Error("Ingen synlig efteranalys för hand "+handId);
    if (closing && !/Matematiskt avgjort mot alla lagliga händer · utan rake\s+Syna\s+0,4\s+\w+\s+100\s*%/.test(ui))
      throw Error("Felaktig all-in-analys för hand "+handId+": "+ui);
    await page("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(true))))");
    const frame = await window.webContents.capturePage();
    if (frame.isEmpty()) throw Error("Ingen renderad bildruta");
    report.runs.push({mode,handId,releaseHand:String(number),lag,reviewMs:Date.now()-releaseTime,ui,fixture:{...s,handId}});
    if (mode==="cold") await fs.writeFile(path.join(output,name+".png"),frame.toPNG());
  }
  await fs.writeFile(path.join(output,name+".json"),JSON.stringify(report,null,2));
};
