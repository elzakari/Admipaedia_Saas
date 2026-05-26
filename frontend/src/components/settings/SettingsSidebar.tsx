import React from 'react';
import { Button } from '../ui/button';
import { 
  Settings, 
  User,
  Users, 
  GraduationCap, 
  Bell, 
  Shield,
  Lock, 
  Database, 
  Palette, 
  FileText,
  Cpu,
  MessageSquare
} from 'lucide-react';

interface SettingsSidebarProps {
  categories: Array<{ id: string; name: string; icon: string }>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ categories, activeTab, setActiveTab }) => {
  const toIcon = (icon: string) => {
    switch (icon) {
      case 'user':
        return <User className="h-5 w-5" />;
      case 'users':
        return <Users className="h-5 w-5" />;
      case 'graduation':
        return <GraduationCap className="h-5 w-5" />;
      case 'bell':
        return <Bell className="h-5 w-5" />;
      case 'cpu':
        return <Cpu className="h-5 w-5" />;
      case 'shield':
        return <Shield className="h-5 w-5" />;
      case 'integrations':
        return <Settings className="h-5 w-5" />;
      case 'lock':
        return <Lock className="h-5 w-5" />;
      case 'database':
        return <Database className="h-5 w-5" />;
      case 'palette':
        return <Palette className="h-5 w-5" />;
      case 'file':
        return <FileText className="h-5 w-5" />;
      case 'notification-logs':
        return <MessageSquare className="h-5 w-5" />;
      case 'settings':
      default:
        return <Settings className="h-5 w-5" />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="space-y-1">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={activeTab === category.id ? "default" : "ghost"}
            className={`w-full justify-start ${activeTab === category.id ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-300'}`}
            onClick={() => setActiveTab(category.id)}
          >
            <span className="mr-2">{toIcon(category.icon)}</span>
            {category.name}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default SettingsSidebar;
