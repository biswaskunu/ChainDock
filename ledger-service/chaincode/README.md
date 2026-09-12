# ChainDock chaincode

Implements the three functions from `DESIGN.md` §2: `AppendEntry`, `GetHistory`, `GetEntry`.
No access control or business logic on-chain — that stays in Axum, per `ARCHITECTURE.md` §4.

## Build

```bash
cd ledger-service/chaincode
npm install
npm run build
```

## Deploy (same flow as the `asset-transfer-basic` sample you already validated)

From `fabric-samples/test-network`:

```bash
./network.sh deployCC -ccn chaindock -ccp ../../ChainDock/ledger-service/chaincode -ccl typescript
```

Adjust `-ccp` to wherever your ChainDock clone sits relative to `fabric-samples` on your machine.

## Invoke / query via peer CLI

Set your Org1 peer env vars the same way you did for the sample chaincode, then:

```bash
# Append an entry
peer chaincode invoke -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile "$ORDERER_CA" \
  -C chaindock-channel -n chaindock \
  --peerAddresses localhost:7051 --tlsRootCertFiles "$PEER0_ORG1_CA" \
  -c '{"function":"AppendEntry","Args":["user-1","UPLOAD","doc-1","case-1","2026-09-12T10:00:00Z"]}'

# Read it back — entryId is the invoke's transaction ID, grab it from that output
peer chaincode query -C chaindock-channel -n chaindock \
  -c '{"function":"GetEntry","Args":["<entryId>"]}'

# Get a case's trail
peer chaincode query -C chaindock-channel -n chaindock \
  -c '{"function":"GetHistory","Args":["case-1"]}'
```

## Notes

- Requires the network's state database to be **CouchDB**, not LevelDB — `GetHistory` uses a
  CouchDB selector query. This should already be the case if you're planning the CouchDB-based
  tamper-demo mechanism from `DESIGN.md` §5.
- `entryHash` is per-entry only (no `prevHash` chaining) — Fabric's own block/endorsement
  structure is the tamper-evidence guarantee here, not a client-side hash chain. See
  `ARCHITECTURE.md` §4 for why we deliberately don't reimplement one.
