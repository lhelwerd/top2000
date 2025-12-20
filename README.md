# NPO Radio 2 Top 2000 data reader, parser and output formatter

This repository contains a Python module for reading data sources related to 
the NPO Radio 2 Top 2000 from different years. The data is parsed, normalized, 
formatted and output for custom reporting. This includes comparisons with 
earlier years to track increase or decrease of track chart ranking as well as 
later comebacks of a track. We also report on per-artist charts so that we can 
see whether an artist has more tracks in the current list and how the track 
performs, with consideration for collaborations and individual artist charts. 
Supported output formats are a CSV spreadsheet for condensed printing and JSON 
which feeds a Web application built in Node.js for interactive browsing.

## Requirements

The module is written for recent Python versions, currently Python 3.11 and 
later is supported. The intention is to have few (if any) package dependencies.

The Web application is written for recent Node.js versions, currently Node 22 
and later is supported. The Web application makes use of Bulma and D3.js for 
presentation, MiniSearch for search and several Webpack dependencies for 
bundled compilation.

### Top 2000 data

Necessary data files for different years were previously obtainable from the 
[NPO Radio 2 Top 2000](https://www.nporadio2.nl/top2000) website. However, 
downloads for older years might no longer be available there (or, if they are, 
they may not be in the format that we expect by default) and the [terms of 
service](https://npo.nl/overnpo/algemene-voorwaarden/algemene-voorwaarden-online) 
of NPO might make it not acceptable to share these files nor provide automated 
methods of obtaining them. We make use of several input formats:

- We read CSV files which are based on the Excel (.xlsx) downloads from the 
  official website. Only the current year's CSV file and the CSV files from 
  older years without JSON files are used; the older years are assumed to have 
  columns named `pos <year>` in them for the chart position for a `<year>`.
- We read JSON files which are obtained from the API that feeds the official 
  website with the chart list.

If you download fresh API responses to JSON files, you might need to adjust 
settings in `fields.toml` in order to properly read them; see details there and 
in the [Running](#running) section.

Another option is reading data from Wikipedia's article on Top 2000s, which 
might be less reliable and different from the NPO data (the data could be more 
curated in some cases or strange adjustments may sneak in; they also make their 
own choices on name formatting).

We combine data from these input sources to improve upon detection of the same 
track across years, normalization of artist and track names and preference of 
display of these texts between the files.

## Running

### Parsing

In this repository, use `python3 -m top2000` or `uv run top2000` to run the 
module to read the CSV and JSON files and output as CSV charts. To instead use 
Wikipedia data, provide arguments to run `python3 -m top2000 wiki csv` to 
output as CSV charts. Caching is used to avoid requesting the API on later 
commands. Finally, it is possible to include both source chart data and 
external data, for example by running `python3 -m top2000 multi wiki json` to 
output as a JSON dump. Additional arguments allow selecting which year to 
output charts for; by default the module attempts to output files for all years 
from end to start.

This repository contains some settings files which may be customized in order 
to adjust the normalization and formatting of this module. The following 
settings files are considered:

- `fields.toml`: File reading settings for different years of chart files, with 
  subfields for JSON and CSV fields. Wiki fields can be used to, e.g., adjust 
  the revision ID with `oldid` field to pin the article version or remove the 
  field to use the latest version (which is still cached).
- `fixes.toml`: Groups of lists and mappings of character sequences to adjust 
  when finding alternative writing forms and preferred names of tracks and 
  artists, which help with combining data of charts from different years or in 
  different formats as well as external data.
- `output.toml`: Formatting settings for different output formats, such as 
  a multi-columnar CSV layout.

### Web application

First install dependencies for the package using `npm install`. Ensure you have 
a suitable JSON dump file for the Web application, such as one generated in the 
[parsing](#parsing) section above with `json` as one of the output formats. 
Then use `npm start` to compile a development version of the application and 
start a local server to host the files. For production, use `npm run build` to 
obtain files for hosting on a server. In order to produce a single file with 
all assets combined which most browsers can open from local filesystems, use 
`npm run single-file`. Then, the `dist` directory contains an `index.html` file 
(and if not using a single-file build, the other assets) for distribution.

### Validation

In order to validate JSON files from APIs, JSON output and TOML setting files, 
first install validation dependencies using one of `pip install .[validate]`, 
`poetry install .[validate]` or `uv sync --group validate`, then run 
`./validate_schema.sh` in this repository.

## License

The module and Web application are licensed under the MIT License. See the 
[license](LICENSE) file for more information.
