import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync('app/app/taches/page.tsx', 'utf8');

test('recurring task deletion has a named accessible modal', () => {
  assert.match(page, /ref=\{recurrenceDialogRef\} role="dialog" aria-modal="true" aria-labelledby="recurrence-delete-dialog-title" aria-describedby="recurrence-delete-dialog-description"/);
  assert.match(page, /id="recurrence-delete-dialog-title"/);
  assert.match(page, /id="recurrence-delete-dialog-description"/);
});

test('recurring task dialog handles Escape and keyboard focus boundaries', () => {
  assert.match(page, /if \(event\.key === "Escape"\)/);
  assert.match(page, /if \(event\.key !== "Tab" \|\| !dialog\) return/);
  assert.match(page, /event\.shiftKey/);
  assert.match(page, /document\.addEventListener\("keydown", onKeyDown\)/);
  assert.match(page, /document\.removeEventListener\("keydown", onKeyDown\)/);
});

test('recurring task dialog restores scrolling and previous focus', () => {
  assert.match(page, /document\.body\.style\.overflow = "hidden"/);
  assert.match(page, /document\.body\.style\.overflow = previousOverflow/);
  assert.match(page, /previousFocus\?\.isConnected/);
});
