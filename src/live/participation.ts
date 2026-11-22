import type { LivePlayer } from './types';
/** A sit-out marker is conclusive only without cards or a current contribution. */
export const isSittingOut = (p: LivePlayer) => p.sittingOut === true && !p.inHand && p.bet === 0;
export const unknownParticipation = (p: LivePlayer) => !p.inHand && !p.folded && !isSittingOut(p);
