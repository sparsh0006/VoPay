'use client';

import { CheckCircle2 } from 'lucide-react';

interface Split {
  member: string;
  amount: number;
  wallet?: string;
  splitId?: string;
}

interface Expense {
  description: string;
  total: number;
  payer: string;
  splits: Split[];
}

interface Props {
  expense: Expense;
  onConfirm: (expenseId: string) => void;
  onCancel: () => void;
}

export default function ExpensePreview({ expense, onConfirm, onCancel }: Props) {
  async function handleConfirm() {
    // Save expense to DB first, get back the ID
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: expense.description,
        total: expense.total,
        // In production: pass real groupId + payerId from auth
        groupId: 'default',
        payerId: 'default',
        splits: expense.splits.map(s => ({
          userId: s.member, // map from username to userId in production
          amount: s.amount,
        })),
      }),
    });
    const data = await res.json();
    onConfirm(data.id);
  }

  return (
    <div className="card animate-fade-up">
      {/* Expense header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-celo-muted text-xs uppercase tracking-wider mb-1">Expense</p>
          <h2 className="text-xl font-bold">{expense.description}</h2>
        </div>
        <div className="text-right">
          <p className="text-celo-muted text-xs uppercase tracking-wider mb-1">Total</p>
          <p className="text-2xl font-bold text-celo-gold">${expense.total.toFixed(2)}</p>
        </div>
      </div>

      {/* Splits list */}
      <div className="border-t border-celo-border pt-4 space-y-3 mb-6">
        {expense.splits.map((split, i) => {
          const isPayer = split.member === expense.payer;
          return (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isPayer ? 'bg-celo-gold' : 'bg-celo-muted'}`} />
                <span className="font-mono text-sm">{split.member}</span>
                {isPayer && (
                  <span className="text-xs text-celo-muted bg-celo-border px-2 py-0.5 rounded-full">you</span>
                )}
              </div>
              <div className="text-right">
                <span className="font-bold">${split.amount.toFixed(2)}</span>
                {!isPayer && (
                  <span className="text-celo-green text-xs ml-2">owes you</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total check */}
      <div className="flex items-center gap-2 text-xs text-celo-muted mb-6 bg-celo-dark/50 rounded-lg px-3 py-2">
        <CheckCircle2 size={14} className="text-celo-green" />
        Splits sum to ${expense.splits.reduce((s, sp) => s + sp.amount, 0).toFixed(2)} of ${expense.total.toFixed(2)} total
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-ghost flex-1">
          ❌ Cancel
        </button>
        <button onClick={handleConfirm} className="btn-primary flex-1">
          ✅ Confirm
        </button>
      </div>
    </div>
  );
}