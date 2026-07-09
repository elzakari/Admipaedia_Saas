import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Building2,
  Calendar,
  BookOpen,
  Megaphone,
  DollarSign,
  Users,
  GraduationCap,
  Brain,
  Search as SearchIcon,
  GitBranch,
  LayoutGrid,
  Sparkles
} from 'lucide-react';

import FinancialManagement from '../../components/administration/FinancialManagement';
import AcademicCalendar from '../../components/administration/AcademicCalendar';
import LibraryManagement from '../../components/administration/LibraryManagement';
import Announcements from '../../components/administration/Announcements';
import { Infrastructure } from '../../components/administration/Infrastructure';
import StaffManagement from '../../components/administration/StaffManagement';
import GhanaEducationService from '../../components/administration/GhanaEducationServiceFixed';
import EducationSystemConfiguration from '../../components/administration/EducationSystemConfiguration';
import CoreCompetencies from '../../components/administration/CoreCompetencies';
import BranchesConfiguration from '../../components/administration/BranchesConfiguration';

import { useHeader } from '../../contexts/HeaderContext';
import { useSaasTenant } from '@/hooks/useSaasTenant'
import { Input } from '../../components/ui/input';
import { cn } from '../../lib/utils';

const AdministrationPage = () => {
  const { setHeaderSearch } = useHeader();
  const { current } = useSaasTenant()
  const [activeTab, setActiveTab] = useState('education-system');
  const [searchTerm, setSearchTerm] = useState('');

  const isGhanaTenant = current?.tenant?.country_code === 'GH'

  const tabs = [
    {
      value: 'education-system',
      label: 'Education System',
      icon: GraduationCap,
      component: EducationSystemConfiguration,
      description: 'Configure the school framework, grading model, and active tenant setup.',
      keywords: ['education', 'system', 'grading', 'framework', 'tenant']
    },
    ...(isGhanaTenant ? [{
      value: 'ghana-education',
      label: 'GES Standards',
      icon: GraduationCap,
      component: GhanaEducationService,
      description: 'Manage Ghana-specific curriculum, grading, STEM, and assessment standards.',
      keywords: ['ges', 'ghana', 'curriculum', 'grading', 'assessment']
    }] : []),
    {
      value: 'competencies',
      label: 'Core Competencies',
      icon: Brain,
      component: CoreCompetencies,
      description: 'Maintain competency definitions used across learning and reporting flows.',
      keywords: ['competencies', 'skills', 'learning', 'assessment']
    },
    {
      value: 'branches',
      label: 'Branches',
      icon: GitBranch,
      component: BranchesConfiguration,
      description: 'Manage campuses, regional hubs, and branch-level activation.',
      keywords: ['branches', 'campus', 'campuses', 'locations', 'enterprise']
    },
    {
      value: 'financial',
      label: 'Financial Management',
      icon: DollarSign,
      component: FinancialManagement,
      description: 'Review budgets, transactions, fee operations, and finance reporting.',
      keywords: ['financial', 'finance', 'budget', 'transactions', 'fees', 'reports']
    },
    {
      value: 'calendar',
      label: 'Academic Calendar',
      icon: Calendar,
      component: AcademicCalendar,
      description: 'Coordinate terms, events, schedules, and exam planning.',
      keywords: ['calendar', 'terms', 'events', 'exam', 'schedule']
    },
    {
      value: 'library',
      label: 'Library Management',
      icon: BookOpen,
      component: LibraryManagement,
      description: 'Track books, borrowing activity, categories, and library statistics.',
      keywords: ['library', 'books', 'borrowers', 'borrowing', 'statistics']
    },
    {
      value: 'announcements',
      label: 'Announcements',
      icon: Megaphone,
      component: Announcements,
      description: 'Create, schedule, and monitor school-wide communications.',
      keywords: ['announcements', 'communication', 'messages', 'broadcast']
    },
    {
      value: 'infrastructure',
      label: 'Infrastructure',
      icon: Building2,
      component: Infrastructure,
      description: 'Manage facilities, maintenance requests, assets, and planning.',
      keywords: ['infrastructure', 'facilities', 'maintenance', 'assets', 'planning']
    },
    {
      value: 'staff',
      label: 'Staff Management',
      icon: Users,
      component: StaffManagement,
      description: 'Manage staff records, departments, attendance, and staffing structure.',
      keywords: ['staff', 'teachers', 'departments', 'attendance', 'directory']
    }
  ];

  const filteredTabs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return tabs;

    return tabs.filter((tab) => {
      const haystack = [tab.label, tab.description, ...(tab.keywords || [])].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [searchTerm, tabs]);

  useEffect(() => {
    if (!filteredTabs.some((tab) => tab.value === activeTab) && filteredTabs.length > 0) {
      setActiveTab(filteredTabs[0].value);
    }
  }, [activeTab, filteredTabs]);

  useEffect(() => {
    const searchBar = (
      <div className="relative w-full max-w-2xl">
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search administration..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-10"
        />
      </div>
    );
    setHeaderSearch(searchBar);
    return () => setHeaderSearch(null);
  }, [searchTerm, setHeaderSearch]);

  const activeTabMeta = filteredTabs.find((tab) => tab.value === activeTab) || tabs.find((tab) => tab.value === activeTab);

  return (
    <div className="space-y-6 p-4">
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-white via-indigo-50/60 to-violet-50/70 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" />
              Administrative Control Center
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Administration</h1>
              <p className="text-sm text-slate-600">Analyze standards, operations, finance, staffing, and infrastructure from one workspace.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Modules</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{tabs.length}</div>
              <div className="text-xs text-slate-500">Administration work areas</div>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Visible Now</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{filteredTabs.length}</div>
              <div className="text-xs text-slate-500">{searchTerm.trim() ? 'Modules matching your search' : 'Modules currently available'}</div>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Curriculum Scope</div>
              <div className="mt-2 text-lg font-bold text-slate-900">{isGhanaTenant ? 'Ghana + Core' : 'Global Core'}</div>
              <div className="text-xs text-slate-500">{isGhanaTenant ? 'GES standards enabled' : 'Country-specific tab hidden'}</div>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <LayoutGrid className="h-4 w-4" />
            <span>{searchTerm.trim() ? `Showing ${filteredTabs.length} matching modules` : 'Browse administration modules by workflow area'}</span>
          </div>
          <TabsList className="w-full justify-start overflow-x-auto bg-transparent h-auto p-0 gap-2">
          {filteredTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border transition-all shadow-sm",
                "data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:border-indigo-600",
                "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-700"
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span className="whitespace-nowrap font-medium">{tab.label}</span>
            </TabsTrigger>
          ))}
          </TabsList>
        </div>

        {filteredTabs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <SearchIcon className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">No administration module matched</h2>
            <p className="mt-1 text-sm text-slate-500">Try a broader keyword like `finance`, `calendar`, `staff`, or `infrastructure`.</p>
          </div>
        ) : (
          <>
            {activeTabMeta && (
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
                    <activeTabMeta.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{activeTabMeta.label}</h2>
                    <p className="text-sm text-slate-500">{activeTabMeta.description}</p>
                  </div>
                </div>
              </div>
            )}

        {filteredTabs.map((tab) => {
          const Component = tab.component;
          return (
            <TabsContent key={tab.value} value={tab.value} className="mt-0 focus-visible:outline-none">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm min-h-[400px]">
                {Component ? <Component /> : <div className="p-8 text-center text-gray-500">Module not found</div>}
              </div>
            </TabsContent>
          );
        })}
          </>
        )}
      </Tabs>
    </div>
  );
};

export default AdministrationPage;
