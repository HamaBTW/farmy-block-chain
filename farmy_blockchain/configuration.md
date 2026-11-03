# Farmy Blockchain — Configuration

This project connects three tools:

| Tool | Role |
|------|------|
| **Ganache** (desktop GUI) | Local Ethereum blockchain (accounts with test ETH, mines transactions instantly) |
| **Truffle** | Compiles, deploys (migrates) and tests the Solidity contracts on Ganache |
| **MetaMask** | Browser wallet the front-end (`app/`) uses to sign transactions on Ganache |

```
 MetaMask (browser) ──┐
                      ├──► Ganache RPC  http://127.0.0.1:7545  (network ID 5777, chain ID 1337)
 Truffle (CLI)  ──────┘
```

---

## 1. Prerequisites

| Requirement | Version used | Check |
|-------------|--------------|-------|
| Node.js | v22.x | `node -v` |
| npm | comes with Node | `npm -v` |
| Truffle | v5.11.5 | `truffle version` |
| OpenZeppelin contracts | 5.0.2 (pinned, `npm install` here) | `npm ls @openzeppelin/contracts` |
| Ganache (GUI) | v2.x desktop app | — |
| MetaMask | browser extension | — |
| Solidity compiler | 0.8.24, `evmVersion: paris` (pinned in `truffle-config.js`, downloaded automatically) | — |

Install Truffle globally if needed:

```bash
npm install -g truffle
```

> Ganache 7 has no Shanghai/Cancun opcodes, so the compiler targets `paris`. OpenZeppelin is pinned to 5.0.2 because 5.1+ needs `mcopy`.

---

## 2. Ganache configuration

Ganache → ⚙️ Settings → **SERVER** tab:

| Setting | Value |
|---------|-------|
| Hostname | `127.0.0.1 - lo0` |
| Port number | `7545` |
| Network ID | `5777` |
| Automine | ON |
| Error on transaction failure | ON |

Click **RESTART** after you change anything.

> **Network ID and chain ID are different things.** Ganache reports network ID `5777` (`net_version`),
> but its **chain ID is `1337`** (`eth_chainId` = `0x539`). Truffle uses the network ID, and
> MetaMask uses the chain ID.

---

## 3. Truffle configuration

`truffle-config.js`:

```js
networks: {
  development: {
    host: "127.0.0.1",
    port: 7545,
    network_id: "5777",
  },
},
compilers: { solc: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "paris" } } },
```

Truffle signs with Ganache's unlocked accounts. **Account 0** deploys the contracts by default.

---

## 4. MetaMask configuration

### 4.1 Add the Ganache network
MetaMask → Networks → **Add a network manually**:

| Field | Value |
|-------|-------|
| Network name | `Farmy` (MetaMask warns that the name doesn't match its records, suggesting "Localhost 8545". Ignore the warning.) |
| Default RPC URL | `http://127.0.0.1:7545` |
| Chain ID | `1337` |
| Currency symbol | `ETH` |
| Block explorer URL | *(leave empty)* |

### 4.2 Import the Ganache account
1. In Ganache → **ACCOUNTS**, click the 🔑 key icon of the **first account** (`0x6B34…87ac`) and copy its private key.
2. MetaMask → account menu → **Add account or hardware wallet → Import account** → paste the private key.
3. Switch MetaMask to the **Farmy** network. The account should show Ganache's balance.

> ⚠️ These private keys are for local testing only. Never send real funds to them or use them on mainnet.

---

## 5. Front-end (`../farmy_web/`)

The Next.js UI is its own project next to this one (see `../architecture.md`). It reads the ABIs and
addresses from `build/contracts/` through `npm run sync-contracts`. For reads it calls Ganache at
`http://127.0.0.1:7545`, and MetaMask signs the transactions.

```bash
npm run migrate                 # here: truffle migrate --reset + sync ABIs into farmy_web
cd ../farmy_web && npm install && npm run dev
```

Open `http://localhost:3000`. The home page shows a status row for Ganache, MetaMask, the network and each contract.

---

## 6. Check the connections

With Ganache running:

```bash
# 1. Ganache responds: should print "5777" and "0x539" (1337)
curl -s -X POST -H 'Content-Type: application/json' --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' http://127.0.0.1:7545
curl -s -X POST -H 'Content-Type: application/json' --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' http://127.0.0.1:7545
```

```bash
# 2. Truffle compiles and deploys to Ganache, and syncs the ABIs to farmy_web
npm run migrate
```

```bash
# 3. Contract tests pass on Ganache
npm test
```

Results on 2026-11-03:
- Ganache: `net_version` = `5777`, `eth_chainId` = `0x539` (1337), 20 accounts
- `truffle migrate` + `truffle test` passed with the MetaCoin sample (now removed), deployed from account `0x6B34…87ac`
- solc 0.8.24/paris + OpenZeppelin 5.0.2 ERC-721 and ERC-20 deploy to this Ganache

**MetaMask check:** the imported account shows the same balance as Ganache account 0. After a
transaction from the dApp, the transaction count goes up in Ganache (**TRANSACTIONS** tab).

---

## 7. Troubleshooting

| Problem | Fix |
|---------|-----|
| `Could not connect to your Ethereum client` | Ganache isn't running, or isn't on port 7545 |
| `The network id specified in the truffle config (5777) does not match ...` | Ganache's Network ID setting changed. Set it back to 5777, or update `truffle-config.js` |
| MetaMask: "Chain ID returned by the RPC URL does not match" | Use chain ID **1337**, not 5777 |
| MetaMask: `nonce too high` / stuck transactions after a Ganache restart | MetaMask → Settings → Advanced → **Clear activity tab data** |
| Balance is 0 in MetaMask | The wrong network is selected, or you imported a key from another workspace |
| `Cannot find module '../binaries/uws_darwin_arm64_127.node'` during `truffle test` | Harmless warning (no native WebSocket binary for Node 22); tests still run |
