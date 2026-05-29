import fs from 'fs';
import path from 'path';

const bidsDir = path.join(process.cwd(), 'src/pages/GameBid/bids');
const skip = new Set(['BidReviewModal.jsx', 'QuickPointsRow.jsx', 'JodiBid.jsx']);

const motorResetFn = `  const resetAfterSuccessfulBet = () => {
    clearLocal();
    setReviewRows([]);
    const todayStr = new Date().toISOString().split('T')[0];
    setSelectedDate(todayStr);
    try {
      localStorage.setItem('betSelectedDate', todayStr);
    } catch (e) {}
  };
`;

const motorFiles = ['SpMotorBid.jsx', 'DpMotorBid.jsx', 'SpDpMotorBid.jsx'];

for (const f of fs.readdirSync(bidsDir)) {
  if (!f.endsWith('.jsx') || skip.has(f)) continue;
  let s = fs.readFileSync(path.join(bidsDir, f), 'utf8');
  const orig = s;

  s = s.replace(/(const clearAll = \(\) => \{\n)\s*setIsReviewOpen\(false\);\n/gm, '$1');

  s = s.replace(
    /(\s*if \(result\.data\?\.newBalance != null\)\s*\n\s*updateUserBalance\(result\.data\.newBalance\);\s*\n)(\s*clearLocal\(\);\s*\n\s*setReviewRows\(\[\]\);\s*\n[\s\S]*?catch \(e\) \{\}\s*\n)/g,
    '$1',
  );

  s = s.replace(
    /(if \(result\.data\?\.newBalance != null\) updateUserBalance\(result\.data\.newBalance\);\s*\n)\s*\n\s*setReviewRows\(\[\]\);\s*\n\s*clearLocal\(\);\s*\n[\s\S]*?catch \(e\) \{\}\s*\n/g,
    '$1',
  );

  s = s.replace(
    /(if \(result\.data\?\.newBalance != null\) updateUserBalance\(result\.data\.newBalance\);\s*\n)\s*\n\s*setReviewRows\(\[\]\);\s*\n\s*setGeneratedRows\(\[\]\);\s*\n[\s\S]*?catch \(e\) \{\}\s*\n/g,
    '$1',
  );

  if (motorFiles.includes(f) && !s.includes('resetAfterSuccessfulBet')) {
    s = s.replace(
      /(\n  const dateText = reviewDateText;)/,
      `\n${motorResetFn}$1`,
    );
    s = s.replace(
      /onClose=\{\(\) => setIsReviewOpen\(false\)\}/,
      `onClose={() => setIsReviewOpen(false)}\n        onAfterSuccessClose={() => {\n          setIsReviewOpen(false);\n          resetAfterSuccessfulBet();\n        }}`,
    );
  }

  if (s !== orig) {
    fs.writeFileSync(path.join(bidsDir, f), s);
    console.log('pass2', f);
  }
}
