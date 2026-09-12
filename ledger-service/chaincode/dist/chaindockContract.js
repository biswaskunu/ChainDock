"use strict";
/*
 * ChainDock custody/audit chaincode.
 *
 * Scope is deliberately narrow per ARCHITECTURE.md §2 and §4: this chaincode
 * records and serves custody/audit events. It does NOT enforce access control
 * or business rules — that stays in Axum. It does NOT re-implement a
 * client-side hash chain — Fabric's own block/endorsement structure is the
 * tamper-evidence guarantee. `entryHash` exists only to support the tamper
 * DEMO (see DESIGN.md §5): GET /ledger/verify recomputes this hash from an
 * entry's own stored fields and compares it, to catch an edit made directly
 * against the state DB (CouchDB) rather than through chaincode.
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChainDockContract = void 0;
const fabric_contract_api_1 = require("fabric-contract-api");
const crypto_1 = require("crypto");
const DOC_TYPE = 'ChainDockEntry';
/**
 * Deterministic across every endorsing peer: all peers executing this
 * chaincode receive the exact same arguments as part of the same proposal,
 * so hashing them produces an identical result everywhere. That determinism
 * is required for Fabric endorsement to succeed at all.
 */
function computeEntryHash(actorId, action, documentId, caseId, timestamp) {
    return (0, crypto_1.createHash)('sha256')
        .update(actorId)
        .update(action)
        .update(documentId)
        .update(caseId)
        .update(timestamp)
        .digest('hex');
}
let ChainDockContract = class ChainDockContract extends fabric_contract_api_1.Contract {
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
    async AppendEntry(ctx, actorId, action, documentId, caseId, timestamp) {
        if (!actorId || !action || !timestamp) {
            throw new Error('actorId, action, and timestamp are required');
        }
        const entryId = ctx.stub.getTxID();
        const docId = documentId !== null && documentId !== void 0 ? documentId : '';
        const caseIdVal = caseId !== null && caseId !== void 0 ? caseId : '';
        const entry = {
            docType: DOC_TYPE,
            entryId,
            actorId,
            action,
            documentId: docId,
            caseId: caseIdVal,
            timestamp,
            entryHash: computeEntryHash(actorId, action, docId, caseIdVal, timestamp),
        };
        await ctx.stub.putState(entryId, Buffer.from(JSON.stringify(entry)));
        return entryId;
    }
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
    async GetHistory(ctx, caseId) {
        const query = {
            selector: {
                docType: DOC_TYPE,
                caseId,
            },
        };
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const entries = [];
        let result = await iterator.next();
        while (!result.done) {
            if (result.value && result.value.value.toString()) {
                entries.push(JSON.parse(Buffer.from(result.value.value).toString('utf8')));
            }
            result = await iterator.next();
        }
        await iterator.close();
        entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        return JSON.stringify(entries);
    }
    /**
     * Single-entry lookup by entryId. Backs the recompute-and-compare step of
     * GET /ledger/verify: the Ledger Service calls this, recomputes
     * entryHash from the returned fields, and checks it against the stored
     * entryHash — catching an edit made directly against CouchDB's state DB
     * rather than through chaincode (the tamper-demo mechanism from
     * DESIGN.md §5).
     */
    async GetEntry(ctx, entryId) {
        const bytes = await ctx.stub.getState(entryId);
        if (!bytes || bytes.length === 0) {
            throw new Error(`entry ${entryId} does not exist`);
        }
        return Buffer.from(bytes).toString('utf8');
    }
};
exports.ChainDockContract = ChainDockContract;
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    (0, fabric_contract_api_1.Returns)('string'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ChainDockContract.prototype, "AppendEntry", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    (0, fabric_contract_api_1.Returns)('string'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], ChainDockContract.prototype, "GetHistory", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    (0, fabric_contract_api_1.Returns)('string'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], ChainDockContract.prototype, "GetEntry", null);
exports.ChainDockContract = ChainDockContract = __decorate([
    (0, fabric_contract_api_1.Info)({
        title: 'ChainDockContract',
        description: 'Custody/audit ledger for ChainDock — AppendEntry / GetHistory / GetEntry',
    })
], ChainDockContract);
//# sourceMappingURL=chaindockContract.js.map