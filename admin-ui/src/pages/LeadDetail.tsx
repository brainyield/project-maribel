import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, Globe, MapPin, GraduationCap } from 'lucide-react';
import { useLead, useConversations } from '../hooks/useMaribelData';
import { ConversationViewer } from '../components/ConversationViewer';

const SCORE_STYLES: Record<string, string> = {
  new: 'bg-gray-500/20 text-gray-400',
  cold: 'bg-info/20 text-info',
  warm: 'bg-warning/20 text-warning',
  hot: 'bg-danger/20 text-danger',
  existing_client: 'bg-success/20 text-success',
  enrolled: 'bg-purple-500/20 text-purple-400',
};

export function LeadDetail() {
  const { senderId } = useParams<{ senderId: string }>();
  const navigate = useNavigate();
  const { data: lead, isLoading: leadLoading } = useLead(senderId ?? '');
  const { data: messages, isLoading: msgsLoading } = useConversations(senderId ?? '');

  if (leadLoading) return <p className="py-8 text-center text-text-muted">Loading...</p>;
  if (!lead) return <p className="py-8 text-center text-text-muted">Lead not found</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/leads')}
          className="rounded-lg bg-surface-2 p-2 text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{lead.parent_name ?? lead.ig_username ?? lead.ig_sender_id}</h1>
          {lead.ig_username && <p className="text-sm text-text-secondary">@{lead.ig_username}</p>}
        </div>
        <span className={`ml-3 rounded-full px-3 py-1 text-xs font-medium ${SCORE_STYLES[lead.lead_score] ?? ''}`}>
          {lead.lead_score}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Lead info sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface-1 p-4">
            <h3 className="mb-3 text-sm font-medium text-text-secondary">Lead Details</h3>
            <div className="space-y-3 text-sm">
              <InfoRow label="Status" value={lead.status} />
              <InfoRow label="Language" value={
                <span className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  {lead.language === 'es' ? 'Spanish' : 'English'}
                </span>
              } />
              {lead.child_name && <InfoRow label="Child" value={lead.child_name} />}
              {lead.child_grade && (
                <InfoRow label="Grade" value={
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {lead.child_grade}
                  </span>
                } />
              )}
              {lead.location && (
                <InfoRow label="Location" value={
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {lead.location}
                  </span>
                } />
              )}
              {lead.email && <InfoRow label="Email" value={lead.email} />}
              {lead.phone && <InfoRow label="Phone" value={lead.phone} />}
              {lead.referral_source && <InfoRow label="Referral" value={lead.referral_source} />}
              <InfoRow label="Messages" value={String(lead.total_messages)} />
              <InfoRow label="First Contact" value={new Date(lead.first_contact_at).toLocaleDateString()} />
              <InfoRow label="Last Contact" value={new Date(lead.last_contact_at).toLocaleDateString()} />
            </div>
          </div>

          {/* Interests */}
          {(lead.interests?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-border bg-surface-1 p-4">
              <h3 className="mb-3 text-sm font-medium text-text-secondary">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {lead.interests.map((i) => (
                  <span key={i} className="rounded-lg bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent">
                    {i}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Calendly */}
          {lead.calendly_booked && (
            <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">
              <CalendarCheck className="h-5 w-5" />
              <span>Calendly booking confirmed</span>
            </div>
          )}

          {/* Notes */}
          {lead.notes && (
            <div className="rounded-xl border border-border bg-surface-1 p-4">
              <h3 className="mb-2 text-sm font-medium text-text-secondary">Notes</h3>
              <p className="text-sm text-text-primary">{lead.notes}</p>
            </div>
          )}
        </div>

        {/* Conversation */}
        <div className="col-span-2 rounded-xl border border-border bg-surface-1 p-4">
          <h3 className="mb-4 text-sm font-medium text-text-secondary">Conversation History</h3>
          <div className="max-h-[600px] overflow-y-auto">
            {msgsLoading ? (
              <p className="py-8 text-center text-text-muted">Loading...</p>
            ) : (
              <ConversationViewer
                messages={messages ?? []}
                summary={lead.conversation_summary}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between">
      <span className="text-text-muted">{label}</span>
      <span className="text-right text-text-primary">{value}</span>
    </div>
  );
}
