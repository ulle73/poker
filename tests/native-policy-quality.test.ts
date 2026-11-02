import {it,expect} from "vitest";
import {spawnSync} from "node:child_process";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {createHash} from "node:crypto";
import {resolve} from "node:path";
import {nativeAuditProfile} from "./helpers/native-audit-profile";
import {independentCheckJamReport,type CheckJamSpot} from "./helpers/check-jam-oracle";

function fixture(count:number,weighted:boolean):CheckJamSpot {
  const combos=[[["As","Ad"],["Qs","Js"]],[["Ac","Kh"],["Qc","Qd"]],
    [["Jc","Jd"],["Ad","Qh"]],[["Ts","Th"]],[["9s","9h"]],[["8s","8h"]],
    [["6s","6h"]],[["5s","5h"]],[["3s","3h"]],[["Tc","Td"]]];
  return {board:["Ah","Kd","7c","4s","2h"],investment:100,stack:90,
    ranges:combos.slice(0,count).map((row,p)=>row.map((cards,i)=>({cards:cards as [string,string],
      weight:weighted && p===0 ? [0.2,0.8][i] : 1})))};
}
it.skipIf(process.env.POKER_NATIVE_POLICY_PROBE!=="1")(
  "measures the exported native policy with the independent own-information best-response oracle",()=>{
    const exe=resolve(".research/noregrets/target/release/pluribus.exe");
    const patch="research/noregrets/advisor-policy-audit.patch";
    const sha=(p:string)=>createHash("sha256").update(readFileSync(p)).digest("hex");
    const dir=resolve("artifacts/native-policy-quality");mkdirSync(dir,{recursive:true});
    const long=process.env.POKER_NATIVE_POLICY_LONG==="1";
    const counts=long?[3,10]:[2,3,4,5,6,7,8,9,10];
    const iterations=long?1_000_000:100_000;
    const expectedCases=long?9:30;
    const reportPath="docs/evidence/native-policy-quality-"+(long?"long-":"")+"2026-11-03.json";
    const seeds=[395,396,397];
    const results=[];
    for(const count of counts) for(const weighted of (count===3?[false,true]:[false]))
      for(const seed of seeds) {
        const spot=fixture(count,weighted);
        const request={...spot,seed,iterations,timeBudgetMs:60_000};
        const label=`${count}p-${weighted?"weighted":"uniform"}-${seed}${long?"-long":""}`;
        const input=resolve(dir,label+"-input.json"),output=resolve(dir,label+"-profile.json");
        writeFileSync(input,JSON.stringify(request,null,2)+"\n");
        const args=["advisor-audit","--input",input,"--output",output];
        const run=spawnSync(exe,args,{encoding:"utf8",timeout:90000,env:{...process.env,RAYON_NUM_THREADS:"1"}});
        expect(run.status,run.stderr||run.error?.message).toBe(0);
        const data=JSON.parse(readFileSync(output,"utf8"));
        const profile=nativeAuditProfile(spot,data);
        const quality=independentCheckJamReport(spot,profile);
        expect(Math.abs(quality.ev.reduce((a,b)=>a+b,0))).toBeLessThan(1e-8);
        expect(quality.gains.every(g=>g>=-1e-8)).toBe(true);
        expect(Number.isFinite(quality.nashConvPct)).toBe(true);
        expect(data.iterations).toBeGreaterThan(0);
        expect(data.iterations).toBeLessThanOrEqual(request.iterations);
        const summary={count,weighted,seed,requestedIterations:request.iterations,iterations:data.iterations,
          elapsedMs:data.elapsedMs,publicNodes:data.nodes.length,rayonThreads:1,quality,
          requestSha256:sha(input),profileSha256:sha(output)};
        results.push(summary);
        console.log(JSON.stringify({count,weighted,seed,nashConvPct:quality.nashConvPct,untrained:quality.untrainedInformationSets}));
        if(count===3 && seed===395) {
          const prefix="docs/evidence/native-policy-3p-"+(long?"long-":"")+(weighted?"weighted":"uniform");
          writeFileSync(prefix+"-input.json",readFileSync(input));
          writeFileSync(prefix+"-profile.json",readFileSync(output));
        }
        writeFileSync(reportPath,JSON.stringify({
          recordedAt:new Date().toISOString(),goalReady:false,eligibleForAdvice:false,
          expectedCases,completedCases:results.length,complete:results.length===expectedCases,
          scope:"Independent exact best responses in equal-stack, small-range river check/jam games only; not general NLHE certification.",
          engineSha256:sha(exe),sourcePatch:{path:patch,sha256:sha(patch)},results,
        },null,2)+"\n");
      }
  },600_000);
