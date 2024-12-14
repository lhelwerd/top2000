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
const formatYear = nl.format("'%y");

const data = await d3.json("output-sorted.json"); // jshint ignore: line
const firstYear = data.first_year;
const currentYear = data.year;
const direction = data.reverse ? 1 : -1;

const setCurrent = function(d, i, nodes) {
    const now = Date.now();
    let next = i + direction;
    const isCurrent = d.timestamp <= now &&
        (!(next in data.tracks) || data.tracks[next].timestamp > now);
    d3.select(this).classed("is-selected", isCurrent);
    if (isCurrent) {
        window.requestAnimationFrame(() => {
            this.scrollIntoView({behavior: "smooth", block: "center"});
        });
        d3.timeout(() => {
            if (setCurrent.bind(this)(d, i, nodes)) {
                return;
            }
            while (next in data.tracks) {
                const nextCurrent = setCurrent.bind(nodes[next]);
                if (nextCurrent(d3.select(nodes[next]).datum(), next, nodes)) {
                    break;
                }
                next += direction;
            }
        }, Math.max(data.tracks[next].timestamp - now, 0) + 5000);
    }
    return isCurrent;
};
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
    for (let year = currentYear - 2; year >= data.first_year; year--) {
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
        column: data.columns.position,
        field: (d, i) => `${i}.`
    },
    {
        column: data.columns.artist,
        field: d => `${d.artist} (${d.year})`
    },
    {
        column: data.columns.title,
        field: (d, i) => `${d.title}${d.album_version ? " \u29be" : ""} (${formatRankChange(d, i)}${formatArtistChart(d, i)})`
    },
    {
        column: data.columns.timestamp,
        field: d => formatTime(new Date(d.timestamp))
    }
];
table.append("thead").append("tr").selectAll("th")
    .data(columns)
    .join("th")
    .text(d => d.column);
const rows = table.append("tbody").selectAll("tr")
    .data(data.tracks)
    .join("tr")
    .each(setCurrent);
rows.on("click", function(event, d) {
    const next = d3.select(this.nextSibling);
    if (next.classed("is-info")) {
        next.remove();
        return;
    }
    const pos = d3.select(this.firstChild).datum();
    const cell = d3.select(this.parentNode).insert("tr", () => this.nextSibling)
        .classed("is-info", true)
        .append("td")
        .attr("colspan", "4");

    // Progression chart
    const width = 640;
    const height = 400;
    const marginTop = 20;
    const marginRight = 20;
    const marginBottom = 30;
    const marginLeft = 40;
    const lastDate = new Date(data.year, 0);
    const x = d3.scaleUtc()
        .domain([new Date(data.first_year, 0), lastDate])
        .range([marginLeft, width - marginRight]);
    const y = d3.scaleLinear()
        .domain([data.positions[data.positions.length - 1], data.positions[0]])
        .range([height - marginBottom, marginTop]);
    const xTicks = x.ticks(data.year - data.first_year);
    xTicks.push(lastDate);
    const yTicks = y.ticks(10);
    yTicks.push(data.positions[0]);
    const line = d3.line()
        .defined(d => typeof d[1] !== "undefined")
        .x(d => x(d[0]))
        .y(d => y(d[1]))
        .curve(d3.curveMonotoneX);
    const xAxis = d3.axisBottom(x)
        .tickValues(xTicks)
        .tickFormat(formatYear);
    const svg = cell.append("svg")
        .attr("width", width)
        .attr("height", height);
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(xAxis);
    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y).tickValues(yTicks));
    const linePath = svg.append("path")
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 2);
    const years = [];
    for (let year = data.first_year; year < data.year; year++) {
        const date = new Date(year, 0);
        years.push([date, d[year]]);
        if (year in d) {
            svg.append("circle")
                .attr("fill", "black")
                .attr("r", 4)
                .attr("cx", x(date))
                .attr("cy", y(d[year]));
        }
    }
    years.push([lastDate, data.positions[pos]]);
    svg.append("path")
        .attr("fill", "black")
        .attr("d", d3.symbol(d3.symbolStar))
        .attr("transform", `translate(${x(lastDate)}, ${y(data.positions[pos])})`);
    linePath.attr("d", line(years));
});
rows.selectAll("td")
    .data((d, i) => Array(columns.length).fill(i))
    .join("td")
    .text((pos, i) => columns[i].field(data.tracks[pos], data.positions[pos]));
