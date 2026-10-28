import { SUITS } from "../core/cards";
export function Card({
  card,
  small = false,
  back = false,
}: {
  card?: string;
  small?: boolean;
  back?: boolean;
}) {
  return (
    <span
      className={`playing-card ${small ? "small" : ""} ${back ? "back" : card?.[1] === "h" || card?.[1] === "d" ? "red" : "black"}`}
      data-card={back ? undefined : card}
      aria-label={back ? "Dolt kort" : card}
    >
      {back ? (
        <span className="card-pattern">◇</span>
      ) : (
        <>
          <span className="card-rank">
            {card?.[0] === "T" ? "10" : card?.[0]}
          </span>
          <span className="card-suit">{SUITS[card?.[1] ?? "s"]}</span>
        </>
      )}
    </span>
  );
}
