'use client';

import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { LiveMatch, InningsState, Ball } from '@/app/lib/cricket-scorer-types';
import { RootState, AppDispatch } from '@/app/lib/redux/store';
import { openDialog } from '@/app/lib/redux/slices/scorerSlice';
import { getBattingTeamInnings } from './ReviewTeamToggle';
import { getBowlerStats } from '@/app/lib/bowling-stats-utils';
import { getNormalizedBatsmen } from './review-batting-utils';
import { formatBallDisplay } from '@/app/lib/ball-display-utils';

type ReviewView = 'batting' | 'bowling' | 'overs' | 'wickets' | 'partnerships' | 'details';

interface MatchResultPanelProps {
  liveMatch: LiveMatch;
  onStartNewMatch: () => void;
  onOpenView: (view: ReviewView) => void;
}

const formatDate = (dateInput: string) => {
  const date = new Date(dateInput);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export function MatchResultPanel({ liveMatch, onStartNewMatch, onOpenView }: MatchResultPanelProps) {
  const dispatch = useDispatch<AppDispatch>();
  const currentInnings = useSelector((state: RootState) => state.scorer.currentInnings);
  const teamName = useSelector((state: RootState) => state.team.team?.name || 'KNP');
  const usInnings = getBattingTeamInnings(liveMatch, currentInnings, 'Us');
  const themInnings = getBattingTeamInnings(liveMatch, currentInnings, 'Them');
  // const [showShareMenu, setShowShareMenu] = useState(false);

  const getSummaryLine = () => {
    if (liveMatch.winMargin) {
      // Check if winMargin already contains 'won' or 'lost' (pre-formatted)
      if (liveMatch.winMargin.toLowerCase().includes('won') || liveMatch.winMargin.toLowerCase().includes('lost')) {
        return liveMatch.winMargin;
      }
      
      if (liveMatch.result === 'won') return `${teamName} won by ${liveMatch.winMargin}`;
      if (liveMatch.result === 'lost') return `${liveMatch.opponent} won by ${liveMatch.winMargin}`;
      return liveMatch.winMargin;
    }

    if (liveMatch.result === 'tie') return 'Match tied';
    if (liveMatch.result === 'no_result') return 'No result';
    if (liveMatch.result === 'abandoned') return 'Abandoned';
    if (liveMatch.result === 'won') return 'Won';
    if (liveMatch.result === 'lost') return 'Lost';
    return 'Match complete';
  };

  const summaryLine = getSummaryLine();

  const getOvers = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;

  const getExtras = (innings: InningsState | null | undefined) => {
    if (!innings) return 0;
    const ballExtras = innings.ballHistory.reduce((sum, ball) => sum + (ball.runs.extras || 0), 0);
    return ballExtras + (innings.penaltyExtras || 0);
  };

  const generateMatchPdf = async () => {
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
      bg: [255, 255, 255] as const,
      panel: [250, 250, 250] as const,
      panelAlt: [240, 240, 240] as const,
      border: [190, 190, 190] as const,
      header: [0, 0, 0] as const,
      text: [0, 0, 0] as const,
      textMuted: [60, 60, 60] as const,
      textAccent: [0, 0, 0] as const,
    };

    const sectionSpacing = 16;
    const sectionPadding = 10;

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
      ensureSpace(32);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...colors.header);
      doc.text(text, margin, y + 16);
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.line(margin, y + 22, margin + contentWidth, y + 22);
      y += 32;
    };

    const getTeamNameStr = (team: 'Us' | 'Them') => (team === 'Us' ? teamName : liveMatch.opponent);

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

    const getOverGroups = (innings: InningsState | null) => {
      if (!innings) return [];

      const groups: Array<{
        over: number;
        balls: typeof innings.ballHistory[0][];
        overRuns: number;
        cumulativeRuns: number;
        cumulativeWickets: number;
      }> = [];

      let totalRuns = 0;
      let totalWickets = 0;

      for (const ball of innings.ballHistory) {
        const overIndex = Math.floor(ball.over);
        if (!groups[overIndex]) {
          groups[overIndex] = {
            over: overIndex,
            balls: [],
            overRuns: 0,
            cumulativeRuns: 0,
            cumulativeWickets: 0,
          };
        }

        groups[overIndex].balls.push(ball);
        groups[overIndex].overRuns += ball.runs.total || 0;
        totalRuns += ball.runs.total || 0;
        if (ball.isWicket) totalWickets += 1;
        groups[overIndex].cumulativeRuns = totalRuns;
        groups[overIndex].cumulativeWickets = totalWickets;
      }

      return groups.filter(Boolean);
    };

    const getFallOfWickets = (innings: InningsState | null) => {
      if (!innings) return [];

      return innings.ballHistory
        .map((ball, idx) => ({ ball, idx }))
        .filter(({ ball }) => ball.isWicket)
        .map(({ ball, idx }, i) => {
          const runsAtWicket = innings.ballHistory
            .slice(0, idx + 1)
            .reduce((sum, currentBall) => sum + currentBall.runs.total, 0);

          return {
            wicket: i + 1,
            playerName: ball.dismissal?.playerOut.name || 'Unknown',
            over: `${Math.floor(ball.over)}.${ball.ball}`,
            score: runsAtWicket,
            balls: idx + 1,
          };
        });
    };

    const getPartnerships = (innings: InningsState | null) => {
      if (!innings) return [];

      const partnerships: Array<{
        wicketNumber: number;
        batsmen: Array<{ name: string; runs: number; balls: number }>;
        partnershipRuns: number;
        partnershipBalls: number;
      }> = [];

      const wicketIndices = innings.ballHistory
        .map((ball, idx) => (ball.isWicket ? idx : -1))
        .filter((idx) => idx >= 0);

      let prevWicketIndex = -1;

      for (let wicketNum = 1; wicketNum <= wicketIndices.length; wicketNum++) {
        const nextWicketIndex = wicketIndices[wicketNum - 1];
        const partnershipBalls = innings.ballHistory.slice(prevWicketIndex + 1, nextWicketIndex + 1);

        if (partnershipBalls.length > 0) {
          const batsmenMap = new Map<string, { name: string; runs: number; balls: number }>();
          const batsmenOrder: string[] = [];
          const firstBall = partnershipBalls[0];
          [firstBall.batter, firstBall.nonStriker].forEach((batsman) => {
            if (!batsmenMap.has(batsman.id)) {
              batsmenMap.set(batsman.id, { name: batsman.name, runs: 0, balls: 0 });
              batsmenOrder.push(batsman.id);
            }
          });

          for (const ball of partnershipBalls) {
            const batterId = ball.batter.id;
            if (!batsmenMap.has(batterId)) {
              batsmenMap.set(batterId, { name: ball.batter.name, runs: 0, balls: 0 });
              batsmenOrder.push(batterId);
            }
            const batsman = batsmenMap.get(batterId)!;
            batsman.runs += ball.runs.batter;
            if (ball.extra?.type !== 'wide') {
              batsman.balls += 1;
            }
          }

          const batsmen = batsmenOrder.map((id) => batsmenMap.get(id)!);
          const totalRuns = partnershipBalls.reduce((sum, ball) => sum + ball.runs.total, 0);
          const totalBalls = partnershipBalls.filter((ball) => ball.extra?.type !== 'wide').length;

          partnerships.push({
            wicketNumber: wicketNum,
            batsmen,
            partnershipRuns: totalRuns,
            partnershipBalls: totalBalls,
          });
        }

        prevWicketIndex = nextWicketIndex;
      }

      const currentBalls = innings.ballHistory.slice(prevWicketIndex + 1);
      if (innings.striker && innings.nonStriker) {
        const batsmenMap = new Map<string, { name: string; runs: number; balls: number }>();
        const batsmenOrder: string[] = [];
        [innings.striker, innings.nonStriker].forEach((batsman) => {
          if (!batsmenMap.has(batsman.id)) {
            batsmenMap.set(batsman.id, { name: batsman.name, runs: 0, balls: 0 });
            batsmenOrder.push(batsman.id);
          }
        });

        for (const ball of currentBalls) {
          const batterId = ball.batter.id;
          if (!batsmenMap.has(batterId)) {
            batsmenMap.set(batterId, { name: ball.batter.name, runs: 0, balls: 0 });
            batsmenOrder.push(batterId);
          }
          const batsman = batsmenMap.get(batterId)!;
          batsman.runs += ball.runs.batter;
          if (ball.extra?.type !== 'wide') {
            batsman.balls += 1;
          }
        }

        const batsmen = batsmenOrder.map((id) => batsmenMap.get(id)!);
        const totalRuns = currentBalls.reduce((sum, ball) => sum + ball.runs.total, 0);
        const totalBalls = currentBalls.filter((ball) => ball.extra?.type !== 'wide').length;

        if (batsmen.length > 0) {
          partnerships.push({
            wicketNumber: 0,
            batsmen,
            partnershipRuns: totalRuns,
            partnershipBalls: totalBalls,
          });
        }
      }

      return partnerships;
    };

    const getOrdinal = (num: number) => {
      if (num % 10 === 1 && num !== 11) return 'st';
      if (num % 10 === 2 && num !== 12) return 'nd';
      if (num % 10 === 3 && num !== 13) return 'rd';
      return 'th';
    };

    const getOverHistoryRows = (innings: InningsState) => {
      const overMap = new Map<number, { over: number; balls: Ball[]; runs: number; wickets: number }>();
      for (const ball of innings.ballHistory) {
        const overNum = Math.floor(ball.over);
        const group = overMap.get(overNum) ?? { over: overNum, balls: [], runs: 0, wickets: 0 };
        group.balls.push(ball);
        group.runs += ball.runs.total || 0;
        if (ball.isWicket) group.wickets += 1;
        overMap.set(overNum, group);
      }
      return Array.from(overMap.values())
        .sort((a, b) => a.over - b.over)
        .map((group) => [
          `${group.over + 1}.${group.balls.length}`,
          String(group.runs),
          String(group.wickets),
          group.balls.map(formatBallDisplay).join(' '),
        ]);
    };

    const getFallOfWicketsRows = (innings: InningsState) => {
      return innings.dismissedBatsmen.map((batsman, idx) => {
        const wicketBallIndex = innings.ballHistory.findIndex(
          (ball) => ball.isWicket && ball.dismissal?.playerOut.id === batsman.id
        );
        const wicketBall = wicketBallIndex >= 0 ? innings.ballHistory[wicketBallIndex] : null;
        const overText = wicketBall ? `${Math.floor(wicketBall.over)}.${wicketBall.ball}` : '-';
        const runsAtWicket = wicketBallIndex >= 0
          ? innings.ballHistory.slice(0, wicketBallIndex + 1).reduce((sum, ball) => sum + ball.runs.total, 0)
          : 0;

        return [String(idx + 1), overText, String(runsAtWicket), batsman.name];
      });
    };

    const getPartnershipRows = (innings: InningsState) => {
      interface Partnership {
        wicketNumber: number;
        batsmen: { name: string; runs: number; balls: number }[];
        partnershipRuns: number;
        partnershipBalls: number;
      }

      const partnerships: Partnership[] = [];
      const wicketBallIndices = innings.ballHistory
        .map((ball, index) => (ball.isWicket ? index : -1))
        .filter((idx) => idx >= 0);

      let prevWicketIndex = -1;

      for (let wicketNumber = 1; wicketNumber <= wicketBallIndices.length; wicketNumber++) {
        const nextWicketIndex = wicketBallIndices[wicketNumber - 1];
        const partnershipBalls = innings.ballHistory.slice(prevWicketIndex + 1, nextWicketIndex + 1);

        if (partnershipBalls.length === 0) {
          prevWicketIndex = nextWicketIndex;
          continue;
        }

        const batsmenMap = new Map<string, { name: string; runs: number; balls: number }>();
        const batsmenOrder: string[] = [];
        const firstBall = partnershipBalls[0];
        [firstBall.batter, firstBall.nonStriker].forEach((batsman) => {
          if (!batsmenMap.has(batsman.id)) {
            batsmenMap.set(batsman.id, { name: batsman.name, runs: 0, balls: 0 });
            batsmenOrder.push(batsman.id);
          }
        });

        for (const ball of partnershipBalls) {
          const batterId = ball.batter.id;
          if (!batsmenMap.has(batterId)) {
            batsmenMap.set(batterId, { name: ball.batter.name, runs: 0, balls: 0 });
            batsmenOrder.push(batterId);
          }
          const batsman = batsmenMap.get(batterId)!;
          batsman.runs += ball.runs.batter;
          if (ball.extra?.type !== 'wide') {
            batsman.balls += 1;
          }
        }

        const batsmen = batsmenOrder.map((id) => batsmenMap.get(id)!);
        const partnershipRuns = partnershipBalls.reduce((sum, ball) => sum + ball.runs.total, 0);
        const partnershipBallsCount = partnershipBalls.filter((ball) => ball.extra?.type !== 'wide').length;

        partnerships.push({ wicketNumber, batsmen, partnershipRuns, partnershipBalls: partnershipBallsCount });
        prevWicketIndex = nextWicketIndex;
      }

      const currentBalls = innings.ballHistory.slice(prevWicketIndex + 1);
      if (innings.striker && innings.nonStriker) {
        const batsmenMap = new Map<string, { name: string; runs: number; balls: number }>();
        const batsmenOrder: string[] = [];

        [innings.striker, innings.nonStriker].forEach((batsman) => {
          if (!batsmenMap.has(batsman.id)) {
            batsmenMap.set(batsman.id, { name: batsman.name, runs: 0, balls: 0 });
            batsmenOrder.push(batsman.id);
          }
        });

        for (const ball of currentBalls) {
          const batterId = ball.batter.id;
          if (!batsmenMap.has(batterId)) {
            batsmenMap.set(batterId, { name: ball.batter.name, runs: 0, balls: 0 });
            batsmenOrder.push(batterId);
          }
          const batsman = batsmenMap.get(batterId)!;
          batsman.runs += ball.runs.batter;
          if (ball.extra?.type !== 'wide') {
            batsman.balls += 1;
          }
        }

        const batsmen = batsmenOrder.map((id) => batsmenMap.get(id)!);
        const partnershipRuns = currentBalls.reduce((sum, ball) => sum + ball.runs.total, 0);
        const partnershipBallsCount = currentBalls.filter((ball) => ball.extra?.type !== 'wide').length;

        partnerships.push({ wicketNumber: 0, batsmen, partnershipRuns, partnershipBalls: partnershipBallsCount });
      }

      return partnerships.map((partnership) => {
        const label = partnership.wicketNumber === 0
          ? 'Current'
          : `${partnership.wicketNumber}${getOrdinal(partnership.wicketNumber)} Wkt`;
        const score = `${partnership.partnershipRuns}(${partnership.partnershipBalls})`;
        const batsmanText = partnership.batsmen
          .map((batsman) => `${batsman.name} - ${batsman.runs}(${batsman.balls})`)
          .join('\n');

        return [label, score, batsmanText];
      });
    };

    const drawSimpleSection = (title: string, lines: string[]) => {
      if (lines.length === 0) return;
      y += sectionSpacing;
      const sectionHeight = 14 + lines.length * 12;
      ensureSpace(sectionHeight + sectionSpacing);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...colors.textAccent);
      doc.text(title, margin, y);
      y += 18;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...colors.text);
      lines.forEach((line) => {
        const wrapped = doc.splitTextToSize(line, contentWidth - sectionPadding);
        doc.text(wrapped, margin + sectionPadding / 2, y);
        y += wrapped.length * 10;
        if (y > pageHeight - margin - sectionSpacing) {
          addNewPage();
          y += sectionSpacing;
        }
      });

      y += sectionSpacing;
    };

    const drawInfoBox = (items: Array<{ label: string; value: string }>) => {
      const labelValueGap = 15;
      const rowHeight = 36;
      const rows = Math.ceil(items.length / 2);
      const boxHeight = rows * rowHeight + 18;
      y += sectionSpacing;
      ensureSpace(boxHeight + sectionSpacing);
      drawPanel(margin, y, contentWidth, boxHeight);

      const colWidth = contentWidth / 2;
      items.forEach((item, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = margin + col * colWidth + 14;
        const cellTop = y + 16 + row * rowHeight;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...colors.text);
        doc.text(item.label, x, cellTop + 2);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...colors.text);
        doc.text(item.value, x, cellTop + 2 + labelValueGap);
        // add a divider line between rows, but not after the last row
        if (row < rows - 1) {
          doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
          doc.line(margin + 8, cellTop + rowHeight - 8, margin + contentWidth - 8, cellTop + rowHeight - 8);
        }
      });

      y += boxHeight + sectionSpacing;
    };

    const computeTableHeight = (rows: string[][], colWidths: number[], width: number) => {
      const headerH = 28;
      const baseLineHeight = 14;
      const rowHeights = rows.map((row) => {
        const lineCounts = row.map((cell, i) => {
          const cellWidth = colWidths[i] * width - 12;
          const wrapped = doc.splitTextToSize(cell, cellWidth);
          return wrapped.length;
        });
        return Math.max(1, Math.max(...lineCounts)) * baseLineHeight + 14;
      });
      return headerH + rowHeights.reduce((sum, h) => sum + h, 0);
    };

    const drawTableAt = (
      x: number,
      width: number,
      title: string,
      columns: string[],
      rows: string[][],
      colWidths: number[]
    ) => {
      const headerH = 28;
      const baseLineHeight = 12;
      const cellLines = rows.map((row) =>
        row.map((cell, i) => {
          const cellWidth = colWidths[i] * width - 12;
          return doc.splitTextToSize(cell, cellWidth);
        })
      );
      const rowHeights = cellLines.map((row) => Math.max(1, ...row.map((lines) => lines.length)) * baseLineHeight + 14);
      const tableH = headerH + rowHeights.reduce((sum, h) => sum + h, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...colors.header);
      doc.text(title, x, y);
      const tableTop = y + 20;
      drawPanel(x, tableTop, width, tableH);
      fillRect(x + 1, tableTop + 1, width - 2, headerH - 2, colors.panelAlt);
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.line(x, tableTop + headerH, x + width, tableTop + headerH);

      let currentX = x;
      for (let i = 0; i < colWidths.length - 1; i++) {
        currentX += colWidths[i] * width;
        doc.line(currentX, tableTop, currentX, tableTop + tableH);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...colors.text);
      currentX = x;
      columns.forEach((col, i) => {
        const cellW = colWidths[i] * width;
        const labelY = tableTop + 18;
        doc.text(col, currentX + 6, labelY);
        currentX += cellW;
      });

      if (rows.length === 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...colors.text);
        doc.text('No data available', x + 8, tableTop + headerH + 14);
      } else {
        let currentTop = tableTop + headerH;
        rows.forEach((row, idx) => {
          const rowHeight = rowHeights[idx];
          if (idx > 0) {
            doc.line(x, currentTop, x + width, currentTop);
          }
          let rowX = x;
          row.forEach((cell, i) => {
            const cellW = colWidths[i] * width;
            const lines = cellLines[idx][i] as string[];
            const textBlockHeight = lines.length * baseLineHeight;
            const cellStartY = currentTop + (rowHeight - textBlockHeight) / 2 + baseLineHeight - 2;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...colors.text);
            lines.forEach((line: string, lineIndex: number) => {
              const textY = cellStartY + lineIndex * baseLineHeight;
              doc.text(line, rowX + 6, textY);
            });
            rowX += cellW;
          });
          currentTop += rowHeight;
        });
      }

      return 20 + tableH;
    };

    const drawTable = (
      title: string,
      columns: string[],
      rows: string[][],
      colWidths: number[]
    ) => {
      y += sectionSpacing;
      ensureSpace(computeTableHeight(rows, colWidths, contentWidth) + sectionSpacing + 24);
      const tableHeight = drawTableAt(margin, contentWidth, title, columns, rows, colWidths);
      y += tableHeight;
    };

    const drawTwoColumnSection = (
      left: { title: string; columns: string[]; rows: string[][]; colWidths: number[] },
      right: { title: string; items: Array<{ label: string; value: string }> }
    ) => {
      const gap = 14;
      const columnWidth = (contentWidth - gap) / 2;
      const leftHeight = 20 + computeTableHeight(left.rows, left.colWidths, columnWidth);
      const rowHeight = 36;
      const rightHeight = 12 + Math.ceil(right.items.length / 2) * rowHeight + 18;
      const sectionHeight = Math.max(leftHeight, rightHeight);
      y += sectionSpacing;
      ensureSpace(sectionHeight + sectionSpacing);

      const leftY = y;
      drawTableAt(margin, columnWidth, left.title, left.columns, left.rows, left.colWidths);

      const rightX = margin + columnWidth + gap;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...colors.header);
      doc.text(right.title, rightX, leftY);
      const panelTop = leftY + 18;
      const boxHeight = sectionHeight - 12;
      drawPanel(rightX, panelTop, columnWidth, boxHeight);
      const colW = columnWidth / 2;
      right.items.forEach((item, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = rightX + col * colW + 10;
        const top = panelTop + 16 + row * rowHeight;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...colors.text);
        doc.text(item.label, x, top);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...colors.text);
        doc.text(item.value, x, top + 12);
      });

      y += sectionHeight;
    };

    const drawTwoColumnTables = (
      left: { title: string; columns: string[]; rows: string[][]; colWidths: number[] },
      right: { title: string; columns: string[]; rows: string[][]; colWidths: number[] }
    ) => {
      const gap = 14;
      const columnWidth = (contentWidth - gap) / 2;
      const leftHeight = 20 + computeTableHeight(left.rows, left.colWidths, columnWidth);
      const rightHeight = 20 + computeTableHeight(right.rows, right.colWidths, columnWidth);
      const sectionHeight = Math.max(leftHeight, rightHeight);
      y += sectionSpacing;
      ensureSpace(sectionHeight + sectionSpacing);

      const leftY = y;
      drawTableAt(margin, columnWidth, left.title, left.columns, left.rows, left.colWidths);
      drawTableAt(margin + columnWidth + gap, columnWidth, right.title, right.columns, right.rows, right.colWidths);

      y += sectionHeight;
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
      y += sectionSpacing;
      const boxHeight = 58;
      ensureSpace(boxHeight + sectionSpacing + 24);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...colors.header);
      doc.text('Extras', margin, y);
      y += 16;
      drawPanel(margin, y, contentWidth, boxHeight);

      const colW = contentWidth / items.length;
      items.forEach((item, idx) => {
        const x = margin + idx * colW;
        if (idx > 0) {
          doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
          doc.line(x, y, x, y + boxHeight);
        }
        const centerX = x + colW / 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...colors.text);
        const labelWidth = doc.getTextWidth(item.label);
        doc.text(item.label, centerX - labelWidth / 2, y + 20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...colors.text);
        const valueWidth = doc.getTextWidth(item.value);
        doc.text(item.value, centerX - valueWidth / 2, y + 41);
      });

      y += boxHeight + sectionSpacing;
    };

    const renderInningsSection = (label: string, innings: InningsState | null) => {
      y += 6;
      drawSectionHeader(label);

      if (!innings) {
        drawInfoBox([{ label: 'Status', value: 'Innings not started' }]);
        return;
      }

      const battingName = getTeamNameStr(innings.battingTeam);
      const bowlingName = getTeamNameStr(innings.battingTeam === 'Us' ? 'Them' : 'Us');
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
        String(batsman.zeros || 0),
        String(batsman.fours),
        String(batsman.sixes),
        batsman.balls > 0 ? ((batsman.runs / batsman.balls) * 100).toFixed(1) : '0.0',
      ]);

      drawTable('Batting', ['Name', 'R', 'B', '0s', '4s', '6s', 'SR'], batters, [0.46, 0.08, 0.08, 0.08, 0.07, 0.07, 0.16]);

      const bowlers = getBowlerStats(innings).map((bowler) => [
        bowler.name,
        `${bowler.overs}.${bowler.balls % 6}`,
        String(bowler.maidens || 0),
        String(bowler.runs),
        String(bowler.wickets),
        bowler.zeros >= 0 ? String(bowler.zeros) : '-',
        bowler.economy.toFixed(2),
      ]);

      y += 8;
      drawTable('Bowling', ['Name', 'O', 'M', 'R', 'W', '0s', 'ECO'], bowlers, [0.42, 0.10, 0.08, 0.11, 0.11, 0.08, 0.10]);

      y += 8;
      drawExtrasBox(innings);

      y += 8;
      drawTable(
        'Overs History',
        ['Over', 'Runs', 'Wickets', 'Details'],
        getOverHistoryRows(innings),
        [0.15, 0.15, 0.12, 0.58]
      );

      y += sectionSpacing;
      drawTable(
        'Fall of Wickets',
        ['Wicket', 'Over', 'Runs', 'Batsman'],
        getFallOfWicketsRows(innings),
        [0.10, 0.16, 0.12, 0.62]
      );

      y += sectionSpacing;
      drawTable(
        'Partnerships',
        ['Partnership', 'Score', 'Batsman'],
        getPartnershipRows(innings),
        [0.16, 0.14, 0.70]
      );
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

    // add margin top before each label/value pair to ensure spacing between rows, and add extra space after the info box
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

    doc.setTextColor(...colors.text);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(teamName, leftX + 10, cardTop + 16);
    doc.text(liveMatch.opponent, rightX + 10, cardTop + 16);

    doc.setTextColor(...colors.text);
    doc.setFontSize(16);
    doc.text(`${usInnings?.totalRuns || 0}/${usInnings?.totalWickets || 0}`, leftX + 10, cardTop + 38);
    doc.text(`${themInnings?.totalRuns || 0}/${themInnings?.totalWickets || 0}`, rightX + 10, cardTop + 38);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...colors.text);
    doc.text(`${getOvers(usInnings?.totalBalls || 0)} overs`, leftX + 10, cardTop + 54);
    doc.text(`${getOvers(themInnings?.totalBalls || 0)} overs`, rightX + 10, cardTop + 54);
    doc.text(`Extras: ${getExtras(usInnings)}`, leftX + 10, cardTop + 68);
    doc.text(`Extras: ${getExtras(themInnings)}`, rightX + 10, cardTop + 68);

    y += cardHeight + 14;

    renderInningsSection('First Innings', firstInnings);

     if (secondInnings) {
       addNewPage();
       renderInningsSection('Second Innings', secondInnings);
     }

     return { doc, filename, shareText: title };
  };

  const handleExportMatchInfoPdf = async () => {
    const { doc, filename } = await generateMatchPdf();
    doc.save(filename);
  };

  const handleSharePdfToWhatsApp = async () => {
    try {
      const { doc, filename, shareText } = await generateMatchPdf();
      const pdfBlob = doc.output('blob');
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: shareText,
          text: `Scorecard for ${shareText}`,
        });
      } else {
        // Fallback: Download the file and tell user
        doc.save(filename);
        alert('PDF generated and downloaded. You can now share it manually to WhatsApp.');
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
      alert('Failed to share PDF. It has been downloaded instead.');
      const { doc, filename } = await generateMatchPdf();
      doc.save(filename);
    }
  };

  // handleShare removed as we are standardizing on WhatsApp PDF share

  return (
    <div className="h-full overflow-y-auto bg-slate-950 px-4 py-5 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <section className="rounded-2xl border border-green-400/35 bg-gradient-to-br from-green-900/45 via-slate-900 to-slate-950 p-5 shadow-xl shadow-black/40">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-200/80">Match Complete</p>
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
          <button
            onClick={handleSharePdfToWhatsApp}
            className="w-full rounded-lg border border-purple-500/60 bg-purple-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-600 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Share to WhatsApp
          </button>
          <button
            onClick={() => {
              dispatch(openDialog({ dialog: 'uploadConfirm' }));
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
