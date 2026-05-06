import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import FeesTab from './FeesTab';

type FeeData = Parameters<typeof FeesTab>[0]['currentFeeData'];

type LedgerFee = {
  id: number;
  category: string;
  amount: number;
  balance: number;
  status: string;
  due_date: string | null;
};

type LedgerPayment = {
  id: number;
  amount: number;
  date: string;
  method: string;
  ref: string;
};

function formatDateIso(dateIso?: string | null) {
  if (!dateIso) return '';
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function toFeeDataFromLedger(payload: { fees: LedgerFee[]; payments: LedgerPayment[] }): FeeData {
  const totalFee = payload.fees.reduce((sum, f) => sum + Number(f.amount || 0), 0);
  const paid = payload.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const due = Math.max(0, totalFee - paid);

  const dueDate = payload.fees
    .map((f) => f.due_date)
    .filter(Boolean)
    .map((d) => new Date(d as string))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const upcoming = payload.fees
    .filter((f) => Number(f.balance || 0) > 0)
    .map((f) => ({
      id: String(f.id),
      dueDate: formatDateIso(f.due_date),
      amount: Number(f.balance || 0),
      description: String(f.category || 'Fee')
    }));

  const paymentHistory = payload.payments
    .slice()
    .sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (Number.isNaN(da) || Number.isNaN(db)) return 0;
      return db - da;
    })
    .map((p) => ({
      id: String(p.id),
      date: formatDateIso(p.date),
      amount: Number(p.amount || 0),
      method: String(p.method || 'payment'),
      status: 'completed'
    }));

  return {
    tuitionFee: totalFee,
    transportFee: 0,
    libraryFee: 0,
    computerLabFee: 0,
    activityFee: 0,
    totalFee,
    paid,
    due,
    dueDate: dueDate ? dueDate.toISOString().slice(0, 10) : '',
    paymentHistory,
    upcomingPayments: upcoming
  };
}

export default function ConnectedFeesTab(props: { childId: string; fallbackFeeData: FeeData }) {
  const { childId, fallbackFeeData } = props;

  const numericChildId = useMemo(() => {
    const n = Number(childId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [childId]);

  const [feeData, setFeeData] = useState<FeeData>(fallbackFeeData);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!numericChildId) {
        setFeeData(fallbackFeeData);
        return;
      }

      try {
        const [ledgerRes, balanceRes] = await Promise.all([
          api.get(`/finance/students/${numericChildId}/ledger`),
          api.get(`/finance/students/${numericChildId}/balance`)
        ]);

        const ledger = ledgerRes.data as { success: boolean; fees: LedgerFee[]; payments: LedgerPayment[] };
        const balance = balanceRes.data as { success: boolean; balance: number };

        if (!ledger?.success) {
          if (!cancelled) setFeeData(fallbackFeeData);
          return;
        }

        const mapped = toFeeDataFromLedger({ fees: ledger.fees || [], payments: ledger.payments || [] });
        const adjusted = {
          ...mapped,
          due: typeof balance?.balance === 'number' ? Number(balance.balance) : mapped.due
        } as FeeData;

        if (!cancelled) setFeeData(adjusted);
      } catch {
        if (!cancelled) setFeeData(fallbackFeeData);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [fallbackFeeData, numericChildId]);

  return <FeesTab currentFeeData={feeData} />;
}

