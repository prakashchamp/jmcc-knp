'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Match, Performance } from '@/app/lib/cricket-schema';
import Tesseract from 'tesseract.js';

interface ParsedData {
  match: Partial<Match>;
  performances: Partial<Performance>[];
}

interface ScorecardUploadProps {
  onDataParsed: (data: ParsedData) => void;
}

export function ScorecardUpload({ onDataParsed }: ScorecardUploadProps) {
  const [battingImage, setBattingImage] = useState<File | null>(null);
  const [bowlingImage, setBowlingImage] = useState<File | null>(null);
  const [battingPreview, setBattingPreview] = useState<string>('');
  const [bowlingPreview, setBowlingPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [editedData, setEditedData] = useState<ParsedData | null>(null);
  const battingInputRef = useRef<HTMLInputElement>(null);
  const bowlingInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'batting' | 'bowling'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      if (type === 'batting') {
        setBattingImage(file);
        setBattingPreview(url);
      } else {
        setBowlingImage(file);
        setBowlingPreview(url);
      }
    };
    reader.readAsDataURL(file);
    setError('');
  };

  const preprocessImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          try {
            setError('Enhancing image quality...');
            
            // Create canvas for preprocessing
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              throw new Error('Failed to get canvas context');
            }

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Convert to grayscale and enhance contrast
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];

              // Grayscale conversion (luminosity method)
              const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
              
              // Increase contrast (multiply difference from middle gray by factor)
              const contrast = 1.8;
              const adjusted = Math.round(128 + (gray - 128) * contrast);
              const clamped = Math.max(0, Math.min(255, adjusted));

              // Apply to all RGB channels
              data[i] = clamped;
              data[i + 1] = clamped;
              data[i + 2] = clamped;
              // Keep alpha unchanged
            }

            // Put enhanced image data back
            ctx.putImageData(imageData, 0, 0);

            // Convert canvas to blob and return as data URL
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    resolve(e.target?.result as string);
                  };
                  reader.onerror = () => reject(new Error('Failed to convert canvas to data URL'));
                  reader.readAsDataURL(blob);
                } else {
                  reject(new Error('Failed to create blob from canvas'));
                }
              },
              'image/png'
            );
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const extractTextFromImage = async (file: File): Promise<string> => {
    try {
      setError(`Processing ${file.name}... Please wait (may take 30-60 seconds on first use).`);
      
      // Preprocess image to improve OCR accuracy
      let imageSource: File | string = file;
      try {
        const preprocessedDataUrl = await preprocessImage(file);
        imageSource = preprocessedDataUrl;
        console.log('Image preprocessing completed');
      } catch (err) {
        console.warn('Image preprocessing failed, using original:', err);
        // Fall back to original image if preprocessing fails
      }
      
      // Use Tesseract.js for client-side OCR (completely free, no API keys needed)
      const result = await Tesseract.recognize(imageSource, 'eng', {
        logger: (m: any) => {
          console.log('Tesseract progress:', m);
          if (m.status === 'recognizing text') {
            setError(`Processing ${file.name}... ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      
      const text = result.data.text || '';
      console.log(`Extracted text from ${file.name}:`, text);
      return text;
    } catch (err) {
      console.error('OCR Error:', err);
      throw new Error('Failed to parse scorecard image. Please try with a clearer image (good lighting, straight angle, high contrast).');
    }
  };

  const parseBattingScorecard = (text: string): Partial<Performance>[] => {
    const performances: Partial<Performance>[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    console.log('Parsing batting scorecard with', lines.length, 'lines');

    for (const line of lines) {
      // Skip headers and info lines
      if (line.match(/^(Batsman|Player|R\s+B|EXTRAS|Jmcc|Overs|Second|Innings|BATTING|Name|---|===|Second Innings)/i)) continue;
      if (line.length < 3) continue;

      // Split by single or multiple spaces
      let parts = line.split(/\s+/);
      
      console.log('Processing line:', line);
      console.log('  Parts:', parts);
      
      // POSITIONAL READ: Find first numeric part, then assume next 6 values are: R B 0s 4s 6s SR
      let firstNumericIdx = -1;
      
      for (let i = 0; i < parts.length; i++) {
        if (/^[\d.]+$/.test(parts[i])) {
          firstNumericIdx = i;
          break;
        }
      }
      
      console.log('  First numeric index:', firstNumericIdx);

      // Need at least 6 numeric values after first numeric found
      if (firstNumericIdx > 0 && firstNumericIdx + 6 <= parts.length) {
        // Name is first part
        const playerName = parts[0];
        
        // Everything between name and numeric data is dismissal
        const dismissalPart = parts.slice(1, firstNumericIdx).join(' ').toLowerCase();
        
        // Extract exactly 6 numeric columns in positional order: R B 0s 4s 6s SR
        const runs = parseFloat(parts[firstNumericIdx]) || 0;
        const balls = parseFloat(parts[firstNumericIdx + 1]) || 0;
        const dots = parseFloat(parts[firstNumericIdx + 2]) || 0;
        const fours = parseFloat(parts[firstNumericIdx + 3]) || 0;
        const sixes = parseFloat(parts[firstNumericIdx + 4]) || 0;
        const strikeRate = parseFloat(parts[firstNumericIdx + 5]) || 0;
        
        console.log('  Player:', playerName);
        console.log('  Dismissal:', dismissalPart);
        console.log('  Positional values - R:', runs, 'B:', balls, '0s:', dots, '4s:', fours, '6s:', sixes, 'SR:', strikeRate);

        // Dismissal status detection
        const isNotOut = dismissalPart.includes('not out') || dismissalPart === '' || dismissalPart === 'no';
        const isDismissed = !isNotOut;

        // Validation
        const hasValidName = playerName && playerName.length > 0 && !/^\d+$/.test(playerName);
        const hasValidStats = !isNaN(runs) && !isNaN(balls) && balls >= 1 && runs >= 0;
        
        if (hasValidName && hasValidStats) {
          performances.push({
            playerName,
            playerId: '',
            playerRole: 'batsman',
            batting: {
              didBat: true,
              innings: 1,
              runs,
              balls,
              fours: !isNaN(fours) ? fours : 0,
              sixes: !isNaN(sixes) ? sixes : 0,
              strikeRate: !isNaN(strikeRate) ? strikeRate : 0,
              dismissed: isDismissed,
              isDuck: runs === 0 && balls > 0,
              isFifty: runs >= 50 && runs < 100,
              isHundred: runs >= 100,
              isThirty: runs >= 30 && runs < 50,
            },
            bowling: {
              didBowl: false,
              innings: 0,
              overs: 0,
              balls: 0,
              runs: 0,
              wickets: 0,
              maidens: 0,
              isThreeFer: false,
              isFourFer: false,
              isFiveFer: false,
              economy: 0,
            },
          });
          console.log(`✓ Parsed: ${playerName} - ${runs}(${balls}) 0s:${dots} 4s:${fours} 6s:${sixes} SR:${strikeRate} Out:${isDismissed}`);
        } else {
          console.log(`✗ Invalid - Name:"${playerName}" R:${runs} B:${balls} Valid:${hasValidStats}`);
        }
      } else {
        console.log(`  ✗ Line has insufficient numeric columns at position ${firstNumericIdx}`);
      }
    }

    console.log('Total batters parsed:', performances.length);
    return performances;
  };

  const parseBowlingScorecard = (text: string): Partial<Performance>[] => {
    const performances: Partial<Performance>[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    console.log('Parsing bowling scorecard with', lines.length, 'lines');

    for (const line of lines) {
      // Skip header lines
      if (line.match(/^(Bowler|Player|O\s+R|EXTRAS|Overs|Maiden|Economy|BOWLING|Name|W|---|M|ECO|WD|NB)/i)) continue;
      if (line.length < 2) continue;

      let playerName = '';
      let overs = 0, runs = 0, wickets = 0;
      let foundData = false;

      console.log('Processing line:', line);
      
      // FORMAT 1: "Name - X ovr/ Y runs/ Z wkt"
      let match = line.match(/^([A-Za-z\s]+?)\s*-\s*(\d+\.?\d*)\s*ovr[s]?\s*\/\s*(\d+)\s*run[s]?\s*\/\s*(\d+)\s*w[ick]*/i);
      
      if (match) {
        playerName = match[1].trim();
        overs = parseFloat(match[2]);
        runs = parseInt(match[3], 10);
        wickets = parseInt(match[4], 10);
        foundData = true;
        
        console.log('  ✓ Format 1 matched:', { playerName, overs, runs, wickets });
      }

      // FORMAT 2: Table format - Name | Overs | Runs | Wickets (ignore rest)
      if (!foundData) {
        const parts = line.split(/\s+/);
        
        // Need at least 4 columns: Name O R W
        if (parts.length >= 4) {
          // Check if parts[1], parts[2], parts[3] are all numeric (Overs, Runs, Wickets)
          const isFormat2 = /^[\d.]+$/.test(parts[1]) && /^[\d.]+$/.test(parts[2]) && /^[\d.]+$/.test(parts[3]);
          
          if (isFormat2) {
            playerName = parts[0];
            overs = parseFloat(parts[1]);
            runs = parseInt(parts[2], 10);
            wickets = parseInt(parts[3], 10);
            foundData = true;
            
            console.log('  ✓ Format 2 (table) matched:', { playerName, overs, runs, wickets });
          }
        }
      }

      if (foundData && playerName && !playerName.match(/^(Bowler|Player|O|R|W|M|ECO)$/i) && overs > 0) {
        performances.push({
          playerName,
          playerId: '',
          playerRole: 'bowler',
          batting: {
            didBat: false,
            innings: 0,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            strikeRate: 0,
            dismissed: false,
            isDuck: false,
            isFifty: false,
            isHundred: false,
            isThirty: false,
          },
          bowling: {
            didBowl: true,
            innings: 1,
            overs,
            balls: 0,
            runs,
            wickets,
            maidens: 0,
            isThreeFer: wickets >= 3,
            isFourFer: wickets >= 4,
            isFiveFer: wickets >= 5,
            economy: overs > 0 ? runs / overs : 0,
          },
        });
        console.log(`✓ Parsed bowler: ${playerName} - ${overs}ov/${runs}runs/${wickets}wkt`);
      } else if (!foundData) {
        console.log(`  ✗ Line did not match any bowling format`);
      }
    }

    console.log('Total bowlers parsed:', performances.length);
    return performances;
  };

  const parseMatchData = (battingText: string, bowlingText: string): ParsedData => {
    // Parse batting and bowling performances
    const battingPerformances = parseBattingScorecard(battingText);
    const bowlingPerformances = parseBowlingScorecard(bowlingText);

    // Combine performances
    const allPerformances = [...battingPerformances, ...bowlingPerformances];

    // Find best batter (highest runs)
    const bestBatter = battingPerformances.reduce((prev, current) => 
      (prev.batting?.runs || 0) > (current.batting?.runs || 0) ? prev : current, 
      battingPerformances[0] || {}
    );

    // Find best bowler (most wickets)
    const bestBowler = bowlingPerformances.reduce((prev, current) => 
      (prev.bowling?.wickets || 0) > (current.bowling?.wickets || 0) ? prev : current, 
      bowlingPerformances[0] || {}
    );

    const matchData: Partial<Match> = {
      date: new Date().toISOString(),
      opponent: 'TBD',
      venue: 'Home',
      tossWonBy: 'Us',
      tossDecision: 'bat',
      result: 'won',
      bestBatterId: '',
      bestBatterName: bestBatter.playerName || '',
      bestBatterRuns: bestBatter.batting?.runs || 0,
      bestBatterBalls: bestBatter.batting?.balls || 0,
      bestBowlerId: '',
      bestBowlerName: bestBowler.playerName || '',
      bestBowlerWickets: bestBowler.bowling?.wickets || 0,
      bestBowlerRuns: bestBowler.bowling?.runs || 0,
    };

    return {
      match: matchData,
      performances: allPerformances,
    };
  };

  const handleParse = async () => {
    if (!battingImage) {
      setError('Please upload a batting scorecard image');
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('Starting scorecard parsing...');
      
      const battingText = await extractTextFromImage(battingImage);
      console.log('Batting text extracted, length:', battingText.length);
      
      let bowlingText = '';
      if (bowlingImage) {
        bowlingText = await extractTextFromImage(bowlingImage);
        console.log('Bowling text extracted, length:', bowlingText.length);
      }

      const data = parseMatchData(battingText, bowlingText);
      console.log('Match data parsed:', data);
      
      if (data.performances.length === 0) {
        setError('No player data found in scorecard. Please ensure the image contains a clear scorecard with batting statistics. Try: better lighting, straight angle, or higher contrast.');
        setParsedData(null);
      } else {
        setParsedData(data);
        setEditedData(JSON.parse(JSON.stringify(data)));
        setError('');
      }
    } catch (err) {
      console.error('Parse error:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse scorecard image');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (editedData) {
      onDataParsed(editedData);
      // Reset state after submission
      setParsedData(null);
      setEditedData(null);
      setBattingImage(null);
      setBowlingImage(null);
      setBattingPreview('');
      setBowlingPreview('');
    }
  };

  const updatePerformanceField = (index: number, field: string, value: any) => {
    if (!editedData) return;
    
    const updated = JSON.parse(JSON.stringify(editedData));
    const perf = updated.performances[index];
    
    if (field.startsWith('batting.')) {
      perf.batting[field.split('.')[1]] = isNaN(value) ? value : 
        (field.includes('Rate') || field.includes('economy')) ? parseFloat(value) : parseInt(value, 10);
    } else if (field.startsWith('bowling.')) {
      perf.bowling[field.split('.')[1]] = isNaN(value) ? value : 
        (field.includes('Rate') || field.includes('economy')) ? parseFloat(value) : parseInt(value, 10);
    } else {
      perf[field] = value;
    }
    
    setEditedData(updated);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Scorecard Image Upload */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-2xl font-semibold text-white mb-2">📸 Upload Cricket Scorecard</h3>
        <p className="text-gray-400 text-sm mb-6">Upload clear, straight photos of the scorecard. The system will automatically extract and parse batting statistics.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Batting Image */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3">Batting Scorecard (Required)</label>
            <input
              ref={battingInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageSelect(e, 'batting')}
              className="hidden"
            />
            <button
              onClick={() => battingInputRef.current?.click()}
              className="w-full py-4 px-4 border-2 border-dashed border-blue-500 rounded-lg hover:bg-blue-900/20 transition-colors text-blue-300 hover:text-blue-200 font-medium text-sm"
            >
              {battingImage ? '✓ Batting Image Selected' : '+ Upload Batting Scorecard'}
            </button>

            {battingPreview && (
              <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-900 mt-3 border border-gray-600">
                <Image
                  src={battingPreview}
                  alt="Batting Scorecard"
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>

          {/* Bowling Image */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3">Bowling Scorecard (Optional)</label>
            <input
              ref={bowlingInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageSelect(e, 'bowling')}
              className="hidden"
            />
            <button
              onClick={() => bowlingInputRef.current?.click()}
              className="w-full py-4 px-4 border-2 border-dashed border-gray-600 rounded-lg hover:border-blue-500 transition-colors text-gray-400 hover:text-blue-300 font-medium text-sm"
            >
              {bowlingImage ? '✓ Bowling Image Selected' : '+ Upload Bowling Scorecard'}
            </button>

            {bowlingPreview && (
              <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-900 mt-3 border border-gray-600">
                <Image
                  src={bowlingPreview}
                  alt="Bowling Scorecard"
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleParse}
          disabled={!battingImage || loading}
          className="w-full mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
        >
          {loading ? 'Parsing Scorecard...' : '→ Parse & Extract Data'}
        </button>
      </div>

      {/* Parsed Data Preview */}
      {editedData && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 space-y-6">
          <h3 className="text-xl font-semibold text-white">Parsed Data (Review & Edit)</h3>

          {/* Batting Performances */}
          {editedData.performances.some(p => p.batting?.didBat) && (
            <div>
              <h4 className="font-semibold text-white mb-3">Batting Performances</h4>
              <div className="space-y-3">
                {editedData.performances.filter(p => p.batting?.didBat).map((perf, idx) => {
                  const perfIdx = editedData.performances.indexOf(perf);
                  return (
                    <div key={idx} className="bg-gray-700 rounded-lg p-4 space-y-3">
                      <input
                        type="text"
                        value={perf.playerName || ''}
                        onChange={(e) => updatePerformanceField(perfIdx, 'playerName', e.target.value)}
                        placeholder="Player Name"
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-gray-400">Runs</label>
                          <input type="number" value={perf.batting?.runs || 0} onChange={(e) => updatePerformanceField(perfIdx, 'batting.runs', e.target.value)} className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Balls</label>
                          <input type="number" value={perf.batting?.balls || 0} onChange={(e) => updatePerformanceField(perfIdx, 'batting.balls', e.target.value)} className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">4s</label>
                          <input type="number" value={perf.batting?.fours || 0} onChange={(e) => updatePerformanceField(perfIdx, 'batting.fours', e.target.value)} className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-gray-400">6s</label>
                          <input type="number" value={perf.batting?.sixes || 0} onChange={(e) => updatePerformanceField(perfIdx, 'batting.sixes', e.target.value)} className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">SR %</label>
                          <input type="number" step="0.1" value={perf.batting?.strikeRate || 0} onChange={(e) => updatePerformanceField(perfIdx, 'batting.strikeRate', e.target.value)} className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Dismissed</label>
                          <select value={perf.batting?.dismissed ? 'yes' : 'no'} onChange={(e) => updatePerformanceField(perfIdx, 'batting.dismissed', e.target.value === 'yes')} className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm">
                            <option value="no">Not Out</option>
                            <option value="yes">Dismissed</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bowling Performances */}
          {editedData.performances.some(p => p.bowling?.didBowl) && (
            <div>
              <h4 className="font-semibold text-white mb-3">Bowling Performances</h4>
              <div className="space-y-3">
                {editedData.performances.filter(p => p.bowling?.didBowl).map((perf, idx) => {
                  const perfIdx = editedData.performances.indexOf(perf);
                  return (
                    <div key={idx} className="bg-gray-700 rounded-lg p-4 space-y-3">
                      <input
                        type="text"
                        value={perf.playerName || ''}
                        onChange={(e) => updatePerformanceField(perfIdx, 'playerName', e.target.value)}
                        placeholder="Player Name"
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-gray-400">Overs</label>
                          <input type="number" value={perf.bowling?.overs || 0} onChange={(e) => updatePerformanceField(perfIdx, 'bowling.overs', e.target.value)} className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Runs</label>
                          <input type="number" value={perf.bowling?.runs || 0} onChange={(e) => updatePerformanceField(perfIdx, 'bowling.runs', e.target.value)} className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Wickets</label>
                          <input type="number" value={perf.bowling?.wickets || 0} onChange={(e) => updatePerformanceField(perfIdx, 'bowling.wickets', e.target.value)} className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-400">Maidens</label>
                          <input type="number" value={perf.bowling?.maidens || 0} onChange={(e) => updatePerformanceField(perfIdx, 'bowling.maidens', e.target.value)} className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Economy</label>
                          <input type="number" step="0.01" value={(perf.bowling?.economy || 0).toFixed(2)} onChange={(e) => updatePerformanceField(perfIdx, 'bowling.economy', e.target.value)} className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end pt-4">
            <button
              onClick={() => {
                setParsedData(null);
                setEditedData(null);
              }}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
            >
              Reparse
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
            >
              Submit Match Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
