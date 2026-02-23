'use client';

import { useFetch } from '@/hooks/use-fetch';
import { GlassCard } from '@/components/glass-card';
import { GitBranch, GitCommit } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Repo { name: string; commits: Array<{ hash: string; message: string; date: string; author: string }> }

export default function GitPage() {
  const { data } = useFetch<{ repos: Repo[] }>('/api/git', 60000);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Git Activity</h1>

      <div className="space-y-4">
        {(data?.repos || []).map((repo, i) => (
          <GlassCard key={repo.name} delay={i * 0.1}>
            <div className="flex items-center gap-2 mb-3">
              <GitBranch className="h-4 w-4 text-primary" />
              <h3 className="font-medium">{repo.name}</h3>
              <span className="text-xs text-muted-foreground">{repo.commits.length} commits</span>
            </div>
            <div className="space-y-1.5">
              {repo.commits.slice(0, 10).map(c => (
                <div key={c.hash} className="flex items-center gap-2 text-xs">
                  <GitCommit className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="font-mono text-primary shrink-0">{c.hash}</span>
                  <span className="truncate">{c.message}</span>
                  <span className="text-muted-foreground shrink-0 ml-auto">
                    {c.date ? formatDistanceToNow(new Date(c.date), { addSuffix: true }) : ''}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        ))}
        {(data?.repos || []).length === 0 && <p className="text-center text-muted-foreground py-8">No repos found</p>}
      </div>
    </div>
  );
}
