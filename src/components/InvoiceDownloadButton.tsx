'use client';

import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import InvoiceTemplate, { InvoiceData } from '@/components/invoice/InvoiceTemplate';

interface InvoiceDownloadButtonProps {
  invoiceData: InvoiceData;
  className?: string;
}

export default function InvoiceDownloadButton({ invoiceData, className = '' }: InvoiceDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // Generate the PDF
      const doc = <InvoiceTemplate data={invoiceData} logoUrl="/doshi.png" />;
      const blob = await pdf(doc).toBlob();
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `doshi-sensei-invoice-${invoiceData.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error('Error generating invoice:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors disabled:opacity-50 ${className}`}
    >
      {isGenerating ? (
        <>
          <div className="animate-spin w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full"></div>
          <span>Generating...</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>
            <span className="font-semibold">Doshi Invoice</span>
            <span className="opacity-75"> (PDF)</span>
          </span>
        </>
      )}
    </button>
  );
}