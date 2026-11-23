export interface DrawExclusion {
  giverId: string;
  receiverId: string;
}

export interface DrawOptions {
  participantIds: string[];
  exclusions: DrawExclusion[];
  avoidTwoCycles: boolean;
  /** History of previous draws: giverId -> receiverId to avoid repeating. Optional. */
  previousAssignments?: Record<string, string>;
}

export type DrawErrorCode = 'NOT_ENOUGH' | 'EMPTY_DOMAIN' | 'NO_SOLUTION';

export class DrawError extends Error {
  code: DrawErrorCode;

  constructor(message: string, code: DrawErrorCode) {
    super(message);
    this.name = 'DrawError';
    this.code = code;
  }
}

/**
 * Secret-santa engine using backtracking + MRV (Minimum Remaining Values).
 * Respects self-exclusion, SAME_PHONE and MANUAL exclusions, previous history
 * (optional) and avoids 2-cycles (A->B and B->A) when avoidTwoCycles is true.
 */
export function runDraw(opts: DrawOptions): Record<string, string> {
  const { participantIds, exclusions, avoidTwoCycles, previousAssignments } = opts;
  const n = participantIds.length;

  if (n < 2) {
    throw new DrawError('At least 2 participants are required to draw.', 'NOT_ENOUGH');
  }

  const forbidden: Record<string, Set<string>> = {};
  for (const id of participantIds) forbidden[id] = new Set<string>([id]);

  for (const e of exclusions) {
    if (!forbidden[e.giverId]) continue;
    if (!participantIds.includes(e.receiverId)) continue;
    forbidden[e.giverId].add(e.receiverId);
  }

  if (previousAssignments) {
    for (const [giver, receiver] of Object.entries(previousAssignments)) {
      if (!forbidden[giver]) continue;
      if (participantIds.includes(receiver)) forbidden[giver].add(receiver);
    }
  }

  const emptyDomain = participantIds.filter((id) => {
    return participantIds.every((r) => forbidden[id].has(r));
  });
  if (emptyDomain.length > 0) {
    throw new DrawError(
      'No solution: some participants cannot give to anyone due to exclusions. Review the manual or shared-phone exclusions.',
      'EMPTY_DOMAIN',
    );
  }

  const assignment: Record<string, string> = {};
  const assignedReceivers = new Set<string>();

  function available(giver: string): string[] {
    const out: string[] = [];
    for (const r of participantIds) {
      if (forbidden[giver].has(r)) continue;
      if (assignedReceivers.has(r)) continue;
      if (avoidTwoCycles && assignment[r] === giver) continue;
      out.push(r);
    }
    return out;
  }

  function backtrack(remaining: string[]): boolean {
    if (remaining.length === 0) return true;

    let chosen: string | null = null;
    let chosenDomain: string[] | null = null;

    for (const g of remaining) {
      const dom = available(g);
      if (dom.length === 0) return false;
      if (!chosenDomain || dom.length < chosenDomain.length) {
        chosen = g;
        chosenDomain = dom;
        if (dom.length === 1) break;
      }
    }

    const giver = chosen!;
    const domain = chosenDomain!;

    for (const receiver of domain) {
      assignment[giver] = receiver;
      assignedReceivers.add(receiver);
      if (backtrack(remaining.filter((x) => x !== giver))) return true;
      assignedReceivers.delete(receiver);
      delete assignment[giver];
    }

    return false;
  }

  const solved = backtrack(participantIds);
  if (!solved) {
    throw new DrawError(
      'No valid combination found with the current constraints (self-exclusion, shared phone, manual exclusions and/or avoid 2-cycles). Try removing a constraint.',
      'NO_SOLUTION',
    );
  }

  return assignment;
}
