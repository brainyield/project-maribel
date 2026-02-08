import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isAuthenticated } from './lib/auth';
import { AuthGate } from './components/AuthGate';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { EscalationManager } from './pages/EscalationManager';
import { LeadPipeline } from './pages/LeadPipeline';
import { LeadDetail } from './pages/LeadDetail';
import { KnowledgeEditor } from './pages/KnowledgeEditor';
import { AgentConfigEditor } from './pages/AgentConfigEditor';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  },
});

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated);

  if (!authed) {
    return <AuthGate onSuccess={() => setAuthed(true)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="escalations" element={<EscalationManager />} />
            <Route path="leads" element={<LeadPipeline />} />
            <Route path="leads/:senderId" element={<LeadDetail />} />
            <Route path="knowledge" element={<KnowledgeEditor />} />
            <Route path="config" element={<AgentConfigEditor />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
