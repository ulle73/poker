import {useEffect, useState} from "react";
import {DecisionContext} from "../decision/context";
import {prepareDecision} from "../decision/adapter";
import {createDecisionEngine} from "../decision/providers";
import {LIVE_DECISION_MS} from "../decision/quality";
import type {DecisionInput} from "../decision/types";
import type {PreflopFacts} from "../preflop/types";
import {flopReference} from "../flop/match-review";
import {frequency, type FlopStudy} from "../flop/study";
import {Card} from "../components/Card";
import {HandStrength} from "../components/HandStrength";
import {MultiwayStats} from "../components/MultiwayStats";
import type {LiveSnapshot,LiveState} from "./types";

interface ReviewHand {id:string; reader:string; frames:LiveSnapshot[]; overflow:boolean}
interface Spot {
  frame:number; snapshot:LiveSnapshot; pre?:PreflopFacts; input?:DecisionInput; error?:string;
}
interface Answer {source:string; detail:string; actions:{name:string; frequency:number}[]}

export function reviewSpots(hand:ReviewHand) {
  const context = new DecisionContext(), spots = new Map<string,Spot>();
  let pre:PreflopFacts|undefined;
  for (const [frame,s] of hand.frames.entries()) {
    context.observe(s);
    if (s.street === "preflop") pre = context.preflopFacts(s);
    if (!s.heroTurn || !s.valid) continue;
    const spot:Spot = {frame,snapshot:s,pre};
    try { spot.input = {...prepareDecision(s,context.facts()),preflop:pre}; }
    catch (e) {spot.error = (e as Error).message;}
    // Label animations can produce several snapshots during the same decision.
    const key = JSON.stringify([s.street,s.board,s.heroCards,s.pot,s.players.map(p=>[p.seat,p.bet,p.stack])]);
    spots.set(key,spot);
  }
  return [...spots.values()].sort((a,b) => Number(b.snapshot.street==="flop")-Number(a.snapshot.street==="flop"));
}

function ReviewedHand({id, reader}:{id:string;reader:string}) {
  const [rows,setRows] = useState<{s:LiveSnapshot; answer?:Answer; error?:string}[]>([]);
  const [status,setStatus] = useState("Hämtar avslutad hand…");
  useEffect(() => {
    const controller = new AbortController(), engine = createDecisionEngine();
    const signal = controller.signal;
    const load = async () => {
      const query = new URLSearchParams({id,reader});
      const response = await fetch(new URL("hand-review?"+query,document.baseURI),{signal});
      if (!response.ok) throw Error("Den avslutade handen finns inte längre i mottagaren.");
      const hand:ReviewHand = await response.json();
      if (hand.overflow || id !== hand.id || reader !== hand.reader)
        throw Error("Ofullständig handhistorik. Analys saknas.");
      const spots = reviewSpots(hand);
      const library = new Map<string,Promise<FlopStudy>>();
      const read = (board:string) => {
        const cached = library.get(board);
        if (cached) return cached;
        const file = fetch(new URL("flop-study?board="+board,document.baseURI),{signal})
          .then(async r => {const body = await r.json(); if (!r.ok) throw Error(body.error); return body as FlopStudy;});
        library.set(board,file);
        return file;
      };
      for (const spot of spots) {
        if (signal.aborted) return;
        const s = spot.snapshot, input = spot.input;
        let expired = false;
        const analyze = async ():Promise<Answer> => {
          if (!input) throw Error(spot.error);
          let reason = "";
          if (s.street === "flop" && input.seats.length === 2 && s.variant === "holdem") {
            try {return await flopReference(hand.frames.slice(0,spot.frame+1),spot.pre,input,read);}
            catch (e) {reason = (e as Error).message;}
          }
          if (signal.aborted || expired) throw Error("Avbruten.");
          const outcome = await engine.compute(s,input);
          if (outcome.status !== "ready") throw Error(reason || (s.street==="flop" && input.seats.length>2 && outcome.status==="unsupported"
            ? "En källstrategi för öppet flopspel med "+input.seats.length+" aktiva saknas. Bara vissa avslutande all-in-beslut kan avgöras matematiskt."
            : "message" in outcome ? outcome.message : "Avbruten."));
          const r = outcome.result;
          const label = {check:"Check",bet:"Satsa",raise:"Höj till",call:"Syna",fold:"Fold"};
          return {source:outcome.provider.name, detail:r.quality === "solver-unverified" ? "Beräknad strategi · okänd felgräns" :
            r.quality === "chart-reference" ? "Källtabell · referensmodell" :
            r.quality === "proven-action" ? "Matematiskt avgjort mot alla lagliga händer · utan rake" :
            "Solverstrategi i det matchade trädet · "+r.exploitabilityPct+" % av startpotten",
            actions:r.actions.map(a=>({frequency:a.frequency,name:label[a.kind]+(["call","bet","raise"].includes(a.kind)?
              " "+((a.kind==="call"?a.cost:a.to)*input.chipUnit).toLocaleString("sv-SE")+" "+s.currency:"")}))};
        };
        let timer:ReturnType<typeof setTimeout>|undefined;
        let answer:Answer|undefined, error:string|undefined;
        const started = performance.now();
        try {
          answer = await Promise.race([analyze(),new Promise<never>((_,reject)=>{
            timer=setTimeout(()=>{expired=true; reject(Error("Analysen överskred tio sekunder."));},LIVE_DECISION_MS);
          })]);
          if (performance.now()-started >= LIVE_DECISION_MS) throw Error("Analysen överskred tio sekunder.");
        } catch(e) {engine.cancel(); error=(e as Error).message; answer=undefined;}
        finally {clearTimeout(timer);}
        if (signal.aborted) return;
        setRows(previous=>[...previous,{s,answer,error}]);
        setStatus("");
      }
      if (!spots.length && !signal.aborted) setStatus("Inget komplett eget beslut lästes av.");
    };
    load().catch(e=>{if (!signal.aborted) setStatus(e.message);});
    return ()=>{controller.abort(); engine.cancel();};
  },[id,reader]);
  return <div className="multiway-body" data-reviewed-hand={id}>
    <h3>Avslutad hand #{id}</h3>{status && <p role="status">{status}</p>}
    {rows.map(({s,answer,error},i)=><article key={i} className="review-spot">
      <strong>{s.street} · {s.players.filter(p=>p.inHand&&!p.folded).length} kvar · pott {s.pot?.toLocaleString("sv-SE")} {s.currency}</strong>
      <div className="live-cards"><div><span>Din hand</span><div>{s.heroCards.map(c=><Card key={c} card={c}/>)}</div></div>
        <div><span>Bräda</span><div>{s.board.map(c=><Card key={c} card={c}/>)}</div></div></div>
      {answer ? <><strong>{answer.source}</strong><p>{answer.detail}</p><table className="flop-actions"><tbody>
        {answer.actions.map(a=><tr key={a.name}><td>{a.name}</td><td>{frequency(a.frequency)}</td></tr>)}
      </tbody></table></> : <p>{error}</p>}
      {s.street==="flop" && <HandStrength hero={s.heroCards} board={s.board} short={s.variant==="sixplus"} dead={s.players.flatMap(p=>p.shownCards??[])}/>}
      {i===0 && s.street==="flop" && <MultiwayStats snapshot={s} fresh={true}/>}
    </article>)}
  </div>;
}
export function HandReview({review}:{review?:LiveState["review"]}) {
  const [previous,setPrevious] = useState("");
  const id = review?.hands[0];
  return <section className="panel hand-review" aria-label="Automatisk efteranalys">
    <div className="panel-heading"><h2>Automatisk efteranalys</h2>{review && <span className="quiet-badge">{review.lag} {review.lag===1?"hand":"händer"} efter</span>}</div>
    {id && review?.reader ? <><ReviewedHand key={review.reader+":"+id} id={id} reader={review.reader}/>
      {review.hands.length>1 && <details className="multiway-body"><summary>Tidigare efteranalyser</summary>
        {review.hands.slice(1).map(hand=><button key={hand} onClick={()=>setPrevious(hand)}>#{hand}</button>)}
        {review.hands.slice(1).includes(previous) && <ReviewedHand key={review.reader+":"+previous} id={previous} reader={review.reader}/>}
      </details>}</> :
      <div className="multiway-body"><p>Väntar på en avslutad hand med ett avläst beslut.</p>
        {review && review.lag>0 && <p>{review.completed} av {review.lag} handbyten i kön.</p>}</div>}
  </section>;
}
