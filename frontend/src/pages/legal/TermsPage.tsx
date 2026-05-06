import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Scale, FileText } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { Card, CardContent } from '../../components/ui/card';

export const TermsPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader
        title={t('navigation.legal.terms_title', 'Terms of Service')}
        description={t('navigation.legal.terms_description', 'Please read these terms carefully before using ADMIPAEDIA.')}
        icon={<Scale className="h-6 w-6 text-indigo-600" />}
      />

      <Card>
        <CardContent className="p-8 prose prose-slate dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 dark:text-gray-400">
              By accessing or using ADMIPAEDIA, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">2. Use License</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Permission is granted to use ADMIPAEDIA for educational and administrative purposes within your authorized institution. This is the grant of a license, not a transfer of title.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">3. Data Security</h2>
            <p className="text-gray-600 dark:text-gray-400">
              ADMIPAEDIA implements robust security measures to protect school data. Users are responsible for maintaining the confidentiality of their login credentials.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">4. Limitations</h2>
            <p className="text-gray-600 dark:text-gray-400">
              In no event shall ADMIPAEDIA or its suppliers be liable for any damages arising out of the use or inability to use the materials on ADMIPAEDIA's website.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default TermsPage;
