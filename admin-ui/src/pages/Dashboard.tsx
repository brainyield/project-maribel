import { useState } from 'react';
import {
  MessageSquare,
  UserPlus,
  AlertTriangle,
  CalendarCheck,
  Power,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts';
import {
  useDashboardCounts,
  useAnalyticsChart,
  useEscalationQueue,
  useConfigValue,
} from '../hooks/useMaribelData';
import { useToggleKillSwitch, useResolveEscalation } from '../hooks/useMaribelActions';

const PIE_COLORS = ['#6366f1', '#f59e0b'];
const SCORE_COLORS: Record<string, string> = {
  new: '#6b7280',
  cold: '#3b82f6',
  warm: '#f59e0b',
  hot: '#ef4444',
  existing_client: '#22c55e',
  enrolled: '#8b5cf6',
};

export function Dashboard() {
  const { data: counts } = useDashboardCounts();
  const { data: chartData } = useAnalyticsChart(30);
  const { data: escalations } = useEscalationQueue();
  const { data: autoReply } = useConfigValue('auto_reply_enabled');
  const toggleKill = useToggleKillSwitch();
  const resolve = useResolveEscalation();

  const [confirmKill, setConfirmKill] = useState(false);

  const isActive = autoReply?.value !== 'false';

  // Aggregate chart data for language + score breakdowns
  const langData = (chartData ?? []).reduce(
    (acc, row) => {
      const lb = (row as { language_breakdown?: Record<string, number> }).language_breakdown;
      if (lb) {
        Object.entries(lb).forEach(([lang, count]) => {
          const key = lang === 'es' ? 'Spanish' : 'English';
          acc[key] = (acc[key] || 0) + count;
        });
      }
      return acc;
    },
    {} as Record<string, number>,
  );
  const langChartData = Object.entries(langData).map(([name, value]) => ({ name, value }));

  // Aggregate interests
  const interestMap: Record<string, number> = {};
  (chartData ?? []).forEach((row) => {
    const ti = (row as { top_interests?: string[] }).top_interests;
    if (ti) ti.forEach((i: string) => { interestMap[i] = (interestMap[i] || 0) + 1; });
  });
  const interestData = Object.entries(interestMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  // Lead score distribution from recent escalations (approximate from queue data)
  const scoreMap: Record<string, number> = {};
  (escalations ?? []).forEach((e) => {
    if (e.lead_score) scoreMap[e.lead_score] = (scoreMap[e.lead_score] || 0) + 1;
  });
  const scoreData = Object.entries(scoreMap).map(([name, count]) => ({ name, count }));

  const stats = [
    { label: "Today's Conversations", value: counts?.todayConversations ?? 0, icon: MessageSquare, color: 'text-info' },
    { label: 'New Leads (week)', value: counts?.newLeadsWeek ?? 0, icon: UserPlus, color: 'text-success' },
    { label: 'Open Escalations', value: counts?.openEscalations ?? 0, icon: AlertTriangle, color: 'text-warning' },
    { label: 'Bookings (week)', value: counts?.bookingsWeek ?? 0, icon: CalendarCheck, color: 'text-accent' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        {/* Kill Switch */}
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${isActive ? 'text-success' : 'text-danger'}`}>
            Maribel is {isActive ? 'ACTIVE' : 'PAUSED'}
          </span>
          <button
            onClick={() => {
              if (isActive) {
                setConfirmKill(true);
              } else {
                toggleKill.mutate(true);
              }
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-danger/15 text-danger hover:bg-danger/25'
                : 'bg-success/15 text-success hover:bg-success/25'
            }`}
          >
            <Power className="h-4 w-4" />
            {isActive ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>

      {/* Kill Switch Confirm */}
      {confirmKill && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4">
          <p className="mb-3 text-sm text-danger">
            Are you sure you want to disable Maribel? All incoming DMs will be received but not responded to automatically.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { toggleKill.mutate(false); setConfirmKill(false); }}
              className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white"
            >
              Yes, Disable
            </button>
            <button
              onClick={() => setConfirmKill(false)}
              className="rounded-lg bg-surface-3 px-4 py-2 text-sm text-text-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border bg-surface-1 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">{label}</span>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Conversations over time */}
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <h3 className="mb-4 text-sm font-medium text-text-secondary">Conversations (30 days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData ?? []}>
              <XAxis
                dataKey="date"
                tick={{ fill: '#6a6a7a', fontSize: 11 }}
                tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fill: '#6a6a7a', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1a1a24', border: '1px solid #2e2e3a', borderRadius: 8 }}
                labelStyle={{ color: '#9898a8' }}
              />
              <Line type="monotone" dataKey="total_conversations" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Language breakdown */}
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <h3 className="mb-4 text-sm font-medium text-text-secondary">Language Breakdown</h3>
          {langChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={langChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {langChartData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid #2e2e3a', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-sm text-text-muted">No data yet</div>
          )}
        </div>

        {/* Top interests */}
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <h3 className="mb-4 text-sm font-medium text-text-secondary">Top Interests</h3>
          {interestData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={interestData}>
                <XAxis dataKey="name" tick={{ fill: '#6a6a7a', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6a6a7a', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid #2e2e3a', borderRadius: 8 }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-sm text-text-muted">No data yet</div>
          )}
        </div>

        {/* Lead score distribution */}
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <h3 className="mb-4 text-sm font-medium text-text-secondary">Lead Score Distribution</h3>
          {scoreData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scoreData}>
                <XAxis dataKey="name" tick={{ fill: '#6a6a7a', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6a6a7a', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid #2e2e3a', borderRadius: 8 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {scoreData.map((entry) => (
                    <Cell key={entry.name} fill={SCORE_COLORS[entry.name] ?? '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-sm text-text-muted">No data yet</div>
          )}
        </div>
      </div>

      {/* Recent Escalations */}
      <div className="rounded-xl border border-border bg-surface-1 p-4">
        <h3 className="mb-4 text-sm font-medium text-text-secondary">Recent Open Escalations</h3>
        {(escalations ?? []).length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">No open escalations</p>
        ) : (
          <div className="space-y-2">
            {(escalations ?? []).slice(0, 5).map((esc) => (
              <div
                key={esc.escalation_id}
                className="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {esc.parent_name ?? esc.ig_username ?? esc.ig_sender_id}
                  </p>
                  <p className="text-xs text-text-secondary">{esc.reason}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-muted">
                    {new Date(esc.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => resolve.mutate({ escalationId: esc.escalation_id, notes: 'Resolved from dashboard' })}
                    className="rounded bg-success/15 px-3 py-1 text-xs font-medium text-success hover:bg-success/25"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
