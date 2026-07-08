---
name: cross-platform-npm-scripts
description: Pattern for writing cross-platform npm scripts that work on Windows, macOS, and Linux
source: auto-skill
extracted_at: '2026-07-08T03:16:32.644Z'
---

# Cross-Platform npm Scripts

## Problem
Shell commands in npm scripts behave differently across operating systems:
- `mkdir -p` works on Unix but fails on Windows cmd
- `cp -r` works in git bash but not native Windows cmd
- Path separators differ (`/` vs `\`)
- Environment variable syntax differs (`$VAR` vs `%VAR%`)

## Anti-Pattern: Shell-Dependent Scripts

```json
{
  "scripts": {
    "build": "mkdir -p dist && cp -r src/* dist/"
  }
}
```

**Why it fails on Windows:**
```
> npm run build
'mkdir' is not recognized as an internal or external command
```

## Correct Pattern: Node.js Inline Scripts

```json
{
  "scripts": {
    "build": "node -e \"const fs=require('fs'),p=require('path');fs.mkdirSync('dist',{recursive:true});/* copy logic */\""
  }
}
```

### File Copy Example

```json
{
  "scripts": {
    "build:frontend": "node -e \"const fs=require('fs'),p=require('path');const cp=(s,d)=>{fs.mkdirSync(p.dirname(d),{recursive:true});fs.copyFileSync(s,d)};const cpr=(s,d)=>{if(fs.statSync(s).isDirectory()){fs.mkdirSync(d,{recursive:true});for(const f of fs.readdirSync(s))cpr(p.join(s,f),p.join(d,f))}else cp(s,d)};fs.mkdirSync('docs',{recursive:true});cp('src/index.html','docs/index.html');cpr('src/css','docs/css');cpr('src/js','docs/js');console.log('Built to docs/')\""
  }
}
```

### Helper Functions

```javascript
// Copy single file
const cp = (src, dest) => {
  fs.mkdirSync(p.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
};

// Recursive directory copy
const cpr = (src, dest) => {
  if (fs.statSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      cpr(p.join(src, file), p.join(dest, file));
    }
  } else {
    cp(src, dest);
  }
};
```

## Alternative: External Build Script

For complex builds, use an external `.mjs` file:

```json
{
  "scripts": {
    "build": "node scripts/build.mjs"
  }
}
```

```javascript
// scripts/build.mjs
import { mkdirSync, copyFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

mkdirSync('dist', { recursive: true });
// ... build logic
```

## Cross-Platform Patterns

### Directory creation
```bash
# BAD (Unix only)
mkdir -p dist/css

# GOOD (cross-platform)
node -e "require('fs').mkdirSync('dist/css',{recursive:true})"
```

### File copy
```bash
# BAD (Unix only)
cp src/index.html dist/

# GOOD (cross-platform)
node -e "require('fs').copyFileSync('src/index.html','dist/index.html')"
```

### Remove directory
```bash
# BAD (Unix only)
rm -rf dist

# GOOD (cross-platform)
node -e "require('fs').rmSync('dist',{recursive:true,force:true})"
```

### Environment variables
```bash
# BAD (platform-specific)
echo $HOME          # Unix
echo %USERPROFILE%  # Windows

# GOOD (cross-platform)
node -e "console.log(require('os').homedir())"
```

## When to Use

- Any npm script that needs to work on Windows, macOS, and Linux
- Build scripts that create directories or copy files
- CI/CD pipelines that run on multiple OS
- Projects with mixed development environments

## When NOT to Use

- Simple scripts that only use Node.js executables (already cross-platform)
- Scripts that only run in CI with a fixed OS
- When you can use a build tool like `rimraf`, `mkdirp`, or `cpx`

## Related Tools

If inline scripts become too complex, consider:
- `rimraf` — cross-platform `rm -rf`
- `mkdirp` — cross-platform `mkdir -p`
- `cpx` — cross-platform `cp -r`
- `shx` — ShellJS cross-platform shell commands
- `cross-env` — cross-platform environment variables

## Real-World Example

From snapkitty-agentos frontend build:

```json
{
  "scripts": {
    "build:frontend": "node -e \"const fs=require('fs'),p=require('path');const cp=(s,d)=>{fs.mkdirSync(p.dirname(d),{recursive:true});fs.copyFileSync(s,d)};const cpr=(s,d)=>{if(fs.statSync(s).isDirectory()){fs.mkdirSync(d,{recursive:true});for(const f of fs.readdirSync(s))cpr(p.join(s,f),p.join(d,f))}else cp(s,d)};fs.mkdirSync('docs',{recursive:true});cp('agentos-frontend/pages/index.html','docs/index.html');cpr('agentos-frontend/css','docs/css');cpr('agentos-frontend/js','docs/js');console.log('Frontend built to docs/')\""
  }
}
```

This works identically on Windows cmd, PowerShell, git bash, macOS, and Linux.
