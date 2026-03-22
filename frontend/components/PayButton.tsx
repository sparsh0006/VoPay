'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { Loader2, ExternalLink } from 'lucide-react';

// cUSD on Celo Sepolia (Alfajores)
const CUSD_ADDRESS = process.env.NEXT_PUBLIC_CUSD_ADDRESS || '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1';
const CELO_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CELO_CHAIN_ID || '44787');
const CELO_CHAIN_ID_HEX = `0x${parseInt(process.env.NEXT_PUBLIC_CELO_CHAIN_ID || '11142220').toString(16)}`;


// Minimal ERC-20 ABI — only transfer needed
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
];

interface Split {
  member: string;
  amount: number;
  wallet: string;
  splitId?: string;
}

interface Expense {
  description: string;
  total: number;
  payer: string;
  splits: Split[];
}

interface Props {
  expenseId: string;
  expense: Expense;
  onPaid: () => void;
}

interface TxResult {
  splitId?: string;
  member: string;
  txHash: string;
}

export default function PayButton({ expenseId, expense, onPaid }: Props) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'signing' | 'confirming' | 'done' | 'error'>('idle');
  const [txResults, setTxResults] = useState<TxResult[]>([]);
  const [error, setError] = useState('');

  // Only send to people who owe the payer (exclude payer's own share)
  const payableSplits = expense.splits.filter(
    s => s.member !== expense.payer && s.wallet
  );

  async function handlePay() {
    if (typeof window === 'undefined' || !window.ethereum) {
      setError('MetaMask not detected. Please install MetaMask.');
      setStatus('error');
      return;
    }

    try {
      setStatus('connecting');

      // Request accounts
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Switch to Celo Sepolia (Alfajores)
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: CELO_CHAIN_ID_HEX }],
        });
      } catch (switchErr: any) {
        // Chain not added yet — add it
        if (switchErr.code === 4902) {
         
// Inside handlePay, update wallet_addEthereumChain:
await window.ethereum.request({
  method: 'wallet_addEthereumChain',
  params: [{
    chainId: CELO_CHAIN_ID_HEX,
    chainName: 'Celo Sepolia Testnet',
    nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
    rpcUrls: ['https://rpc.ankr.com/celo_sepolia'],
    blockExplorerUrls: ['https://celo-sepolia.blockscout.com'],
  }],
});
        } else {
          throw switchErr;
        }
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const cusd = new ethers.Contract(CUSD_ADDRESS, ERC20_ABI, signer);
      const decimals = await cusd.decimals();

      setStatus('signing');

      // Send transactions sequentially — one per debtor
      const results: TxResult[] = [];
      for (const split of payableSplits) {
        const amount = ethers.parseUnits(split.amount.toFixed(6), decimals);
        const tx = await cusd.transfer(split.wallet, amount);

        setStatus('confirming');
        const receipt = await tx.wait();

        results.push({
          splitId: split.splitId,
          member: split.member,
          txHash: receipt.hash,
        });
        setTxResults([...results]);
      }

      // Notify backend → marks splits as paid, posts TG confirmation
      const txHashes: Record<string, string> = {};
      for (const r of results) {
        if (r.splitId) txHashes[r.splitId] = r.txHash;
      }

      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/expenses/${expenseId}/settle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHashes }),
      });

      setStatus('done');
      onPaid();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Transaction failed');
      setStatus('error');
    }
  }

  const celoExplorer = 'https://celo-sepolia.blockscout.com/tx';

  if (status === 'done') {
    return (
      <div className="card animate-fade-up space-y-3">
        <p className="text-celo-green font-bold text-center">✅ All payments sent!</p>
        {txResults.map(r => (
          <div key={r.txHash} className="flex items-center justify-between text-sm">
            <span className="text-celo-muted font-mono">{r.member}</span>
            <a
              href={`${celoExplorer}/${r.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-celo-gold hover:underline"
            >
              View tx <ExternalLink size={12} />
            </a>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="card space-y-4 animate-fade-up">
      {/* Summary of what will be sent */}
      <div>
        <p className="text-celo-muted text-xs uppercase tracking-wider mb-3">Transactions to sign</p>
        {payableSplits.map((split, i) => (
          <div key={i} className="flex justify-between text-sm py-2 border-b border-celo-border last:border-0">
            <div>
              <p className="font-mono">{split.member}</p>
              <p className="text-celo-muted text-xs truncate w-40">{split.wallet}</p>
            </div>
            <p className="font-bold text-celo-gold">${split.amount.toFixed(2)} cUSD</p>
          </div>
        ))}
      </div>

      {/* In-progress tx results */}
      {txResults.length > 0 && (
        <div className="space-y-1">
          {txResults.map(r => (
            <div key={r.txHash} className="flex items-center justify-between text-xs text-celo-green">
              <span>{r.member} ✅</span>
              <a href={`${celoExplorer}/${r.txHash}`} target="_blank" rel="noopener noreferrer"
                className="hover:underline flex items-center gap-1">
                view <ExternalLink size={10} />
              </a>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        onClick={handlePay}
        disabled={status !== 'idle' && status !== 'error'}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {status === 'connecting' && <><Loader2 size={16} className="animate-spin" /> Connecting MetaMask…</>}
        {status === 'signing' && <><Loader2 size={16} className="animate-spin" /> Sign in MetaMask…</>}
        {status === 'confirming' && <><Loader2 size={16} className="animate-spin" /> Confirming on Celo…</>}
        {(status === 'idle' || status === 'error') && <>✅ Sign & Pay with MetaMask</>}
      </button>

      <p className="text-center text-celo-muted text-xs">
        {payableSplits.length} transaction{payableSplits.length > 1 ? 's' : ''} · Celo Sepolia
      </p>
    </div>
  );
}