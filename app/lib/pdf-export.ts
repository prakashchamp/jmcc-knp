import jsPDF from 'jspdf';
import type { CurrentBatsman, InningsState } from './cricket-scorer-types';
import type { BowlerStatsSummary } from './bowling-stats-utils';
import { getBowlerStats } from './bowling-stats-utils';

interface PDFExportData {
  matchDate: string;
  opponent: string;
  venue: string;
  teamName: string;
  innings1?: {
    battingTeam: string;
    totalRuns: number;
    totalWickets: number;
    totalBalls: number;
    batsmen: CurrentBatsman[];
    bowlers: BowlerStatsSummary[];
    partnerships: Array<{ batsmen: string[]; runs: number }>;
    fallOfWickets: Array<{ wicket: number; playerName: string; runs: number; balls: number }>;
    oversHistory: string[];
  };
  innings2?: {
    battingTeam: string;
    totalRuns: number;
    totalWickets: number;
    totalBalls: number;
    batsmen: CurrentBatsman[];
    bowlers: BowlerStatsSummary[];
    partnerships: Array<{ batsmen: string[]; runs: number }>;
    fallOfWickets: Array<{ wicket: number; playerName: string; runs: number; balls: number }>;
    oversHistory: string[];
  };
  result?: string;
  margin: number;
}

export function generateMatchPDF(data: PDFExportData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = data.margin || 10;
  let yPosition = margin;

  // Title
  doc.setFontSize(18);
  doc.setFont('', 'bold');
  doc.text('MATCH REPORT', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Match Header
  doc.setFontSize(11);
  doc.setFont('', 'normal');
  doc.text(`Date: ${data.matchDate}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Opponent: ${data.opponent}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Venue: ${data.venue}`, margin, yPosition);
  yPosition += 8;

  // Add Innings 1
  if (data.innings1) {
    addInningsSection(doc, data.innings1, data.teamName, pageWidth, margin, data.innings1.battingTeam === data.teamName, () => {});
  }

  // Add Innings 2
  if (data.innings2) {
    doc.addPage();
    addInningsSection(doc, data.innings2, data.teamName, pageWidth, margin, data.innings2.battingTeam === data.teamName, () => {});
  }

  // Add Result if available
  if (data.result) {
    doc.setFontSize(12);
    doc.setFont('', 'bold');
    doc.text(`Result: ${data.result}`, margin, pageHeight - margin - 10);
  }

  // Save PDF
  doc.save(`match-report-${data.opponent}-${data.matchDate}.pdf`);
}

function addInningsSection(
  doc: jsPDF,
  innings: PDFExportData['innings1'],
  teamName: string,
  pageWidth: number,
  margin: number,
  isOurInnings: boolean,
  checkSpace: () => void
) {
  let yPosition = 20;
  const pageHeight = doc.internal.pageSize.getHeight();

  if (!innings) return;

  yPosition += 10;
  const inningsTitle = `${innings.battingTeam} Innings - ${innings.totalRuns}/${innings.totalWickets}`;

  doc.setFontSize(13);
  doc.setFont('', 'bold');
  doc.text(inningsTitle, margin, yPosition);
  yPosition += 8;

  // Batting Stats Section Header
  doc.setFontSize(10);
  doc.setFont('', 'bold');
  doc.text('Batting Stats', margin, yPosition);
  yPosition += 4;

  doc.setFontSize(8);
  doc.setFont('', 'bold');
  doc.text('Batsman', margin, yPosition);
  doc.text('R', margin + 50, yPosition);
  doc.text('B', margin + 60, yPosition);
  doc.text('4s', margin + 70, yPosition);
  doc.text('6s', margin + 80, yPosition);
  doc.text('Dismissal', margin + 90, yPosition);
  yPosition += 3;

  // Batting rows
  doc.setFont('', 'normal');
  innings.batsmen.forEach((batsman) => {
    if (yPosition > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }

    doc.text(batsman.name.substring(0, 20), margin, yPosition);
    doc.text(batsman.runs.toString(), margin + 50, yPosition);
    doc.text(batsman.balls.toString(), margin + 60, yPosition);
    doc.text(batsman.fours.toString(), margin + 70, yPosition);
    doc.text(batsman.sixes.toString(), margin + 80, yPosition);
    const dismissal = batsman.status === 'batting' ? 'not out' : batsman.dismissal?.mode || 'out';
    doc.text(dismissal.substring(0, 20), margin + 90, yPosition);
    yPosition += 3;
  });

  // Innings Summary
  const totalFours = innings.batsmen.reduce((sum, b) => sum + (b.fours || 0), 0);
  const totalSixes = innings.batsmen.reduce((sum, b) => sum + (b.sixes || 0), 0);

  yPosition += 3;
  doc.setFontSize(9);
  doc.setFont('', 'bold');
  doc.text(`Total Fours: ${totalFours} | Total Sixes: ${totalSixes}`, margin, yPosition);
  yPosition += 8;

  // Bowling Stats Section
  if (innings.bowlers && innings.bowlers.length > 0) {
    if (yPosition > pageHeight - margin - 20) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(10);
    doc.setFont('', 'bold');
    doc.text('Bowling Analysis', margin, yPosition);
    yPosition += 4;

    doc.setFontSize(8);
    doc.setFont('', 'bold');
    doc.text('Bowler', margin, yPosition);
    doc.text('O', margin + 45, yPosition);
    doc.text('R', margin + 55, yPosition);
    doc.text('W', margin + 65, yPosition);
    doc.text('M', margin + 75, yPosition);
    doc.text('0s', margin + 85, yPosition);
    doc.text('ECO', margin + 95, yPosition);
    yPosition += 3;

    doc.setFont('', 'normal');
    innings.bowlers.forEach((bowler) => {
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
        doc.setFontSize(8);
        doc.setFont('', 'bold');
        doc.text('Bowler', margin, yPosition);
        doc.text('O', margin + 45, yPosition);
        doc.text('R', margin + 55, yPosition);
        doc.text('W', margin + 65, yPosition);
        doc.text('M', margin + 75, yPosition);
        doc.text('0s', margin + 85, yPosition);
        doc.text('ECO', margin + 95, yPosition);
        yPosition += 3;
        doc.setFont('', 'normal');
      }

      doc.text(bowler.name.substring(0, 18), margin, yPosition);
      doc.text(`${bowler.overs}.${bowler.balls % 6}`, margin + 45, yPosition);
      doc.text(bowler.runs.toString(), margin + 55, yPosition);
      doc.text(bowler.wickets.toString(), margin + 65, yPosition);
      doc.text(bowler.maidens.toString(), margin + 75, yPosition);
      doc.text(bowler.zeros >= 0 ? bowler.zeros.toString() : '-', margin + 85, yPosition);
      doc.text(bowler.economy.toFixed(2), margin + 95, yPosition);
      yPosition += 3;
    });
  }

  // Overs History
  if (innings.oversHistory && innings.oversHistory.length > 0) {
    yPosition += 5;
    if (yPosition > pageHeight - margin - 15) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(10);
    doc.setFont('', 'bold');
    doc.text('Overs History:', margin, yPosition);
    yPosition += 4;

    doc.setFontSize(8);
    doc.setFont('', 'normal');
    let oversText = '';
    for (let i = 0; i < innings.oversHistory.length; i++) {
      oversText += `Over ${i + 1}: ${innings.oversHistory[i]} | `;
      if ((i + 1) % 2 === 0 || i === innings.oversHistory.length - 1) {
        doc.text(oversText, margin, yPosition);
        oversText = '';
        yPosition += 3;
        if (yPosition > pageHeight - margin - 5) {
          doc.addPage();
          yPosition = margin;
        }
      }
    }
  }

  // Fall of Wickets
  if (innings.fallOfWickets && innings.fallOfWickets.length > 0) {
    yPosition += 5;
    if (yPosition > pageHeight - margin - 20) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(10);
    doc.setFont('', 'bold');
    doc.text('Fall of Wickets:', margin, yPosition);
    yPosition += 4;

    doc.setFontSize(8);
    doc.setFont('', 'bold');
    doc.text('W', margin, yPosition);
    doc.text('Player', margin + 15, yPosition);
    doc.text('Score', margin + 50, yPosition);
    doc.text('Balls', margin + 80, yPosition);
    yPosition += 3;

    doc.setFont('', 'normal');
    innings.fallOfWickets.forEach((fow) => {
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      doc.text(fow.wicket.toString(), margin, yPosition);
      doc.text(fow.playerName.substring(0, 25), margin + 15, yPosition);
      doc.text(`${fow.runs}/${fow.runs}`, margin + 50, yPosition);
      doc.text(`${fow.balls}b`, margin + 80, yPosition);
      yPosition += 3;
    });
  }

  // Partnerships
  if (innings.partnerships && innings.partnerships.length > 0) {
    yPosition += 5;
    if (yPosition > pageHeight - margin - 20) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(10);
    doc.setFont('', 'bold');
    doc.text('Partnerships:', margin, yPosition);
    yPosition += 4;

    doc.setFontSize(8);
    doc.setFont('', 'normal');
    innings.partnerships.forEach((p, idx) => {
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      doc.text(`${idx + 1}. ${p.batsmen.join(' & ')} - ${p.runs} runs`, margin, yPosition);
      yPosition += 3;
    });
  }
}
