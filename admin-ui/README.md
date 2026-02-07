# Admin UI

React components for the Maribel admin dashboard, integrated into the existing Eaton Academic business management app.

## Routes

All routes are under `/maribel` and protected by the app's existing auth guard.

| Route | Component | Description |
|-------|-----------|-------------|
| `/maribel/dashboard` | MaribelDashboard | Analytics overview + kill switch |
| `/maribel/escalations` | EscalationManager | Escalation queue + resolution |
| `/maribel/leads` | LeadPipeline | Lead CRM with filtering |
| `/maribel/knowledge` | KnowledgeEditor | Knowledge base CRUD + re-embed |
| `/maribel/config` | AgentConfigEditor | Agent settings management |

## Structure

- `components/` — React components for each page/feature
- `hooks/` — TanStack Query hooks for data fetching and mutations
- `types/` — TypeScript interfaces for all Maribel data
