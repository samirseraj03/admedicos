import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { beatForTime, scrollWorld, timeForProgress } from '../src/config/scroll-world.ts';

test('scroll maps linearly to the real duration in both directions', () => {
  assert.deepEqual([0, .2, .6, .4, .1].map((p) => timeForProgress(p, 10)), [0, 2, 6, 4, 1]);
  assert.equal(timeForProgress(.4, 25), 10);
});
test('clamp endpoints and invalid metadata without seeking past the last frame', () => {
  assert.equal(timeForProgress(-1, 10), 0);
  assert.equal(timeForProgress(2, 10), 10 - 1 / scrollWorld.fps);
  assert.equal(timeForProgress(.5, NaN), 0);
  assert.equal(timeForProgress(.5, 0), 0);
});
test('scene messages use inspected, unequal time ranges', () => {
  assert.deepEqual([0, 2.49, 2.5, 4.89, 4.9, 8.19, 8.2, 9.96].map(beatForTime), [0, 0, 1, 1, 2, 2, 3, 3]);
});
test('rendered landing has one silent video and exactly four principal sections', () => {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.equal((html.match(/<video\b/g) ?? []).length, 1);
  const videoTag = html.match(/<video\b[^>]*>/)![0];
  assert.match(videoTag, /muted/);
  assert.match(videoTag, /playsinline/);
  assert.doesNotMatch(videoTag, /autoplay|controls|src=/);
  assert.deepEqual([...html.matchAll(/<section id="([^"]+)"/g)].map((match) => match[1]), ['inicio', 'doctores', 'primera-visita', 'contacto']);
  assert.match(html, /tel:\+34938613975/);
  assert.doesNotMatch(html, /<form\b|\[PENDIENTE\]|Lorem ipsum/);
});
