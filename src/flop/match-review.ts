import catalog from "../../electron/flop-study-boards.json";
import {handKey} from "../core/cards";
import type {LiveSnapshot} from "../live/types";
import type {PreflopFacts} from "../preflop/types";
import {actionName, studyLines, type FlopStudy} from "./study";
import type {DecisionInput, BettingAction} from "../decision/types";
import {legalRiverRoot} from "../decision/river-legality";

const suits = "cdhs";
const boards = new Map(Object.keys(catalog).map(board => [handKey(board), board]));
const permutations = (rest:string):string[] => rest.length
  ? [...rest].flatMap(s => permutations(rest.replace(s,"")).map(t => s+t)) : [""];
const mappings = permutations(suits);
const cents = (amount:number) => Math.round(amount * 100);

function sourceCards(s:LiveSnapshot) {
  for (const mapping of mappings) {
    const translate = (card:string) => card[0] + mapping[suits.indexOf(card[1])];
    const board = boards.get(handKey(s.board.map(translate)));
    if (board) return {board, hero:handKey(s.heroCards.map(translate))};
  }
  throw Error("Brädan saknas i det installerade flopbiblioteket.");
}

export async function flopReference(frames:LiveSnapshot[], pre:PreflopFacts|undefined, input:DecisionInput,
  read:(board:string)=>Promise<FlopStudy>) {
  const s = frames[frames.length-1];
  const bb = pre?.bigBlind;
  if (!pre || pre.error || !bb || pre.participants.length !== 6 ||
      pre.handId !== s.handId || pre.readerId !== s.readerId || s.variant !== "holdem" ||
      !pre.participants.every(seat => pre.startingStacks[seat] === 100*bb))
    throw Error("Referensen kräver observerad sexmaxhistorik och 100 BB i startstackarna.");
  const seats = ["BB","BU"].map(pos => pre.participants.find(i => pre.positions[i] === pos)!);
  const players = seats.map(seat => s.players.find(p => p.seat === seat));
  const actor = players.findIndex(p => p?.hero);
  if (actor < 0 || seats[1] !== s.dealerSeat || !players.every(p => p?.inHand && !p.folded) ||
      !pre.participants.filter(i => !seats.includes(i)).every(i => s.players.find(p => p.seat === i)?.folded))
    throw Error("Flopreferensen gäller knappen och stora mörken efter fyra foldar.");
  if (frames.some(f => f.valid && f.street === "preflop" &&
      (handKey(f.heroCards) !== handKey(s.heroCards) || f.dealerSeat !== s.dealerSeat ||
       f.currency !== s.currency || f.players.find(p => p.hero)?.seat !== seats[actor])))
    throw Error("Hålkort, hjältesäte, knapp eller valuta ändrades mellan preflop och flop.");
  const moves = pre.steps.filter(a => a.kind !== "fold");
  if (moves.length < 1 || moves.length > 2 || moves[0].kind !== "raise" ||
      moves[0].seat !== seats[1] || moves[0].to !== 2.5*bb ||
      (moves[1] && (moves[1].kind !== "call" || moves[1].seat !== seats[0] || moves[1].to !== 2.5*bb)))
    throw Error("Prefloplinjen matchar inte knappens öppning till 2,5 BB och stora mörkens syn.");
  const observed:{seat:number; amount:number}[] = [];
  const last = [0,0];
  for (const f of frames) {
    if (!f.valid || f.street !== "flop") continue;
    if (handKey(f.board) !== handKey(s.board) || handKey(f.heroCards) !== handKey(s.heroCards) ||
        f.dealerSeat !== s.dealerSeat || f.currency !== s.currency)
      throw Error("Kort, valuta eller position ändrades under floppen.");
    const changed:number[] = [];
    for (const [i,seat] of seats.entries()) {
      const p = f.players.find(p => p.seat === seat);
      if (p?.bet == null || p.stack == null || cents(p.bet)+cents(p.stack) !== 97.5*bb)
        throw Error("Stack och flopinsats matchar inte källans 97,5 BB.");
      const bet = cents(p.bet);
      if (bet < last[i]) throw Error("Ett bidrag försvann innan beslutet.");
      if (bet !== last[i]) {changed.push(i); last[i]=bet;}
    }
    if (changed.length > 1 || f.pot == null || cents(f.pot) !== 5.5*bb+last[0]+last[1])
      throw Error("Pott eller ordning på flopinsatserna är oklar.");
    for (const i of changed) observed.push({seat:i,amount:last[i]});
  }
  const cards = sourceCards(s);
  const doc = await read(cards.board);
  let id = doc.root;
  // In HU the BB must have checked if the first wager (or turn to act) belongs to BTN.
  if ((observed[0]?.seat ?? actor) === 1)
    id = doc.nodes[id].actions.find(a => a.token === "check")!.child;
  for (const move of observed) {
    const node = doc.nodes[id];
    const match = node.actions?.filter(a => a.amount !== undefined &&
      Math.round(a.amount * bb / 100) === move.amount);
    if (node.player !== move.seat || match?.length !== 1)
      throw Error("Satsningen eller höjningen ligger utanför källans bettingträd.");
    id = match[0].child;
  }
  const node = doc.nodes[id];
  const index = doc.combos.findIndex(h => handKey(h) === cards.hero);
  const line = studyLines(doc,cards.board).find(l => l.id === id);
  if (node.player !== actor || !line?.hands.includes(index))
    throw Error("Exakt hand eller turordning saknar en nåbar rad i källan.");
  const {state,hero} = input;
  const own = state.bets[hero];
  const legal = node.actions.every(a => {
    const aggressive = a.amount !== undefined;
    const kind:BettingAction["kind"] = aggressive ? state.currentBet ? "raise" : "bet" :
      a.token === "call" ? "call" : a.token === "fold" ? "fold" : "check";
    const to = aggressive ? Math.round(a.amount! * bb / 100) :
      kind === "call" ? Math.min(state.currentBet, own+state.stacks[hero]) : own;
    return input.rootKinds?.includes(kind) && legalRiverRoot(input,[{kind,to,cost:to-own,
      allIn:to-own===state.stacks[hero],id:a.token}]);
  });
  if (!legal) throw Error("Källans handlingar matchar inte det avlästa beslutets lagliga val.");
  return {source:"TexasSolver · källreferens", detail:line.label+
    ". Sexmax 100 BB · BTN mot BB. Källans begränsade storlekar matchas till närmaste marker. Oberoende felgräns saknas.",
    actions:node.actions.map((a,j) => ({name:actionName(node,a), frequency:node.strategy[index][j]}))};
}
