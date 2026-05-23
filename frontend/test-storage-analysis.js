#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('SyncHire Storage Analysis Report\n');
console.log('='.repeat(60));

// 1. Analyze Zustand Store
console.log('\nZustand Store Analysis:');

const storePath = path.join(__dirname, 'src/lib/store.ts');
if (fs.existsSync(storePath)) {
  const storeContent = fs.readFileSync(storePath, 'utf8');

  console.log('Persist middleware:', storeContent.includes('persist') ? 'YES' : 'NO');
  console.log('Storage key:', storeContent.match(/name:\s*['"`]([^'"`]+)['"`]/)?.[1] || 'Not found');

  const partialize = storeContent.includes('partialize');
  console.log('Selective persistence:', partialize ? 'YES' : 'NO');

  if (partialize) {
    const persistedKeys = storeContent.match(/partialize:.*?{([\s\S]*?)}/)?.[1]?.match(/(\w+):/g) || [];
    console.log('Persisted keys:', persistedKeys.map(k => k.replace(':', '')).join(', '));
  }

  const currentResumeInPersist = storeContent.includes('currentResume') && storeContent.includes('partialize');
  const currentJDInPersist = storeContent.includes('currentJD') && storeContent.includes('partialize');

  console.log('CurrentResume persisted:', currentResumeInPersist ? 'YES (should be NO)' : 'NO (GOOD)');
  console.log('CurrentJD persisted:', currentJDInPersist ? 'YES (should be NO)' : 'NO (GOOD)');
} else {
  console.log('ERROR: Store file not found');
}

// 2. Search for direct storage usage
console.log('\nDirect Storage Usage:');

function searchDir(dir, searchTerm) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const files = fs.readdirSync(dir, { recursive: true });

  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isFile() && /\.(ts|tsx|js|jsx)$/.test(file)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes(searchTerm)) {
          results.push(file);
        }
      } catch (e) {}
    }
  });
  return results;
}

const srcDir = path.join(__dirname, 'src');
const localStorageFiles = searchDir(srcDir, 'localStorage');
const sessionStorageFiles = searchDir(srcDir, 'sessionStorage');

console.log('Files using localStorage:', localStorageFiles.length > 0 ? localStorageFiles.join(', ') : 'None (GOOD)');
console.log('Files using sessionStorage:', sessionStorageFiles.length > 0 ? sessionStorageFiles.join(', ') : 'None');

// 3. Check cookie libraries
console.log('\nCookie Handling:');

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const cookieLibs = Object.keys({...packageJson.dependencies, ...packageJson.devDependencies}).filter(k => k.includes('cookie'));

console.log('Cookie libraries:', cookieLibs.length > 0 ? cookieLibs.join(', ') : 'None');

// 4. Security check
console.log('\nSecurity Analysis:');

const authFiles = ['src/app/signup/page.tsx', 'src/app/login/page.tsx'];
authFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(`${file} - Uses localStorage:`, content.includes('localStorage') ? 'YES' : 'NO');
    console.log(`${file} - Uses cookies:`, content.includes('cookie') ? 'YES' : 'NO');
  }
});

// 5. Storage capacity info
console.log('\nStorage Capacity Info:');
console.log('localStorage limit: 5-10 MB');
console.log('sessionStorage limit: 5-10 MB');
console.log('Cookie limit: ~4 KB per cookie');

console.log('\n' + '='.repeat(60));
console.log('For interactive testing: http://localhost:3000/storage-test.html');
console.log('='.repeat(60));