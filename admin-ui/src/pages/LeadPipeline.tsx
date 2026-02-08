import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react';
import { useLeadPipeline } from '../hooks/useMaribelData';
import type { LeadFilters } from '../types/maribel';

const SCORE_STYLES: Record<string, string> = {
  new: 'bg-gray-500/20 text-gray-400',
  cold: 'bg-info/20 text-info',
  warm: 'bg-warning/20 text-warning',
  hot: 'bg-danger/20 text-danger',
  existing_client: 'bg-success/20 text-success',
  enrolled: 'bg-purple-500/20 text-purple-400',
};

const SCORES = ['', 'new', 'cold', 'warm', 'hot', 'existing_client', 'enrolled'];
const STATUSES = ['', 'active', 'escalated', 'paused', 'converted', 'inactive', 'do_not_contact'];

export function LeadPipeline() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<LeadFilters>({
    score: null,
    status: null,
    dateFrom: null,
    dateTo: null,
    search: '',
  });

  const { data, isLoading } = useLeadPipeline(filters, page);
  const leads = data?.leads ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / 50);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Lead Pipeline</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filters.score ?? ''}
          onChange={(e) => { setFilters({ ...filters, score: e.target.value || null }); setPage(0); }}
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none"
        >
          <option value="">All Scores</option>
          {SCORES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>

        <select
          value={filters.status ?? ''}
          onChange={(e) => { setFilters({ ...filters, status: e.target.value || null }); setPage(0); }}
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none"
        >
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>

        <input
          type="date"
          value={filters.dateFrom ?? ''}
          onChange={(e) => { setFilters({ ...filters, dateFrom: e.target.value || null }); setPage(0); }}
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none"
        />
        <span className="text-text-muted">to</span>
        <input
          type="date"
          value={filters.dateTo ?? ''}
          onChange={(e) => { setFilters({ ...filters, dateTo: e.target.value || null }); setPage(0); }}
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none"
        />

        <span className="ml-auto text-sm text-text-muted">{totalCount} leads</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="py-8 text-center text-text-muted">Loading...</p>
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-text-muted">
          <Users className="mb-2 h-8 w-8" />
          <p>No leads found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-1 text-left text-text-secondary">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Interests</th>
                <th className="px-4 py-3 font-medium">Msgs</th>
                <th className="px-4 py-3 font-medium">Last Contact</th>
                <th className="px-4 py-3 font-medium">Calendly</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.lead_id}
                  onClick={() => navigate(`/leads/${lead.ig_sender_id}`)}
                  className="cursor-pointer border-b border-border bg-surface-0 transition-colors hover:bg-surface-1"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{lead.parent_name ?? lead.ig_username ?? 'Unknown'}</p>
                      {lead.ig_username && lead.parent_name && (
                        <p className="text-xs text-text-muted">@{lead.ig_username}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SCORE_STYLES[lead.lead_score] ?? ''}`}>
                      {lead.lead_score}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{lead.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(lead.interests ?? []).slice(0, 3).map((i) => (
                        <span key={i} className="rounded bg-surface-3 px-1.5 py-0.5 text-xs text-text-secondary">
                          {i}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{lead.total_messages}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(lead.last_contact_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {lead.calendly_booked && (
                      <CalendarCheck className="h-4 w-4 text-success" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 rounded-lg bg-surface-2 px-3 py-2 text-sm text-text-secondary disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="text-sm text-text-muted">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1 rounded-lg bg-surface-2 px-3 py-2 text-sm text-text-secondary disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
