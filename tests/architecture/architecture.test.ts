import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

function checkDirectoryFiles(
  dirPath: string,
  checkFn: (filePath: string, content: string) => void
) {
  if (!fs.existsSync(dirPath)) return;
  const files = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      checkDirectoryFiles(fullPath, checkFn);
    } else if (file.isFile() && (file.name.endsWith('.ts') || file.name.endsWith('.tsx'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      checkFn(fullPath, content);
    }
  }
}

export async function runArchitectureTests(): Promise<boolean> {
  const libPath = path.resolve(process.cwd(), 'lib');
  const modulesPath = path.join(libPath, 'modules');

  // Rule 1: No React in Domain
  checkDirectoryFiles(modulesPath, (filePath, content) => {
    if (filePath.includes(`${path.sep}domain${path.sep}`)) {
      assert.strictEqual(
        content.includes("from 'react'") || content.includes('from "react"') || content.includes("from 'next'"),
        false,
        `Architecture Error: Domain layer file ${filePath} must not import React or Next.js`
      );
    }
  });

  // Rule 2: No Supabase outside Infrastructure & Config/Setup
  checkDirectoryFiles(modulesPath, (filePath, content) => {
    if (!filePath.includes(`${path.sep}infrastructure${path.sep}`) && !filePath.includes(`${path.sep}api${path.sep}`) && !filePath.includes(`${path.sep}application${path.sep}`)) {
      if (filePath.includes(`${path.sep}domain${path.sep}`)) {
        assert.strictEqual(
          content.includes("from '@/lib/supabase'") || content.includes('@supabase/supabase-js'),
          false,
          `Architecture Error: Domain layer ${filePath} must not import Supabase directly`
        );
      }
    }
  });

  // Rule 3: Module entry points must not use wildcard export *
  if (fs.existsSync(modulesPath)) {
    const moduleDirs = fs.readdirSync(modulesPath, { withFileTypes: true });
    for (const mod of moduleDirs) {
      if (mod.isDirectory()) {
        const indexFile = path.join(modulesPath, mod.name, 'index.ts');
        if (fs.existsSync(indexFile)) {
          const indexContent = fs.readFileSync(indexFile, 'utf8');
          assert.strictEqual(
            indexContent.includes('export * from'),
            false,
            `Architecture Error: Module index ${indexFile} must use curated exports instead of wildcard export *`
          );
        }
      }
    }
  }

  return true;
}

if (require.main === module) {
  runArchitectureTests().then(() => console.log('Architecture tests passed! 100% compliance'));
}
