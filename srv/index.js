/* jshint esversion: 8 */
const nl = d3.timeFormatLocale({
    dateTime: "%H:%M %d-%m-%Y",
    date: "%d-%m-%Y",
    time: "%H:%M:%S",
    periods: [],
    days: ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"],
    shortDays: ["zo", "ma", "di", "wo", "do", "vr", "za"],
    months: ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"],
    shortMonths: ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"]
});
const formatTime = nl.format("%d %b %H:%M");

const data = await d3.json("output-sorted.json"); // jshint ignore: line
const firstYear = data.first_year;
const currentYear = data.year;

const formatRankChange = (d, position) => {
    const previousYear = currentYear - 1;
    if (previousYear in d) {
        const previousPosition = d[previousYear];
        const diff = Math.abs(position - previousPosition);
        if (position < previousPosition) {
            return `\u25b2${diff}`;
        }
        if (position > previousPosition) {
            return `\u25bc${diff}`;
        }
        return "\u21c4";
    }
    for (let year = currentYear - 2; year >= 1999; year--) {
        if (year in d) {
            return `\u27f2${year}`;
        }
    }
    return "\u2234";
};
const formatArtistChart = (d, position) => {
    if (d.max_artist_key in data.artists) {
        const artistTracks = data.artists[d.max_artist_key];
        const artistPos = artistTracks.indexOf(position) + 1;
        return ` ${artistPos}/${artistTracks.length}`;
    }
    return "";
};

const table = d3.select("#container").append("table")
    .classed("table is-narrow is-hoverable is-striped is-fullwidth", true);
const columns = [
    {
        column: "nr.",
        field: (d, i) => `${i}.`
    },
    {
        column: "artiest",
        field: d => `${d.artist} (${d.year})`
    },
    {
        column: "titel",
        field: (d, i) => `${d.title}${d.album_version ? " \u29be" : ""} (${formatRankChange(d, i)}${formatArtistChart(d, i)})`
    },
    {
        column: "tijd",
        field: d => formatTime(new Date(d.timestamp))
    }
];
table.append("thead").append("tr").selectAll("th")
    .data(columns)
    .join("th")
    .text(d => d.column);
table.append("tbody").selectAll("tr")
    .data(data.tracks)
    .join("tr")
    .selectAll("td")
    .data((d, i) => Array(columns.length).fill(i))
    .join("td")
    .text((pos, i) => columns[i].field(data.tracks[pos], data.positions[pos]));
