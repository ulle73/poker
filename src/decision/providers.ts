import { POSTFLOP_ALL_IN, PostflopAllInProvider, provenChoice } from "./postflop-all-in";
import pushFold from "../preflop/push-fold.json";
import type { LiveSnapshot } from "../live/types";
import type { DecisionInput, DecisionResult } from "./types";
import { SolverClient } from "../solver/client";
import { prepareLiveSolve } from "../live/analysis";
import { FULL_RANGE, verifiedPostflop } from "./verified-river";
import { legalRiverRoot } from "./river-legality";
import { SixplusClient, prepareSixplus, sixplusDecision } from "../shortdeck/client";
import { NLHE_LIVE_ERROR_PCT } from "./quality";
import {MonkerClient,monkerDecision} from '../monker/client';
import {prepareMonker,MONKER_ERROR_PCT} from '../monker/config';
import {PreflopClient,ARTGTO_SHA,RC40_SHA} from '../preflop/client';
import {HoldemClient} from '../holdem/client';
import {prepareHoldem,holdemHandIndex} from '../holdem/model';

export interface ProviderInfo {
  id: string;
  name: string;
  cost: "free" | "paid";
  coverage: string;
  variants?: readonly ("holdem" | "sixplus" | "unknown")[];
  maxExploitabilityPct?: number;
  allowUnverified?: boolean;
  streets?: readonly string[];
}
/** Adapters must validate the whole model. Router checks are additional
 * transport/identity checks, not a proof of equilibrium for external engines. */
export interface DecisionProvider {
  info: ProviderInfo;
  unsupportedReason(snapshot: LiveSnapshot, input: DecisionInput): string | null;
  solve(snapshot: LiveSnapshot, input: DecisionInput): Promise<DecisionResult | null>;
  cancel(): void;
}
export type DecisionOutcome =
  | { status: "ready"; provider: ProviderInfo; result: DecisionResult }
  | { status: "unsupported" | "rejected" | "error"; message: string; provider?: ProviderInfo }
  | { status: "cancelled" };
export const FREE_POSTFLOP: ProviderInfo = {
  id: "postflop-wasm",
  name: "Postflop · fri lokal solver",
  cost: "free",
  streets:['turn','river'],
  coverage: "Två aktiva spelare på turn och river, i matchande bettingträd.",
  variants: ["holdem"],
  maxExploitabilityPct: NLHE_LIVE_ERROR_PCT,
};
export class FreePostflopProvider implements DecisionProvider {
  readonly info = FREE_POSTFLOP;
  constructor(private readonly client = new SolverClient()) {}
  unsupportedReason(snapshot: LiveSnapshot, input: DecisionInput): string | null {
    if (snapshot.variant === "sixplus") return "52-kortsmotorn används inte för 6+ Hold’em.";
    if (input.seats.length !== 2)
      return `${input.seats.length} aktiva spelare: den fria motorn saknar kontrollerad multiway-strategi. Heads-up-lösningar kan inte kombineras till ett multiway-råd.`;
    if (![4, 5].includes(input.board.length))
      return `Ingen ansluten solver stöder ${input.state.street}. Den fria motorn har kontrollerad täckning på turn och river med två aktiva spelare.`;
    try {
      prepareLiveSolve(snapshot, input.ranges[0] || FULL_RANGE, input.ranges[1] || FULL_RANGE, {
        postflop: input.board.length === 4,
      });
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Bordet kan inte matchas mot solverns träd.";
    }
  }
  solve(snapshot: LiveSnapshot, input: DecisionInput) {
    return verifiedPostflop(snapshot, input, this.client);
  }
  cancel() { this.client.cancel(); }
}
function acceptable(result: DecisionResult, input: DecisionInput, provider: ProviderInfo): boolean {
  const limit = provider.maxExploitabilityPct ?? 0.2;
  const monker=provider.id==='monker-free'&&result.provider==='monker-free-10114'&&input.seats.length>=3&&input.seats.length<=6&&[4,5].includes(input.board.length)&&result.modelVerified===true&&result.qualityMetric==='max-unilateral'&&result.qualityLimitPct===MONKER_ERROR_PCT;
  if (!Number.isFinite(limit) || limit <= 0 || limit > (monker?MONKER_ERROR_PCT:NLHE_LIVE_ERROR_PCT)) return false;
  const proof=result.sourceProof;
  const holdem=provider.id==='holdem-free'&&result.provider==='holdem-solver-0.93'&&input.state.street==='flop'&&input.seats.length>=2&&input.seats.length<=6&&result.modelVerified===true&&proof?.solver==='holdem-0.93'&&proof.entryExact===true&&proof.visits>=32&&proof.visits===result.rootVisits&&proof.handIndex===holdemHandIndex(input.heroCards)&&proof.history==='entry_flop'+'.check'.repeat(input.hero)&&/^[a-zA-Z0-9_-]{1,100}$/.test(proof.solveId);
  const unverified=(monker||holdem)&&provider.allowUnverified===true&&result.quality==='solver-unverified'&&result.exploitabilityPct===null;
  const chartIdentity=result.reference?.source==='rangeconverter'
    ?result.provider==='rangeconverter-preflop'&&result.reference.archiveSha256===RC40_SHA&&result.reference.modelDepthBB===40&&result.reference.actualDepthBB>=30&&result.reference.actualDepthBB<=50
    :result.provider==='holdemmath-preflop' && result.reference?.modelPlayers===6
      ?result.reference.archiveSha256===pushFold.sha256 && result.reference.tablePlayers===6 && result.reference.actualDepthBB===result.reference.modelDepthBB && pushFold.depths.includes(result.reference.modelDepthBB)
    :result.reference?.archiveSha256===ARTGTO_SHA&&['artgto-preflop','holdemmath-preflop'].includes(result.provider);
  const reference=provider.id==='free-preflop'&&input.state.street==='preflop'&&input.preflop&&!input.preflop.error&&result.quality==='chart-reference'&&result.modelVerified===true&&result.exploitabilityPct===null&&chartIdentity&&result.reference?.tablePlayers===input.preflop.participants.length;
  const proven = provider.id === POSTFLOP_ALL_IN.id && result.provider === provider.id &&
    result.quality === "proven-action" && result.exploitabilityPct === null && result.actions.length === 1 &&
    result.actions[0].frequency === 1 && result.actions[0].kind === provenChoice(input, result.bounds);
  const verified=result.quality==='verified-gto'&&result.exploitabilityPct!==null&&Number.isFinite(result.exploitabilityPct)&&result.exploitabilityPct>=0&&result.exploitabilityPct<=limit;
  if (
    result.key !== input.key || result.rangeRevision !== input.rangeRevision ||
    !(verified||unverified||reference||proven) || !result.actions.length ||
    !Number.isInteger(result.recommended) || !result.actions[result.recommended]
  ) return false;
  const actions = result.actions;
  if (new Set(actions.map((a) => a.id)).size !== actions.length) return false;
  if (actions.some((a) =>
    !Number.isFinite(a.frequency) || a.frequency < 0 || a.frequency > 1 ||
    (a.ev !== null && !Number.isFinite(a.ev)) ||
    !Number.isSafeInteger(a.to) || !Number.isSafeInteger(a.cost) ||
    a.to < 0 || a.cost < 0 || a.allIn !== (a.cost === input.state.stacks[input.hero]) ||
    (input.rootKinds && !input.rootKinds.includes(a.kind))
  )) return false;
  return Math.abs(actions.reduce((sum, a) => sum + a.frequency, 0) - 1) <= 1e-4 &&
    legalRiverRoot(input, actions);
}
/** Free first; paid providers require explicit opt-in. No paid provider is
 * registered by default. Each provider owns its model-quality validation. */
export class DecisionEngine {
  private generation = 0;
  constructor(private readonly providers: readonly DecisionProvider[], private readonly allowPaid = false) {}
  cancel() {
    this.generation++;
    for (const provider of this.providers) provider.cancel();
  }
  async compute(snapshot: LiveSnapshot, input: DecisionInput): Promise<DecisionOutcome> {
    this.cancel();
    const generation = this.generation;
    const providers = this.providers
      .filter((p) => (p.info.cost === "free" || this.allowPaid) && (!p.info.variants || p.info.variants.includes(snapshot.variant ?? "holdem")))
      .filter(p=>!p.info.streets||p.info.streets.includes(input.state.street))
      .sort((a, b) => Number(a.info.cost === "paid") - Number(b.info.cost === "paid"));
    const reasons: string[] = [];
    let failure: DecisionOutcome | undefined;
    for (const provider of providers) {
      if (generation !== this.generation) return { status: "cancelled" };
      try {
        const reason = provider.unsupportedReason(snapshot, input);
        if (reason) { reasons.push(reason); continue; }
        const result = await provider.solve(snapshot, input);
        if (generation !== this.generation) return { status: "cancelled" };
        if (result && acceptable(result, input, provider.info))
          return { status: "ready", provider: provider.info, result };
        failure = {
          status: "rejected", provider: provider.info,
          message: "Lösningen klarade inte kvalitetskontrollen för aktuellt träd, hand och belopp. Inget råd visas.",
        };
      } catch (error) {
        if (generation !== this.generation) return { status: "cancelled" };
        const coverage=error instanceof Error&&'code' in error&&error.code==='PREFLOP_UNSUPPORTED';
        failure = {
          status: (coverage || (provider.info.id === POSTFLOP_ALL_IN.id && error instanceof RangeError))?'unsupported':"error", provider: provider.info,
          message: error instanceof Error ? error.message : "Solverberäkningen misslyckades.",
        };
      }
    }
    return failure ?? {
      status: "unsupported",
      message: [...new Set(reasons)].join(" ") || `Ingen aktiverad solver stöder ${input.state.street} i detta läge.`,
    };
  }
}
export class SixplusProvider implements DecisionProvider {
  readonly info: ProviderInfo = {id:"texassolver-sixplus",name:"TexasSolver · fri 6+-solver",cost:"free",coverage:"Två aktiva spelare på river i matchande 6+-träd.",variants:["sixplus"]};
  constructor(private readonly client = new SixplusClient()) {}
  unsupportedReason(snapshot: LiveSnapshot, input: DecisionInput) {
    try { prepareSixplus(snapshot,input); return null; }
    catch(error) {return (error as Error).message;}
  }
  solve(snapshot: LiveSnapshot, input: DecisionInput) {return sixplusDecision(snapshot,input,this.client);}
  cancel(){this.client.cancel();}
}
export const MONKER:ProviderInfo={id:'monker-free',name:'Monker Free · lokal träningssolver',cost:'free',variants:['holdem'],streets:['turn','river'],coverage:'3–6 aktiva spelare på turn och river i matchande begränsat bettingträd.',maxExploitabilityPct:MONKER_ERROR_PCT,allowUnverified:true};
export class MonkerProvider implements DecisionProvider {
 readonly info=MONKER;
 private prepared=new WeakMap<DecisionInput,ReturnType<typeof prepareMonker>>();
 constructor(private readonly client=new MonkerClient()){}
 unsupportedReason(snapshot:LiveSnapshot,input:DecisionInput){try{this.prepared.set(input,prepareMonker(snapshot,input));return null;}catch(error){return (error as Error).message;}}
 solve(snapshot:LiveSnapshot,input:DecisionInput){return monkerDecision(snapshot,input,this.client,this.prepared.get(input));}
 cancel(){this.client.cancel();}
}
export const FREE_PREFLOP:ProviderInfo={id:'free-preflop',name:'Fria prefloptabeller',cost:'free',variants:['holdem'],streets:['preflop'],coverage:'RangeConverter 40 BB och ART/GTO 100 BB 6-maxreferenser, 2–6 positioner; HU push/fold 4–20 BB. Observerad linje och storlekar kontrolleras.'};
export class FreePreflopProvider implements DecisionProvider {
 readonly info=FREE_PREFLOP;
 constructor(private readonly client=new PreflopClient()){}
 unsupportedReason(_snapshot:LiveSnapshot,input:DecisionInput){
  if(input.state.street!=='preflop')return 'Prefloptabeller gäller bara före floppen.';
  if(!input.preflop)return 'Preflop: säker blind- och handhistorik saknas. Inväntar ny hand.';
  return input.preflop.error??null;
 }
 solve(snapshot:LiveSnapshot,input:DecisionInput){return this.client.compute(snapshot,input);}
 cancel(){this.client.cancel();}
}
export const HOLDEM:ProviderInfo={id:'holdem-free',name:'Holdem Solver · lokal flopträning',cost:'free',variants:['holdem'],streets:['flop'],allowUnverified:true,coverage:'2–6 aktiva spelare på oöppnad flop, inklusive tidigare checkar. Kräver officiell inloggning. Felgräns ej verifierad.'};
export class HoldemProvider implements DecisionProvider {
 readonly info=HOLDEM;
 constructor(private readonly client=new HoldemClient()){}
 unsupportedReason(snapshot:LiveSnapshot,input:DecisionInput){try{prepareHoldem(snapshot,input);return null;}catch(error){return (error as Error).message;}}
 solve(snapshot:LiveSnapshot,input:DecisionInput){return this.client.compute(snapshot,input);}
 cancel(){this.client.cancel();}
}
export const createDecisionEngine = () => new DecisionEngine([new FreePreflopProvider(),new PostflopAllInProvider(),new FreePostflopProvider(), new SixplusProvider(),new MonkerProvider()]);
