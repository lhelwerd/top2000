# NPO Radio 2 Top 2000 data reader, parser and output formatter

This repository contains a Python module for reading several files related to 
the NPO Radio 2 Top 2000 from different years. The data is parsed, normalized, 
formatted and output for custom reporting. This includes comparisons with 
earlier years to track increase or decrease of track chart ranking as well as 
later comebacks of a track. We also report on per-artist charts so that we can 
see whether an artist has more tracks in the current list and how the track 
performs, with consideration for collaborations and individual artist charts.

## Requirements

The module is written for recent Python versions, currently Python 3.11 and 
later is supported. The intention is to have few (if any) package dependencies.

Necessary data files for different years were previously obtainable from the 
[NPO Radio 2 Top 2000](https://www.nporadio2.nl/top2000) website. However, 
downloads for older years might no longer be available there. We make use of 
several input formats:

- We read CSV files which are based on the Excel (.xlsx) downloads from the 
  official website.
- We read JSON files which are obtained from the API that feeds the official 
  website with the chart list.

We combine data from these input sources to improve upon detection of the same 
track across years, normalization of artist and track names and preference of 
display of these texts between the files.

## Running

In this repository, use `python -m top2000` to run the module to read the files 
and output charts.

This repository contains some settings files which may be customized in order 
to adjust the normalization and formatting of this module. The following 
settings files are considered:

- `fields.toml`: File reading settings for different years of chart files, with 
  subfields for JSON and CSV fields.
- `fixes.toml`: Groups of lists and mappings of character sequences to adjust 
  when finding alternative writing forms and preferred names of tracks and 
  artists, which help with combining data of charts from different years or in 
  different formats as well as external data.
- `output.toml`: Formatting settings for different output formats, such as 
  a multi-columnar CSV layout.

In order to validate JSON files from APIs and TOML setting files, first install 
`check-jsonschema` with `pip install check-jsonschema==0.30.0`, then run 
`./validate_schema.sh` in this repository.

## License

The module is licensed under the MIT License. See the [license](LICENSE) file 
for more information.
