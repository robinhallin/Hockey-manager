"use strict";
// Snapshot of existing game data. Simulation attributes, not measured real-world ratings.
const MATCH_LAB_ROSTERS = [
  {
    "name": "HV71",
    "code": "HV71",
    "primary": "#093e78",
    "accent": "#f2cf51",
    "players": [
      {
        "id": "ep-650466",
        "name": "Olof Glifford",
        "pos": "MV",
        "attributes": {
          "reflexes": 11,
          "positioning": 11,
          "reboundControl": 10,
          "handling": 10,
          "movement": 10,
          "composure": 11
        }
      },
      {
        "id": "ep-796339",
        "name": "Herman Liv",
        "pos": "MV",
        "attributes": {
          "reflexes": 11,
          "positioning": 11,
          "reboundControl": 10,
          "handling": 10,
          "movement": 10,
          "composure": 10
        }
      },
      {
        "id": "ep-146703",
        "name": "Felix Sandström",
        "pos": "MV",
        "attributes": {
          "reflexes": 13,
          "positioning": 13,
          "reboundControl": 12,
          "handling": 12,
          "movement": 12,
          "composure": 12
        }
      },
      {
        "id": "ep-139080",
        "name": "Olle Alsing",
        "pos": "B",
        "attributes": {
          "skating": 13,
          "acceleration": 14,
          "shooting": 13,
          "passing": 13,
          "puckControl": 13,
          "vision": 13,
          "positioning": 15,
          "checking": 14,
          "faceoffs": 11,
          "stamina": 14,
          "strength": 13,
          "workRate": 14,
          "decisions": 14,
          "composure": 14,
          "discipline": 13
        }
      },
      {
        "id": "ep-871865",
        "name": "Karl Annborn",
        "pos": "B",
        "attributes": {
          "skating": 11,
          "acceleration": 11,
          "shooting": 10,
          "passing": 11,
          "puckControl": 10,
          "vision": 10,
          "positioning": 12,
          "checking": 11,
          "faceoffs": 8,
          "stamina": 11,
          "strength": 11,
          "workRate": 11,
          "decisions": 11,
          "composure": 11,
          "discipline": 10
        }
      },
      {
        "id": "ep-85683",
        "name": "Andreas Borgman",
        "pos": "B",
        "attributes": {
          "skating": 13,
          "acceleration": 14,
          "shooting": 13,
          "passing": 13,
          "puckControl": 13,
          "vision": 13,
          "positioning": 15,
          "checking": 14,
          "faceoffs": 11,
          "stamina": 14,
          "strength": 14,
          "workRate": 14,
          "decisions": 14,
          "composure": 13,
          "discipline": 13
        }
      },
      {
        "id": "ep-647763",
        "name": "Hugo Fransson",
        "pos": "B",
        "attributes": {
          "skating": 13,
          "acceleration": 13,
          "shooting": 13,
          "passing": 13,
          "puckControl": 13,
          "vision": 13,
          "positioning": 14,
          "checking": 13,
          "faceoffs": 10,
          "stamina": 13,
          "strength": 12,
          "workRate": 13,
          "decisions": 13,
          "composure": 13,
          "discipline": 13
        }
      },
      {
        "id": "ep-886275",
        "name": "Malte Gustafsson",
        "pos": "B",
        "attributes": {
          "skating": 10,
          "acceleration": 10,
          "shooting": 9,
          "passing": 10,
          "puckControl": 9,
          "vision": 9,
          "positioning": 11,
          "checking": 10,
          "faceoffs": 7,
          "stamina": 10,
          "strength": 10,
          "workRate": 10,
          "decisions": 10,
          "composure": 10,
          "discipline": 9
        }
      },
      {
        "id": "ep-86135",
        "name": "Niklas Hansson",
        "pos": "B",
        "attributes": {
          "skating": 13,
          "acceleration": 14,
          "shooting": 13,
          "passing": 14,
          "puckControl": 13,
          "vision": 14,
          "positioning": 15,
          "checking": 14,
          "faceoffs": 11,
          "stamina": 14,
          "strength": 13,
          "workRate": 14,
          "decisions": 14,
          "composure": 14,
          "discipline": 13
        }
      },
      {
        "id": "ep-397011",
        "name": "Santeri Hatakka",
        "pos": "B",
        "attributes": {
          "skating": 13,
          "acceleration": 14,
          "shooting": 13,
          "passing": 13,
          "puckControl": 13,
          "vision": 13,
          "positioning": 15,
          "checking": 14,
          "faceoffs": 10,
          "stamina": 13,
          "strength": 13,
          "workRate": 13,
          "decisions": 13,
          "composure": 13,
          "discipline": 12
        }
      },
      {
        "id": "ep-487621",
        "name": "Lucas Lagerberg Hoen",
        "pos": "B",
        "attributes": {
          "skating": 12,
          "acceleration": 13,
          "shooting": 12,
          "passing": 12,
          "puckControl": 12,
          "vision": 12,
          "positioning": 14,
          "checking": 13,
          "faceoffs": 9,
          "stamina": 13,
          "strength": 12,
          "workRate": 12,
          "decisions": 13,
          "composure": 12,
          "discipline": 12
        }
      },
      {
        "id": "ep-251447",
        "name": "Jonathan Ang",
        "pos": "HF",
        "attributes": {
          "skating": 13,
          "acceleration": 14,
          "shooting": 15,
          "passing": 15,
          "puckControl": 14,
          "vision": 14,
          "positioning": 14,
          "checking": 12,
          "faceoffs": 14,
          "stamina": 14,
          "strength": 12,
          "workRate": 14,
          "decisions": 14,
          "composure": 14,
          "discipline": 13
        }
      },
      {
        "id": "ep-118779",
        "name": "Hampus Eriksson",
        "pos": "C",
        "attributes": {
          "skating": 12,
          "acceleration": 12,
          "shooting": 11,
          "passing": 12,
          "puckControl": 11,
          "vision": 11,
          "positioning": 12,
          "checking": 11,
          "faceoffs": 13,
          "stamina": 12,
          "strength": 13,
          "workRate": 12,
          "decisions": 12,
          "composure": 12,
          "discipline": 11
        }
      },
      {
        "id": "ep-353521",
        "name": "Mike Hardman",
        "pos": "F",
        "attributes": {
          "skating": 13,
          "acceleration": 13,
          "shooting": 13,
          "passing": 12,
          "puckControl": 13,
          "vision": 12,
          "positioning": 13,
          "checking": 12,
          "faceoffs": 14,
          "stamina": 13,
          "strength": 14,
          "workRate": 13,
          "decisions": 13,
          "composure": 13,
          "discipline": 13
        }
      },
      {
        "id": "ep-284816",
        "name": "Aleksi Heponiemi",
        "pos": "C",
        "attributes": {
          "skating": 13,
          "acceleration": 14,
          "shooting": 13,
          "passing": 14,
          "puckControl": 13,
          "vision": 13,
          "positioning": 13,
          "checking": 12,
          "faceoffs": 14,
          "stamina": 14,
          "strength": 11,
          "workRate": 14,
          "decisions": 14,
          "composure": 13,
          "discipline": 13
        }
      },
      {
        "id": "ep-585832",
        "name": "Martin Johnsen",
        "pos": "C",
        "attributes": {
          "skating": 12,
          "acceleration": 12,
          "shooting": 12,
          "passing": 12,
          "puckControl": 12,
          "vision": 12,
          "positioning": 12,
          "checking": 11,
          "faceoffs": 13,
          "stamina": 12,
          "strength": 11,
          "workRate": 12,
          "decisions": 12,
          "composure": 12,
          "discipline": 11
        }
      },
      {
        "id": "ep-113322",
        "name": "Justin Kloos",
        "pos": "C",
        "attributes": {
          "skating": 13,
          "acceleration": 14,
          "shooting": 13,
          "passing": 13,
          "puckControl": 13,
          "vision": 13,
          "positioning": 14,
          "checking": 12,
          "faceoffs": 14,
          "stamina": 14,
          "strength": 12,
          "workRate": 14,
          "decisions": 14,
          "composure": 14,
          "discipline": 13
        }
      },
      {
        "id": "ep-86064",
        "name": "Victor Laz",
        "pos": "C",
        "attributes": {
          "skating": 12,
          "acceleration": 12,
          "shooting": 12,
          "passing": 11,
          "puckControl": 12,
          "vision": 11,
          "positioning": 12,
          "checking": 11,
          "faceoffs": 13,
          "stamina": 12,
          "strength": 11,
          "workRate": 12,
          "decisions": 12,
          "composure": 12,
          "discipline": 12
        }
      },
      {
        "id": "ep-242668",
        "name": "Linus Lindström",
        "pos": "C",
        "attributes": {
          "skating": 13,
          "acceleration": 14,
          "shooting": 12,
          "passing": 12,
          "puckControl": 12,
          "vision": 12,
          "positioning": 13,
          "checking": 12,
          "faceoffs": 14,
          "stamina": 13,
          "strength": 12,
          "workRate": 13,
          "decisions": 13,
          "composure": 13,
          "discipline": 13
        }
      },
      {
        "id": "ep-427906",
        "name": "Jan Mysak",
        "pos": "C",
        "attributes": {
          "skating": 13,
          "acceleration": 13,
          "shooting": 13,
          "passing": 13,
          "puckControl": 13,
          "vision": 13,
          "positioning": 13,
          "checking": 12,
          "faceoffs": 14,
          "stamina": 13,
          "strength": 13,
          "workRate": 13,
          "decisions": 13,
          "composure": 13,
          "discipline": 13
        }
      },
      {
        "id": "ep-381306",
        "name": "William Nilsson Ignberg",
        "pos": "HF",
        "attributes": {
          "skating": 13,
          "acceleration": 14,
          "shooting": 12,
          "passing": 12,
          "puckControl": 12,
          "vision": 13,
          "positioning": 13,
          "checking": 13,
          "faceoffs": 11,
          "stamina": 13,
          "strength": 14,
          "workRate": 14,
          "decisions": 13,
          "composure": 13,
          "discipline": 13
        }
      },
      {
        "id": "ep-259121",
        "name": "Nikola Pasic",
        "pos": "VF",
        "attributes": {
          "skating": 13,
          "acceleration": 14,
          "shooting": 12,
          "passing": 13,
          "puckControl": 13,
          "vision": 13,
          "positioning": 14,
          "checking": 13,
          "faceoffs": 11,
          "stamina": 14,
          "strength": 13,
          "workRate": 14,
          "decisions": 14,
          "composure": 14,
          "discipline": 13
        }
      },
      {
        "id": "ep-236358",
        "name": "Lukas Rousek",
        "pos": "C",
        "attributes": {
          "skating": 13,
          "acceleration": 13,
          "shooting": 12,
          "passing": 15,
          "puckControl": 13,
          "vision": 14,
          "positioning": 13,
          "checking": 13,
          "faceoffs": 14,
          "stamina": 14,
          "strength": 14,
          "workRate": 13,
          "decisions": 13,
          "composure": 13,
          "discipline": 13
        }
      },
      {
        "id": "ep-203936",
        "name": "Oskar Stål Lyrenäs",
        "pos": "HF",
        "attributes": {
          "skating": 13,
          "acceleration": 14,
          "shooting": 13,
          "passing": 12,
          "puckControl": 13,
          "vision": 13,
          "positioning": 14,
          "checking": 12,
          "faceoffs": 11,
          "stamina": 14,
          "strength": 13,
          "workRate": 14,
          "decisions": 14,
          "composure": 13,
          "discipline": 14
        }
      },
      {
        "id": "ep-200913",
        "name": "Riley Woods",
        "pos": "VF",
        "attributes": {
          "skating": 13,
          "acceleration": 14,
          "shooting": 14,
          "passing": 13,
          "puckControl": 13,
          "vision": 13,
          "positioning": 14,
          "checking": 12,
          "faceoffs": 11,
          "stamina": 14,
          "strength": 13,
          "workRate": 14,
          "decisions": 14,
          "composure": 14,
          "discipline": 13
        }
      }
    ]
  },
  {
    "name": "Färjestad BK",
    "code": "FBK",
    "primary": "#15503f",
    "accent": "#e0bf65",
    "players": [
      {
        "id": "ep-151877",
        "name": "Emil Larmi",
        "pos": "MV",
        "attributes": {
          "reflexes": 14,
          "positioning": 14,
          "reboundControl": 13,
          "handling": 13,
          "movement": 13,
          "composure": 14
        }
      },
      {
        "id": "ep-707277",
        "name": "Melker Thelin",
        "pos": "MV",
        "attributes": {
          "reflexes": 13,
          "positioning": 13,
          "reboundControl": 12,
          "handling": 12,
          "movement": 12,
          "composure": 12
        }
      },
      {
        "id": "ep-289485",
        "name": "Axel Bergkvist",
        "pos": "B",
        "attributes": {
          "skating": 13,
          "acceleration": 14,
          "shooting": 14,
          "passing": 14,
          "puckControl": 13,
          "vision": 13,
          "positioning": 15,
          "checking": 14,
          "faceoffs": 11,
          "stamina": 14,
          "strength": 14,
          "workRate": 14,
          "decisions": 14,
          "composure": 14,
          "discipline": 13
        }
      },
      {
        "id": "ep-187919",
        "name": "Gabriel Carlsson",
        "pos": "B",
        "attributes": {
          "skating": 13,
          "acceleration": 14,
          "shooting": 13,
          "passing": 13,
          "puckControl": 13,
          "vision": 13,
          "positioning": 15,
          "checking": 14,
          "faceoffs": 11,
          "stamina": 14,
          "strength": 14,
          "workRate": 14,
          "decisions": 14,
          "composure": 14,
          "discipline": 13
        }
      },
      {
        "id": "ep-806192",
        "name": "Samuel Eriksson",
        "pos": "B",
        "attributes": {
          "skating": 7,
          "acceleration": 7,
          "shooting": 7,
          "passing": 6,
          "puckControl": 7,
          "vision": 7,
          "positioning": 9,
          "checking": 8,
          "faceoffs": 4,
          "stamina": 7,
          "strength": 8,
          "workRate": 7,
          "decisions": 7,
          "composure": 7,
          "discipline": 7
        }
      },
      {
        "id": "ep-921852",
        "name": "Måns Gudmundsson",
        "pos": "B",
        "attributes": {
          "skating": 7,
          "acceleration": 8,
          "shooting": 7,
          "passing": 10,
          "puckControl": 8,
          "vision": 8,
          "positioning": 9,
          "checking": 7,
          "faceoffs": 4,
          "stamina": 8,
          "strength": 7,
          "workRate": 7,
          "decisions": 7,
          "composure": 7,
          "discipline": 7
        }
      },
      {
        "id": "ep-10538",
        "name": "Magnus Nygren",
        "pos": "B",
        "attributes": {
          "skating": 13,
          "acceleration": 13,
          "shooting": 14,
          "passing": 14,
          "puckControl": 13,
          "vision": 13,
          "positioning": 15,
          "checking": 14,
          "faceoffs": 11,
          "stamina": 14,
          "strength": 13,
          "workRate": 14,
          "decisions": 14,
          "composure": 14,
          "discipline": 13
        }
      },
      {
        "id": "ep-114812",
        "name": "Adam Ollas Mattsson",
        "pos": "B",
        "attributes": {
          "skating": 13,
          "acceleration": 14,
          "shooting": 13,
          "passing": 13,
          "puckControl": 13,
          "vision": 13,
          "positioning": 15,
          "checking": 14,
          "faceoffs": 11,
          "stamina": 14,
          "strength": 15,
          "workRate": 14,
          "decisions": 14,
          "composure": 14,
          "discipline": 13
        }
      },
      {
        "id": "ep-344180",
        "name": "Filip Roos",
        "pos": "B",
        "attributes": {
          "skating": 13,
          "acceleration": 14,
          "shooting": 13,
          "passing": 13,
          "puckControl": 13,
          "vision": 13,
          "positioning": 15,
          "checking": 14,
          "faceoffs": 10,
          "stamina": 14,
          "strength": 14,
          "workRate": 13,
          "decisions": 14,
          "composure": 13,
          "discipline": 13
        }
      },
      {
        "id": "ep-649581",
        "name": "Albert Wikman",
        "pos": "B",
        "attributes": {
          "skating": 13,
          "acceleration": 13,
          "shooting": 12,
          "passing": 11,
          "puckControl": 12,
          "vision": 12,
          "positioning": 14,
          "checking": 13,
          "faceoffs": 10,
          "stamina": 13,
          "strength": 13,
          "workRate": 13,
          "decisions": 13,
          "composure": 13,
          "discipline": 13
        }
      },
      {
        "id": "ep-714281",
        "name": "Jack Berglund",
        "pos": "C",
        "attributes": {
          "skating": 12,
          "acceleration": 13,
          "shooting": 12,
          "passing": 12,
          "puckControl": 12,
          "vision": 12,
          "positioning": 13,
          "checking": 12,
          "faceoffs": 13,
          "stamina": 13,
          "strength": 13,
          "workRate": 13,
          "decisions": 13,
          "composure": 13,
          "discipline": 12
        }
      },
      {
        "id": "ep-328488",
        "name": "Sebastian Cederle",
        "pos": "F",
        "attributes": {
          "skating": 10,
          "acceleration": 11,
          "shooting": 11,
          "passing": 11,
          "puckControl": 10,
          "vision": 10,
          "positioning": 11,
          "checking": 10,
          "faceoffs": 11,
          "stamina": 11,
          "strength": 10,
          "workRate": 11,
          "decisions": 11,
          "composure": 11,
          "discipline": 10
        }
      },
      {
        "id": "ep-29343",
        "name": "Victor Ejdsell",
        "pos": "VF",
        "attributes": {
          "skating": 13,
          "acceleration": 14,
          "shooting": 14,
          "passing": 15,
          "puckControl": 14,
          "vision": 14,
          "positioning": 14,
          "checking": 13,
          "faceoffs": 14,
          "stamina": 14,
          "strength": 15,
          "workRate": 14,
          "decisions": 14,
          "composure": 13,
          "discipline": 13
        }
      },
      {
        "id": "ep-876952",
        "name": "Mikkel Eriksen",
        "pos": "C",
        "attributes": {
          "skating": 9,
          "acceleration": 10,
          "shooting": 11,
          "passing": 11,
          "puckControl": 10,
          "vision": 10,
          "positioning": 10,
          "checking": 8,
          "faceoffs": 10,
          "stamina": 10,
          "strength": 9,
          "workRate": 9,
          "decisions": 10,
          "composure": 9,
          "discipline": 9
        }
      },
      {
        "id": "ep-270160",
        "name": "Christoffer Jansson",
        "pos": "C",
        "attributes": {
          "skating": 13,
          "acceleration": 13,
          "shooting": 12,
          "passing": 12,
          "puckControl": 12,
          "vision": 12,
          "positioning": 13,
          "checking": 12,
          "faceoffs": 13,
          "stamina": 13,
          "strength": 13,
          "workRate": 13,
          "decisions": 13,
          "composure": 13,
          "discipline": 12
        }
      },
      {
        "id": "ep-16658",
        "name": "Linus Johansson",
        "pos": "C",
        "attributes": {
          "skating": 13,
          "acceleration": 13,
          "shooting": 12,
          "passing": 13,
          "puckControl": 13,
          "vision": 13,
          "positioning": 14,
          "checking": 13,
          "faceoffs": 14,
          "stamina": 14,
          "strength": 14,
          "workRate": 14,
          "decisions": 14,
          "composure": 13,
          "discipline": 13
        }
      },
      {
        "id": "ep-6225",
        "name": "Marcus Johansson",
        "pos": "C",
        "attributes": {
          "skating": 15,
          "acceleration": 15,
          "shooting": 15,
          "passing": 17,
          "puckControl": 16,
          "vision": 16,
          "positioning": 16,
          "checking": 15,
          "faceoffs": 17,
          "stamina": 16,
          "strength": 16,
          "workRate": 16,
          "decisions": 16,
          "composure": 16,
          "discipline": 16
        }
      },
      {
        "id": "ep-287856",
        "name": "Viktor Lodin",
        "pos": "C",
        "attributes": {
          "skating": 13,
          "acceleration": 14,
          "shooting": 14,
          "passing": 16,
          "puckControl": 14,
          "vision": 14,
          "positioning": 14,
          "checking": 13,
          "faceoffs": 14,
          "stamina": 14,
          "strength": 14,
          "workRate": 14,
          "decisions": 14,
          "composure": 14,
          "discipline": 12
        }
      },
      {
        "id": "ep-25858",
        "name": "Joakim Nygård",
        "pos": "VF",
        "attributes": {
          "skating": 13,
          "acceleration": 13,
          "shooting": 13,
          "passing": 13,
          "puckControl": 13,
          "vision": 13,
          "positioning": 14,
          "checking": 13,
          "faceoffs": 11,
          "stamina": 14,
          "strength": 13,
          "workRate": 14,
          "decisions": 14,
          "composure": 14,
          "discipline": 13
        }
      },
      {
        "id": "ep-212666",
        "name": "Oskar Steen",
        "pos": "C",
        "attributes": {
          "skating": 13,
          "acceleration": 14,
          "shooting": 14,
          "passing": 13,
          "puckControl": 13,
          "vision": 13,
          "positioning": 14,
          "checking": 13,
          "faceoffs": 14,
          "stamina": 14,
          "strength": 13,
          "workRate": 14,
          "decisions": 14,
          "composure": 14,
          "discipline": 13
        }
      },
      {
        "id": "ep-305485",
        "name": "Marian Studenic",
        "pos": "VF",
        "attributes": {
          "skating": 13,
          "acceleration": 14,
          "shooting": 13,
          "passing": 14,
          "puckControl": 13,
          "vision": 14,
          "positioning": 14,
          "checking": 12,
          "faceoffs": 11,
          "stamina": 14,
          "strength": 13,
          "workRate": 14,
          "decisions": 14,
          "composure": 14,
          "discipline": 12
        }
      },
      {
        "id": "ep-190526",
        "name": "Radim Zohorna",
        "pos": "C",
        "attributes": {
          "skating": 13,
          "acceleration": 14,
          "shooting": 13,
          "passing": 14,
          "puckControl": 13,
          "vision": 13,
          "positioning": 14,
          "checking": 13,
          "faceoffs": 14,
          "stamina": 14,
          "strength": 15,
          "workRate": 14,
          "decisions": 14,
          "composure": 14,
          "discipline": 13
        }
      },
      {
        "id": "ep-3885",
        "name": "Per Åslund",
        "pos": "VF",
        "attributes": {
          "skating": 12,
          "acceleration": 12,
          "shooting": 14,
          "passing": 13,
          "puckControl": 13,
          "vision": 13,
          "positioning": 14,
          "checking": 12,
          "faceoffs": 11,
          "stamina": 13,
          "strength": 13,
          "workRate": 14,
          "decisions": 14,
          "composure": 14,
          "discipline": 12
        }
      },
      {
        "id": "ep-549487",
        "name": "Mikkel Øby-Olsen",
        "pos": "F",
        "attributes": {
          "skating": 11,
          "acceleration": 11,
          "shooting": 13,
          "passing": 11,
          "puckControl": 11,
          "vision": 11,
          "positioning": 11,
          "checking": 10,
          "faceoffs": 12,
          "stamina": 11,
          "strength": 10,
          "workRate": 11,
          "decisions": 11,
          "composure": 11,
          "discipline": 11
        }
      }
    ]
  }
];
if(typeof module!=="undefined")module.exports=MATCH_LAB_ROSTERS;
