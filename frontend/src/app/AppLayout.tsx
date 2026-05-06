import React from 'react';
import { Layout } from '../components/layout/Layout';

interface AppLayoutProps {
  children: React.ReactNode;
  hideHeader?: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, hideHeader }) => {
  return <Layout hideHeader={hideHeader}>{children}</Layout>;
};

export default AppLayout;