import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Lock, UserCheck } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { Card, CardContent } from '../../components/ui/card';

export const PrivacyPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader
        title={t('navigation.legal.privacy_title', 'Privacy Policy')}
        description={t('navigation.legal.privacy_description', 'Your privacy and data security are our top priorities.')}
        icon={<ShieldCheck className="h-6 w-6 text-green-600" />}
      />

      <Card>
        <CardContent className="p-8 prose prose-slate dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-green-600" />
              Information We Collect
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              We collect information that you provide to us when using ADMIPAEDIA, including student profiles, teacher details, grades, and administrative logs.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              How We Use Information
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Your information is used to facilitate school management processes, generate reports, manage communication, and provide support.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">Data Protection</h2>
            <p className="text-gray-600 dark:text-gray-400">
              We employ advanced encryption and security protocols to ensure your data remains secure and private at all times.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">Sharing Your Information</h2>
            <p className="text-gray-600 dark:text-gray-400">
              We do not sell or trade your personal information to third parties. Information is only shared as required for the platform's operation or by law.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyPage;
