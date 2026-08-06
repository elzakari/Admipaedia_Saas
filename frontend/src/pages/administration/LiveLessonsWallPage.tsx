import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Radio } from 'lucide-react';
import DailyLessonMonitoring from '../../components/administration/DailyLessonMonitoring';
import { useHeader } from '../../contexts/HeaderContext';
import { useSaasTenant } from '../../hooks/useSaasTenant';
import { Input } from '../../components/ui/input';
import { Search as SearchIcon } from 'lucide-react';

const LiveLessonsWallPage: React.FC = () => {
  const { t } = useTranslation();
  const { setHeaderSearch } = useHeader();
  const { current } = useSaasTenant();

  useEffect(() => {
    const searchBar = (
      <div className="relative w-full max-w-2xl">
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search live lessons, teachers, subjects..."
          className="pl-10 h-10"
        />
      </div>
    );
    setHeaderSearch(searchBar);
    return () => setHeaderSearch(null);
  }, [setHeaderSearch]);

  return (
    <div className="space-y-0">
      <div className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-white via-emerald-50/60 to-teal-50/70 p-6 shadow-sm mx-6 mt-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              {t('live_wall.badge', 'Live Operations')}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <span className="relative inline-flex h-6 w-6">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-6 w-6 bg-rose-600 items-center justify-center">
                    <Radio className="h-3.5 w-3.5 text-white" />
                  </span>
                </span>
                {t('live_wall.title', 'Live Lessons Wall')}
              </h1>
              <p className="text-sm text-slate-600 mt-2 max-w-xl">
                {t('live_wall.subtitle', 'Real-time broadcast monitoring across the institution. Observe active lessons anonymously and track live engagement metrics at a glance.')}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {t('live_wall.streaming', 'Streaming now')}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-rose-600 tabular-nums">—</span>
                <span className="text-xs text-rose-500 font-medium">LIVE</span>
              </div>
              <div className="text-xs text-slate-500">{t('live_wall.active_broadcasts', 'Active broadcasts')}</div>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {t('live_wall.viewers', 'Current viewers')}
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">—</div>
              <div className="text-xs text-slate-500">{t('live_wall.concurrent', 'Concurrent across streams')}</div>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {t('live_wall.tenant_scope', 'Tenant scope')}
              </div>
              <div className="mt-2 text-lg font-bold text-slate-900 truncate">
                {current?.tenant?.display_name || current?.tenant?.name || t('live_wall.default_scope', 'School network')}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {current?.tenant?.country_code ? `${current.tenant.country_code} campus` : t('live_wall.all_branches', 'All branches')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DailyLessonMonitoring standaloneWall={true} />
    </div>
  );
};

export default LiveLessonsWallPage;
