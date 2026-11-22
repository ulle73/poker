import { useEffect, useMemo, useState } from "react";
import boards from "../../electron/flop-study-boards.json";
import { actionName, amountBB, frequency, studyLines, type FlopStudy as Study } from "../flop/study";
import { Card } from "./Card";

const names = Object.keys(boards);
const suit: Record<string,string> = {s:"♠",h:"♥",d:"♦",c:"♣"};
const display = (hand: string) => hand.match(/../g)!.map(c => c[0]+suit[c[1]]).join(" ");
export function FlopStudy() {
  const [board,setBoard] = useState("AcKdJc");
  const [loaded,setLoaded] = useState<{board:string; doc:Study} | null>(null);
  const [error,setError] = useState("");
  const [lineId,setLine] = useState("n1");
  const [hand,setHand] = useState("Kh7c");
  useEffect(() => {
    const controller=new AbortController();
    const url=new URL("flop-study",document.baseURI);
    url.searchParams.set("board",board);
    (async()=>{
      try {
        const response=await fetch(url,{signal:controller.signal});
        if (!response.headers.get("content-type")?.includes("application/json"))
          throw Error("Flopbiblioteket öppnas i Windows-appen.");
        const data=await response.json();
        if(!response.ok)throw Error(data.error || "Flopfilen kunde inte läsas.");
        if(!controller.signal.aborted)setLoaded({board,doc:data});
      } catch(e) { if(!controller.signal.aborted)setError((e as Error).message); }
    })();
    return ()=>controller.abort();
  },[board]);
  const doc=loaded?.board===board ? loaded.doc : null;
  const lines=useMemo(()=>doc ? studyLines(doc,board) : [],[doc,board]);
  const line=lines.find(l=>l.id===lineId) ?? lines[0];
  const node=doc && line ? doc.nodes[line.id] : null;
  const savedIndex=doc?.combos.indexOf(hand) ?? -1;
  const index=hand ? line?.hands.includes(savedIndex) ? savedIndex : undefined : line?.hands[0];
  return <section className="panel" aria-label="Flopstudie">
    <div className="panel-heading"><h2>Flopstudie · två kvar i potten</h2><span className="quiet-badge">TexasSolver · källreferens</span></div>
    <div className="multiway-body">
      <p>Sexmax, 100 BB. Knappen öppnar till 2,5 BB och stora mörken synar. På floppen är potten 5,5 BB och båda har 97,5 BB kvar.</p>
      <div className="form-grid"><label>Flop<select value={board} onChange={e=>{setError("");setLine("");setHand("");setBoard(e.target.value);}}>
        {names.map(b=><option key={b} value={b}>{display(b)}</option>)}</select></label>
      {doc && line && node && <>
        <label>Bettinglinje<select value={line.id} onChange={e=>setLine(e.target.value)}>{lines.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}</select></label>
        <label>Hålkort · {node.player===0?"stora mörken":"knappen"}<select value={index===undefined?"":doc.combos[index]} onChange={e=>setHand(e.target.value)}>
          {index===undefined && <option value="" disabled>{display(hand)} saknar nåbar rad · välj hand</option>}
          {line.hands.map(i=><option key={i} value={doc.combos[i]}>{display(doc.combos[i])}</option>)}</select></label>
      </>}</div>
      {error && <p role="alert">{error}</p>}
      {!error && !doc && <p role="status">Läser flopplösningen…</p>}
      {doc && node && index!==undefined && <>
        <div className="live-cards"><div><span>Bräda</span><div>{board.match(/../g)!.map(c=><Card key={c} card={c}/>)}</div></div><div><span>Din hand</span><div>{doc.combos[index].match(/../g)!.map(c=><Card key={c} card={c}/>)}</div></div></div>
        <p>Pott {amountBB(node.pot)} · din stack {amountBB(node.stacks[node.player])}</p>
        <p><strong>Vanligast i lösningen · {node.actions.filter((_,j)=>node.strategy[index][j]===Math.max(...node.strategy[index])).map(a=>actionName(node,a)).join(" / ")}</strong></p>
        <table className="flop-actions"><thead><tr><th>Handling</th><th>Källans frekvens</th></tr></thead><tbody>
          {node.actions.map((a,j)=><tr key={a.token}><td>{actionName(node,a)}</td><td>{frequency(node.strategy[index][j])}</td></tr>)}
        </tbody></table>
        <p className="microcopy">TexasSolver rapporterade {doc.meta.exploitability_pct_pot.toLocaleString("sv-SE",{maximumFractionDigits:3})} % av startpotten i genomsnitt för de två spelarnas bästa svar. Måttet gäller hela källträdet. Den lokala exporten omfattar floppen och saknar oberoende verifiering av hela trädet.</p>
      </>}
    </div>
  </section>;
}
