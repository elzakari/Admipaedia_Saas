import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Book, 
  Search, 
  ChevronRight, 
  UserPlus, 
  GraduationCap, 
  Calendar, 
  CreditCard, 
  Settings,
  FileText
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export const GuidesPage: React.FC = () => {
  const { t } = useTranslation();

  const categories = [
    {
      title: "Getting Started",
      description: "Learn the basics of ADMIPAEDIA and set up your account.",
      icon: <UserPlus className="h-6 w-6 text-blue-500" />,
      articles: ["Setting up your profile", "Navigating the dashboard", "Troubleshooting common issues"]
    },
    {
      title: "Student Management",
      description: "Manage student profiles, enrollments, and academic records.",
      icon: <GraduationCap className="h-6 w-6 text-indigo-500" />,
      articles: ["Adding a new student", "Managing student attendance", "Bulk student imports"]
    },
    {
      title: "Academic Records",
      description: "Set up classes, subjects, and grading systems.",
      icon: <FileText className="h-6 w-6 text-purple-500" />,
      articles: ["Creating a class", "Managing subjects", "Generating grade reports"]
    },
    {
      title: "Scheduling & Attendance",
      description: "Configure school calendars and daily schedules.",
      icon: <Calendar className="h-6 w-6 text-green-500" />,
      articles: ["Setting up the school calendar", "Managing class timetables", "Tracking daily attendance"]
    },
    {
      title: "Finance & Fees",
      description: "Manage fee collection, invoicing, and payments.",
      icon: <CreditCard className="h-6 w-6 text-amber-500" />,
      articles: ["Fee structure configuration", "Generating invoices", "Processing payments"]
    },
    {
      title: "System Administration",
      description: "Configure global system settings and user roles.",
      icon: <Settings className="h-6 w-6 text-slate-500" />,
      articles: ["Managing user roles", "Configuring system settings", "Audit logs and security"]
    }
  ];

  return (
    <div className="container mx-auto py-8 space-y-12">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white">User Documentation</h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto">
          Comprehensive guides and tutorials to help you master ADMIPAEDIA.
        </p>
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
          <Input 
            className="w-full pl-12 h-14 text-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 rounded-xl shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500" 
            placeholder="Search documentation..." 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
        {categories.map((category, index) => (
          <Card key={index} className="border-none shadow-md hover:shadow-xl transition-all duration-300">
            <CardHeader className="space-y-4">
              <div className="h-12 w-12 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                {category.icon}
              </div>
              <div className="space-y-2">
                <CardTitle className="text-xl font-bold">{category.title}</CardTitle>
                <CardDescription className="text-slate-500 text-sm leading-relaxed">
                  {category.description}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {category.articles.map((article, idx) => (
                  <li key={idx}>
                    <Button variant="link" className="p-0 h-auto text-slate-600 dark:text-slate-400 hover:text-blue-600 text-sm flex items-center justify-between w-full">
                      {article}
                      <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Button>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full mt-4 border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
                View All Guides
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Featured Tutorial */}
      <div className="max-w-5xl mx-auto px-4 pb-12">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-indigo-600/20">
          <div className="relative z-10 max-w-2xl space-y-6">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-sm font-semibold backdrop-blur-sm">
              Featured Tutorial
            </div>
            <h2 className="text-3xl font-bold">Comprehensive School Management Masterclass</h2>
            <p className="text-indigo-100 text-lg leading-relaxed">
              New to ADMIPAEDIA? This 15-minute guide will walk you through everything from student enrollment to final grade reporting.
            </p>
            <Button className="bg-white text-indigo-600 hover:bg-slate-100 font-bold px-8 h-12 rounded-xl">
              Start Masterclass ▸
            </Button>
          </div>
          {/* Abstract background shape */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        </div>
      </div>
    </div>
  );
};

export default GuidesPage;
