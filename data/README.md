# State facts: data methods

The bundled `state-facts.json` contains 50 records keyed by USPS abbreviation and 500 ranked place/community entries. Source vintages are deliberately fixed; updates require review. `source-manifest.json` records exact download URLs and SHA-256 hashes of source inputs at refresh time. Download caches in `data/sources/` are ignored. Normal builds read checked-in facts and require no network or API key.

## Definitions and exceptions

- Population: Census PEP Vintage 2025, July 1, 2025, `NST-EST2025-ALLDATA.csv`, `SUMLEV=040`, field `POPESTIMATE2025`. Only the 50 states. Rank descending; no DC or territories.
- Cities/communities: PEP Vintage 2025, July 1, `sub-est2025.csv`, `SUMLEV=162`, official place names in the stored data. The UI removes the Census-added trailing “city” or “city and borough” designation for readability, preserving names such as Salt Lake City and qualifiers such as (balance). Unique statewide place IDs; descending population, then place ID for ties. Consolidated-city balance areas remain legal place-level populations, not metropolitan statistical areas. No county totals or MSA records are selected.
- Rhode Island: only eight incorporated places. Select `SUMLEV=061` cities and towns (municipal county subdivisions) for its top ten, without also selecting their duplicate place rows. Explicitly labeled in the UI/credits. Other New England lists use incorporated places, not all municipal towns.
- Hawaii: no conventional incorporated municipalities. Use all Hawaiian CDPs in the official 2020–2024 ACS five-year summary file, `B01003_E001`, paired with geography names using `GEO_ID`. Source files are streamed to retain only `1600000US15...` rows. The Census API currently requires a key; summary-file downloads avoid that dependency. Lists rank published point estimates and are labeled as ACS period estimates, not 2025 point estimates. Margins of error exist and can affect close rankings; this list does not claim statistical significance.
- Area: Census 2010 state area table, total/land/water in rounded square miles. Total-area rank includes water. Independent rounding may cause land plus water to differ from total by one square mile.
- Statehood: `statehood.csv`, normalized to ordinary CSV newlines. All 50 dates and orders checked against CRS R47747 Table 1. Original 13 states use Constitution ratification dates; later states effective admission dates. ND/SD share a date, retaining conventional order39/40.
- Neighbors: shared arcs in US Atlas 3.0.1, plus water-only MI–IL, MI–MN and NY–RI boundaries omitted by coastal clipping. Corner-only AZ–CO and NM–UT are excluded. Symmetric lists; AK/HI empty. Definitions appear in-game.
- Bird/flower/motto: factual names and designations adapted from the linked Wikipedia reference tables (contributors, CC BY-SA4.0 for adapted text). Multiple official designations are retained, unofficial/traditional status labeled; nicknames are one selected common example, checked against reference names. No general prose or photos are copied.
- Landmarks: one selected NPS site per state, sourced to the official linked park page. These are illustrative, not a ranked “most famous” claim. `landmark-source-audit.json` records the reviewed official page titles and successful URL responses.
- Flags: complete Flagpedia SVG package from `https://flagcdn.com/us-svg.zip`, mapped to uppercase USPS abbreviations in `public/assets/flags/` without rewriting SVG content. Public-domain offering, Wikimedia Commons-based. Package page last updated February6,2026; fetched November14,2026. Minnesota2024, Mississippi2021 and Utah2024 designs visually checked and linked to official state sources in credits. Layout preserves intrinsic proportions.

## Refresh

```sh
python3 scripts/refresh_facts.py --download
python3 scripts/build.py
python3 -m unittest discover -s tests -p 'test_*.py'
node tests/core.test.cjs
node tests/games.test.cjs
node tests/pwa.test.cjs
```

Refresh uses pinned vintages; it does not automatically select a new year. Review Census schema, all50 populations/ranks, the500 place rows and geography exceptions, symbols, flags and source/usage notes before committing. Historical statehood, nickname selections and curated NPS sites are checked-in inputs. Source year/method labels in the UI/credits must change together with any dataset vintage.

The source and license links are maintained in the app's **Image/Data Credits** page, designed to grow with new datasets and artwork.
