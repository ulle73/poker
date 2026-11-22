export function canonicalHand(cards:string){return cards.match(/../g)!.sort().join('');}
