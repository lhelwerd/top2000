# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and we adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.2025] - Unreleased

### Added

- Add logo and Web app manifest for progressive web app installation (GH-31)
- Toggle to switch between dark and light mode themes (GH-54)
- Pagination input box to scroll to specific position (GH-53)
- Script to compare JSON dumps from different readers (GH-16)
- Tab URL contains year to indicate data source (GH-35)
- Option to upload chart dump (GH-14)
- Options for CSV row skip and delimiter in case of localized Excel export
- Script now be run with `uv run top2000 <arguments...>`
- Analyze code style in GitHub Actions
- Parse and output multiple years if reader supports it
- Output and display old year charts (GH-11)

### Changed

- Indicate start of hour in table chart if timestamps are available (GH-56)
- Adjust title of Web application when current track changes
- Display extra lines in progression chart to indicate current year and 
  position 2000 in case the year has more than 2000 tracks
- Display more complete timestamp for older year charts
- Reduce number of pagination links when a year has more than 2000 tracks
- Store current year position in field to allow older years to output it as 
  well as later years for progression charts and latest year position in table 
  column of Web application (GH-44)
- Read CSV/JSON for all years, including one with overwritten tracks that is 
  fixed by normalization replacements
- Avoid issues regarding collision detection from position field detection and 
  multiple CSV/JSON reading for same year
- Store timestamp and album version in year-specific fields to output correct 
  ones for each year (GH-43)
- Correct collision detection with old overview files adding position fields to 
  multi-year position information

### Removed

- Dropped support for Node 20

### Fixed

- Adjust table header offset when header container size changes or when it does 
  not fit on one line on full-to-ultra-HD desktops in older year charts (GH-62)
- Correct full-page display of next track on larger screens sometimes becoming 
  offset to the left and showing other pagination links
- Avoid error in Web application from missing fields, such as links
- Avoid mutating output field between years when it is a mapping
- Avoid missing title data for tracks in De Extra 500 (GH-46)
- Correct charts to work with missing data in some dumps
- Avoid error from missing artist chart when artist/title combinations for 
  certain tracks/years/readers do not have their charts filled in
- Exclude "(page does not exist)" from links to non-existent Wiki pages (GH-39)
- Skip duplicate tracks in artist chart from individual + artist search (GH-18)
- Correct charts to work with incomplete year (GH-28)
- Avoid recompile loops in Web app development mode
- Keep search box and other position in artist charts when clicking on a search 
  result to jump to another progression chart (GH-17)
- Avoid collision detection issues if latest year is incomplete
- Display an incomplete year with correct pagination
- Wiki reader now has a descriptive `User-Agent` header to avoid HTTP 403 error 
  on GitHub CI (GH-20)

## [0.0.2024] - 2025-01-01

### Added

- Publish JSON schema
- Credits of readers to be output in JSON dump
- GitHub Actions workflow to build, collect data and publish Web application
- Web application to view chart data of current year, with responsive design, 
  pagination links, highlight/autoscroll of currently playing track/countdown 
  if timestamps are available, track progression chart, subtables for artist 
  charts with linked titles, enabling toggling of additional lines with 
  position points in progression chart and symbol legend correspondence with 
  jump to other track chart, search dialog/subchart with track/artist lookup, 
  tabs for chart statistics of top 10 bars/histograms and usage info/credits
- Web application can be built as a single file for distribution without server 
  or using external manifest to load updated application with local data
- Add Wiki reader for Dutch Wikipedia page of all Top 2000 charts, with caching 
  and artist/title link parsing/normalization
- Support a JSON filtered dump as output format, used by Web application
- Support multiple readers and multiple output formatters which are able to 
  combine data from a primary reader and extra readers, with more arguments to 
  script entry point for readers, outputs, and old year argument reordering

### Removed

- Dropped support for Python versions before 3.11

### Changed

- Improve collision detection for tracks in the current year with different 
  positions but similar artists/titles
- Do not use older year position data when reading old years except for the 
  first overview CSV year
- Validate if positions are ordered properly and not missing in JSON output
- Use previous field for previous year position if the latter is missing
- Use replaced artist part as alternative for chart grouping
- Improve album version detection and track title normalization
- Allow CSV data to clean up incorrect JSON data during collision detection
- Make it possible to reinstate rejected track/artist key combinations for 
  certain readers, like Wiki
- Use rejected track/artist key combination for artist charts, but perform 
  filtering to avoid duplicate charts with a relevance filter, tracks for 
  separator characters and weird splits/combinations of artists

### Fixed

- Avoid including year too early in merged data from years, ignoring collisions
- Improve ordering of track/artist key combination
- Reading De Extra 500 as an old fractional year for merging with the old year 
  main chart with position offset and correct read order
- Ensure track year is mapped to a normalized naming through field mapping and 
  works for old year charts

## [0.0.2023] - 2023-12-23

### Added

- Support reading supplementary CSV files with chart positions beyond 2000, 
  such as De Extra 500
- Add usage output when script arguments are unrecognized

### Changed

- Use normalized replacement for track title without parenthesis suffix if any
- After a full artist replacement, split the artist to detect groups

## [0.0.2022] - 2022-12-20

### Added

- Detect album version identifier and indicate with symbol in output
- Consolidation of settings for multiple output formats, such as single-column 
  and double-column presets

### Changed

- Read new JSON file with different track/position structure and field mapping
- Detect timestamp in new JSON files, indicate in additional row for old years 
  or in a separate column in single layout
- If multiple artists worked on a song and they have the same number of tracks 
  then use the chart of the artist where the track is placed the lowest in the 
  chart (so more relevant tracks before it)
- Exit code reflects validation issues with normalizing/formatting

### Fixed

- Read CSV/JSON files in proper encoding

## [0.0.2021] - 2021-12-16

### Changed

- Read JSON files with different field names via field mapping and row lookup

### Fixed

- Avoid error in collision detection

## [0.0.2020] - 2020-12-29

### Changed

- Display hour breakpoint as separate row in CSV output

### Fixed

- Original artist (with limited replacements) is now the preferred alternative
- Improve collision detection for duplicate position to only handle current
  year or year already stored in data
- Old collect timestamp for current year chart
- Prefer reading JSON over CSV for older year charts

## [0.0.2019] - 2019-12-27

### Added

- Support for Python 3
- Read latest year from JSON file and validation of previous year position

### Removed

- Dropped support for Python 2

### Changed

- Convert to UTF-8 encoding, clean up special characters beforehand

### Fixed

## [0.0.2018] - 2018-12-27

### Added

- Support for reversed output
- Validation output with summary of problematic or missing tracks

### Changed

- More collision detection and resolution

### Fixed

- Only update current year's artist/title combination to best normalized form

## [0.0.2017] - 2017-12-24

### Added

- Collect timestamp data
- Track artist charts to display how many more songs the artist has; if 
  multiple artists are detected for a track, then only the artist with the most 
  tracks in that year's chart is mentioned

### Changed

- More normalization replacements for special characters, no-split artist
- Handle collisions between similar artist and track combinations
- Prefer adding data to the normalized artist/title combination for recent year
- Formatter to add year into artist column instead of separate column

## [0.0.2016] - 2016-12-21

### Added

- Python CSV parser, including overview from previous years
- Find same title and artist based on normalization
- CSV writer of double-column headers, rank changes and returning tracks

## [0.0.2014] - 2014-12-25

### Added

- Spreadsheet preprocessor macro to add number of places that a track has risen 
  or fallen compared to the previous year.

[0.0.2025]: https://github.com/lhelwerd/top2000/compare/v0.0.2024...HEAD
[0.0.2024]: https://github.com/lhelwerd/top2000/releases/tag/v0.0.2024
[0.0.2023]: https://github.com/lhelwerd/top2000/releases/tag/v0.0.2023
[0.0.2022]: https://github.com/lhelwerd/top2000/releases/tag/v0.0.2022
[0.0.2021]: https://github.com/lhelwerd/top2000/releases/tag/v0.0.2021
[0.0.2020]: https://github.com/lhelwerd/top2000/releases/tag/v0.0.2020
[0.0.2019]: https://github.com/lhelwerd/top2000/releases/tag/v0.0.2019
[0.0.2018]: https://github.com/lhelwerd/top2000/releases/tag/v0.0.2018
[0.0.2017]: https://github.com/lhelwerd/top2000/releases/tag/v0.0.2017
[0.0.2016]: https://github.com/lhelwerd/top2000/releases/tag/v0.0.2016
[0.0.2014]: https://github.com/lhelwerd/top2000/releases/tag/v0.0.2014
