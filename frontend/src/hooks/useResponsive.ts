import { useMediaQuery } from './useMediaQuery';

export interface ResponsiveBreakpoints {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isSmallMobile: boolean;
  isLargeMobile: boolean;
}

export const useResponsive = (): ResponsiveBreakpoints => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');
  const isSmallMobile = useMediaQuery('(max-width: 480px)');
  const isLargeMobile = useMediaQuery('(min-width: 481px) and (max-width: 768px)');

  return {
    isMobile,
    isTablet,
    isDesktop,
    isSmallMobile,
    isLargeMobile
  };
};