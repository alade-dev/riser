import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { BalanceCard } from './components/BalanceCard';
import { NavBar } from './components/NavBar';
import { SendScreen } from './screens/SendScreen';
import { SwapScreen } from './screens/SwapScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { Alert } from './components/Alert';
import { IconShield, IconSwap, IconHistory } from './components/Icons';

// Zama FHE VM SDK & Viem imports
import { ZamaSDK, SepoliaConfig, indexedDBStorage, RelayerWeb, ReadonlyToken, type Address } from '@zama-fhe/sdk';
import { ViemSigner } from '@zama-fhe/sdk/viem';
import { createPublicClient, createWalletClient, custom, erc20Abi, getAddress, parseAbi, parseAbiItem, parseUnits, formatUnits } from 'viem';
import { sepolia } from 'viem/chains';

// Actual Contract Addresses on Zama Sepolia FHEVM Testnet
const ETH_CONTRACT_ADDRESS = '0xceA7DFD4547B92eDE105a20345D4973d272FDdb9';
const USDT_CONTRACT_ADDRESS = '0x4Bf61234635A98e2533053Aebe1E8e22Aa2fbad6';

// Add ABI definitions for the real Wrapper and ERC20 interaction
const WRAPPER_ABI = [
  { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "wrap", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "unwrap", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "underlying", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }
];

const TOKEN_META_ABI = parseAbi([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
]);
const ERC20_ABI = [
  { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }
];

interface HistoryItem {
  id: string;
  action: string;
  token: string;
  amount: string;
  type: 'Private' | 'Wallet';
  status: 'Completed' | 'Pending' | 'Failed';
  txHash: string;
  timestamp: string;
}

/** Local-only activity (wrap / unwrap) not covered by ConfidentialTransfer indexing */
interface StoredActivity {
  txHash: string;
  action: string;
  token: string;
  amount: string;
  at: string;
}

/** Matches IERC7984 — third topic is the encrypted handle (`bytes32`), not `uint256`. */
const CONFIDENTIAL_TRANSFER_EVENT = parseAbiItem(
  'event ConfidentialTransfer(address indexed from, address indexed to, bytes32 indexed amount)'
);

const ERC20_TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)'
);

const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

function classifyConfidentialTransfer(
  log: { args: Record<string, unknown>; address: string; transactionHash: string },
  userLower: string,
  symbol: 'ETH' | 'USDT',
  localTxMap: Map<string, { amount?: string }>
): Pick<HistoryItem, 'action' | 'amount' | 'token'> {
  const args = log.args as { from: string; to: string };
  const from = args.from.toLowerCase();
  const to = args.to.toLowerCase();
  const txHash = log.transactionHash.toLowerCase();
  const local = localTxMap.get(txHash);

  if (from === ZERO_ADDR && to === userLower) {
    return {
      action: `Shield · mint c${symbol}`,
      token: symbol,
      amount: local?.amount ?? 'Confidential',
    };
  }
  if (to === ZERO_ADDR && from === userLower) {
    return {
      action: `Unshield · burn c${symbol}`,
      token: symbol,
      amount: local?.amount ?? 'Confidential',
    };
  }
  if (from === userLower) {
    const peer = args.to;
    return {
      action: `Confidential send → ${peer.slice(0, 6)}…${peer.slice(-4)}`,
      token: symbol,
      amount: local?.amount ?? 'Confidential',
    };
  }
  const peer = args.from;
  return {
    action: `Confidential receive ← ${peer.slice(0, 6)}…${peer.slice(-4)}`,
    token: symbol,
    amount: local?.amount ?? 'Confidential',
  };
}

function classifyErc20Transfer(
  log: { args: Record<string, unknown>; address: string },
  userLower: string,
  symbol: 'ETH' | 'USDT',
  decimals: number,
  wrapperAddrLower: string
): Pick<HistoryItem, 'action' | 'amount' | 'token'> {
  const args = log.args as { from: string; to: string; value: bigint };
  const from = args.from.toLowerCase();
  const to = args.to.toLowerCase();
  const v = formatUnits(args.value, decimals);

  if (to === wrapperAddrLower && from === userLower) {
    return { action: `Public ${symbol} → wrapper (deposit for wrap)`, amount: v, token: symbol };
  }
  if (from === wrapperAddrLower && to === userLower) {
    return { action: `Wrapper → public ${symbol} (unwrap payout)`, amount: v, token: symbol };
  }
  if (from === userLower) {
    return {
      action: `Public ${symbol} transfer → ${args.to.slice(0, 6)}…${args.to.slice(-4)}`,
      amount: v,
      token: symbol,
    };
  }
  return {
    action: `Public ${symbol} transfer ← ${args.from.slice(0, 6)}…${args.from.slice(-4)}`,
    amount: v,
    token: symbol,
  };
}

const INITIAL_TX_HISTORY: HistoryItem[] = [];

const activityStorageKey = (addr: string) =>
  `riser_activity_${addr.toLowerCase()}`;

function appendStoredActivity(
  walletAddress: string,
  partial: Omit<StoredActivity, 'at'>
) {
  const key = activityStorageKey(walletAddress);
  const list: StoredActivity[] = JSON.parse(localStorage.getItem(key) || '[]');
  list.push({ ...partial, at: new Date().toISOString() });
  localStorage.setItem(key, JSON.stringify(list));
}

/** MetaMask / RPC often reject txs when estimated gas exceeds ~16.8M ("gas limit too high"). */
const WALLET_GAS_CEILING = 16_777_215n;

async function cappedEstimateGas(
  publicClient: ReturnType<typeof createPublicClient>,
  params: {
    address: Address;
    abi: readonly unknown[];
    functionName: string;
    args: readonly unknown[];
    account: Address;
  },
  fallback: bigint
): Promise<bigint> {
  try {
    let g = await publicClient.estimateContractGas(params as Parameters<typeof publicClient.estimateContractGas>[0]);
    g = (g * 125n) / 100n;
    if (g > WALLET_GAS_CEILING) g = WALLET_GAS_CEILING;
    if (g < 21_000n) return fallback;
    return g;
  } catch {
    return fallback;
  }
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'send' | 'swap' | 'history'>('send');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<string>();
  
  // Real Decrypted Balances
  const [ethBalance, setEthBalance] = useState('0.0000');
  const [usdtBalance, setUsdtBalance] = useState('0.00');
  const [publicBalance, setPublicBalance] = useState('0.0000');
  /** Public ERC-20 balance for the USDT wrapper’s underlying (not native ETH). */
  const [publicUsdtBalance, setPublicUsdtBalance] = useState('0.00');
  
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Send state
  const [selectedToken, setSelectedToken] = useState<'ETH' | 'USDT'>('ETH');
  const [amountValue, setAmountValue] = useState('');
  const [recipient, setRecipient] = useState('');
  const [sending, setSending] = useState(false);

  // Swap/Wrap state
  const [swapInputAmount, setSwapInputAmount] = useState('');
  const [isWrapping, setIsWrapping] = useState(true);

  // History state
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(INITIAL_TX_HISTORY);

  // Zama SDK and token instances state
  const [ethTokenInstance, setEthTokenInstance] = useState<any>(null);
  const [usdtTokenInstance, setUsdtTokenInstance] = useState<any>(null);
  const [footerTokenImportBusy, setFooterTokenImportBusy] = useState(false);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  // Autodetect connection
  useEffect(() => {
    const checkConnection = async () => {
      if ((window as any).ethereum) {
        try {
          const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            await handleConnect();
          }
        } catch (err) {
          console.error("Error checking connection:", err);
        }
      }
    };
    checkConnection();
  }, []);

  const handleConnect = async () => {
    if (!(window as any).ethereum) {
      showAlert('error', 'MetaMask or compatible browser wallet is not installed.');
      return;
    }

    setLoading(true);
    try {
      // Request account access
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      // Wallets sometimes return invalid EIP-55 mixed case; Zama/ethers validate strictly. Normalize from lowercase.
      const userAddress = getAddress(accounts[0].toLowerCase() as `0x${string}`);

      // Switch/Add Sepolia Network (Chain ID 11155111)
      const targetChainId = '0x' + (11155111).toString(16); // '0xaa36a7'
      try {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetChainId }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: targetChainId,
                chainName: 'Sepolia Test Network',
                rpcUrls: [SepoliaConfig.network],
                nativeCurrency: {
                  name: 'Sepolia Ether',
                  symbol: 'ETH',
                  decimals: 18,
                },
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }

      // Initialize Viem clients
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: custom((window as any).ethereum),
      });

      const walletClient = createWalletClient({
        chain: sepolia,
        transport: custom((window as any).ethereum),
        account: userAddress,
      });

      // Wrap clients with Zama FHEVM ViemSigner
      const signer = new ViemSigner({
        publicClient,
        walletClient,
        ethereum: (window as any).ethereum,
      });

      // Construct RelayerWeb with standard Sepolia parameters
      const relayer = new RelayerWeb({
        getChainId: async () => 11155111,
        transports: {
          11155111: {
            relayerUrl: SepoliaConfig.relayerUrl,
            aclContractAddress: SepoliaConfig.aclContractAddress,
            kmsContractAddress: SepoliaConfig.kmsContractAddress,
            inputVerifierContractAddress: SepoliaConfig.inputVerifierContractAddress,
            verifyingContractAddressDecryption: SepoliaConfig.verifyingContractAddressDecryption,
            verifyingContractAddressInputVerification: SepoliaConfig.verifyingContractAddressInputVerification,
          },
        },
      });

      // Instantiate ZamaSDK
      const sdk = new ZamaSDK({
        relayer,
        signer,
        storage: indexedDBStorage,
        registryAddresses: {
          11155111: SepoliaConfig.registryAddress,
        },
      });

      // Create Token instances for confidential ETH and USDT
      const ethToken = sdk.createToken(ETH_CONTRACT_ADDRESS);
      const usdtToken = sdk.createToken(USDT_CONTRACT_ADDRESS);

      setEthTokenInstance(ethToken);
      setUsdtTokenInstance(usdtToken);

      setAddress(userAddress);
      setConnected(true);

      showAlert('success', 'Please sign the FHEVM decryption authorization to view your private balances...');
      await ReadonlyToken.allow(ethToken, usdtToken);

      showAlert('success', 'Connected to Sepolia FHEVM and Authorized!');

      // Fetch initial private balances & real history
      await Promise.all([
        fetchBalances(ethToken, usdtToken, userAddress),
        fetchTransactionHistory(userAddress)
      ]);
    } catch (err: any) {
      console.error(err);
      showAlert('error', err.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setConnected(false);
    setAddress(undefined);
    setEthTokenInstance(null);
    setUsdtTokenInstance(null);
    setEthBalance('0.0000');
    setUsdtBalance('0.00');
    setPublicBalance('0.0000');
    setPublicUsdtBalance('0.00');
    setHistoryItems([]);
    showAlert('success', 'Disconnected successfully.');
  };

  const handleAddCTokensToWallet = async () => {
    const eth = (window as any).ethereum;
    if (!eth?.request) {
      showAlert('error', 'Install MetaMask or another EIP-1193 wallet.');
      return;
    }

    setFooterTokenImportBusy(true);
    try {
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: custom(eth),
      });
      const origin = window.location.origin;
      const tokens: Array<{ addr: Address; image: string }> = [
        { addr: ETH_CONTRACT_ADDRESS as Address, image: `${origin}/images/eth.png` },
        { addr: USDT_CONTRACT_ADDRESS as Address, image: `${origin}/images/usdt.png` },
      ];
      const added: string[] = [];

      for (const { addr, image } of tokens) {
        const [symbol, decimals] = await Promise.all([
          publicClient.readContract({
            address: addr,
            abi: TOKEN_META_ABI,
            functionName: 'symbol',
          }),
          publicClient.readContract({
            address: addr,
            abi: TOKEN_META_ABI,
            functionName: 'decimals',
          }),
        ]);

        const sym = String(symbol).slice(0, 11);
        // MetaMask validates watchAsset decimals against the token contract's decimals() — must match (6 for these wrappers).
        const displayDecimals = Math.min(36, Math.max(0, Number(decimals)));

        await eth.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: getAddress(addr),
              symbol: sym,
              decimals: displayDecimals,
              image,
            },
          },
        });
        added.push(sym);
      }

      showAlert(
        'success',
        `Imported. use Riser to view real balances.`
      );
    } catch (e: any) {
      console.error(e);
      const cancelled =
        e?.code === 4001 ||
        String(e?.message || '')
          .toLowerCase()
          .includes('reject');
      showAlert(
        'error',
        cancelled ? 'Token import cancelled.' : e?.message || 'Could not add tokens to the wallet.'
      );
    } finally {
      setFooterTokenImportBusy(false);
    }
  };

  const fetchBalances = async (
    ethTok = ethTokenInstance,
    usdtTok = usdtTokenInstance,
    userAddr = address
  ) => {
    const currentEthTok = ethTok || ethTokenInstance;
    const currentUsdtTok = usdtTok || usdtTokenInstance;
    const rawAddr = userAddr || address;
    if (!currentEthTok || !currentUsdtTok || !rawAddr) return;
    const currentUserAddr = getAddress(rawAddr.toLowerCase() as `0x${string}`);

    setLoading(true);
    try {
      // Decrypt and fetch balances simultaneously (catching reverts if using old RiserToken instead of ERC7984)
      const [ethBalRaw, usdtBalRaw] = await Promise.all([
        currentEthTok.balanceOf(currentUserAddr),
        currentUsdtTok.balanceOf(currentUserAddr),
      ]);

      const ethDecs = await currentEthTok.decimals();
      const usdtDecs = await currentUsdtTok.decimals();

      setEthBalance(formatUnits(ethBalRaw, ethDecs));
      setUsdtBalance(formatUnits(usdtBalRaw, usdtDecs));
      
      // Fetch public ETH balance
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: custom((window as any).ethereum),
      });
      const pubBalRaw = await publicClient.getBalance({ address: currentUserAddr as Address });
      setPublicBalance(formatUnits(pubBalRaw, 18));

      const underlyingUsdt = await publicClient.readContract({
        address: USDT_CONTRACT_ADDRESS as Address,
        abi: WRAPPER_ABI,
        functionName: 'underlying',
      }) as Address;
      const [pubUsdtDecs, pubUsdtBalRaw] = await Promise.all([
        publicClient.readContract({
          address: underlyingUsdt,
          abi: erc20Abi,
          functionName: 'decimals',
        }),
        publicClient.readContract({
          address: underlyingUsdt,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [currentUserAddr],
        }),
      ]);
      setPublicUsdtBalance(formatUnits(pubUsdtBalRaw as bigint, Number(pubUsdtDecs)));

      showAlert('success', 'Balances successfully fetched!');
    } catch (err: any) {
      console.error(err);
      showAlert('error', 'Private balance decryption failed: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionHistory = async (userAddr = address) => {
    const currentUserAddr = userAddr || address;
    if (!currentUserAddr) return;

    try {
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: custom((window as any).ethereum),
      });

      const userAddr = currentUserAddr as Address;
      const userLower = userAddr.toLowerCase();

      const localTxsKey = `riser_tx_history_${userLower}`;
      const localTxs = JSON.parse(localStorage.getItem(localTxsKey) || '[]');
      const localTxMap = new Map<string, any>();
      localTxs.forEach((tx: any) => {
        localTxMap.set(tx.txHash.toLowerCase(), tx);
      });

      const wrappers = [ETH_CONTRACT_ADDRESS, USDT_CONTRACT_ADDRESS] as Address[];

      const [underlyingEth, underlyingUsdt] = await Promise.all([
        publicClient.readContract({
          address: ETH_CONTRACT_ADDRESS as Address,
          abi: WRAPPER_ABI,
          functionName: 'underlying',
        }) as Promise<Address>,
        publicClient.readContract({
          address: USDT_CONTRACT_ADDRESS as Address,
          abi: WRAPPER_ABI,
          functionName: 'underlying',
        }) as Promise<Address>,
      ]);

      const [decEth, decUsdt] = await Promise.all([
        publicClient.readContract({
          address: underlyingEth,
          abi: erc20Abi,
          functionName: 'decimals',
        }),
        publicClient.readContract({
          address: underlyingUsdt,
          abi: erc20Abi,
          functionName: 'decimals',
        }),
      ]);
      const ethDecimals = Number(decEth);
      const usdtDecimals = Number(decUsdt);

      const [
        ctFromUser,
        ctToUser,
        ercEthFrom,
        ercEthTo,
        ercUsdtFrom,
        ercUsdtTo,
      ] = await Promise.all([
        publicClient.getLogs({
          address: wrappers,
          event: CONFIDENTIAL_TRANSFER_EVENT,
          args: { from: userAddr },
          fromBlock: 0n,
        }),
        publicClient.getLogs({
          address: wrappers,
          event: CONFIDENTIAL_TRANSFER_EVENT,
          args: { to: userAddr },
          fromBlock: 0n,
        }),
        publicClient.getLogs({
          address: underlyingEth,
          event: ERC20_TRANSFER_EVENT,
          args: { from: userAddr },
          fromBlock: 0n,
        }),
        publicClient.getLogs({
          address: underlyingEth,
          event: ERC20_TRANSFER_EVENT,
          args: { to: userAddr },
          fromBlock: 0n,
        }),
        publicClient.getLogs({
          address: underlyingUsdt,
          event: ERC20_TRANSFER_EVENT,
          args: { from: userAddr },
          fromBlock: 0n,
        }),
        publicClient.getLogs({
          address: underlyingUsdt,
          event: ERC20_TRANSFER_EVENT,
          args: { to: userAddr },
          fromBlock: 0n,
        }),
      ]);

      const ctKey = (log: { transactionHash: string; logIndex?: number }) =>
        `${log.transactionHash.toLowerCase()}-${log.logIndex ?? 0}`;
      const ctSeen = new Set<string>();
      const ctLogs: typeof ctFromUser = [];
      for (const log of [...ctFromUser, ...ctToUser]) {
        const k = ctKey(log);
        if (ctSeen.has(k)) continue;
        ctSeen.add(k);
        ctLogs.push(log);
      }

      type ErcEnriched = {
        log: (typeof ercEthFrom)[number];
        symbol: 'ETH' | 'USDT';
        decimals: number;
        wrapper: string;
      };

      const ercSeen = new Set<string>();
      const ercFlat: ErcEnriched[] = [];
      const pushE = (log: ErcEnriched['log'], symbol: 'ETH' | 'USDT', decimals: number, wrapper: string) => {
        const k = ctKey(log);
        if (ercSeen.has(k)) return;
        ercSeen.add(k);
        ercFlat.push({ log, symbol, decimals, wrapper });
      };

      for (const log of ercEthFrom) pushE(log, 'ETH', ethDecimals, ETH_CONTRACT_ADDRESS);
      for (const log of ercEthTo) pushE(log, 'ETH', ethDecimals, ETH_CONTRACT_ADDRESS);
      for (const log of ercUsdtFrom) pushE(log, 'USDT', usdtDecimals, USDT_CONTRACT_ADDRESS);
      for (const log of ercUsdtTo) pushE(log, 'USDT', usdtDecimals, USDT_CONTRACT_ADDRESS);

      type TxGroup = {
        blockHash?: `0x${string}` | null;
        ct: typeof ctLogs;
        erc: ErcEnriched[];
      };

      const groups = new Map<string, TxGroup>();

      const touchGroup = (txHash: string, blockHash?: `0x${string}` | null) => {
        const k = txHash.toLowerCase();
        if (!groups.has(k)) groups.set(k, { blockHash: blockHash ?? undefined, ct: [], erc: [] });
        const g = groups.get(k)!;
        if (blockHash && !g.blockHash) g.blockHash = blockHash;
      };

      for (const log of ctLogs) {
        touchGroup(log.transactionHash as string, log.blockHash);
        groups.get((log.transactionHash as string).toLowerCase())!.ct.push(log);
      }

      for (const e of ercFlat) {
        touchGroup(e.log.transactionHash as string, e.log.blockHash);
        groups.get((e.log.transactionHash as string).toLowerCase())!.erc.push(e);
      }

      const blockHashes = new Set<string>();
      for (const g of groups.values()) {
        if (g.blockHash) blockHashes.add(g.blockHash.toLowerCase());
      }

      const blockTimestampMap = new Map<string, string>();
      await Promise.all(
        [...blockHashes].map(async (bh) => {
          try {
            const block = await publicClient.getBlock({ blockHash: bh as `0x${string}` });
            blockTimestampMap.set(
              bh,
              new Date(Number(block.timestamp) * 1000).toISOString()
            );
          } catch (e) {
            console.error('Failed to fetch block timestamp:', e);
          }
        })
      );

      const chainItems: HistoryItem[] = [];

      for (const [txHashLower, group] of groups) {
        const ts =
          blockTimestampMap.get((group.blockHash || '').toLowerCase()) ||
          new Date().toISOString();

        if (group.ct.length > 0) {
          const log = group.ct[0];
          const sym =
            String(log.address).toLowerCase() === ETH_CONTRACT_ADDRESS.toLowerCase()
              ? 'ETH'
              : 'USDT';
          const fields = classifyConfidentialTransfer(
            log as { args: Record<string, unknown>; address: string; transactionHash: string },
            userLower,
            sym,
            localTxMap
          );
          chainItems.push({
            id: txHashLower,
            ...fields,
            type: 'Private',
            status: 'Completed',
            txHash: txHashLower,
            timestamp: ts,
          });
          continue;
        }

        if (group.erc.length > 0) {
          const e = group.erc[0];
          const fields = classifyErc20Transfer(
            e.log as { args: Record<string, unknown>; address: string },
            userLower,
            e.symbol,
            e.decimals,
            e.wrapper.toLowerCase()
          );
          chainItems.push({
            id: txHashLower,
            ...fields,
            type: 'Wallet',
            status: 'Completed',
            txHash: txHashLower,
            timestamp: ts,
          });
        }
      }

      const activityKey = activityStorageKey(currentUserAddr);
      const storedRaw: StoredActivity[] = JSON.parse(
        localStorage.getItem(activityKey) || '[]'
      );
      const storedItems: HistoryItem[] = storedRaw.map((act) => ({
        id: act.txHash.toLowerCase(),
        action: act.action,
        token: act.token,
        amount: act.amount,
        type: 'Private',
        status: 'Completed',
        txHash: act.txHash.toLowerCase(),
        timestamp: act.at,
      }));

      const byTx = new Map<string, HistoryItem>();
      for (const row of chainItems) byTx.set(row.txHash.toLowerCase(), row);
      for (const row of storedItems) {
        const k = row.txHash.toLowerCase();
        if (!byTx.has(k)) byTx.set(k, row);
      }

      const items = Array.from(byTx.values());
      items.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setHistoryItems(items);
    } catch (err) {
      console.error("Failed to query on-chain history:", err);
    }
  };

  const handleRefreshBalances = async () => {
    await Promise.all([
      fetchBalances(),
      fetchTransactionHistory()
    ]);
  };

  const handleSend = async () => {
    if (!amountValue || parseFloat(amountValue) <= 0 || !recipient) return;
    if (!ethTokenInstance || !usdtTokenInstance || !address) {
      showAlert('error', 'Zama SDK is not initialized.');
      return;
    }

    setSending(true);
    try {
      const activeToken = selectedToken === 'ETH' ? ethTokenInstance : usdtTokenInstance;
      const decimals = await activeToken.decimals();
      const amountBigInt = parseUnits(amountValue, decimals);

      showAlert('success', `Generating zero-knowledge proofs and encrypting amount for ${amountValue} ${selectedToken}...`);
      
      // Call the fully confidential transfer from the Zama SDK
      const result = await activeToken.confidentialTransfer(recipient as Address, amountBigInt);
      const txHash = String(
        (result as { txHash?: string; hash?: string }).txHash ?? (result as { hash?: string }).hash
      ).toLowerCase();
      
      // Persist the transaction details locally so that we can render the exact amount in history
      const localTxsKey = `riser_tx_history_${address.toLowerCase()}`;
      const localTxs = JSON.parse(localStorage.getItem(localTxsKey) || '[]');
      localTxs.push({
        txHash,
        amount: amountValue,
        recipient,
        token: selectedToken
      });
      localStorage.setItem(localTxsKey, JSON.stringify(localTxs));

      showAlert('success', `Sent ${amountValue} ${selectedToken} confidentially (Tx: ${txHash.slice(0, 10)}...)`);
      
      setAmountValue('');
      setRecipient('');

      // Refresh on-chain balance and real transaction history
      await Promise.all([
        fetchBalances(),
        fetchTransactionHistory()
      ]);
    } catch (err: any) {
      console.error(err);
      showAlert('error', 'Confidential transaction failed: ' + (err.message || String(err)));
    } finally {
      setSending(false);
    }
  };

  const handleSwap = async () => {
    if (!swapInputAmount || parseFloat(swapInputAmount) <= 0) return;
    if (!ethTokenInstance || !usdtTokenInstance || !address) {
      showAlert('error', 'Zama SDK is not initialized.');
      return;
    }

    setSending(true);
    try {
      const activeToken = selectedToken === 'ETH' ? ethTokenInstance : usdtTokenInstance;

      const walletClient = createWalletClient({
        account: address as Address,
        chain: sepolia,
        transport: custom((window as any).ethereum)
      });
      const publicClient = createPublicClient({ chain: sepolia, transport: custom((window as any).ethereum) });
      const wrapperAddress = selectedToken === 'ETH' ? ETH_CONTRACT_ADDRESS : USDT_CONTRACT_ADDRESS;

      if (isWrapping) {
        showAlert('success', `Initiating real FHEVM wrap sequence for ${swapInputAmount} ${selectedToken}...`);

        const underlyingAddress = await publicClient.readContract({
          address: wrapperAddress as Address,
          abi: WRAPPER_ABI,
          functionName: 'underlying',
        }) as Address;

        // wrap(amount) expects underlying ERC-20 base units (e.g. 18 decimals), not confidential token decimals (caps at 6).
        const underlyingDecimals = await publicClient.readContract({
          address: underlyingAddress,
          abi: erc20Abi,
          functionName: 'decimals',
        });
        const dec = Number(underlyingDecimals);
        const amountBigInt = parseUnits(swapInputAmount, dec);

        const underlyingBal = await publicClient.readContract({
          address: underlyingAddress,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address as Address],
        }) as bigint;
        if (amountBigInt > underlyingBal) {
          throw new Error(
            `Insufficient public ${selectedToken}: balance ${formatUnits(underlyingBal, dec)}, requested ${swapInputAmount}.`
          );
        }

        showAlert('success', `Waiting for approval...`);
        const approveGas = await cappedEstimateGas(
          publicClient,
          {
            address: underlyingAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [wrapperAddress, amountBigInt],
            account: address as Address,
          },
          400_000n
        );
        const approveHash = await walletClient.writeContract({
          address: underlyingAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [wrapperAddress, amountBigInt],
          gas: approveGas,
        });
        const approveRcpt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
        if (approveRcpt.status === 'reverted') {
          throw new Error('ERC-20 approval transaction reverted.');
        }

        showAlert('success', `Tokens approved. Sending FHEVM wrap transaction...`);
        const wrapGas = await cappedEstimateGas(
          publicClient,
          {
            address: wrapperAddress as Address,
            abi: WRAPPER_ABI,
            functionName: 'wrap',
            args: [address as Address, amountBigInt],
            account: address as Address,
          },
          12_000_000n
        );
        const wrapHash = await walletClient.writeContract({
          address: wrapperAddress as Address,
          abi: WRAPPER_ABI,
          functionName: 'wrap',
          args: [address as Address, amountBigInt],
          gas: wrapGas,
        });

        const wrapRcpt = await publicClient.waitForTransactionReceipt({ hash: wrapHash });
        if (wrapRcpt.status === 'reverted') {
          throw new Error(
            'Wrap transaction reverted on-chain (often out of gas — try a smaller amount or retry).'
          );
        }
        showAlert('success', `Successfully wrapped ${swapInputAmount} into c${selectedToken}! (Tx: ${wrapHash.slice(0, 10)}...)`);
        appendStoredActivity(address, {
          txHash: wrapHash.toLowerCase(),
          action: `Wrap → c${selectedToken}`,
          token: selectedToken,
          amount: swapInputAmount,
        });
      } else {
        const confidentialDecimals = await activeToken.decimals();
        const amountBigInt = parseUnits(swapInputAmount, confidentialDecimals);

        showAlert('success', `Initiating FHEVM Unwrap proof generation...`);
        const unwrapResult = await activeToken.unwrap(amountBigInt);
        const txPreview = unwrapResult?.txHash ? String(unwrapResult.txHash).slice(0, 10) : '...';
        showAlert('success', `Unwrap Request submitted to FHEVM! (Tx: ${txPreview}...)`);
        if (unwrapResult?.txHash) {
          appendStoredActivity(address, {
            txHash: String(unwrapResult.txHash).toLowerCase(),
            action: `Unwrap c${selectedToken}`,
            token: selectedToken,
            amount: swapInputAmount,
          });
        }
      }

      setSwapInputAmount('');
      await handleRefreshBalances();
    } catch (err: any) {
      console.error(err);
      showAlert('error', 'Transaction failed: ' + (err.message || String(err)));
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout
      navbar={
        <NavBar
          connected={connected}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          address={address}
          loading={loading}
          publicBalance={publicBalance}
        />
      }
      footerContent={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0">
            <span className="text-[10px] font-extrabold text-[var(--color-text-muted)] uppercase tracking-wider shrink-0">
              Riser App
            </span>
            <div className="text-[10px] font-mono text-cyan-400 truncate max-w-[min(100%,14rem)]">
              {connected ? `Connected (${address?.slice(0, 6)}...${address?.slice(-4)})` : 'Disconnected'}
            </div>
            <button
              type="button"
              onClick={handleAddCTokensToWallet}
              disabled={
                footerTokenImportBusy || !(typeof window !== 'undefined' && (window as any).ethereum)
              }
              className="shrink-0 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-1.5 text-[10px] font-semibold text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-surface)] hover:border-[var(--color-border-focus)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Register cETH & cUSDT wrapper tokens in MetaMask using EIP-747"
            >
              {footerTokenImportBusy ? 'Adding tokens…' : 'Add cTokens to wallet'}
            </button>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)] shrink-0">
            <span className="font-semibold">Sepolia Zama FHEVM</span>
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          </div>
        </div>
      }
    >
      <div className="relative flex flex-col flex-1 min-h-0 h-full overflow-hidden">
        {alert && (
          <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none [&>*]:pointer-events-auto">
            <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
          </div>
        )}

        <div className="flex flex-col flex-1 min-h-0 gap-2 sm:gap-3 overflow-hidden">
        {/* Standalone Tabs Toggle */}
        <div className="flex justify-center shrink-0">
          <div className="bg-[var(--color-bg-elevated)] p-1 rounded-full border border-[var(--color-border-subtle)] inline-flex">
              {[
                { id: 'send', label: 'Send', icon: IconShield },
                { id: 'swap', label: 'Swap', icon: IconSwap },
                { id: 'history', label: 'History', icon: IconHistory }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as 'send' | 'swap' | 'history')}
                  className={`
                      flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-full transition-all
                      ${activeTab === tab.id
                        ? 'bg-[var(--color-accent-surface)] text-[var(--color-accent-primary)] shadow-sm'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                      }
                    `}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
        </div>

        <div className="shrink-0">
          <BalanceCard
            ethBalance={ethBalance}
            usdtBalance={usdtBalance}
            onRefresh={handleRefreshBalances}
            loading={loading}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          {activeTab === 'send' && (
            <SendScreen
              selectedToken={selectedToken}
              onTokenChange={setSelectedToken}
              balanceA={ethBalance}
              balanceB={usdtBalance}
              amountValue={amountValue}
              onAmountChange={setAmountValue}
              recipient={recipient}
              onRecipientChange={setRecipient}
              onSend={handleSend}
              loading={sending}
              connected={connected}
              onConnect={handleConnect}
              walletBusy={loading && !connected}
            />
          )}

          {activeTab === 'swap' && (
            <SwapScreen
              selectedToken={selectedToken}
              onTokenChange={setSelectedToken}
              publicBalance={selectedToken === 'ETH' ? publicBalance : publicUsdtBalance}
              privateBalance={selectedToken === 'ETH' ? ethBalance : usdtBalance}
              swapInputAmount={swapInputAmount}
              onSwapInputChange={setSwapInputAmount}
              onSwap={handleSwap}
              loading={sending}
              isWrapping={isWrapping}
              onToggleWrap={() => setIsWrapping(!isWrapping)}
              connected={connected}
              onConnect={handleConnect}
              walletBusy={loading && !connected}
            />
          )}

          {activeTab === 'history' && (
            <HistoryScreen
              items={historyItems}
              connected={connected}
              onConnect={handleConnect}
              walletBusy={loading && !connected}
            />
          )}
        </div>
        </div>
      </div>
    </Layout>
  );
};

export default App;
