import React from 'react';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t border-gray-200 py-4 px-4 sm:px-6 pb-20 md:pb-4 hidden min-[520px]:block">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="text-center md:text-left">
          <p className="text-sm text-gray-600">
            &copy; {currentYear} ADMIPAEDIA. {t('common.all_rights_reserved', 'Tous droits réservés.')}
          </p>
        </div>
        <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2">
          <a href="/terms" className="text-sm text-indigo-600 hover:text-indigo-800">
            {t('footer.terms', "Conditions d'utilisation")}
          </a>
          <a href="/privacy" className="text-sm text-indigo-600 hover:text-indigo-800">
            {t('footer.privacy', 'Politique de confidentialité')}
          </a>
          <a href="/help" className="text-sm text-indigo-600 hover:text-indigo-800">
            {t('footer.help', "Centre d'aide")}
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
