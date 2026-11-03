// Synthetic persistence probe, never strategy qualification or live play.
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const project=fileURLToPath(new URL('../',import.meta.url));
const engine=resolve(project,'.research/noregrets/target/release/pluribus.exe');
const patch=resolve(project,'research/noregrets/advisor-checkpoint.patch');
const sha=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const smoke=JSON.parse(readFileSync(resolve(project,'docs/evidence/noregrets-checkpoint-training-smoke.json')));
assert.equal(smoke.engineSha256,sha(engine),'Rebuild with probe-native-training before this probe');
assert.equal(smoke.sourcePatches[0].sha256,sha(patch));
const source=spawnSync('git',['-C','.research/noregrets','diff','--no-ext-diff','--binary'],{cwd:project,maxBuffer:20e6});
assert.equal(source.status,0);assert.ok(source.stdout.equals(readFileSync(patch)));
const root=resolve(project,'artifacts/native-checkpoint');mkdirSync(root,{recursive:true});
const reportPath=resolve(project,'docs/evidence/noregrets-checkpoint-cli.json');
const report={recordedAt:new Date().toISOString(),goalReady:false,eligibleForAdvice:false,complete:false,
 scope:'40+20 synthetic traversals per count, exact persistence/mode restoration and rejection checks only. Blueprints still use the unbound upstream format.',
 engineSha256:sha(engine),patchSha256:sha(patch),runs:[]};
function run(args,expected=0) {
 const p=spawnSync(engine,args,{cwd:project,encoding:'utf8',timeout:60_000,env:{...process.env,RAYON_NUM_THREADS:'1'}});
 const result={args,exitCode:p.status,stdout:p.stdout,stderr:p.stderr};
 assert.equal(p.status,expected,p.error?.message||p.stderr);return result;
}
function save() { report.recordedAt=new Date().toISOString();writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n'); }
save();
for(let players=2;players<=10;players++) {
 const ck=resolve(root,players+'p.ckpt'),before=resolve(root,players+'p-before.bin'),after=resolve(root,players+'p-after.bin');
 const base=['train','--players',String(players),'--stack','1000','--train-seed','395','--no-prune','--threads','1'];
 const initial=run([...base,'--iters','40','--raw-buckets','--buckets','2','--rollouts','2','--runouts','1','--vr-baseline','--checkpoint',ck,'--out',before]);
 const initialSha=sha(ck);assert.equal(readFileSync(ck).subarray(0,8).toString(),'PGTOCP01');
 const resumed=run([...base,'--iters','20','--resume',ck,'--checkpoint',ck,'--out',after]);
 assert.match(resumed.stdout,/vr baselines on/);assert.match(resumed.stdout,/resumed from .*: 40 iterations/);
 const inspect=run(['inspect','--blueprint',after]);assert.match(inspect.stdout,/trained iterations: 60\b/);
 const resumedSha=sha(ck);assert.notEqual(initialSha,resumedSha);
 const forbidden=resolve(root,players+'p-forbidden.bin');writeFileSync(forbidden,'preserve-existing-output');const forbiddenSha=sha(forbidden);
 const rejected=[];
 for(const [flag,value] of [['--players',String(players===2?3:2)],['--stack','2000'],['--train-seed','396']]) {
   const args=base.slice();args[args.indexOf(flag)+1]=value;
   const bad=run([...args,'--iters','1','--resume',ck,'--out',forbidden],1);
   assert.match(bad.stderr,/configuration mismatch/);rejected.push(bad);
 }
 const mode=run([...base,'--iters','1','--resume',ck,'--vr-baseline','--out',forbidden],1);
 assert.match(mode.stderr,/resume restores VR\/RNR/);rejected.push(mode);
 assert.equal(sha(ck),resumedSha);assert.equal(sha(forbidden),forbiddenSha);
 report.runs.push({players,initial,resumed,inspect,rejected,checkpointSha256:resumedSha,
   bytes:readFileSync(ck).length,iterations:60,vrPreserved:true,rejectedOutputPreserved:true});save();
 console.log(`${players} seats: checkpoint resumed, VR preserved, 4 mismatches rejected`);
}
assert.equal(report.runs.length,9);assert.ok(existsSync(engine));report.complete=true;save();
