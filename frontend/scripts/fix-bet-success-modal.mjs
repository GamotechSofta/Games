import fs from 'fs';
import path from 'path';

const bidsDir = path.join(process.cwd(), 'src/pages/GameBid/bids');
const skip = new Set(['BidReviewModal.jsx', 'QuickPointsRow.jsx', 'JodiBid.jsx']);

function stripPostBetCleanup(s) {
  let out = s;

  // clearAll / clearLocal should not close the review modal (close via onClose / onAfterSuccessClose).
  out = out.replace(/(const clearAll = \(\) => \{\n)\s*setIsReviewOpen\(false\);\n/g, '$1');
  out = out.replace(/(const clearLocal = \(\) => \{\n)\s*setIsReviewOpen\(false\);\n/g, '$1');

  // After wallet update in submit handlers: remove early close + form reset.
  out = out.replace(
    /(if \(result\.data\?\.newBalance != null\)\s*\n?\s*updateUserBalance\(result\.data\.newBalance\);\s*\n)(\s*setIsReviewOpen\(false\);\s*\n)?(\s*clearAll\(\);\s*\n)?/g,
    '$1',
  );
  out = out.replace(
    /(if \(result\.data\?\.newBalance != null\) updateUserBalance\(result\.data\.newBalance\);\s*\n)(\s*setIsReviewOpen\(false\);\s*\n)?(\s*clearAll\(\);\s*\n)?/g,
    '$1',
  );
  out = out.replace(
    /(if \(result\.data\?\.newBalance != null\) updateUserBalance\(result\.data\.newBalance\);\s*\n)\s*clearAll\(\);\s*\n/g,
    '$1',
  );

  // Motor / chart / common: multi-line cleanup after successful bet.
  out = out.replace(
    /(updateUserBalance\(result\.data\.newBalance\);\s*\n)\s*setIsReviewOpen\(false\);\s*\n[\s\S]*?catch \(e\) \{\}\s*\n/g,
    '$1',
  );

  out = out.replace(
    /onClose=\{clearAll\}/g,
    'onClose={() => { setIsReviewOpen(false); clearAll(); }}',
  );

  return out;
}

for (const f of fs.readdirSync(bidsDir)) {
  if (!f.endsWith('.jsx') || skip.has(f)) continue;
  const fp = path.join(bidsDir, f);
  const orig = fs.readFileSync(fp, 'utf8');
  const next = stripPostBetCleanup(orig);
  if (next !== orig) {
    fs.writeFileSync(fp, next);
    console.log('fixed', f);
  }
}
