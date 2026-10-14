'use strict';

/**
 * The router asks "is this message for Research" of every outbox file, which
 * needs the registry and Research's name. It reads them at most once a tick,
 * and only when a message needs them, instead of once per file (TODOS, "Read
 * the registry once per router tick", performance review of the third ship).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { HiveManager } = loadTs('src/main/hive.ts');

async function floor(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'md-route-registry-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const hive = new HiveManager(() => home);
  await hive.ensureAgent({ id: 'god-1', name: 'Michael', provider: 'claude', cwd: home, isGod: true });
  await hive.ensureAgent({ id: 'worker-1', name: 'Creed', provider: 'claude', cwd: home });
  await hive.ensureAgent({ id: 'worker-2', name: 'Pam', provider: 'claude', cwd: home });
  const outbox = (id) => path.join(home, 'hive', 'agents', id, 'outbox');
  return { hive, outbox };
}

function send(outbox, name, to) {
  fs.writeFileSync(path.join(outbox, name), JSON.stringify({ to, act: 'inform', subject: name, body: 'b' }), 'utf8');
}

/** Registry reads routeOnce makes itself: delivery is stubbed out, since
 *  routeMessage has callers outside the router and reads the registry on its own. */
function readsDuringTick(hive) {
  const delivered = [];
  hive.routeMessage = (msg) => { delivered.push(msg); };
  const real = hive.registry.bind(hive);
  let reads = 0;
  hive.registry = () => { reads += 1; return real(); };
  const routed = hive.routeOnce();
  hive.registry = real;
  return { reads, routed, delivered };
}

test('a busy tick reads the registry as often as a tick with one message', async (t) => {
  // Value: protects=router cost stays flat as an outbox fills; fails_when=routeOnce reads registry.json once per outbox file; why_new=TODOS performance item from the third ship review; seam=routeMessage stubbed
  const one = await floor(t);
  send(one.outbox('worker-1'), 'a.json', 'god');
  const single = readsDuringTick(one.hive);
  assert.equal(single.routed, 1);

  const busy = await floor(t);
  for (let i = 0; i < 4; i++) send(busy.outbox('worker-1'), `w1-${i}.json`, 'god');
  for (let i = 0; i < 3; i++) send(busy.outbox('worker-2'), `w2-${i}.json`, 'Creed');
  const many = readsDuringTick(busy.hive);
  assert.equal(many.routed, 7);
  assert.equal(many.delivered.length, 7);
  assert.equal(many.reads, single.reads, 'seven messages read the registry no more than one does');
});

test('an empty tick does not read the registry for the Research check', async (t) => {
  const empty = await floor(t);
  const idle = readsDuringTick(empty.hive);

  const one = await floor(t);
  send(one.outbox('worker-1'), 'a.json', 'god');
  const single = readsDuringTick(one.hive);

  assert.equal(idle.routed, 0);
  assert.equal(single.reads - idle.reads, 1, 'the first message reads it once; with none it is not read');
});
