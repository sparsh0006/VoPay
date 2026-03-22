'use client';

import { useState } from 'react';
import VoiceRecorder from '@/components/VoiceRecorder';
import ExpensePreview from '@/components/ExpensePreview';
import PayButton from '@/components/PayButton';

type Stage = 'idle' | 'recording' | 'processing' | 'confirm' | 'paying' | 'done';

interface ParsedExpense {
  description: string;
  total: number;
  payer: string;
  splits: { member: string; amount: number; wallet: string }[];
}

export default function Home() {
  const [stage, setStage] = useState<Stage>('idle');
  const [transcript, setTranscript] = useState('');
  const [expense, setExpense] = useState<ParsedExpense | null>(null);
  const [expenseId, setExpenseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function clearError() { setError(null); }

  async function handleTranscript(text: string) {
    setTranscript(text);
    setStage('processing');
    setError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pay/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, groupId: 'default', payerUsername: 'me' }),
      });

      if (!res.ok) throw new Error(`Parse failed: ${res.status}`);
      const parsed = await res.json();
      if (parsed.error) throw new Error(parsed.error);

      setExpense(parsed);
      setStage('confirm');
      await speakText(`Got it! ${parsed.description} for $${parsed.total}. Does that look right?`);
    } catch (err: any) {
      console.error('Parse error:', err);
      setError(err.message || 'Could not parse expense. Please try again.');
      setStage('idle');
    }
  }

  async function speakText(text: string) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pay/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return; // TTS is non-critical, fail silently
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audio.play().catch(() => {}); // ignore autoplay block
    } catch { /* non-critical */ }
  }

  function handleConfirm(id: string) {
    setExpenseId(id);
    setStage('paying');
  }

  async function handlePaid() {
    setStage('done');
    await speakText('All done! Payments confirmed on Celo.');
  }

  function handleError(msg: string) {
    setError(msg);
    setStage('idle');
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="mb-12 text-center animate-fade-up">
        <div className="inline-flex items-center gap-2 bg-celo-card border border-celo-border px-4 py-2 rounded-full text-sm text-celo-muted mb-6">
          <span className="w-2 h-2 rounded-full bg-celo-green animate-pulse-slow" />
          Celo Sepolia
        </div>
        <h1 className="text-5xl font-bold tracking-tight">
          Split<span className="text-celo-gold">Agent</span>
        </h1>
        <p className="text-celo-muted mt-3 text-lg">Talk to split. Pay on-chain.</p>
      </div>

      <div className="w-full max-w-md space-y-4">

        {/* Error banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-start justify-between gap-3 animate-fade-up">
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={clearError} className="text-red-400 hover:text-red-300 text-lg leading-none mt-0.5">×</button>
          </div>
        )}

        {(stage === 'idle' || stage === 'recording' || stage === 'processing') && (
          <div className="card text-center">
            <VoiceRecorder
              stage={stage as 'idle' | 'recording' | 'processing'}
              onStart={() => { setStage('recording'); setError(null); }}
              onTranscript={handleTranscript}
              onError={handleError}
            />
            {transcript && stage === 'processing' && (
              <p className="mt-4 text-celo-muted text-sm italic">"{transcript}"</p>
            )}
          </div>
        )}

        {(stage === 'confirm' || stage === 'paying') && expense && (
          <ExpensePreview
            expense={expense}
            onConfirm={handleConfirm}
            onCancel={() => { setStage('idle'); setExpense(null); setError(null); }}
          />
        )}

        {stage === 'paying' && expenseId && (
          <PayButton expenseId={expenseId} expense={expense!} onPaid={handlePaid} />
        )}

        {stage === 'done' && (
          <div className="card text-center animate-fade-up">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-celo-green">All Done!</h2>
            <p className="text-celo-muted mt-2">Payments confirmed on Celo Sepolia</p>
            <button className="btn-ghost mt-6 w-full" onClick={() => { setStage('idle'); setExpense(null); setTranscript(''); }}>
              Split another expense
            </button>
          </div>
        )}
      </div>
    </main>
  );
}