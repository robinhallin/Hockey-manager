'use strict';
const assert=require('node:assert/strict');
const {sample,profiles}=require('./scripts/match-balance-wide.cjs');
// Held-out seeds, separate from the descriptive tuning sample. Swap rink sides
// for every seed. These are gameplay guardrails, not claims about SHL results.
const [strong,weak]=sample(profiles.strong,profiles.weak,12,100);
console.log('Held-out strength sample',JSON.stringify({periods:24,strong,weak}));
assert.ok(strong.quality>weak.quality,'better attributes retain a chance-quality advantage');
assert.ok(strong.shots>weak.shots,'better attributes retain a shot-volume advantage');
assert.ok(weak.shots/(strong.shots+weak.shots)>=.20,'weaker side must retain at least one fifth of shots across the sample');
assert.ok(weak.attempts>=9,'weaker side must still create attempts throughout a period');
assert.ok(strong.shots<=20,'strength must not produce runaway volume');
