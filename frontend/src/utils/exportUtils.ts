export interface ExportOptions {
  format: 'csv' | 'pdf';
  fields?: string[];
  headers?: string[];
  filename?: string;
  title?: string;
}

/**
 * Generic CSV Export
 * @param data Array of objects to export
 * @param options Export options including fields and filename
 */
export const exportToCSV = <T extends Record<string, any>>(
  data: T[],
  options: ExportOptions = { format: 'csv' }
) => {
  if (data.length === 0 || !data[0]) return;

  const firstItem = data[0] as object;
  const fields = options.fields || Object.keys(firstItem);
  const headers = options.headers || fields.map(field =>
    field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1').trim()
  );

  const csvContent = [
    headers.join(','),
    ...data.map(item =>
      fields.map(field => {
        const value = item[field] ?? '';
        // Escape commas and quotes in CSV
        const stringValue = String(value);
        return (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n'))
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', options.filename || `export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generic PDF Export (via browser print)
 * @param data Array of objects to export
 * @param options Export options including fields and title
 */
export const exportToPDF = <T extends Record<string, any>>(
  data: T[],
  options: ExportOptions = { format: 'pdf' }
) => {
  if (data.length === 0 || !data[0]) return;

  const firstItem = data[0] as object;
  const fields = options.fields || Object.keys(firstItem);
  const headers = options.headers || fields.map(field =>
    field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1').trim()
  );

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const title = options.title || 'Data Export';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; margin: 30px; color: #1a1a1a; }
        header { margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; }
        h1 { margin: 0; font-size: 24px; color: #1e3a8a; }
        .meta { font-size: 14px; color: #64748b; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; font-size: 12px; }
        th { background-color: #f8fafc; font-weight: 600; color: #475569; }
        tr:nth-child(even) { background-color: #f1f5f9; }
        @media print {
          @page { margin: 1.5cm; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <header>
        <h1>${title}</h1>
        <div class="meta">Generated on: ${new Date().toLocaleString()} | Total Records: ${data.length}</div>
      </header>
      <table>
        <thead>
          <tr>
            ${headers.map(header => `<th>${header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(item => `
            <tr>
              ${fields.map(field => `<td>${item[field] ?? 'N/A'}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <script>
        window.onload = () => {
          setTimeout(() => {
            window.print();
            // window.close(); // Optional: close tab after printing
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

/**
 * Main export entry point
 */
export const exportData = <T extends Record<string, any>>(
  data: T[],
  options: ExportOptions
) => {
  switch (options.format) {
    case 'csv':
      exportToCSV(data, options);
      break;
    case 'pdf':
      exportToPDF(data, options);
      break;
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
};