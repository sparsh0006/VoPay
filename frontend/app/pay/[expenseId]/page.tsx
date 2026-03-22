// frontend/app/pay/[expenseId]/page.tsx
import PayPageClient from './PayPageClient';

export default function PayPage({ params }: { params: { expenseId: string } }) {
  return <PayPageClient expenseId={params.expenseId} />;
}