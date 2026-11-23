export interface DrawExclusion {
  giverId: string;
  receiverId: string;
}

export interface DrawOptions {
  participantIds: string[];
  exclusions: DrawExclusion[];
  avoidTwoCycles: boolean;
  /** Historial de sorteigs anteriors: giverId -> receiverId a evitar repetir. Opcional. */
  previousAssignments?: Record<string, string>;
}

export class DrawError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DrawError';
  }
}

/**
 * Motor de sorteig amb backtracking + heurística MRV (Minimum Remaining Values).
 * Respecta: auto-exclusió, exclusions (SAME_PHONE / MANUAL), historial anterior
 * i evita cicles de 2 (A->B i B->A) quan avoidTwoCycles és cert.
 */
export function runDraw(opts: DrawOptions): Record<string, string> {
  const { participantIds, exclusions, avoidTwoCycles, previousAssignments } = opts;
  const n = participantIds.length;

  if (n < 2) {
    throw new DrawError('Cal afegir com a mínim 2 participants per fer el sorteig.');
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
      'Sense solució: hi ha participants que no poden regalar a ningú per les exclusions. Revisa les exclusions manuals o de telèfon compartit.',
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
      "No s'ha trobat cap combinació vàlida amb les restriccions actuals (auto-exclusió, telèfon compartit, exclusions manuals i/o evitar cicles de 2). Prova de treure alguna restricció.",
    );
  }

  return assignment;
}
