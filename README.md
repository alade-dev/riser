# Riser

Riser is a **Sepolia FHEVM** web application for **ERC-7984 confidential tokens**: shield public ERC-20 via wrappers (**wrap**), move balances privately (**send**), and unshield (**unwrap**). The UI is a React + Vite frontend; smart contracts use **Hardhat**, **Zama FHEVM**, and **OpenZeppelin Confidential Contracts** (`ERC7984ERC20Wrapper`).

---

## Table of contents

1. [Live deployment](#live-deployment)
2. [Features](#features)
3. [Tech stack](#tech-stack)
4. [Repository layout](#repository-layout)
5. [Prerequisites](#prerequisites)
6. [Installation](#installation)
7. [Environment variables](#environment-variables)
8. [Smart contracts](#smart-contracts)
9. [Frontend](#frontend)
10. [Deploying contracts](#deploying-contracts)
11. [Troubleshooting](#troubleshooting)
12. [License](#license)

---

## Live deployment

The production build is hosted at **[https://riser-eth.vercel.app](https://riser-eth.vercel.app)** (Sepolia Zama FHEVM — connect a wallet on chain ID **11155111**). 

---

## Features

- **Wallet connection** on Ethereum Sepolia (`11155111`) with MetaMask (or any EIP-1193 wallet).
- **Confidential balances** for **cETH** and **cUSDT** via the Zama SDK (decryption after authorization).
- **Send**: confidential transfers between addresses using wrapped tokens.
- **Swap (wrap / unwrap)**: deposit public ERC-20 into FHEVM wrappers or unwrap back to public tokens; gas-aware approvals and wraps.
- **History**: combines indexed confidential transfers and public ERC-20 activity relevant to your address.
- **Footer**: optional **Add cTokens to wallet** (EIP-747) for the confidential token contracts.

---

## Tech stack

| Area | Technology |
|------|------------|
| Smart contracts | Solidity 0.8.x, Hardhat, `@fhevm/hardhat-plugin`, OpenZeppelin + Confidential Contracts |
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4 |
| Chain / wallet | Viem, `@zama-fhe/sdk`, Sepolia |

---

## Repository layout

```text
riser/
├── contracts/           # Solidity sources (wrappers, mocks, experiments)
├── scripts/             # Hardhat deployment scripts (e.g. deploy.ts)
├── test/                # Hardhat tests
├── frontend/            # Vite React app (src/, index.html)
├── hardhat.config.ts    # Networks: hardhat, local, sepolia
├── package.json         # Root: Hardhat + shared deps
├── .env.example         # Template for PRIVATE_KEY / RPC (copy to .env)
└── README.md
```

The **root** `package.json` drives Hardhat. The **frontend** has its own `package.json` for Vite (`frontend/`).

---

## Prerequisites

- **Node.js** 18+ (LTS recommended).
- **npm** (or compatible client) for installs.
- A wallet with **Sepolia ETH** for transactions.
- For deployment: a funded account whose **private key** you load via `.env` (see below).

---

## Installation

From the repository root:

```bash
npm install
```

Install frontend dependencies:

```bash
cd frontend && npm install && cd ..
```

---

## Environment variables

Create a **`.env`** file at the **repository root** (same level as `hardhat.config.ts`). Do **not** commit it; it is listed in `.gitignore`.

| Variable | Required | Description |
|----------|----------|-------------|
| `PRIVATE_KEY` | For `sepolia` / `local` funded deploys | Hex private key of the deployer (no `0x` prefix is common for Hardhat; follow your tooling’s expectation). |
| `SEPOLIA_RPC_URL` | Optional | JSON-RPC URL for Sepolia. If omitted, `hardhat.config.ts` falls back to a public endpoint. |

Copy from the template:

```bash
cp .env.example .env
# Edit .env and set PRIVATE_KEY (and optionally SEPOLIA_RPC_URL).
```

---

## Smart contracts

Commands are run from the **repository root**.

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile Solidity (`hardhat compile`). |
| `npm test` | Run Hardhat tests. |
| `npm run node` | Start a local Hardhat node (`hardhat node`). |

Compiled output goes to `artifacts/` and `cache/` (ignored by git). TypeChain types go to `typechain-types/` (ignored).

---

## Frontend

All commands below assume **`frontend/`** as the working directory.

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (hot reload). |
| `npm run build` | Typecheck + production build → `frontend/dist/`. |
| `npm run preview` | Preview the production build locally. |

Configure contract addresses in **`frontend/src/App.tsx`** (`ETH_CONTRACT_ADDRESS`, `USDT_CONTRACT_ADDRESS`) to match the confidential **wrapper** contracts you use on Sepolia (or values produced by your deploy script).

---

## Deploying contracts

The script **`scripts/deploy.ts`** deploys mock public ERC-20 tokens and **`ERC7984ERC20WrapperExample`** instances, then **rewrites** `frontend/src/App.tsx` wrapper addresses to match the new deployment.

Example (Sepolia):

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

Requirements:

- Valid **`PRIVATE_KEY`** in `.env` with Sepolia ETH.
- Successful compile (`npm run compile`).

After deployment, review **`App.tsx`** and commit address updates if you version-control them.

---

## Troubleshooting

- **“No accounts found” / deploy fails** — Ensure `.env` exists at the repo root and `PRIVATE_KEY` is set for the chosen network.
- **Frontend cannot reach RPC** — Set `SEPOLIA_RPC_URL` to a reliable provider; public RPCs can rate-limit.
- **Wrap / unwrap errors** — Confirm wrapper addresses match Sepolia; underlying token **decimals** must match what the UI reads on-chain; ensure sufficient **public** balance before wrap and **private** balance before unwrap.
- **Large git checkout** — Ensure `node_modules/`, `artifacts/`, `cache/`, `frontend/dist/`, and `.env` are **not** committed (see `.gitignore`).

---

## License

Refer to the SPDX identifiers in individual Solidity files and the licenses of dependencies (Hardhat, OpenZeppelin, Zama FHEVM, etc.).
