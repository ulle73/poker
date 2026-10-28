import type { Drill, TrainingConfig } from "./types";
const polar: TrainingConfig = {
  board: ["Ks", "7d", "2c", "8h", "3d"],
  oopRange: "KK,A4s,A5s",
  ipRange: "TT,JJ",
  pot: 10,
  stack: 40,
  betSizes: [100],
  raiseSizes: [50],
  maxIterations: 2000,
  targetPct: 0.1,
};
const broad: TrainingConfig = {
  board: ["Qs", "Jh", "2h", "7c", "3d"],
  oopRange: "AA,KK,QQ,JJ,22,AQs,KQs,QJs,T9s,ATs,A5s",
  ipRange: "AA,KK,QQ,JJ,TT,99,AQs,KQs,QTs,JTs,T9s,98s",
  pot: 20,
  stack: 40,
  betSizes: [50, 100],
  raiseSizes: [50],
  maxIterations: 2000,
  targetPct: 0.1,
};
export const DRILLS: Drill[] = [
  {
    id: "bluffcatcher",
    title: "Fånga bluffen",
    subtitle: "IP · Mot pottbet",
    config: polar,
    hero: 1,
    heroCards: ["Th", "Tc"],
    line: ["bet:100"],
    lesson:
      "Mot en polariserad range avgör bluffandelen hur ofta en bluffångare ska syna. Solvern balanserar värde och bluffar i det angivna trädet.",
  },
  {
    id: "value",
    title: "Ta betalt med set",
    subtitle: "OOP · Först att agera",
    config: polar,
    hero: 0,
    heroCards: ["Kc", "Kd"],
    line: [],
    lesson:
      "En stark värdehand behöver en betstorlek som också kan bära bluffar. Jämför bet och all-in i den lösta strategin.",
  },
  {
    id: "bluff",
    title: "Välj dina bluffar",
    subtitle: "OOP · Missat drag",
    config: polar,
    hero: 0,
    heroCards: ["Ah", "4h"],
    line: [],
    lesson:
      "En bluff väljs utifrån hela rangens balans och kortblockering. En låg handstyrka betyder inte automatiskt fold.",
  },
  {
    id: "checked",
    title: "När motståndaren checkar",
    subtitle: "IP · Checkad river",
    config: polar,
    hero: 1,
    heroCards: ["Jh", "Jc"],
    line: ["check"],
    lesson:
      "En check är också information. Motståndarens räckvidd till noden räknas från den lösta strategin, inte från en etikett som ”passiv”.",
  },
  {
    id: "overpair",
    title: "Överpar under press",
    subtitle: "IP · Bredare ranger",
    config: broad,
    hero: 1,
    heroCards: ["Ah", "Ad"],
    line: ["bet:50"],
    lesson:
      "På en dynamisk bräda kan både set, tvåpar, överpar och missade drag finnas kvar. Frekvenserna gäller de uttryckliga riverrangerna.",
  },
  {
    id: "missed",
    title: "Draget som missade",
    subtitle: "OOP · Bredare ranger",
    config: broad,
    hero: 0,
    heroCards: ["Ah", "Th"],
    line: [],
    lesson:
      "Ess-hög med missat färgdrag blockerar vissa kombinationer. Se hur det påverkar bluffar i ett konkret riverträd.",
  },
];
