import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t border-gray-200 py-4 px-6">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="mb-4 md:mb-0">
          <p className="text-sm text-gray-600">
            &copy; {currentYear} ADMIPAEDIA. All rights reserved.
          </p>
        </div>
        <div className="flex space-x-6">
          <a href="/terms" className="text-sm text-indigo-600 hover:text-indigo-800">
            Terms of Service
          </a>
          <a href="/privacy" className="text-sm text-indigo-600 hover:text-indigo-800">
            Privacy Policy
          </a>
          <a href="/help" className="text-sm text-indigo-600 hover:text-indigo-800">
            Help Center
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;