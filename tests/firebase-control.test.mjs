import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {assertReadyRules} from '../scripts/rules-readiness.mjs';

const env={...process.env,GITHUB_REPOSITORY:'nikahanghojjati-oss/-daftar-insurance-ledger',GITHUB_REF:'refs/heads/main',FIREBASE_PROJECT_ID:'daftar-insurance-ledger'};
const run=overrides=>spawnSync(process.execPath,['scripts/firebase-rules-control.mjs'],{cwd:new URL('..',import.meta.url),env:{...env,...overrides},encoding:'utf8'});

test('Rules publication accepts only the exact reviewed UID-scoped source',async()=>{
  const reviewed=await readFile(new URL('../firestore.sync.rules',import.meta.url),'utf8');
  const selected=await readFile(new URL('../firestore.rules',import.meta.url),'utf8');
  assert.doesNotThrow(()=>assertReadyRules(selected,reviewed));
  assert.throws(()=>assertReadyRules('SETUP_BLOCKED',reviewed),/blocked until/);
  assert.throws(()=>assertReadyRules(reviewed.replace('owner(ledger);','true;'),reviewed),/blocked until/);
});
test('Verification requires a credential from the exact project and exact main repository',()=>{
  const wrong=run({FIREBASE_RULES_OPERATION:'verify',GITHUB_REPOSITORY:'other/repo'});
  assert.notEqual(wrong.status,0);assert.match(wrong.stderr,/Only reviewed main/);
  const missing=run({FIREBASE_RULES_OPERATION:'verify',GOOGLE_APPLICATION_CREDENTIALS:''});
  assert.notEqual(missing.status,0);assert.match(missing.stderr,/credential is missing/);
});
test('The credential workflow is manual and does not run on pull requests or automatic pushes',async()=>{
  const yaml=await readFile(new URL('../.github/workflows/firebase-rules-control.yml',import.meta.url),'utf8');
  assert.match(yaml,/workflow_dispatch:/);assert.doesNotMatch(yaml,/\n  pull_request:|\n  push:|pull_request_target:/);
  assert.match(yaml,/github\.ref == 'refs\/heads\/main'/);
});

