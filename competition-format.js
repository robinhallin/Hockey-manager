"use strict";

// Pure competition helpers. Fixtures are generated game schedules, not real results.
// Keep rounds local to each competition; a bye is never a fixture against null.
const CompetitionFormat = (() => {
  function roundRobin(clubs, cycles = 4) {
    if (!Array.isArray(clubs) || clubs.length < 2 ||
        clubs.some(c => typeof c !== 'string' || !c.trim()) ||
        new Set(clubs).size !== clubs.length) {
      throw new TypeError('A competition needs distinct, non-empty club identities.');
    }
    if (!Number.isInteger(cycles) || cycles < 2 || cycles % 2 || cycles > 20) {
      throw new RangeError('Use an even number of cycles between 2 and 20.');
    }
    const slots = clubs.length + clubs.length % 2;
    const games = [];
    let round = 1;
    for (let cycle = 0; cycle < cycles; cycle++) {
      const rotating = [...clubs];
      if (rotating.length % 2) rotating.push(null);
      for (let r = 0; r < slots - 1; r++, round++) {
        for (let i = 0; i < slots / 2; i++) {
          const a = rotating[i], b = rotating[slots - 1 - i];
          if (a === null || b === null) continue;
          const reverse = (r + cycle) % 2 === 1;
          games.push({round, home: reverse ? b : a, away: reverse ? a : b,
            played: false, homeGoals: null, awayGoals: null});
        }
        rotating.splice(1, 0, rotating.pop());
      }
    }
    return games;
  }

  function dayNumber(date) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new TypeError('Expected an ISO calendar date.');
    }
    const stamp = Date.parse(date + 'T12:00:00Z');
    if (!Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0, 10) !== date) {
      throw new RangeError('Invalid calendar date.');
    }
    return stamp;
  }

  function schedule(definition, clubs, season) {
    if (!definition || !definition.id || definition.season !== season) {
      throw new RangeError('Competition rules must match the requested season.');
    }
    const rules = definition.regular;
    if (!rules || clubs.length !== rules.teams) throw new RangeError('Unexpected club count.');
    const games = roundRobin(clubs, rules.cycles);
    if ((clubs.length - 1) * rules.cycles !== rules.gamesPerClub) {
      throw new RangeError('Club count and schedule rules disagree.');
    }
    const first = dayNumber(rules.start), last = dayNumber(rules.end);
    const rounds = games.at(-1).round, days = (last - first) / 86400000;
    if (days < rounds - 1) throw new RangeError('Calendar window is too short.');
    return games.map((g, i) => ({...g, id: `${definition.id}:${season}:${i + 1}`,
      league: definition.id, stage: 'regular', scheduleKind: 'generated',
      date: new Date(first + Math.round((g.round - 1) * days / (rounds - 1)) * 86400000).toISOString().slice(0, 10)}));
  }

  function due(fixtures, date) {
    dayNumber(date);
    return fixtures.filter(g => !g.played && g.date <= date)
      .slice().sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  }

  function next(fixtures, club, date) {
    dayNumber(date);
    return fixtures.filter(g => !g.played && g.date >= date && (g.home === club || g.away === club))
      .slice().sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))[0] || null;
  }

  return Object.freeze({roundRobin, schedule, due, next});
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CompetitionFormat;
