import { useEffect, useState } from 'react';
import { apiGet } from '../api';

type Wallet = { userId?: { username?: string }; balance?: number };
type Res = { success?: boolean; data?: Wallet[] };

export default function Wallet() {
  const [list, setList] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<Res>('/wallet/all')
      .then((r) => setList(Array.isArray(r.data) ? r.data : []))
      .catch((e) => setError(e.message || 'Failed'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="screen-loading">Loading wallets…</div>;
  if (error) return <div className="screen-error">{error}</div>;

  const total = list.reduce((s, w) => s + Number(w.balance || 0), 0);

  return (
    <div className="screen-table-wrap">
      <h1>Wallet</h1>
      <p className="text-muted">Total balance: ₹{total.toLocaleString('en-IN')}</p>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>User</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {list.map((w, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{typeof w.userId === 'object' && w.userId?.username ? w.userId.username : '–'}</td>
                <td>₹{Number(w.balance || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
