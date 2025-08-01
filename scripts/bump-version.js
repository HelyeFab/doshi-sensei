#!/usr/bin/env node
/**
 * Version Bump Script
 * Usage: 
 *   npm run version:patch  (1.0.0 -> 1.0.1)
 *   npm run version:minor  (1.0.0 -> 1.1.0)
 *   npm run version:major  (1.0.0 -> 2.0.0)
 */

const fs = require('fs');
const path = require('path');

const versionFile = path.join(__dirname, '../src/config/version.ts');
const packageFile = path.join(__dirname, '../package.json');

function bumpVersion(type) {
  // Read current version from version.ts
  const versionContent = fs.readFileSync(versionFile, 'utf8');
  const versionMatch = versionContent.match(/version:\s*['"](\d+\.\d+\.\d+)['"]/);
  
  if (!versionMatch) {
    console.error('Could not find version in version.ts');
    process.exit(1);
  }
  
  const currentVersion = versionMatch[1];
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  let newVersion;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
    default:
      console.error('Invalid version type. Use: major, minor, or patch');
      process.exit(1);
  }
  
  // Update version.ts
  const newVersionContent = versionContent
    .replace(/version:\s*['"](\d+\.\d+\.\d+)['"]/, `version: '${newVersion}'`)
    .replace(/releaseDate:\s*['"][\d-]+['"]/, `releaseDate: '${new Date().toISOString().split('T')[0]}'`);
  
  fs.writeFileSync(versionFile, newVersionContent);
  
  // Update package.json
  const packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  packageJson.version = newVersion;
  fs.writeFileSync(packageFile, JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log(`✅ Version bumped from ${currentVersion} to ${newVersion}`);
  console.log('\nNext steps:');
  console.log('1. Update VERSION_HISTORY in src/config/version.ts');
  console.log('2. Commit: git add -A && git commit -m "chore: bump version to v' + newVersion + '"');
  console.log('3. Tag: git tag v' + newVersion);
  console.log('4. Push: git push && git push --tags');
}

const type = process.argv[2];
bumpVersion(type);