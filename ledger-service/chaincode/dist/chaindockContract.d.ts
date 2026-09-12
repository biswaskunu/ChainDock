import { Context, Contract } from 'fabric-contract-api';
export interface Entry {
    docType: string;
    entryId: string;
    actorId: string;
    action: string;
    documentId: string;
    caseId: string;
    timestamp: string;
    entryHash: string;
}
export declare class ChainDockContract extends Contract {
    /**
     * Records one custody/audit event. Called by the Ledger Service's
     * POST /ledger/entries, which Axum's audit.rs calls AFTER the
     * corresponding Postgres transaction has already committed (see
     * DESIGN.md §2 — there is no shared 2-phase commit between Postgres
     * and Fabric).
     *
     * entryId is the transaction ID (ctx.stub.getTxID()), not a
     * client-supplied or randomly-generated value. Unlike Date.now() or a
     * fresh uuid(), the txId is agreed upon as part of the proposal itself,
     * so every endorsing peer arrives at the same entryId deterministically.
     */
    AppendEntry(ctx: Context, actorId: string, action: string, documentId: string, caseId: string, timestamp: string): Promise<string>;
    /**
     * Chronological (by timestamp) list of every entry for one case. Backs
     * GET /ledger/cases/:case_id/trail, which audit.rs proxies to.
     *
     * Uses a CouchDB selector query — requires the network's state database
     * to be CouchDB, not LevelDB, which matches the network you already have
     * running (and which the tamper-demo mechanism also depends on). Sorting
     * happens client-side here rather than via a CouchDB sort index — the
     * simplest correct option at hackathon-demo data volumes; only worth
     * revisiting if trail sizes get large enough to matter.
     */
    GetHistory(ctx: Context, caseId: string): Promise<string>;
    /**
     * Single-entry lookup by entryId. Backs the recompute-and-compare step of
     * GET /ledger/verify: the Ledger Service calls this, recomputes
     * entryHash from the returned fields, and checks it against the stored
     * entryHash — catching an edit made directly against CouchDB's state DB
     * rather than through chaincode (the tamper-demo mechanism from
     * DESIGN.md §5).
     */
    GetEntry(ctx: Context, entryId: string): Promise<string>;
}
