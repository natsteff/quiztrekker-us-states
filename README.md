# StateQuest

[Play StateQuest](https://natsteff.github.io/statequest/)

A browser geography game for all 50 U.S. states. Learn silhouettes, postal abbreviations, names, capitals and locations, then practice with multiple choice or typed abbreviations. Missed states receive extra practice weight. Scores, streaks and explored states are stored in the current browser.

## Run locally

Requires Python 3.9 or later. No package installation is needed.

```sh
python3 scripts/build.py
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:8000. Serve only `dist`, which contains the playable static application. Build identity is in `dist/build.json`.

Swipe or use Previous/Next in Learn Mode; tap a card to flip it. The state selector jumps directly to any state. The shape challenge accepts two-letter postal abbreviations without regard to case. Each answer scores once; a miss resets the current streak. A correct answer earns 100 points plus 10 for each additional consecutive answer, capped at a 100-point bonus. The personal best is the largest cumulative score reached during a visit; returning visits start a new score while retaining streak and history.

Shapes fit their cards by default without stretching or rotation. “Compare at map scale” uses a common map-coordinate scale for all silhouettes. Alaska and Hawaii use the source map’s insets; Alaska is reduced. Small islands and borders reflect the source's cartographic simplification.

Progress is specific to this browser and origin. Clearing browser data removes it. If storage is blocked, the game continues for the visit and displays a notice. There are no accounts or network score services. The first online visit caches the bundled game for offline play. Browser storage eviction can remove saves and cached files; use Export save to keep a backup.

## Checks

```sh
python3 -m unittest discover -s tests -p 'test_*.py'
node tests/core.test.cjs
node tests/pwa.test.cjs
```

The Python tests cover the 50-state data build and representative geometry. The JavaScript tests cover scoring, streaks, answer normalization, weighted review and storage failures. JavaScript tests require Node (only tests require it).

## Geography attribution

Boundary data: [US Atlas 3.0.1](https://github.com/topojson/us-atlas), derived from the U.S. Census Bureau’s 2017 cartographic boundaries, projected with Albers USA. The pinned TopoJSON is in `data/`; `scripts/build.py` decodes its arcs to bundled SVG paths, retaining all rings and the original map coordinates. Copyright 2013–2019 Michael Bostock, ISC license; see [license](dist/US-ATLAS-LICENSE.txt). Names, abbreviations and capitals are maintained in `data/states.tsv`.

## Mobile installation and backups

Phone layouts put gameplay first, with fixed bottom mode controls, 44px minimum control heights, safe-area spacing and swipeable cards. On iPhone, use Safari’s Share → Add to Home Screen; on Android, use the browser’s Install app/Add to Home screen menu. Installation availability depends on the browser. HTTPS or localhost is required for offline setup. After the offline-ready message appears, the bundled game can reopen without a connection. Updates become active after all game windows close and reopen; an update notice appears when detected.

Export save downloads a versioned JSON backup. Transfer that file yourself to another device and choose Import save. A validated summary and confirmation precede replacement; import restarts the current visit’s challenge score. Malformed, oversized and unsupported-version files are rejected. Save files are processed entirely on the device. Import replaces rather than merges progress; export first to retain the old journal.

## GitHub Pages preparation

Publish the **contents of `dist/`** as a static Pages artifact. All asset URLs, manifest scope/start URL and service-worker scope are relative, supporting a project path such as `/statequest/` without code changes. The worker caches only bundled game assets and deletes only older caches for its own project path. The GitHub Actions workflow tests and rebuilds the game, verifies reproducibility, and publishes only `dist/` to Pages when `main` changes. Verify install/offline behavior on the final HTTPS URL before release.

Physical iPhone/Android checks remain necessary for home-screen installation, soft-keyboard behavior, safe areas, larger system text and touch gestures. Browser viewport checks alone do not establish physical-device compatibility.
