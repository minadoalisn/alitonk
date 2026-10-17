# Published-record summary contract

Updated: 2026-10-17. This is an editorial publication gate, not automatic blockchain verification or an independent audit.

The public file currently contains an unverified historical placeholder. It must stay unverified, and its unknown statistics must not become zero or a verified donation. No real transfer was verified as part of this code change.

Before publishing a reviewed receipt, the responsible reviewer must inspect its complete transaction on the correct network. Check successful execution, the actual receiving address, the asset identity (including token contract and decimals where applicable), the received amount, block time and sufficient confirmations/finality. A token contract's transaction `to` address alone does not prove a token transfer to the treasury: review transfer events or balances. Save the evidence and review outcome; never infer them from a submitted hash, a button click or an address copy.

## Required data

- Use only a currency and network in `public/js/site-config.js` and its existing recipient address. Never change that configuration to make a record pass.
- Each record needs `status: "confirmed"`, `currency`, `network`, `recipient`, a complete `txHash`, a positive exact decimal-string `amount`, and an ISO UTC `timestamp` identifying the reviewed transaction time.
- `verification` must contain `status: "verified"`, `result: "received"`, an accountable `reviewedBy`, a non-future ISO UTC `reviewedAt` no earlier than the transaction, `verifiedTransactionAt` matching its transaction time, and a canonical transaction `sourceUrl` on the network's explorer.
- Required explorer prefixes: BSC `https://bscscan.com/tx/`, Bitcoin `https://mempool.space/tx/`, Solana `https://solscan.io/tx/`. Link the transaction, not an account, search result or unrelated hash. Hex transaction identifiers are normalized to lowercase; Solana identifiers remain case-sensitive.
- The file must declare `reportingPeriod: { "start": <ISO UTC>, "end": <ISO UTC> }`. Start is inclusive, end exclusive. Both dates must be valid, start must precede end, and the period must be complete. Do not create a historical collection period unless the underlying evidence supports it.
- Amounts use exact decimal strings, not floating-point JSON numbers or scientific notation. The gate supports up to 18 fractional digits on BSC, 8 on Bitcoin, and 9 on Solana; the reviewer must still check the specific asset's decimals.

No sample reviewed record is included here to avoid publishing fabricated transaction evidence. Unit-test records are explicitly synthetic and must never be copied into public donation data.

## Summary boundaries

- Missing or invalid evidence, missing routing configuration, and missing/invalid periods fail closed. No eligible published records means actual donation totals are unknown, not zero donations.
- Deduplication uses network plus complete transaction identifier. Equivalent entries count once. Conflicting amount, asset, recipient or transaction-time claims for that identity are excluded from the summary, not arbitrarily selected.
- This minimal format supports one reviewed recipient/asset aggregate per transaction. Multi-asset or other ambiguous transactions need a separately reviewed event-level ledger; do not squeeze them into this format.
- Currency and network groups are displayed separately. Decimal arithmetic preserves small amounts and does not estimate an exchange rate. Dates are the declared reporting period, not the operator's browser session or local request log.
- A summary describes the published reviewed subset only, not a complete fundraising total, donor count, token issuance, legal status, expenditure, delivery or beneficiary impact. The browser checks metadata completeness and consistency; it does not fetch or authenticate blockchain receipts.

## Technical references checked on 2026-10-17

- BNB Chain JSON-RPC compatibility: https://docs.bnbchain.org/bnb-smart-chain/developers/json_rpc/json-rpc-endpoint/ . Page date shown: 2026-08-19; first publication unknown. Documentation, not a donation event.
- Ethereum transaction hash and receipt API: https://ethereum.org/en/developers/docs/apis/json-rpc/ . Publication/update date not obtained; `eth_getTransactionReceipt` expects a 32-byte identifier and does not return pending receipts. Documentation, not a donation event.
- Bitcoin transaction details: https://developer.bitcoin.org/reference/rpc/getrawtransaction.html . Publication/update date unknown; transaction identifier, output details and confirmation information are separate fields. Documentation, not a donation event.
- Solana transaction lookup: https://solana.com/docs/rpc/http/gettransaction . Publication/update date unknown; uses a base-58 signature and can return null for an unfound or unconfirmed transaction.
- Solana signature structure: https://solana.com/docs/core/transactions . Publication/update date unknown; each signature is 64 bytes. Documentation, not a donation event.

Unknown dates stay unknown. These references explain the publication checks; they are not evidence of any ALI Charity donation.
