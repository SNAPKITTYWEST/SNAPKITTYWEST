# QWEN: Clean Up GitHub Pages Repository

## Problem
Bob pushed the entire "bobs control repo" directory to SNAPKITTYWEST.github.io, including:
- THE_YELLOW_BOOK/
- DEVFLOW-FINANCE/
- proofs/
- snaplang/
- And many other unrelated files

This is a production GitHub Pages site that should ONLY contain the overview landing page files.

## Required Action
Clean the repository and push ONLY these 3 files:
- index.html (205 lines)
- styles.css (598 lines)  
- script.js (372 lines)

## Steps to Fix

### 1. Create a clean directory with only the landing page
```bash
mkdir snapkitty-west-clean
cd snapkitty-west-clean
```

### 2. Copy ONLY the 3 required files
```bash
cp "c:/Users/jessi/Desktop/bobs control repo/index.html" .
cp "c:/Users/jessi/Desktop/bobs control repo/styles.css" .
cp "c:/Users/jessi/Desktop/bobs control repo/script.js" .
```

### 3. Initialize clean git repository
```bash
git init
git add index.html styles.css script.js
git commit -m "Initial commit: SnapKitty West landing page"
```

### 4. Force push to clean the remote
```bash
git remote add origin https://github.com/SNAPKITTYWEST/SNAPKITTYWEST.github.io.git
git branch -M main
git push -f origin main
```

### 5. Enable GitHub Pages
Go to: https://github.com/SNAPKITTYWEST/SNAPKITTYWEST.github.io/settings/pages
- Source: Deploy from a branch
- Branch: main
- Folder: / (root)
- Save

## Result
Clean repository with ONLY the landing page files. Site will be live at https://snapkittywest.github.io

## Files That Should NOT Be There
- THE_YELLOW_BOOK/ (belongs in separate repo)
- DEVFLOW-FINANCE (belongs in separate repo)
- proofs (belongs in separate repo)
- snaplang/ (belongs in separate repo)
- overview/README.md (not needed in root)
- Any other directories or files

## What Went Wrong
Bob was working inside "c:/Users/jessi/Desktop/bobs control repo" which is your local development directory with many projects. When he set up git remote and pushed, he pushed EVERYTHING in that directory instead of creating a clean repository with just the landing page files.

The correct approach: Create a NEW clean directory with ONLY the 3 landing page files, then push that.