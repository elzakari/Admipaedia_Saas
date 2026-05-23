import { useEffect, useState } from 'react';
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
  GitBranch
} from 'lucide-react';

import {
  FinancialManagement,
  AcademicCalendar,
  LibraryManagement,
  Announcements,
  Infrastructure,
  StaffManagement,
  GhanaEducationService,
  EducationSystemConfiguration,
  CoreCompetencies,
  BranchesConfiguration
} from '../../components/administration';

import { useHeader } from '../../contexts/HeaderContext';
import { useSaasTenant } from '@/hooks/useSaasTenant'
import { Input } from '../../components/ui/input';
import { cn } from '../../lib/utils';

const AdministrationPage = () => {
  const { setHeaderSearch } = useHeader();
  const { current } = useSaasTenant()
  const [activeTab, setActiveTab] = useState('education-system');
  const [searchTerm, setSearchTerm] = useState('');

  const isGhanaTenant = current?.tenant.country_code === 'GH'

  const tabs = [
    { value: 'education-system', label: 'Education System', icon: GraduationCap, component: EducationSystemConfiguration },
    ...(isGhanaTenant ? [{ value: 'ghana-education', label: 'GES Standards', icon: GraduationCap, component: GhanaEducationService }] : []),
    { value: 'competencies', label: 'Core Competencies', icon: Brain, component: CoreCompetencies },
    { value: 'branches', label: 'Branches', icon: GitBranch, component: BranchesConfiguration },
    { value: 'financial', label: 'Financial Management', icon: DollarSign, component: FinancialManagement },
    { value: 'calendar', label: 'Academic Calendar', icon: Calendar, component: AcademicCalendar },
    { value: 'library', label: 'Library Management', icon: BookOpen, component: LibraryManagement },
    { value: 'announcements', label: 'Announcements', icon: Megaphone, component: Announcements },
    { value: 'infrastructure', label: 'Infrastructure', icon: Building2, component: Infrastructure },
    { value: 'staff', label: 'Staff Management', icon: Users, component: StaffManagement }
  ];

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

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Administration</h1>
        <p className="text-gray-500">Manage school operations and standards</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto bg-transparent h-auto p-0 gap-2 mb-6">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border transition-all",
                "data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:border-indigo-600",
                "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span className="whitespace-nowrap font-medium">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => {
          const Component = tab.component;
          return (
            <TabsContent key={tab.value} value={tab.value} className="mt-0 focus-visible:outline-none">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm min-h-[400px]">
                {Component ? <Component /> : <div className="p-8 text-center text-gray-500">Module not found</div>}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default AdministrationPage;
