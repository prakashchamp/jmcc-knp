'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/components/Header';
import { ScorecardUpload } from '@/app/components/admin/ScorecardUpload';
import { MatchDataForm } from '@/app/components/admin/MatchDataForm';
import { Match, Performance } from '@/app/lib/cricket-schema';
import { useAdminAuth } from '@/app/lib/hooks/useAdminAuth';

type AdminStep = 'entry' | 'review';

interface ParsedData {
  match: Partial<Match>;
  performances: Partial<Performance>[];
}

export default function ManualEntryPage() {
  useAdminAuth();
  const router = useRouter();
  const [step, setStep] = useState<AdminStep>('entry');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);

  const handleDataParsed = (data: ParsedData) => {
    setParsedData(data);
    setStep('review');
  };

  const handleFormSubmit = () => {
    setStep('entry');
    setParsedData(null);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="page-container">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="page-title text-white">Manual Entry</h1>
            <p className="hint-text mt-1 sm:mt-2">Enter match data manually or via screenshot</p>
          </div>
          <button 
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Back to Admin
          </button>
        </div>

        {/* Steps */}
        <div className="mb-4 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <div
              className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-sm sm:text-base font-bold flex-shrink-0 ${
                step === 'entry' || step === 'review'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              1
            </div>
            <span className="text-white text-sm sm:text-base font-semibold">Enter Data</span>

            {/* Arrow */}
            <div className="flex-1 h-0.5 sm:h-1 bg-gradient-to-r from-blue-600 to-gray-700 mx-1 sm:mx-4"></div>

            <div
              className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-sm sm:text-base font-bold flex-shrink-0 ${
                step === 'review' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
              }`}
            >
              2
            </div>
            <span className={`text-sm sm:text-base font-semibold ${step === 'review' ? 'text-white' : 'text-gray-400'}`}>
              Review & Save
            </span>
          </div>
        </div>

        {/* Content */}
        {step === 'entry' && (
          <ScorecardUpload onDataParsed={handleDataParsed} />
        )}
        
        {step === 'review' && parsedData && (
          <MatchDataForm matchData={parsedData} onSuccess={handleFormSubmit} />
        )}
      </main>
    </div>
  );
}
