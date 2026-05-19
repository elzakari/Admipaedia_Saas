import React from 'react';

interface StatisticsPanelProps {
  errorState: boolean | any;
  onRetry: () => void;
  onOpenLogs?: () => void;
  children?: React.ReactNode;
}

export function StatisticsPanel({ errorState, onRetry, onOpenLogs, children }: StatisticsPanelProps) {
  return (
    <div className="adm-panel adm-statistics-panel bg-white shadow-sm border rounded-2xl p-6 mb-8">
      <div className="adm-panel-header border-b pb-4 mb-4 flex items-center justify-between">
        <h3 className="adm-panel-heading text-lg font-bold text-gray-900">Statistics</h3>
      </div>
      
      <div className="adm-panel-body min-h-[240px] flex flex-col justify-center">
        {errorState ? (
          /* Custom 500 Error State Overlay Layout Component */
          <div className="adm-error-container text-center py-6" role="alert">
            <div className="adm-error-icon-wrapper flex justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="adm-error-icon h-12 w-12 text-red-500">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h4 className="adm-error-heading text-lg font-semibold text-gray-900 mb-2">Statistics could not be loaded</h4>
            <p className="adm-error-description text-sm text-gray-500 max-w-md mx-auto mb-6">
              The dashboard received an HTTP 500 response. Retry the request, or open the performance monitor to review the service status.
            </p>
            <div className="adm-error-actions flex justify-center space-x-3">
              {/* Connects immediately to your active data-fetching queries */}
              <button 
                className="adm-btn-primary px-4 py-2 bg-[#5846dc] hover:bg-[#4432c6] text-white font-medium rounded-xl text-sm transition-colors shadow-sm" 
                onClick={onRetry}
              >
                Try Again
              </button>
              <button 
                className="adm-btn-secondary px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-sm transition-colors" 
                onClick={onOpenLogs || (() => window.location.href='/admin/diagnostics')}
              >
                Open Logs
              </button>
            </div>
          </div>
        ) : (
          /* Render your standard canvas metrics charts and dynamic components here */
          children || <div className="adm-chart-placeholder text-center text-gray-400 py-12">Active Chart Canvas Container</div>
        )}
      </div>
    </div>
  );
}

export default StatisticsPanel;
