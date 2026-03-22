'use client';

import { useEffect, useState } from 'react';
import PayButton from '@/components/PayButton';
import { ExternalLink, CheckCircle2, Clock } from 'lucide-react';

interface Split {
  id: string;
  amount: number;
  status: 'PENDING' | 'PAID';
  txHash?: string;
  user: { telegramUsername: string; walletAddress: string };
}

interface Expense {
  id: string;
  description: string;
  total: number;
  status: 'PENDING' | 'SETTLED' | 'CANCELLED';
  createdAt: string;
  payer: { telegramUsername: string };
  splits: Split[];
  group: { name: string };
}

export default function PayPageClient({ expenseId }: { expenseId: string }) {
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/expenses/${expenseId}`)
      .then(r => r.json())
      .then(data => { setExpense(data); setLoading(false); });
  }, [expenseId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-celo-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card text-center max-w-sm">
          <p className="text-2xl mb-2">❌</p>
          <p className="text-celo-muted">Expense not found or already settled.</p>
        </div>
      </div>
    );
  }

  const celoExplorer = 'https://alfajores.celoscan.io/tx';
  const pendingSplits = expense.splits.filter(s => s.status === 'PENDING');

  // Convert expense format for PayButton
  const expenseForPay = {
    description: expense.description,
    total: expense.total,
    payer: `@${expense.payer.telegramUsername}`,
    splits: expense.splits.map(s => ({
      member: `@${s.user.telegramUsername}`,
      amount: s.amount,
      wallet: s.user.walletAddress,
      splitId: s.id,
    })),
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 animate-fade-up">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            Split<span className="text-celo-gold">Agent</span>
          </h1>
          <p className="text-celo-muted text-sm mt-1">{expense.group.name}</p>
        </div>

        {/* Expense Card */}
        <div className="card">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-celo-muted text-xs uppercase tracking-wider mb-1">Expense</p>
              <h2 className="text-xl font-bold">{expense.description}</h2>
              <p className="text-celo-muted text-sm mt-1">
                Paid by @{expense.payer.telegramUsername}
              </p>
            </div>
            <div className="text-right">
              <p className="text-celo-muted text-xs uppercase tracking-wider mb-1">Total</p>
              <p className="text-2xl font-bold text-celo-gold">${expense.total.toFixed(2)}</p>
              <p className="text-celo-muted text-xs">cUSD</p>
            </div>
          </div>

          {/* Splits */}
          <div className="border-t border-celo-border pt-4 space-y-3">
            {expense.splits.map(split => (
              <div key={split.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {split.status === 'PAID'
                    ? <CheckCircle2 size={16} className="text-celo-green" />
                    : <Clock size={16} className="text-celo-muted" />
                  }
                  <span className="text-sm font-mono">@{split.user.telegramUsername}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold">${split.amount.toFixed(2)}</span>
                  {split.txHash && (
                    <a
                      href={`${celoExplorer}/${split.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-celo-muted hover:text-celo-gold transition-colors"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pay Button or Already Settled */}
        {expense.status === 'SETTLED' || paid ? (
          <div className="card text-center">
            <CheckCircle2 size={40} className="text-celo-green mx-auto mb-3" />
            <h3 className="text-xl font-bold text-celo-green">Settled!</h3>
            <p className="text-celo-muted text-sm mt-1">All payments confirmed on Celo Sepolia</p>
          </div>
        ) : pendingSplits.length > 0 ? (
          <PayButton
            expenseId={expenseId}
            expense={expenseForPay}
            onPaid={() => setPaid(true)}
          />
        ) : null}

        {/* Wallet info */}
        <p className="text-center text-celo-muted text-xs">
          Payments sent on <span className="text-celo-gold">Celo Sepolia</span> in cUSD
        </p>
      </div>
    </main>
  );
}