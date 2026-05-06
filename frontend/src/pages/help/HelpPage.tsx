import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Book, 
  MessageCircle, 
  Mail, 
  Phone, 
  ChevronRight,
  FileText,
  MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { SupportTicketModal } from '../../components/help/SupportTicketModal';

export const HelpPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const faqItems = [
    {
      question: "How do I add a new student?",
      answer: "Go to the Students page and click on the 'Add New Student' button. Fill in the required details and click save."
    },
    {
      question: "Where can I view my class schedule?",
      answer: "Your schedule is available on the Dashboard and also on the dedicated 'Schedule' page in the main navigation."
    },
    {
      question: "How do I change the system language?",
      answer: "Click on the globe icon in the top header and select your preferred language from the dropdown menu."
    },
    {
      question: "Can I export attendance reports?",
      answer: "Yes, you can export reports from the 'Attendance' page or by using the 'Export Data' quick action in the sidebar."
    },
    {
      question: "What should I do if a student's report card says 'No progression record found'?",
      answer: "To resolve this, ensure the student is assigned to a class with an academic year and an educational level. Then, use the 'Promotion Tool' under the Students menu to initialize their record for the selected year."
    }
  ];

  return (
    <div className="container mx-auto py-8 space-y-12">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white">How can we help you?</h1>
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
          <Input 
            className="w-full pl-12 h-14 text-lg bg-[#37475F] border-none text-white placeholder:text-slate-400 rounded-xl shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500" 
            placeholder="Search for articles, guides, or keywords..." 
          />
        </div>
      </div>

      {/* Quick Links Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
        <Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="space-y-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl font-bold">User Documentation</CardTitle>
              <CardDescription className="text-slate-500 text-sm leading-relaxed">
                Comprehensive guides for teachers, admins, and parents.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button 
              variant="link" 
              className="p-0 h-auto text-blue-600 font-semibold group-hover:translate-x-1 transition-transform"
              onClick={() => navigate('/guides')}
            >
              Read Guides <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="space-y-4">
            <div className="h-12 w-12 rounded-xl bg-green-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageSquare className="h-6 w-6 text-green-600" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl font-bold">Community Support</CardTitle>
              <CardDescription className="text-slate-500 text-sm leading-relaxed">
                Join our community forum to discuss features and get help.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button 
              variant="link" 
              className="p-0 h-auto text-green-600 font-semibold group-hover:translate-x-1 transition-transform"
              onClick={() => window.open('https://forum.admipaedia.com', '_blank')}
            >
              Visit Forum <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="space-y-4">
            <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Mail className="h-6 w-6 text-purple-600" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl font-bold">Contact Support</CardTitle>
              <CardDescription className="text-slate-500 text-sm leading-relaxed">
                Need direct help? Our support team is available 24/7.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button 
              variant="link" 
              className="p-0 h-auto text-purple-600 font-semibold group-hover:translate-x-1 transition-transform"
              onClick={() => setIsTicketModalOpen(true)}
            >
              Open a Ticket <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* FAQ Section */}
      <div className="space-y-8 max-w-5xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Frequently Asked Questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {faqItems.map((item, index) => (
            <Card key={index} className="border border-slate-100 dark:border-white/5 hover:border-blue-200 transition-colors">
              <CardHeader>
                <CardTitle className="text-base font-semibold">{item.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 dark:text-slate-400">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Support Footer */}
      <div className="max-w-5xl mx-auto px-4 pb-12">
        <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 border border-slate-100 dark:border-white/5">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-xl font-bold">Still need help?</h3>
            <p className="text-slate-500">Our technical experts are just a phone call away.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="outline" className="rounded-xl px-6 py-6 h-auto border-slate-200 hover:bg-slate-100">
              <Phone className="h-5 w-5 mr-3 text-slate-600" />
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Call Us</div>
                <div className="font-bold">+221 33 000 00 00</div>
              </div>
            </Button>
            <Button 
              className="rounded-xl px-6 py-6 h-auto bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
              onClick={() => setIsTicketModalOpen(true)}
            >
              <Mail className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-wider font-bold text-blue-200">Email Us</div>
                <div className="font-bold">support@admipaedia.com</div>
              </div>
            </Button>
          </div>
        </div>
      </div>

      {/* Support Ticket Modal */}
      <SupportTicketModal 
        isOpen={isTicketModalOpen} 
        onClose={() => setIsTicketModalOpen(false)} 
      />
    </div>
  );
};

export default HelpPage;
