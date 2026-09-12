"use strict";
/*
 * Chaincode entry point — the exported `contracts` array is what `peer
 * lifecycle` picks up on instantiation. Mirrors the shape of fabric-samples'
 * asset-transfer-typescript chaincode you already deployed successfully.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.contracts = exports.ChainDockContract = void 0;
const chaindockContract_1 = require("./chaindockContract");
var chaindockContract_2 = require("./chaindockContract");
Object.defineProperty(exports, "ChainDockContract", { enumerable: true, get: function () { return chaindockContract_2.ChainDockContract; } });
exports.contracts = [chaindockContract_1.ChainDockContract];
//# sourceMappingURL=index.js.map