const fs = require('fs');

const battingFiles = [
  'app/components/AllTimeBattingStatsTable.tsx',
  'app/components/BattingStatsTable.tsx',
  'app/components/MonthlyBattingStatsTable.tsx',
  'app/components/YearlyBattingStatsTable.tsx'
];

const bowlingFiles = [
  'app/components/AllTimeBowlingStatsTable.tsx',
  'app/components/BowlingStatsTable.tsx',
  'app/components/MonthlyBowlingStatsTable.tsx',
  'app/components/YearlyBowlingStatsTable.tsx'
];

const battingOrder = [
  'playerName', 'totalMatches', 'totalInnings', 'totalRuns', 'totalBalls', 
  'strikeRate', 'average', 'totalFours', 'totalSixes', 'bestScore', 'thirties', 'fifties', 'ducks'
];

const bowlingOrder = [
  'playerName', 'totalMatches', 'totalInnings', 'totalOvers', 'totalWickets', 'totalRuns',
  'economy', 'average', 'strikeRate', 'bestHaul', 'threeWickets', 'fiveWickets'
];

function processFile(file, order) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // Extract all <th> blocks
  // A th block starts with <th and ends with </th>
  let thRegex = /<th[^>]*>[\s\S]*?<\/th>/g;
  
  // Extract all <td> blocks
  let tdRegex = /<td[^>]*>[\s\S]*?<\/td>/g;

  // We need to operate within the <thead><tr> ... </tr></thead> and <tbody> ... <tr> ... </tr> ... </tbody>
  // to avoid replacing wrong tags
  
  let theadMatch = content.match(/<thead[^>]*>[\s\S]*?<\/thead>/);
  if (!theadMatch) return;
  let thead = theadMatch[0];
  
  let thBlocks = [...thead.matchAll(thRegex)].map(m => m[0]);
  
  let newThBlocks = [];
  for (let key of order) {
    let block = thBlocks.find(b => b.includes(`'${key}'`));
    if (block) newThBlocks.push(block);
  }
  
  let newThead = thead;
  // Replace the entire sequence of thBlocks with the new sequence
  // We'll just replace the inner contents of the first <tr> in thead
  let trRegex = /<tr>([\s\S]*?)<\/tr>/;
  let trMatch = thead.match(trRegex);
  if (trMatch) {
    let indentedNewThs = newThBlocks.join('\n              ');
    newThead = thead.replace(trMatch[1], `\n              ${indentedNewThs}\n            `);
  }
  content = content.replace(thead, newThead);

  // Now for <td>
  // The tbody contains map over sortedPlayers
  let tbodyMatch = content.match(/<tbody[^>]*>[\s\S]*?<\/tbody>/);
  if (!tbodyMatch) return;
  let tbody = tbodyMatch[0];
  
  // Inside the tbody, there's a <tr> that contains all <td>
  let tbodyTrRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  
  // Actually, let's just find the first <tr> block inside the map
  // It's tricky because there might be multiple tr matches, but we want the one with the player stats
  let trs = [...tbody.matchAll(tbodyTrRegex)];
  let targetTr = trs.find(tr => tr[0].includes('<td'));
  if (targetTr) {
    let tdBlocks = [...targetTr[1].matchAll(tdRegex)].map(m => m[0]);
    
    // We need to match tdBlocks to the order keys
    // How? We can use heuristics based on the content of the td block
    let tdMap = {};
    for (let td of tdBlocks) {
      if (td.includes('playerName') || td.includes('stats.playerName')) tdMap['playerName'] = td;
      else if (td.includes('totalMatches') || td.includes('matches')) tdMap['totalMatches'] = td;
      else if (td.includes('totalInnings') || td.includes('innings')) tdMap['totalInnings'] = td;
      else if (td.includes('totalRuns') && !td.includes('totalBalls') && !td.includes('totalOvers') && !td.includes('totalWickets')) tdMap['totalRuns'] = td; // Runs
      else if (td.includes('totalBalls')) tdMap['totalBalls'] = td;
      else if (td.includes('totalOvers')) tdMap['totalOvers'] = td;
      else if (td.includes('totalWickets')) tdMap['totalWickets'] = td;
      else if (td.includes('economy') || td.includes('{economy}')) tdMap['economy'] = td;
      else if (td.includes('strikeRate') || td.includes('{strikeRate}')) tdMap['strikeRate'] = td;
      else if (td.includes('average') || td.includes('{average}')) tdMap['average'] = td;
      else if (td.includes('bestHaul')) tdMap['bestHaul'] = td;
      else if (td.includes('threeWickets')) tdMap['threeWickets'] = td;
      else if (td.includes('fiveWickets')) tdMap['fiveWickets'] = td;
      else if (td.includes('totalFours')) tdMap['totalFours'] = td;
      else if (td.includes('totalSixes')) tdMap['totalSixes'] = td;
      else if (td.includes('bestScore')) tdMap['bestScore'] = td;
      else if (td.includes('thirties')) tdMap['thirties'] = td;
      else if (td.includes('fifties')) tdMap['fifties'] = td;
      else if (td.includes('ducks')) tdMap['ducks'] = td;
      else if (td.includes('notOuts')) tdMap['notOuts'] = td;
    }
    
    // Some TD blocks might not map perfectly. 
    // Wait, in Batting, `totalRuns` is `stats.totalRuns`. `average` is `{average}`.
    // Let's refine `totalRuns` detection: 
    if (!tdMap['totalRuns']) {
       let runsTd = tdBlocks.find(td => td.includes('.totalRuns') || td.includes('.runs'));
       if (runsTd) tdMap['totalRuns'] = runsTd;
    }

    let newTdBlocks = [];
    for (let key of order) {
      if (tdMap[key]) {
        newTdBlocks.push(tdMap[key]);
      } else {
        console.log(`Could not find mapping for ${key} in ${file}`);
      }
    }
    
    let indentedNewTds = newTdBlocks.join('\n                  ');
    let newTrContent = `\n                  ${indentedNewTds}\n                `;
    let newTbody = tbody.replace(targetTr[1], newTrContent);
    content = content.replace(tbody, newTbody);
  }

  fs.writeFileSync(file, content);
  console.log(`Processed ${file}`);
}

battingFiles.forEach(f => processFile(f, battingOrder));
bowlingFiles.forEach(f => processFile(f, bowlingOrder));
