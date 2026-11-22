import { useMemo } from "react";
import { currentStrength } from "../multiway/hand-strength";

export function HandStrength({ hero, board, dead = [], short = false }: {
  hero: string[]; board: string[]; dead?: string[]; short?: boolean;
}) {
  const identity = JSON.stringify([hero, board, dead, short]);
  const result = useMemo(() => currentStrength(hero, board, dead, short), [identity]);
  if (!result) return null;
  const { category, counts } = result;
  return <section className="hand-strength" aria-label="Din handstyrka">
    <h3>{counts ? "Din bästa femkortshand" : "Din starthand"} <strong>{category}</strong></h3>
    {counts ? <>
      <dl>{([["Starkare", counts.stronger], ["Lika starka", counts.equal], ["Svagare", counts.weaker]] as const)
        .map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value.toLocaleString("sv-SE")}</dd></div>)}</dl>
      <p>{(counts.stronger + counts.equal + counts.weaker).toLocaleString("sv-SE")} möjliga tvåkortskombinationer för en motståndare med okända kort.
        Dina kort, brädan{dead.length ? " och övriga visade kort" : ""} är borträknade. Varje kombination väger lika.
        {board.length < 5 && " Kommande kort kan ändra ordningen."}</p>
    </> : <p>På floppen kan din första femkortshand jämföras med motståndarnas.</p>}
  </section>;
}
