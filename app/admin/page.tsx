'use client';

import { useState } from 'react';
import { Header } from '@/app/components/Header';
import { ScorecardUpload } from '@/app/components/admin/ScorecardUpload';
import { MatchDataForm } from '@/app/components/admin/MatchDataForm';
import { Match, Performance } from '@/app/lib/cricket-schema';

type AdminStep = 'upload' | 'review';

interface ParsedData {
  match: Partial<Match>;
  performances: Partial<Performance>[];
}

export default function AdminPage() {
  const [step, setStep] = useState<AdminStep>('upload');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);

  const handleDataParsed = (data: ParsedData) => {
    setParsedData(data);
    setStep('review');
  };

  const handleFormSubmit = () => {
    setStep('upload');
    setParsedData(null);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-400 mt-2">Upload and parse match scorecards</p>
        </div>

        {/* Steps */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                step === 'upload' || step === 'review'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              1
            </div>
            <span className="text-white font-semibold">Upload Scorecards</span>

            {/* Arrow */}
            <div className="flex-1 h-1 bg-gradient-to-r from-blue-600 to-gray-700 mx-4"></div>

            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                step === 'review' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
              }`}
            >
              2
            </div>
            <span className={`font-semibold ${step === 'review' ? 'text-white' : 'text-gray-400'}`}>
              Review & Save
            </span>
          </div>
        </div>

        {/* Content */}
        {step === 'upload' && <ScorecardUpload onDataParsed={handleDataParsed} />}
        {step === 'review' && parsedData && (
          <MatchDataForm matchData={parsedData} onSuccess={handleFormSubmit} />
        )}
      </main>
    </div>
  );
}
