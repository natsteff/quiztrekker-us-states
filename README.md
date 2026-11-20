<p align="center">
  <img src="dist/logo.png" alt="QuizTrekker - US States" width="500">
</p>
<p align="center">
  <a href="https://natsteff.github.io/quiztrekker-us-states/">
    <img src="assets/play-now.svg?v=0.12.0" alt="Play QuizTrekker - US States now — v0.12.0" width="420">
  </a>
</p>

# QuizTrekker - US States

Current release: **v0.12.0** — lifetime points and compact per-game progress.

A browser geography game for all 50 U.S. states, with options to include Canadian provinces, U.S. territories and Washington, D.C., and Canadian territories—for up to 70 locations. Learn silhouettes, flags, postal abbreviations, names, capitals and locations, then practice with multiple choice or typed abbreviations. Shape Challenge and neighbor quizzes cover every enabled location once before starting a new random order. Scores, streaks and explored locations are stored in the current browser.

## Run locally

Requires Python 3.9 or later. No package installation is needed.

```sh
python3 scripts/build.py
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:8000. Serve only `dist`, which contains the playable static application. Build identity is in `dist/build.json`.

Swipe or use Previous/Next in Learn Mode; tap a card to flip it. The state selector jumps directly to any state. The shape challenge accepts two-letter postal abbreviations without regard to case. Each answer scores once; a miss resets the current streak. A correct answer earns 100 points plus 10 for each additional consecutive answer, capped at a 100-point bonus. Results show the answer and points separately, including the base 100 and streak bonus. Correct answers receive a brief celebration, with milestones every five consecutive correct answers and at the end of a Shape/Neighbors round. Reduced-motion preferences are respected. The personal best is the largest cumulative score reached during a visit; returning visits start a new score while retaining streak and history.

Shapes fit their cards by default without stretching or rotation. “Compare at map scale” uses a common map-coordinate scale for all silhouettes. Alaska and Hawaii use the source map’s insets; Alaska is reduced. Small islands and borders reflect the source's cartographic simplification.

Progress is specific to this browser and origin. Clearing browser data removes it. If storage is blocked, the game continues for the visit and displays a notice. There are no accounts or network score services. The first online visit caches the bundled game for offline play. Browser storage eviction can remove saves and cached files; use Export save to keep a backup.

## Checks

```sh
python3 -m unittest discover -s tests -p 'test_*.py'
node tests/core.test.cjs
node tests/pwa.test.cjs
node tests/games.test.cjs
node tests/rounds.test.cjs
node tests/updates.test.cjs
node tests/learning.test.cjs
node tests/results.test.cjs
node tests/map-quest.test.cjs
node tests/sprint.test.cjs
node tests/progress.test.cjs
node tests/shape-clue.test.cjs
node tests/welcome.test.cjs
```

The Python tests cover the 50-state data build and representative geometry. The JavaScript tests cover scoring, streaks, answer normalization, saved practice history and storage failures. JavaScript tests require Node (only tests require it).

## Geography attribution

Boundary data: [US Atlas 3.0.1](https://github.com/topojson/us-atlas), derived from the U.S. Census Bureau’s 2017 cartographic boundaries, projected with Albers USA. The pinned TopoJSON is in `data/`; `scripts/build.py` decodes its arcs to bundled SVG paths, retaining all rings and the original map coordinates. Copyright 2013–2019 Michael Bostock, ISC license; see [license](dist/US-ATLAS-LICENSE.txt). Names, abbreviations and capitals are maintained in `data/states.tsv`.

## Mobile installation and backups

Phones start in Card view: one large flashcard fills the available game area, with Learn, Play and My Progress controls at the bottom. Overview switches to the wider dashboard; the chosen view stays on this browser. My Progress contains scores. The top-right gear opens Options for backups, settings and installation help. Buttons use bold colors, tactile borders and large touch targets. Card geometry remains accurate. On iPhone, use Safari’s Share → Add to Home Screen; on Android, use the browser’s Install app/Add to Home screen menu. Installation availability depends on the browser. HTTPS or localhost is required for offline setup. After the offline-ready message appears, the bundled game can reopen without a connection. Updates apply at startup, or through Options → Game settings → Update & Reload when a download is ready.

Export save downloads a versioned JSON backup. Transfer that file yourself to another device and choose Import save. A validated summary and confirmation precede replacement; import restarts the current visit’s challenge score. Malformed, oversized and unsupported-version files are rejected. Save files are processed entirely on the device. Import replaces rather than merges progress; export first to retain the old journal.

## GitHub Pages preparation

Publish the **contents of `dist/`** as a static Pages artifact. All asset URLs, manifest scope/start URL and service-worker scope are relative, supporting a project path such as `/quiztrekker-us-states/` without code changes. The worker caches only bundled game assets and deletes only older caches for its own project path. The GitHub Actions workflow tests and rebuilds the game, verifies reproducibility, and publishes only `dist/` to Pages when `main` changes. Verify install/offline behavior on the final HTTPS URL before release.

Physical iPhone/Android checks remain necessary for home-screen installation, soft-keyboard behavior, safe areas, larger system text and touch gestures. Browser viewport checks alone do not establish physical-device compatibility.

## State facts and mini-games

Flip a Learn card to see up to four fact groups. In **Options → Card Facts**, uncheck a group to make room for another; Restore Defaults selects U.S. statehood, nickname, population/rank and area/rank. The flag always appears beside the state image on the flipped card and does not use a fact slot. Choices stay in this browser. **More Facts** is always beside the state name and shows the unselected groups, ten largest cities/communities, a selected NPS landmark and neighboring states. Fact choices are separate from the progress JSON backup.

In **Play**, choose Shape Challenge, Population Showdown, Size Showdown, Neighboring States or Statehood Timeline. Showdowns compare July 2025 state populations or Census 2010 total area (land + water). Neighbors include shared land/river borders and exclude lake-only, ocean-only and corner-only contact. Alaska and Hawaii have no neighboring U.S. states. Every question has one correct answer; answers reveal the figures or complete neighbor list. All games contribute points/streaks; only Shape Challenge answers update per-state practice history.

See the in-app [Image/Data Credits](https://natsteff.github.io/quiztrekker-us-states/credits.html) for exact Census/ACS vintages, Hawaii and Rhode Island geography exceptions, CRS statehood dates, Flagpedia attribution, symbol references and map licenses. No live data service, Census API key or external flag request is needed during play. Cached credits work offline; outbound source/landmark links need a connection.

Fact data is checked into `data/state-facts.json`; `scripts/build.py` packages it and all 50 original SVGs from `public/assets/flags/`. To refresh the pinned sources, run `python3 scripts/refresh_facts.py --download`, review changes and source vintages, run tests, then rebuild. This maintenance operation uses the network and is separate from the normal offline build. See [data methods](data/README.md).

## Rounds, timelines and startup updates

Showdowns accept either the large state card (including its flag/image) or its answer button. Each question scores once.

Shape Challenge and Neighboring States have independent shuffled 50-state decks. A state is completed after an answer, including a miss. The next cycle uses a new shuffled order, avoiding an immediate repeat across the boundary. Deck order/position is saved locally; reloading or switching games resumes the current unanswered state. ONE/ALL neighbor modes share one deck. Old practice counts remain, but no state receives an early repeat. Deck positions are device-local and separate from the exported progress backup.

In Neighboring States, choose **ALL neighbors**, toggle every correct state, then Check. Every correct neighbor plus at least two incorrect states is offered; None is an additional separate choice. The default 50-state pool currently has 11 options, accommodating eight neighbors, two incorrect states and None. “None — no neighboring states” is exclusive and handles Alaska/Hawaii. Partial sets or extra wrong selections do not count as correct.

Statehood Timeline gives four states per round. Tap them from earliest to latest admission date, use Undo/Clear to revise, then Check. Same-date states (North/South Dakota) are accepted in either order. Reference dates come from the existing CRS-backed statehood data; original 13 dates mean Constitution ratification.

**Options → Game settings → Auto-update on startup** is enabled by default. It checks/stages the offline worker without the browser HTTP cache and applies a fully installed waiting update during a short pre-play window. A successful activation reloads once; ongoing quizzes are never forcibly reloaded. Offline/slow checks fall back within eight seconds, or choose Play now. Turning the setting off stops the app's automatic startup apply/reload; the browser may still stage service-worker updates and activate them after all game windows close. An existing pre-0.5 installation may need one online visit followed by closing/reopening all game windows to receive this new updater.

Questions appear directly below the game controls and before the choices. Showdowns use only the two large state cards as answer controls. ALL Neighbors retains a smaller state silhouette above its ten choices, with scrolling on short screens. Timeline marks the chosen state buttons with selection numbers 1–4; Undo/Clear revises that sequence without a separate list of slots.

Capitals are always labeled on both sides of Learn cards, using USGS National Map capitol-building coordinates and the same Albers USA projection as the outlines. All 50 points are checked against their displayed state polygons. The logo is static. Mobile devices start in Card view; enable **Options → Game settings → Show view switcher** to access Overview. Each Shape Challenge and Neighboring States variant has its own entry in the Game menu.

Existing browser progress and preferences are retained on the same GitHub Pages origin. New backups use the QuizTrekker - US States name; earlier StateQuest version 1 backups remain importable. Home-screen installations made at the former URL should be added again from the new URL. The home-screen icons and favicon artwork are unchanged.


## Optional geographic expansion

In **Options → Choose Locations**, independently enable **U.S. Territories & Washington, D.C.** (+7), **Canadian Provinces** (+10), or **Canadian Territories** (+3). All default off; the original 50 states remain enabled. All options together provide 70 locations. Settings and progress stay on this device; disabling a pack preserves its explored records and each scope’s saved deck.

Learn, both Shape Challenge variants, and neighbor rounds use the selected pool. Statehood Timeline always uses only U.S. states. Population Showdowns compare locations with the same reference date; expanded Size Showdowns use land area, with source vintages disclosed. The default state-only Showdowns retain their existing data and rules. UM is one collective entry with nine shoreline insets and no common capital; it has no bundled comparable numeric Showdown totals. Non-state profiles omit statehood/admission order and other inapplicable facts rather than filling them with invented values. Existing 50-state facts, ranks, flags and capital points are retained.

Expansion boundaries/facts come from the U.S. Census Bureau, USGS, NOAA, Statistics Canada, NRCan, Canadian Heritage, and D.C. government. Sources, projections, census dates, generalization methods, and GSHHG LGPL notices are documented in **Image/Data Credits**. All assets work offline after an online load.

Learn fronts include a small locator beside the close-up shape. Shape / On the Map switches views without flipping; tap the image for facts. Options → Game settings → Default Learn view saves the starting view on this browser. The full map also retains a capital close-up. U.S. states use the U.S. map with Alaska/Hawaii insets; Canadian locations use Canada. Other optional locations retain their documented local outline/insets.

The gear toggles a separate Options card and returns to the previous activity; Close Options does the same. My Progress opens its own stats card. Double-tap browser zoom is disabled with touch-action manipulation while pinch zoom remains available. Neighbor results show a geographic map with labeled neighbors after correct or wrong answers, including neighbors outside enabled packs.

Highest Point replaces the redundant Location Map fact option. It shows the point’s name and approximate elevation in feet/meters for every U.S. state, on the card when selected or in More Facts otherwise. Existing Location Map selections migrate to Highest Point; the default four selections stay unchanged. Learn’s front locator and map view remain available. See Image/Data Credits for reference vintages and Alaska’s updated elevation. Optional non-state locations omit highest point until sourced.

## Mastery, Map Quest and fact comparisons

Mark/unmark a location with the Learn trophy. First marking prompts before switching the Learn bar to Mastered; Options can switch it back to Explored. My Progress always shows both metrics against the enabled geography pool, independent of practice exclusions. Manage mastered locations there even when hidden from Learn. Mastery and cumulative post-mark failures travel in the existing version1 JSON backup; legacy backups start with no mastered locations. After every three additional wrong answers about a mastered location, an in-game prompt offers removal. Keeping mastery retains the count and prompts after another three failures; removing/re-marking clears its count. Shape, Map Quest and neighbor misses count against the target. Showdown misses count against both compared locations; Timeline misses count against locations involved in ordering inversions (same-date ties accepted). Correct answers do not reset these cumulative failures.

Options can exclude mastered locations from Learn and game question/answer pools, except that ALL Neighbors retains mastered neighbors and distractors from enabled geography so its full answer set is available; existing geography progress is retained. If a game lacks enough eligible locations or comparable values, it offers to include mastered locations again. All available geography stays visible for context maps and fact-reference comparisons. Map Quest uses eligible U.S. states only: preview a state on the map (or use Tab/Enter), then press Submit answer. Alaska and Hawaii use the existing insets. Wrong answers reveal target yellow and the wrong choice red. Points follow the existing100 +streak-bonus formula.

Neighbor results use a common geographic map: target yellow, selected correct green, missed eligible neighbors blue, incorrect selections red, other/reference neighbors blue. ONE mode leaves unasked neighbors blue. Labels use postal abbreviations with full names in the key. Cross-border maps reproject pinned U.S. and Canadian outlines to a shared geographic frame; U.S.-only maps retain the familiar source map/insets. This replaces disconnected silhouette cards.

Tap a fact tile in flipped Learn or More Facts to open a comparison popup. It includes all supported locations with that fact, regardless of enabled packs or mastery filters. Numeric facts sort by value (statehood by admission order); other facts sort by location name. All can switch to location-name order. Population values sort highest to lowest across all available locations, with source/reference dates still visible. Sources/vintages and area definitions remain visible. Unavailable numeric facts are omitted. Highest Point replaces Location Map, keeping front Learn maps unchanged. Keyboard focus uses a blue dashed indicator instead of red outlines. Timeline selections can be removed individually by tapping again, compacting later positions; Undo still removes the last remaining selection.

### v0.9.1 result corrections
ALL Neighbors chooses targets from the practice pool but answers from the full enabled geography: mastered neighbors remain required and selectable. All correct neighbors plus at least two incorrect locations are always offered; None is separate. Results distinguish Correctly selected (green), Missed (red), Incorrect choice (red), and unselected distractors (neutral), matching the map. ONE mode is unchanged.

Timeline results show a green correct prefix, red first mistake, and neutral remainder, with “first X of Y in order.” Same-date states remain interchangeable. These colors do not alter round points or mastery attribution. Population comparison rank/value order is descending population across dates, with location-name ties and source dates retained; alphabetical mode remains available.

### v0.9.2 updates and map controls
Options → Game settings has Check for Updates Now and, when a downloaded update is ready, Update & Reload. Manual checking works with automatic checks disabled. Automatic checks run on startup and quietly on foreground/background-cache resume, throttled to once per minute. Only startup or an explicit Update & Reload can apply/reload; ongoing questions are never automatically interrupted. Checks time out after eight seconds; offline play stays available. Reloading returns to Learn and resets the visit score while preserving saved progress/mastery.

Neighbor quizzes, facts and maps use land/river adjacency, excluding lake-only/ocean-only pairs consistently, including MI–MN, MI–IL, NY–RI, ON–OH and ON–PA. MI–ON and ordinary river neighbors remain.

Map Quest results color the original main map: correct green, incorrect choice red, intended target yellow after a miss. There is no second result map. Double-tap an area to zoom without submitting either tap; a single pointer tap previews a choice after a brief double-tap recognition interval. Zoom +/− and Full map work with keyboard or touch. Drag a zoomed map to pan. Small-state results automatically frame target and choice; Zoom target/Zoom your choice buttons help when those states are far apart. Next question resets to the full map. Map-local zoom does not change browser/page zoom behavior.

### v0.9.3 Map Quest answer confirmation
Map gestures never grade an answer. Tap (or keyboard Enter/Space) to preview a state with a neutral dashed outline, change/clear that preview freely, then press Submit answer to grade once. Submit is disabled until there is a preview and while a map gesture is pending. Double-tap zoom and drag pan preserve the previous preview without selecting another state; zoom controls cancel pending taps. Navigation no longer produces yellow hover fills. Green/red/yellow are reserved for submitted results. Each new question starts with no preview.

### v0.9.4 Map Quest identity concealment
Before submission, selected regions show only a neutral outline and “Press Submit answer to check your selected region.” Map regions have generic numbered accessibility labels and no identifying tooltips or abbreviations. The question still names the intended target. State identities, titles and result labels are revealed only after Submit answer. Tap/clear/zoom/pan and explicit grading are unchanged.

### v0.9.5 welcome and installation help
The logo welcome screen appears once per browser/device after the startup updater finishes. Close, Escape or Let’s explore records dismissal; it can be reopened from Options → Game settings → View welcome & installation help. Installation instructions are shared with Settings from one source. Standalone/home-screen launches suppress the installation recommendation while retaining the first-visit introduction.

Returning mobile browser visits show a compact home-screen reminder. Close dismisses it for that visit; Don’t show again persists on that browser. It never appears in standalone mode and hides after a supported appinstalled event. Standalone detection describes the current launch, not installation elsewhere. Welcome/reminder preferences are browser-local and separate from progress backups. If browser storage is unavailable or cleared, first-visit detection cannot persist.

### v0.9.6 compact Map Quest

Map Quest uses one selection instruction and lets players change their choice by tapping another region. After submission, selection instructions, Submit, and zoom buttons disappear. Next question appears above feedback; result colors and automatic small-state framing remain.

### v0.10.0 State Sprint and game navigation

The game menu is now Shape Spotter (multiple choice), Postal Pro (typed abbreviation), State Sprint, Map Quest, Population Showdown, Size Showdown, Statehood Timeline, One of my Neighbors, and All my Neighbors.

State Sprint asks how many locations you can identify correctly in 60 seconds. Start begins a three-second countdown. A fresh shuffled pool visits every eligible location before repeating, using Choose Locations and mastery exclusions. Questions offer up to four names. Correct/wrong feedback lasts 0.65/1.1 seconds and the round clock keeps running; there is no per-question timeout or Next button. Sprint scoring starts at 100 per correct answer plus a round-local streak bonus (10 for each additional consecutive correct answer, capped at 100). Its results show correct/attempted, accuracy, points, longest streak and a separate best correct count for that exact location pool. Sprint bests live on this device separately from progress exports. Per-location answer history and mastery failures are tracked; mastery review prompts wait until the round ends. Sprint does not change untimed scores/streaks.

Pause, backgrounding the app, Learn, Settings and My Progress pause a round; Resume Sprint explicitly continues it. Changing game or location pool discards the unfinished Sprint. The final unanswered question is not a miss. After answering a neighbors question, Next question and the detailed result map appear directly under the game selector, above the original question and answer choices.

### v0.10.1 Neighbor result colors

Red now identifies incorrect selections only. All my Neighbors shows missed required neighbors in blue on the map and answer buttons. One of my Neighbors never marks unselected neighbors as missed; they remain blue for reference. Both modes keep the target yellow and correct selections green, with mode-specific legends and explicit answer labels. Ordinary map background remains light blue.

### v0.11.0 Sprint modes, progress and ranks

Learn/More Facts ranks are bold and larger, separately from dates and source notes. State Sprint offers a 60-second Quiz using the eligible practice pool and a 120-second Challenge covering all 50 U.S. states, including mastered states, once each. The Challenge stops after 50 answers or 120 seconds. Completed all 50 and Perfect 50/50 are distinct results, with separate fastest completion records. Countdown is centered and enlarged. Scoring, pauses, feedback timing and late-submit protection remain the same.

My Progress retains Explored/Mastered and overall untimed stats and adds separate Sprint mode/pool bests, points, longest streak, dated recent runs and Challenge completion times. Other games now track their own correct/answered, accuracy, current/longest streak, total points and last 10 answer results, starting with this update. Sprint retains the last 20 runs per pool for the 12 most recently recorded mode/pool combinations, with best summaries retained within those pools. Prior Sprint correct-count bests migrate once without inventing history. All new results are included in the existing version-1 progress export; old backups remain importable. Unfinished/abandoned Sprints do not create a completed-run entry. Timers exclude countdown and paused time; feedback counts toward the limit and the final Challenge answer ends the run immediately.

### v0.11.1 shape clues and compact layouts

Wyoming and Colorado silhouettes now include a small U.S. locator in games, including Shape Spotter, Postal Pro and both Sprint modes. The clue highlights geographic position without naming the answer; both states remain valid answer choices. Learn already provides geographic context. Area facts retain the total and bold rank with Land and Water on separate lines, removing the redundant Total area label. The Settings sources/credits/methods link is last. Sprint mode selection uses shorter copy and removes its bottom explanation; rules, mastery inclusion and scoring are unchanged.

### v0.12.0 lifetime points and compact progress

The Play header always shows saved lifetime points across all games, including Sprint. Points are saved after each answer, so unfinished Sprint earnings survive switching games or reloading. Sprint correct counts remain below the header. My Progress shows the same lifetime total, then games in dropdown order with lifetime points and best game scores; Sprint's two modes appear together inline. Legacy overall untimed score/streak displays, Try This, and answer/run history lists are removed. Best summaries, accuracy and per-game streaks remain. Untimed best game scores track the current uninterrupted visit to each game; switching games or reloading starts a new attempt while lifetime earnings persist. Completed Sprint rounds update best results without adding their earned points a second time.

Old per-game totals migrate exactly. Old retained Sprint run points (or the known best where larger) provide recoverable Sprint totals; older missing/evicted runs cannot be reconstructed. An older combined untimed best contributes only the portion not already covered by per-game totals, shown as earlier points without a game breakdown. Migration is idempotent, and both new totals and compact best records are included in backups. Older backups with histories remain importable; those histories are validated during import, used to recover points, then discarded. No new histories are stored.
