'use client';

import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { LiveMatch, InningsState } from '@/app/lib/cricket-scorer-types';
import { RootState, AppDispatch } from '@/app/lib/redux/store';
import { openDialog } from '@/app/lib/redux/slices/scorerSlice';
import { getBattingTeamInnings } from './ReviewTeamToggle';
import { getBowlerStats } from '@/app/lib/bowling-stats-utils';
import { getNormalizedBatsmen } from './review-batting-utils';

type ReviewView = 'batting' | 'bowling' | 'overs' | 'wickets' | 'partnerships' | 'details';

interface MatchResultPanelProps {
  liveMatch: LiveMatch;
  onStartNewMatch: () => void;
  onOpenView: (view: ReviewView) => void;
}

export function MatchResultPanel({ liveMatch, onStartNewMatch, onOpenView }: MatchResultPanelProps) {
  const dispatch = useDispatch<AppDispatch>();
  const currentInnings = useSelector((state: RootState) => state.scorer.currentInnings);
  const teamName = useSelector((state: RootState) => state.team.team?.name || 'JMCC');
  const usInnings = getBattingTeamInnings(liveMatch, currentInnings, 'Us');
  const themInnings = getBattingTeamInnings(liveMatch, currentInnings, 'Them');
  const [showShareMenu, setShowShareMenu] = useState(false);

  const summaryLine = liveMatch.winMargin || (liveMatch.result === 'tie' ? 'Match tied' : 'Match complete');

  const formatDate = (dateInput: string) => {
    const date = new Date(dateInput);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getOvers = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;

  const getExtras = (innings: typeof usInnings) => {
    if (!innings) return 0;
    const ballExtras = innings.ballHistory.reduce((sum, ball) => sum + (ball.runs.extras || 0), 0);
    return ballExtras + (innings.penaltyExtras || 0);
  };

  const handleExportMatchInfoPdf = async () => {
    const { jsPDF } = await import('jspdf');

    const formattedDate = formatDate(liveMatch.createdAt || new Date().toISOString());
    const title = `${teamName} vs ${liveMatch.opponent} - ${formattedDate}`;
    const filename = `${teamName} vs ${liveMatch.opponent} - ${formattedDate.replaceAll('/', '-')}.pdf`;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 32;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const colors = {
      bg: [2, 6, 23] as const,
      panel: [15, 23, 42] as const,
      panelAlt: [20, 32, 52] as const,
      border: [20, 184, 166] as const,
      header: [13, 148, 136] as const,
      text: [241, 245, 249] as const,
      textMuted: [148, 163, 184] as const,
      textAccent: [45, 212, 191] as const,
    };

    const fillRect = (x: number, top: number, w: number, h: number, rgb: readonly [number, number, number]) => {
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.rect(x, top, w, h, 'F');
    };

    const drawPanel = (x: number, top: number, w: number, h: number) => {
      fillRect(x, top, w, h, colors.panel);
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.roundedRect(x, top, w, h, 6, 6, 'S');
    };

    const drawPageBackground = () => {
      fillRect(0, 0, pageWidth, pageHeight, colors.bg);
    };

    const addNewPage = () => {
      doc.addPage();
      drawPageBackground();
      y = margin;
    };

    const ensureSpace = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - margin) {
        addNewPage();
      }
    };

    const drawSectionHeader = (text: string) => {
      ensureSpace(28);
      fillRect(margin, y, contentWidth, 24, colors.header);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(text, margin + 10, y + 16);
      y += 32;
    };

    const getTeamName = (team: 'Us' | 'Them') => (team === 'Us' ? teamName : liveMatch.opponent);

    const getMergedInnings = (): InningsState[] => {
      const inningsList = liveMatch.innings ? [...liveMatch.innings] : [];
      if (currentInnings) {
        const idx = inningsList.findIndex(
          (entry) =>
            entry.inningsNumber === currentInnings.inningsNumber &&
            entry.battingTeam === currentInnings.battingTeam
        );
        if (idx >= 0) {
          inningsList[idx] = currentInnings;
        } else {
          inningsList.push(currentInnings);
        }
      }
      return inningsList.sort((a, b) => a.inningsNumber - b.inningsNumber);
    };

    const getExtrasBreakdown = (innings: InningsState | null) => {
      if (!innings) {
        return { wide: 0, bye: 0, legBye: 0, noBall: 0, penalty: 0 };
      }

      return innings.ballHistory.reduce(
        (acc, ball) => {
          const isNoBall = Boolean(ball.extra?.isNoBall || ball.extra?.type === 'no-ball');
          const byeOrLegByeRuns = isNoBall ? Math.max((ball.runs.total || 0) - 1, 0) : ball.runs.extras || 0;

          if (ball.extra?.type === 'wide') acc.wide += ball.runs.total || 0;
          if (ball.extra?.type === 'bye') acc.bye += byeOrLegByeRuns;
          if (ball.extra?.type === 'leg-bye') acc.legBye += byeOrLegByeRuns;
          if (isNoBall) acc.noBall += 1;
          return acc;
        },
        { wide: 0, bye: 0, legBye: 0, noBall: 0, penalty: innings.penaltyExtras || 0 }
      );
    };

    const drawInfoBox = (items: Array<{ label: string; value: string }>) => {
      const rowHeight = 28;
      const rows = Math.ceil(items.length / 2);
      const boxHeight = rows * rowHeight + 18;
      ensureSpace(boxHeight + 12);
      drawPanel(margin, y, contentWidth, boxHeight);

      const colWidth = contentWidth / 2;
      items.forEach((item, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = margin + col * colWidth + 14;
        const top = y + 20 + row * rowHeight;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...colors.textMuted);
        doc.text(item.label, x, top - 8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...colors.text);
        doc.text(item.value, x, top + 6);
      });

      y += boxHeight + 16;
    };

    const drawTable = (
      title: string,
      columns: string[],
      rows: string[][],
      colWidths: number[]
    ) => {
      const headerH = 22;
      const rowH = 18;
      const minRows = Math.max(rows.length, 1);
      const tableH = headerH + minRows * rowH;
      y += 4;
      ensureSpace(tableH + 52);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...colors.textAccent);
      doc.text(title, margin, y);
      y += 10;

      const tableTop = y;
      drawPanel(margin, tableTop, contentWidth, tableH);

      fillRect(margin + 1, tableTop + 1, contentWidth - 2, headerH - 2, colors.panelAlt);

      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.line(margin, tableTop + headerH, margin + contentWidth, tableTop + headerH);

      let currentX = margin;
      for (let i = 0; i < colWidths.length - 1; i++) {
        currentX += colWidths[i] * contentWidth;
        doc.line(currentX, tableTop, currentX, tableTop + tableH);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...colors.textMuted);
      currentX = margin;
      columns.forEach((col, i) => {
        const cellW = colWidths[i] * contentWidth;
        doc.text(col, currentX + 6, tableTop + 14);
        currentX += cellW;
      });

      if (rows.length === 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...colors.textMuted);
        doc.text('No data available', margin + 8, tableTop + headerH + 13);
      } else {
        rows.forEach((row, idx) => {
          const rowTop = tableTop + headerH + idx * rowH;
          if (idx > 0) {
            doc.line(margin, rowTop, margin + contentWidth, rowTop);
          }
          let rowX = margin;
          row.forEach((cell, i) => {
            const cellW = colWidths[i] * contentWidth;
            doc.setFont(i === 0 ? 'helvetica' : 'helvetica', i === 0 ? 'bold' : 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...colors.text);
            doc.text(cell, rowX + 6, rowTop + 13);
            rowX += cellW;
          });
        });
      }

      y += tableH + 18;
    };

    const drawExtrasBox = (innings: InningsState | null) => {
      const extras = getExtrasBreakdown(innings);
      const items = [
        { label: 'Wide', value: String(extras.wide) },
        { label: 'Bye', value: String(extras.bye) },
        { label: 'Leg Bye', value: String(extras.legBye) },
        { label: 'No Ball', value: String(extras.noBall) },
        { label: 'Penalty', value: String(extras.penalty) },
      ];
      y += 4;
      const boxHeight = 58;
      ensureSpace(boxHeight + 32);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...colors.textAccent);
      doc.text('Extras', margin, y);
      y += 8;
      drawPanel(margin, y, contentWidth, boxHeight);

      const colW = contentWidth / items.length;
      items.forEach((item, idx) => {
        const x = margin + idx * colW;
        if (idx > 0) {
          doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
          doc.line(x, y, x, y + boxHeight);
        }
        const centerX = x + colW / 2;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...colors.textMuted);
        const labelWidth = doc.getTextWidth(item.label);
        doc.text(item.label, centerX - labelWidth / 2, y + 20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...colors.text);
        const valueWidth = doc.getTextWidth(item.value);
        doc.text(item.value, centerX - valueWidth / 2, y + 41);
      });

      y += boxHeight + 20;
    };

    const renderInningsSection = (label: string, innings: InningsState | null) => {
      y += 6;
      drawSectionHeader(label);

      if (!innings) {
        drawInfoBox([{ label: 'Status', value: 'Innings not started' }]);
        return;
      }

      const battingName = getTeamName(innings.battingTeam);
      const bowlingName = getTeamName(innings.battingTeam === 'Us' ? 'Them' : 'Us');
      drawInfoBox([
        { label: 'Batting Team', value: battingName },
        { label: 'Bowling Team', value: bowlingName },
        { label: 'Score', value: `${innings.totalRuns}/${innings.totalWickets} (${getOvers(innings.totalBalls)} overs)` },
        { label: 'Total Extras', value: String(getExtras(innings)) },
      ]);

      const batters = getNormalizedBatsmen(innings, liveMatch).map((batsman) => [
        batsman.name,
        String(batsman.runs),
        String(batsman.balls),
        String(batsman.fours),
        String(batsman.sixes),
        batsman.balls > 0 ? ((batsman.runs / batsman.balls) * 100).toFixed(1) : '0.0',
      ]);

      drawTable('Batting', ['Name', 'R', 'B', '4s', '6s', 'SR'], batters, [0.52, 0.08, 0.08, 0.08, 0.08, 0.16]);

      const bowlers = getBowlerStats(innings).map((bowler) => [
        bowler.name,
        `${bowler.overs}.${bowler.balls % 6}`,
        String(bowler.runs),
        String(bowler.wickets),
        bowler.economy.toFixed(2),
      ]);

      drawTable('Bowling', ['Name', 'O', 'R', 'W', 'ECO'], bowlers, [0.56, 0.11, 0.11, 0.11, 0.11]);
      drawExtrasBox(innings);
      y += 6;
    };

    const inningsList = getMergedInnings();
    const firstInnings = inningsList.find((entry) => entry.inningsNumber === 1) ?? null;
    const secondInnings = inningsList.find((entry) => entry.inningsNumber === 2) ?? null;

    drawPageBackground();

    doc.setTextColor(...colors.text);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(title, margin, y);
    y += 20;

    drawInfoBox([
      { label: 'Venue', value: liveMatch.venue },
      { label: 'Result', value: summaryLine },
      { label: 'Match Format', value: `${liveMatch.totalOvers} overs` },
      { label: 'Toss', value: `${liveMatch.tossWonBy === 'Us' ? teamName : liveMatch.opponent} (${liveMatch.tossDecision})` },
    ]);

    drawSectionHeader('Match Score');
    ensureSpace(100);
    const leftX = margin;
    const gap = 14;
    const cardWidth = (contentWidth - gap) / 2;
    const rightX = leftX + cardWidth + gap;
    const cardTop = y;
    const cardHeight = 76;

    drawPanel(leftX, cardTop, cardWidth, cardHeight);
    drawPanel(rightX, cardTop, cardWidth, cardHeight);

    doc.setTextColor(...colors.textMuted);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(teamName, leftX + 10, cardTop + 16);
    doc.text(liveMatch.opponent, rightX + 10, cardTop + 16);

    doc.setTextColor(...colors.text);
    doc.setFontSize(16);
    doc.text(`${usInnings?.totalRuns || 0}/${usInnings?.totalWickets || 0}`, leftX + 10, cardTop + 38);
    doc.text(`${themInnings?.totalRuns || 0}/${themInnings?.totalWickets || 0}`, rightX + 10, cardTop + 38);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...colors.textMuted);
    doc.text(`${getOvers(usInnings?.totalBalls || 0)} overs`, leftX + 10, cardTop + 54);
    doc.text(`${getOvers(themInnings?.totalBalls || 0)} overs`, rightX + 10, cardTop + 54);
    doc.text(`Extras: ${getExtras(usInnings)}`, leftX + 10, cardTop + 68);
    doc.text(`Extras: ${getExtras(themInnings)}`, rightX + 10, cardTop + 68);

    y += cardHeight + 14;

    renderInningsSection('First Innings', firstInnings);

    // Keep second innings as its own area: if remaining space is not enough,
    // move the entire section start to the next page.
    const secondInningsMinStartSpace = 360;
    if (y + secondInningsMinStartSpace > pageHeight - margin) {
      addNewPage();
    }

    renderInningsSection('Second Innings', secondInnings);

    doc.save(filename);
  };

  const handleShare = async (platform?: string) => {
    const formattedDate = formatDate(liveMatch.createdAt || new Date().toISOString());
    const shareText = `${teamName} vs ${liveMatch.opponent} - ${formattedDate}`;
    const matchUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}?matchId=${liveMatch.id}`;

    if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(matchUrl);
        alert('Match link copied to clipboard!');
      } catch {
        alert('Failed to copy link');
      }
    } else if (platform === 'whatsapp') {
      const message = `Check out this match: ${shareText}\n${matchUrl}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    } else if (platform === 'twitter') {
      const message = `Just finished: ${shareText} 🏏 #Cricket`;
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(matchUrl)}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(matchUrl)}`, '_blank');
    }
    setShowShareMenu(false);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-950 px-4 py-5 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <section className="rounded-2xl border border-blue-400/35 bg-gradient-to-br from-blue-900/45 via-slate-900 to-slate-950 p-5 shadow-xl shadow-black/40">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/80">Match Complete</p>
          <h2 className="mt-2 text-2xl font-extrabold text-white">Result</h2>
          <p className="mt-2 text-base font-semibold text-emerald-300">{summaryLine}</p>
          <p className="mt-1 text-sm text-slate-300">
            {liveMatch.opponent} vs {teamName} • {liveMatch.venue}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <article className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{teamName}</p>
            <p className="mt-2 text-2xl font-bold text-white">{usInnings?.totalRuns || 0}/{usInnings?.totalWickets || 0}</p>
            <p className="text-xs text-slate-400">
              {Math.floor((usInnings?.totalBalls || 0) / 6)}.{(usInnings?.totalBalls || 0) % 6} overs
            </p>
          </article>

          <article className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{liveMatch.opponent}</p>
            <p className="mt-2 text-2xl font-bold text-white">{themInnings?.totalRuns || 0}/{themInnings?.totalWickets || 0}</p>
            <p className="text-xs text-slate-400">
              {Math.floor((themInnings?.totalBalls || 0) / 6)}.{(themInnings?.totalBalls || 0) % 6} overs
            </p>
          </article>
        </section>

        <section className="grid gap-2 sm:grid-cols-2">
          <button
            onClick={() => onOpenView('details')}
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Match Info
          </button>
          <button
            onClick={() => onOpenView('batting')}
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Batting Scorecard
          </button>
          <button
            onClick={() => onOpenView('bowling')}
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Bowling Scorecard
          </button>
          <button
            onClick={() => onOpenView('overs')}
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Over History
          </button>
          <button
            onClick={handleExportMatchInfoPdf}
            className="rounded-lg border border-cyan-500/60 bg-cyan-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-600"
          >
            Export Match Info PDF
          </button>
          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="w-full rounded-lg border border-purple-500/60 bg-purple-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-600 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C9.017 13.742 9.5 14 10 14h4c.5 0 .983-.258 1.316-.658m-9.317-2.692a3 3 0 00-.684-2.65m13.001 0a3 3 0 00-.684 2.65m0 0A3 3 0 0015 12h-4a3 3 0 00-3 3v1m6-6l-2.293-2.293a1 1 0 00-1.414 0l-2.293 2.293m17.658 0a2 2 0 10-2.828 2.828l2.828-2.828zm-2.828 2.828l-2.293-2.293a1 1 0 00-1.414 0l-2.293 2.293m0-6l2.293-2.293a1 1 0 011.414 0l2.293 2.293" />
              </svg>
              Share
            </button>
            {showShareMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 rounded-lg border border-slate-600 bg-slate-800 shadow-lg z-10">
                <button
                  onClick={() => handleShare('copy')}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-700 first:rounded-t-lg flex items-center gap-2"
                >
                  📋 Copy Link
                </button>
                <button
                  onClick={() => handleShare('whatsapp')}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-700 flex items-center gap-2"
                >
                  💬 WhatsApp
                </button>
                <button
                  onClick={() => handleShare('twitter')}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-700 flex items-center gap-2"
                >
                  𝕏 Twitter
                </button>
                <button
                  onClick={() => handleShare('facebook')}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-slate-700 last:rounded-b-lg flex items-center gap-2"
                >
                  f Facebook
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              const hasBowlingStats = liveMatch.innings.some(i => i.battingTeam === 'Them' && i.bowlerStats && i.bowlerStats.length > 0);
              if (!hasBowlingStats) {
                dispatch(openDialog({ dialog: 'manualBowling' }));
              } else {
                dispatch(openDialog({ dialog: 'uploadConfirm' }));
              }
            }}
            className="rounded-lg border border-emerald-500/60 bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload to Cloud
          </button>
        </section>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            onClick={onStartNewMatch}
            className="w-full rounded-lg border border-emerald-500/50 bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-500"
          >
            Start New Match
          </button>
          <button
            onClick={onStartNewMatch}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default MatchResultPanel;
