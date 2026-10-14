'use strict';

/**
 * Right-click "Copy link address". The main process shows the item only for
 * links `copyableLinkText` accepts and copies exactly what it returns, and it
 * takes a translated label from the renderer only through `cleanMenuLabel`.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { copyableLinkText, cleanMenuLabel, DEFAULT_COPY_LINK_LABEL } = loadTs('src/shared/linkMenu.ts');

test('web links copy their full address', () => {
  // Value: protects=a named link ("HubSpot") copies the record's real URL; fails_when=the address is altered or a web link gets no menu; why_new=TODOS named links item "Copy a link's address from a card"; seam=none
  assert.equal(copyableLinkText('https://app.hubspot.com/contacts/123/record/0-1/456'), 'https://app.hubspot.com/contacts/123/record/0-1/456');
  assert.equal(copyableLinkText('http://example.com/a?b=c#d'), 'http://example.com/a?b=c#d');
  assert.equal(copyableLinkText('HTTPS://EXAMPLE.COM'), 'HTTPS://EXAMPLE.COM');
});

test('mail links copy the plain address', () => {
  assert.equal(copyableLinkText('mailto:pam@example.com'), 'pam@example.com');
  assert.equal(copyableLinkText('mailto:pam@example.com?subject=Invoice'), 'pam@example.com');
  assert.equal(copyableLinkText('mailto:pam%40example.com'), 'pam@example.com');
});

test('no menu for anything that is not a web or mail link', () => {
  // Value: protects=a file, script or app scheme link is never offered; fails_when=the menu shows for a scheme other than http, https or mailto; why_new=same rule as the window open handler; seam=none
  for (const url of [
    '', ' ', 'file:///etc/passwd', 'javascript:alert(1)', 'dontbemichael://open',
    'ftp://example.com/x', 'about:blank', 'https://', 'mailto:', 'mailto:?subject=x',
    'mailto:%E0%A4%A', 'mailto:a b@example.com', null, undefined, 42, {}
  ]) {
    assert.equal(copyableLinkText(url), null, `no menu for ${JSON.stringify(url)}`);
  }
});

test('the renderer can only set a short plain label', () => {
  assert.equal(cleanMenuLabel('نسخ عنوان الرابط'), 'نسخ عنوان الرابط');
  assert.equal(cleanMenuLabel('  复制链接地址  '), '复制链接地址');
  for (const bad of ['', '   ', 'x'.repeat(61), 'Copy\nlink', 'Copy\u0000', null, 7, ['Copy']]) {
    assert.equal(cleanMenuLabel(bad), null, `refuses ${JSON.stringify(bad)}`);
  }
});

test('the English default matches en.json, and every locale has the label', () => {
  const dir = path.join(__dirname, '..', 'src/renderer/src/i18n/locales');
  const en = JSON.parse(fs.readFileSync(path.join(dir, 'en.json'), 'utf8'));
  assert.equal(en.common.copyLinkAddress, DEFAULT_COPY_LINK_LABEL);
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const locale = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    assert.ok(cleanMenuLabel(locale.common.copyLinkAddress), `${file} has a usable label`);
  }
});
