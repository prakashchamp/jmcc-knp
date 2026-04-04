'use client';

import React, { useState } from 'react';
import { MatchSetupData } from '@/app/lib/pwa-cricket-types';

interface MatchSetupFormProps {
  onSubmit: (data: MatchSetupData) => void;
  isLoading?: boolean;
}

export const MatchSetupForm: React.FC<MatchSetupFormProps> = ({
  onSubmit,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<MatchSetupData>({
    opponentName: '',
    venue: '',
    tossWonBy: 'ABC',
    decision: 'bat',
    oversPerMatch: 20,
  });

  const [errors, setErrors] = useState<Partial<MatchSetupData>>({});

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'oversPerMatch'
          ? parseInt(value, 10)
          : value,
    }));
    // Clear error for this field
    if (errors[name as keyof MatchSetupData]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof MatchSetupData, string>> = {};

    if (!formData.opponentName.trim()) {
      newErrors.opponentName = 'Opponent name is required';
    }
    if (!formData.venue.trim()) {
      newErrors.venue = 'Venue is required';
    }
    if (formData.oversPerMatch < 1 || formData.oversPerMatch > 50) {
      newErrors.oversPerMatch = 'Overs must be between 1 and 50';
    }

    setErrors(newErrors as any);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">New Match</h1>
          <p className="text-slate-400">ABC Cricket Team</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Opponent Name */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Opponent Name
            </label>
            <input
              type="text"
              name="opponentName"
              value={formData.opponentName}
              onChange={handleInputChange}
              placeholder="Enter opponent team name"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={isLoading}
            />
            {errors.opponentName && (
              <p className="text-red-500 text-sm mt-1">{errors.opponentName}</p>
            )}
          </div>

          {/* Venue */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Venue
            </label>
            <input
              type="text"
              name="venue"
              value={formData.venue}
              onChange={handleInputChange}
              placeholder="Enter match venue"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={isLoading}
            />
            {errors.venue && (
              <p className="text-red-500 text-sm mt-1">{errors.venue}</p>
            )}
          </div>

          {/* Overs Per Match */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Overs Per Innings
            </label>
            <input
              type="number"
              name="oversPerMatch"
              value={formData.oversPerMatch}
              onChange={handleInputChange}
              min="1"
              max="50"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={isLoading}
            />
            {errors.oversPerMatch && (
              <p className="text-red-500 text-sm mt-1">{errors.oversPerMatch}</p>
            )}
          </div>

          {/* Toss Won By */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Toss Won By
            </label>
            <select
              name="tossWonBy"
              value={formData.tossWonBy}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={isLoading}
            >
              <option value="ABC">ABC</option>
              <option value="opponent">{formData.opponentName || 'Opponent'}</option>
            </select>
          </div>

          {/* Decision */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Decision: {formData.tossWonBy} chooses to...
            </label>
            <select
              name="decision"
              value={formData.decision}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={isLoading}
            >
              <option value="bat">Bat</option>
              <option value="bowl">Bowl</option>
            </select>
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
            <p className="text-sm text-slate-400 mb-2">Summary:</p>
            <p className="text-white font-semibold">
              {formData.tossWonBy === 'ABC' && formData.decision === 'bat'
                ? 'ABC will bat first'
                : formData.tossWonBy === 'ABC' && formData.decision === 'bowl'
                ? 'Opponent will bat first'
                : formData.tossWonBy === 'opponent' && formData.decision === 'bat'
                ? 'Opponent will bat first'
                : 'ABC will bat first'}
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-8 py-4 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors min-h-[48px] text-lg"
          >
            {isLoading ? 'Creating Match...' : 'Create Match'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MatchSetupForm;
