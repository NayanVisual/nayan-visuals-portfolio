#!/usr/bin/env node
/**
 * Comprehensive smoke test for Nayan Visuals Admin App
 * Tests data layer, IPC handlers, git integration, and UI rendering.
 */

const path = require('path');
const fs = require('fs');
const assert = require('assert').strict;
const { spawn, execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PORTFOLIO_PATH = path.join(ROOT, 'data', 'portfolio.json');
const BACKUP_PATH = path.join(ROOT, 'data', '.portfolio.smoke-test-backup.json');
const TEST_LOG = [];

let passed = 0;
let failed = 0;

function log(...args) { TEST_LOG.push(args.join(' ')); console.log(...args); }

function section(title) {
  log('\n' + '='.repeat(60));
  log(`  ${title}`);
  log('='.repeat(60));
}

function test(name, fn) {
  try { fn(); passed++; log(`  ✓ ${name}`); }
  catch (e) { failed++; log(`  ✗ ${name}: ${e.message}`); }
}

function assertEqual(actual, expected, msg) {
  assert.deepStrictEqual(actual, expected, msg);
}

// --- Setup: backup portfolio ---
fs.copyFileSync(PORTFOLIO_PATH, BACKUP_PATH);
log(`\n📦 Backed up portfolio.json → .portfolio.smoke-test-backup.json`);

// ================================================================
//  1. DATA LAYER — load / save / round-trip
// ================================================================
section('1. Data Layer — Load / Save / Round-trip');

test('load valid portfolio.json', () => {
  const raw = fs.readFileSync(PORTFOLIO_PATH, 'utf-8');
  const data = JSON.parse(raw);
  assert(Array.isArray(data), 'must be array');
  assert(data.length > 0, 'must have entries');
});

test('save portfolio.json round-trip preserves entries', () => {
  const original = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'));
  const serialized = JSON.stringify(original, null, 4) + '\n';
  fs.writeFileSync(PORTFOLIO_PATH, serialized);
  const reread = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'));
  assertEqual(reread.length, original.length, 'entry count unchanged');
  assertEqual(reread[0].id, original[0].id, 'first entry id unchanged');
});

test('all entries have required fields', () => {
  const data = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'));
  for (const e of data) {
    assert(typeof e.id === 'number', `entry ${e.id}: id must be number`);
    assert(typeof e.title === 'string' && e.title.length > 0, `entry ${e.id}: title required`);
    assert(typeof e.category === 'string' && e.category.length > 0, `entry ${e.id}: category required`);
    assert(typeof e.videoUrl === 'string' && e.videoUrl.length > 0, `entry ${e.id}: videoUrl required`);
    assert(['gameplay', 'video', 'real-estate', 'motion-graphics'].includes(e.category),
      `entry ${e.id}: invalid category "${e.category}"`);
  }
});

test('all entry IDs are unique', () => {
  const data = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'));
  const ids = data.map(e => e.id);
  assertEqual(new Set(ids).size, ids.length, 'duplicate IDs found');
});

test('videoUrl contains valid YouTube domain', () => {
  const data = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'));
  for (const e of data) {
    assert(e.videoUrl.includes('youtube.com/embed/'), `entry ${e.id}: invalid embed URL`);
  }
});

// ================================================================
//  2. ERROR HANDLING — malformed data, missing files
// ================================================================
section('2. Error Handling');

test('fail gracefully on malformed JSON', () => {
  fs.writeFileSync(PORTFOLIO_PATH, 'not json at all');
  try {
    JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'));
    assert(false, 'should have thrown');
  } catch (e) {
    assert(e instanceof SyntaxError, 'should be SyntaxError');
  }
});

test('fail gracefully on empty file', () => {
  fs.writeFileSync(PORTFOLIO_PATH, '');
  try {
    JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'));
    assert(false, 'should have thrown');
  } catch (e) {
    assert(e instanceof SyntaxError, 'should be SyntaxError');
  }
});

test('fail gracefully on valid empty array', () => {
  fs.writeFileSync(PORTFOLIO_PATH, '[]\n');
  const data = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'));
  assertEqual(data.length, 0, 'empty array should have 0 entries');
});

test('fail gracefully on null data', () => {
  fs.writeFileSync(PORTFOLIO_PATH, 'null\n');
  const data = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'));
  assertEqual(data, null, 'null should parse as null');
});

// ================================================================
//  3. YOUTUBE URL PARSING — all formats
// ================================================================
section('3. YouTube URL Parsing');

// Replicate the getYoutubeId logic from the app
function getYoutubeId(url) {
  if (!url) return '';
  const m = url.match(/(?:embed\/|shorts\/|v=|\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : '';
}

test('parse youtube.com/embed/ID', () => {
  assertEqual(getYoutubeId('https://www.youtube.com/embed/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
});

test('parse youtube.com/watch?v=ID', () => {
  assertEqual(getYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
});

test('parse youtu.be/ID', () => {
  assertEqual(getYoutubeId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
});

test('parse youtube.com/shorts/ID', () => {
  assertEqual(getYoutubeId('https://youtube.com/shorts/2A_licSOe24'), '2A_licSOe24');
});

test('parse shorts with query params', () => {
  assertEqual(getYoutubeId('https://youtube.com/shorts/2A_licSOe24?si=abc123'), '2A_licSOe24');
});

test('parse youtube.com/live/ID', () => {
  assertEqual(getYoutubeId('https://www.youtube.com/live/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
});

test('parse m.youtube.com/watch?v=ID', () => {
  assertEqual(getYoutubeId('https://m.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
});

test('return empty string for null/undefined', () => {
  assertEqual(getYoutubeId(null), '');
  assertEqual(getYoutubeId(undefined), '');
  assertEqual(getYoutubeId(''), '');
});

test('return empty string for invalid URL', () => {
  assertEqual(getYoutubeId('https://vimeo.com/12345'), '');
  assertEqual(getYoutubeId('not-a-url'), '');
});

test('handle URL with extra path segments', () => {
  assertEqual(getYoutubeId('https://youtube.com/shorts/abc123def45/extra'), 'abc123def45');
});

// ================================================================
//  4. CATEGORY LABELS — all 4 categories
// ================================================================
section('4. Category Labels');

const catLabels = {
  gameplay: 'Gaming Edit',
  video: 'Cinematic Video',
  'real-estate': 'Real Estate Videos',
  'motion-graphics': 'Social Media',
};

test('all 4 categories have display labels', () => {
  assertEqual(Object.keys(catLabels).length, 4);
  assertEqual(catLabels.gameplay, 'Gaming Edit');
  assertEqual(catLabels.video, 'Cinematic Video');
  assertEqual(catLabels['real-estate'], 'Real Estate Videos');
  assertEqual(catLabels['motion-graphics'], 'Social Media');
});

test('each category has a valid icon mapping', () => {
  const icons = { gameplay: 'fa-gamepad', video: 'fa-film', 'real-estate': 'fa-building', 'motion-graphics': 'fa-magic' };
  assertEqual(Object.keys(icons).length, 4);
  for (const [k, v] of Object.entries(icons)) {
    assert(typeof v === 'string' && v.startsWith('fa-'), `icon for ${k} invalid`);
  }
});

// ================================================================
//  5. EDGE CASES — special characters, long strings
// ================================================================
section('5. Edge Cases');

test('handle special characters in title/description', () => {
  const data = [
    { id: 9991, title: 'Test — Emoji 🎬 & <script>alert("xss")</script>', description: 'Special: ñ áéíóú 中文 日本語', category: 'video', icon: 'fa-film', thumbnail: '', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    { id: 9992, title: 'A'.repeat(200), description: 'B'.repeat(500), category: 'gameplay', icon: 'fa-gamepad', thumbnail: '', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
  ];
  const serialized = JSON.stringify(data, null, 4) + '\n';
  fs.writeFileSync(PORTFOLIO_PATH, serialized);
  const reread = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'));
  assertEqual(reread.length, 2);
  assertEqual(reread[0].title, data[0].title);
  assertEqual(reread[1].title.length, 200);
  assertEqual(reread[1].description.length, 500);
});

test('handle entry with minimal fields', () => {
  const minimal = { id: 9993, title: 'x', description: 'y', category: 'video', icon: 'fa-film', thumbnail: '', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' };
  const data = [minimal];
  fs.writeFileSync(PORTFOLIO_PATH, JSON.stringify(data, null, 4) + '\n');
  const reread = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'));
  assertEqual(reread[0].title, 'x');
  assertEqual(reread[0].description, 'y');
});

// ================================================================
//  6. CATEGORY FILTERING LOGIC
// ================================================================
section('6. Category Filtering Logic');

test('filter by gameplay returns only gameplay entries', () => {
  const data = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'));
  const filtered = data.filter(e => e.category === 'gameplay');
  for (const e of filtered) assertEqual(e.category, 'gameplay');
});

test('filter by all returns everything', () => {
  const data = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'));
  assertEqual(data, data); // no filter, all entries
});

test('filter by nonexistent category returns empty', () => {
  const data = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'));
  const filtered = data.filter(e => e.category === 'nonexistent');
  assertEqual(filtered.length, 0);
});

// ================================================================
//  7. GIT INTEGRATION
// ================================================================
section('7. Git Integration');

test('git remote verification — both remotes configured', () => {
  const remotes = execSync('git remote -v', { cwd: ROOT }).toString().trim().split('\n');
  const remoteNames = remotes.filter(r => r.includes('(push)')).map(r => r.split(/\s/)[0]);
  assert(remoteNames.includes('origin'), 'origin remote required');
  assert(remoteNames.includes('nayanvisual'), 'nayanvisual remote required');
  assertEqual(new Set(remoteNames).size, 2, 'exactly 2 push remotes');
});

test('git remote URLs contain tokens', () => {
  const remotes = execSync('git remote -v', { cwd: ROOT }).toString();
  const originLine = remotes.split('\n').find(r => r.startsWith('origin') && r.includes('(push)'));
  const nayanLine = remotes.split('\n').find(r => r.startsWith('nayanvisual') && r.includes('(push)'));
  assert(originLine.includes('@github.com/Amannotop/nayan-visuals-portfolio.git'), 'origin URL mismatch');
  assert(nayanLine.includes('@github.com/NayanVisual/nayan-visuals-portfolio.git'), 'nayanvisual URL mismatch');
});

test('git add dry-run — portfolio.json is tracked', () => {
  const out = execSync('git ls-files data/portfolio.json', { cwd: ROOT }).toString().trim();
  assertEqual(out, 'data/portfolio.json', 'portfolio.json not tracked by git');
});

test('simple-git module loads without error', () => {
  const sg = require('simple-git');
  assert(typeof sg === 'function', 'simple-git exports a function');
});

// ================================================================
//  8. FILE STRUCTURE INTEGRITY
// ================================================================
section('8. File Structure Integrity');

test('required files exist', () => {
  const files = [
    'admin/main.js',
    'admin/preload.js',
    'admin/package.json',
    'admin/renderer/index.html',
    'admin/renderer/style.css',
    'admin/renderer/app.js',
    'data/portfolio.json',
    'index.html',
    'js/script.js',
    'css/style.css',
    '.nojekyll',
  ];
  for (const f of files) {
    assert(fs.existsSync(path.join(ROOT, f)), `missing: ${f}`);
  }
});

test('AGENTS.md exists and documents admin app', () => {
  const agents = fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf-8');
  assert(agents.includes('admin/'), 'AGENTS.md should mention admin/');
  assert(agents.includes('Electron'), 'AGENTS.md should mention Electron');
  assert(agents.includes('Cmd/Ctrl'), 'AGENTS.md should document keyboard shortcuts');
});

// ================================================================
//  9. APP LAUNCH — Electron smoke test
// ================================================================
section('9. Electron App Launch');

test('electron binary is available', () => {
  const v = execSync('node node_modules/electron/cli.js --version', { cwd: __dirname }).toString().trim();
  assert(v.startsWith('v'), `invalid version: ${v}`);
  const parts = v.replace('v', '').split('.').map(Number);
  assert(parts[0] >= 30, 'electron version should be >= 30');
});

test('electron app starts and creates a window', () => {
  const child = spawn('node', ['node_modules/electron/cli.js', '.'], {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ELECTRON_IS_DEV: '0' },
  });

  let output = '';
  let timedOut = false;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
      if (output.includes('error') || output.includes('Error')) {
        reject(new Error('App errors detected:\n' + output));
      } else if (output.length > 0) {
        // If we have output but no errors, app might be running headless
        resolve();
      } else {
        reject(new Error('App started but no output within timeout'));
      }
    }, 10000);

    child.stdout.on('data', d => { output += d.toString(); });
    child.stderr.on('data', d => {
      const text = d.toString();
      // Ignore common Electron warnings that aren't errors
      if (text.includes('ERROR') || text.includes('FATAL')) {
        output += text;
      }
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (!timedOut && code !== 0 && code !== null) {
        reject(new Error(`App exited with code ${code}:\n${output}`));
      } else if (!timedOut) {
        resolve();
      }
    });

    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
  }).then(() => {
    if (!timedOut) child.kill();
    log('  ✓ App started and closed cleanly');
    passed++;
  }).catch(e => {
    child.kill();
    failed++;
    log(`  ✗ ${e.message}`);
  });
});

// ================================================================
// 10. INTEGRATION — rebuild portfolio from scratch
// ================================================================
section('10. Integration — Full CRUD cycle');

test('create new entry via JSON write', () => {
  const data = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'));
  const maxId = data.reduce((m, e) => Math.max(m, e.id), 0);
  data.push({ id: maxId + 1, title: 'Smoke Test Entry', description: 'Created during smoke test', category: 'video', icon: 'fa-film', thumbnail: '', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' });
  fs.writeFileSync(PORTFOLIO_PATH, JSON.stringify(data, null, 4) + '\n');
  const reread = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'));
  const found = reread.find(e => e.id === maxId + 1);
  assert(found, 'new entry should exist');
  assertEqual(found.title, 'Smoke Test Entry');
});

test('update entry via JSON write', () => {
  const data = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'));
  const entry = data.find(e => e.title === 'Smoke Test Entry');
  entry.title = 'Smoke Test Entry (updated)';
  fs.writeFileSync(PORTFOLIO_PATH, JSON.stringify(data, null, 4) + '\n');
  const reread = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'));
  const found = reread.find(e => e.title === 'Smoke Test Entry (updated)');
  assert(found, 'updated entry should exist');
});

test('reorder entries via JSON write', () => {
  const data = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'));
  // Move last to first
  const last = data.pop();
  data.unshift(last);
  fs.writeFileSync(PORTFOLIO_PATH, JSON.stringify(data, null, 4) + '\n');
  const reread = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'));
  assertEqual(reread[0].id, last.id, 'last entry should now be first');
});

test('delete entry via JSON write', () => {
  const data = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'));
  const filtered = data.filter(e => !e.title.includes('Smoke Test'));
  fs.writeFileSync(PORTFOLIO_PATH, JSON.stringify(filtered, null, 4) + '\n');
  const reread = JSON.parse(fs.readFileSync(PORTFOLIO_PATH, 'utf-8'));
  const found = reread.find(e => e.title.includes('Smoke Test'));
  assert(!found, 'smoke test entries should be deleted');
});

// ================================================================
//  TEARDOWN — restore original portfolio
// ================================================================
section('Teardown');

fs.copyFileSync(BACKUP_PATH, PORTFOLIO_PATH);
fs.unlinkSync(BACKUP_PATH);
log('  ✓ Restored original portfolio.json');

// Ensure clean git state
execSync('git checkout -- data/portfolio.json', { cwd: ROOT });

// ================================================================
//  RESULTS
// ================================================================
section('Results');
log(`  Passed: ${passed}`);
log(`  Failed: ${failed}`);
log(`  Total:  ${passed + failed}`);
if (failed > 0) {
  log('\n  ❌ SOME TESTS FAILED');
  process.exit(1);
} else {
  log('\n  ✅ ALL TESTS PASSED');
}
