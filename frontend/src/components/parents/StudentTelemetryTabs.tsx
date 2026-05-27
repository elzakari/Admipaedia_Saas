import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, BookOpen, Clipboard, CreditCard, MessageSquare } from 'lucide-react';

interface StudentTelemetryTabsProps {
  currentStudentId: string;
}

export const StudentTelemetryTabs: React.FC<StudentTelemetryTabsProps> = ({ currentStudentId }) => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Default to 'dashboard' tab safely if none is provided in the string URL context
  const activeTab = searchParams.get('tab') || 'dashboard';

  const handleTabChange = (e: React.MouseEvent, tabName: string) => {
    e.preventDefault(); // 🌟 Crucial: Block the browser from freezing the navigation thread
    
    // Update query params natively within the React Router engine context
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabName);
      return next;
    }, { replace: true });
  };

  const tabs = [
    { id: 'dashboard', label: t('parent_portal.my_children.tabs.dashboard', 'Dashboard'), icon: BarChart3 },
    { id: 'academics', label: t('parent_portal.my_children.tabs.academics', 'Academics'), icon: BookOpen },
    { id: 'attendance', label: t('parent_portal.my_children.tabs.attendance', 'Attendance'), icon: Clipboard },
    { id: 'fees', label: t('parent_portal.my_children.tabs.fees', 'Pending Fees'), icon: CreditCard },
    { id: 'messages', label: t('parent_portal.my_children.tabs.messages', 'Messages'), icon: MessageSquare },
  ];

  return (
    <div className="flex gap-2 border-b border-white border-opacity-10 mb-6 overflow-x-auto no-scrollbar scroll-smooth bg-white bg-opacity-5 p-1 rounded-xl shadow-inner backdrop-blur-md">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={(e) => handleTabChange(e, tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 relative outline-none whitespace-nowrap ${
              isActive
                ? 'text-white bg-indigo-600 bg-opacity-90 shadow-md transform scale-[1.02]'
                : 'text-indigo-200 hover:text-white hover:bg-white hover:bg-opacity-5'
            }`}
          >
            <Icon className={`h-4 w-4 transition-transform duration-300 ${isActive ? 'rotate-12' : ''}`} />
            <span>{tab.label}</span>
            {isActive && (
              <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-white rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default StudentTelemetryTabs;
