/* Reproducible regression belt. Skipped historical features are reported as
   SKIP, never as passing tests. Detailed logs stay in ignored work/. */
const fs = require('fs'), path = require('path'), { execFile } = require('child_process');
const root = path.resolve(__dirname, '../../..');
const logDir = path.resolve(root, process.env.SMOKE_LOG_DIR || 'work/audit169/regression');
fs.mkdirSync(logDir, { recursive: true });
const files = fs.readdirSync(__dirname).filter(f => /^v\d+[a-z]?-(check|php-run|direct|pdp|cart)\.js$/.test(f));
files.push('pay-audit-check.js', 'php-parse-check.js');
files.sort((a,b) => a.localeCompare(b, undefined, { numeric:true }));
let cursor = 0; const results = [];
async function worker() {
  while (cursor < files.length) {
    const file = files[cursor++];
    const row = await new Promise(resolve => execFile(process.execPath, [path.join(__dirname, file)],
      { cwd:root, timeout:180000, maxBuffer:4*1024*1024, env:process.env }, (err, stdout, stderr) => {
        fs.writeFileSync(path.join(logDir, file+'.log'), stdout + stderr);
        resolve({ file, status:err ? 'FAIL' : /^SKIP/m.test(stdout) ? 'SKIP' : 'PASS', code:err ? err.code : 0,
          summary:stdout.trim().split('\n').slice(-1)[0] });
      }));
    results.push(row); console.log(`${row.status} ${file}: ${row.summary}`);
  }
}
(async () => {
  /* PHP-WASM suites share fixed in-runtime fixture paths/process ids. Running
     two interpreters concurrently made otherwise-green rate fixtures
     intermittently return an empty block. Determinism matters more than a
     shorter belt: execute one suite at a time. */
  await worker();
  results.sort((a,b) => a.file.localeCompare(b.file, undefined, { numeric:true }));
  fs.writeFileSync(path.join(logDir, 'results.json'), JSON.stringify(results, null, 2)+'\n');
  const counts = type => results.filter(r => r.status === type).length;
  console.log(`\n${counts('PASS')} suites passed, ${counts('SKIP')} retired-feature suites skipped, ${counts('FAIL')} failed. Logs: ${logDir}`);
  process.exitCode = counts('FAIL') ? 1 : 0;
})();
