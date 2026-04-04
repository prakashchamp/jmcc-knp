'use client';

import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/lib/redux/store';
import CricketScoringEngine from '@/app/lib/scoring-engine';
import {
  recordBattingBall,
  createUndoSnapshot,
  openDialog,
} from '@/app/lib/redux/slices/scorerSlice';

/**
 * Button Pad Component
 * All control buttons: Number pad (0-7), Extra buttons (UNDO, LB, B, NB, WD), Wicket button
 */
export function ButtonPad() {
  const dispatch = useDispatch<AppDispatch>();
  const { currentInnings } = useSelector((state: RootState) => state.scorer);

  const handleNumberButton = (runs: number) => {
    if (!currentInnings) return;

    // Create undo snapshot before recording
    dispatch(createUndoSnapshot());

    // Record the batting ball
    dispatch(recordBattingBall({ runs }));
  };

  const handleByeButton = () => {
    dispatch(createUndoSnapshot());
    dispatch(openDialog({ dialog: 'extra', data: { extraType: 'bye', hasWicket: false } }));
  };

  const handleLegByeButton = () => {
    dispatch(createUndoSnapshot());
    dispatch(openDialog({ dialog: 'extra', data: { extraType: 'leg-bye', hasWicket: false } }));
  };

  const handleWideButton = () => {
    dispatch(createUndoSnapshot());
    dispatch(openDialog({ dialog: 'extra', data: { extraType: 'wide', hasWicket: false } }));
  };

  const handleNoBallButton = () => {
    dispatch(createUndoSnapshot());
    dispatch(openDialog({ dialog: 'extra', data: { extraType: 'no-ball', hasWicket: false } }));
  };

  const handleWicketButton = () => {
    dispatch(openDialog({ dialog: 'wicket' }));
  };

  const handleUndoButton = () => {
    // Undo is handled by dialog, just close any open dialog
    dispatch(openDialog({ dialog: null }));
  };

  if (!currentInnings) {
    return (
      <div className="bg-gray-100 p-4">
        <p className="text-sm text-gray-600 text-center">No match in progress</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 p-4 space-y-2">
      {/* Row 1: UNDO, LB, B, NB, WD */}
      <div className="grid grid-cols-5 gap-2">
        <Button
          label="UNDO"
          onClick={handleUndoButton}
          variant="gray"
          className="text-xs"
        />
        <Button
          label="LB"
          onClick={handleLegByeButton}
          variant="gray"
          className="text-xs"
        />
        <Button
          label="B"
          onClick={handleByeButton}
          variant="gray"
          className="text-xs"
        />
        <Button
          label="NB"
          onClick={handleNoBallButton}
          variant="red"
          className="text-xs"
        />
        <Button
          label="WD"
          onClick={handleWideButton}
          variant="gray"
          className="text-xs"
        />
      </div>

      {/* Row 2: 7, 5, 6, 4, 1 */}
      <div className="grid grid-cols-5 gap-2">
        <Button label="7" onClick={() => handleNumberButton(7)} variant="number" />
        <Button label="5" onClick={() => handleNumberButton(5)} variant="number" />
        <Button label="6" onClick={() => handleNumberButton(6)} variant="number" />
        <Button label="4" onClick={() => handleNumberButton(4)} variant="number" />
        <Button label="1" onClick={() => handleNumberButton(1)} variant="number" />
      </div>

      {/* Row 3: 0, 2, 3, W, ... */}
      <div className="grid grid-cols-5 gap-2">
        <Button label="0" onClick={() => handleNumberButton(0)} variant="number" />
        <Button label="2" onClick={() => handleNumberButton(2)} variant="number" />
        <Button label="3" onClick={() => handleNumberButton(3)} variant="number" />
        <Button
          label="W"
          onClick={handleWicketButton}
          variant="wicket"
          className="text-sm font-bold"
        />
        <Button label="..." onClick={() => {}} variant="gray" disabled />
      </div>
    </div>
  );
}

/**
 * Reusable Button Component
 */
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'number' | 'gray' | 'red' | 'wicket';
  className?: string;
  disabled?: boolean;
}

function Button({
  label,
  onClick,
  variant = 'gray',
  className = '',
  disabled = false,
}: ButtonProps) {
  const baseClasses = 'w-full py-3 rounded font-semibold text-white transition-colors transform active:scale-95';

  const variantClasses: Record<string, string> = {
    number: 'bg-gray-700 hover:bg-gray-800 active:bg-gray-900',
    gray: 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800',
    red: 'bg-red-600 hover:bg-red-700 active:bg-red-800',
    wicket: 'bg-red-700 hover:bg-red-800 active:bg-red-900',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {label}
    </button>
  );
}

export default ButtonPad;
