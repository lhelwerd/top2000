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
const front = data.positions[data.positions.length - 1];
const end = data.positions[0];

const container = d3.select("#container");
const pagination = container.append("div")
    .style("position", "sticky")
    .style("top", "0px")
    .style("z-index", 10)
    .append("nav")
    .classed("pagination is-centered has-background-info-dark", true)
    .append("ul")
    .classed("pagination-list is-flex-wrap-nowrap", true);
const updatePagination = (current=null) => {
    const pages = d3.ticks(...d3.nice(end, front, 20), 20);
    if (current) {
        const currentIndex = d3.bisectRight(pages, current);
        if (pages[currentIndex-1] !== current) {
            pages.splice(currentIndex, 0, current);
        }
    }
    pagination.selectAll("li")
        .data(d3.map(pages, d => d3.median([d, end, front]))) // Clamp
        .join(
            enter => enter.append("li")
                .append("a")
                .classed("pagination-link", true)
                .on("click", function(event, d) {
                    const posNode = findPositionRow(d);
                    if (posNode) {
                        d3.select(this.parentNode.parentNode)
                            .selectAll(".pagination-link")
                            .classed("is-current", pos => d === pos);
                        container.selectAll("table.main > tbody > tr")
                            .classed("is-link", false);
                        d3.select(posNode)
                            .classed("is-selected", false) // Color contrast
                            .classed("is-link", true);
                    }
                }),
            update => update.select("a"),
            exit => exit.remove()
        )
        .classed("has-background-primary has-text-dark", d => d === current)
        .classed("is-hidden-desktop-only",
            (d, i) => i !== 0 && d !== current && d % 200 !== 0
        )
        .classed("is-hidden-touch",
            (d, i) => i !== 0 && d !== current && d % 500 !== 0
        )
        .text(d => d);
};
const findPositionRow = (d) => {
    const posCell = container
        .selectAll("table.main > tbody > tr > td:first-child")
        .select(function(pos) {
            return d === data.positions[pos] ? this : null;
        })
        .node();
    if (posCell) {
        posCell.scrollIntoView({
            behavior: "smooth", block: "center"
        });
    }
    return posCell.parentNode;
};

const setCurrent = function(d, i, nodes) {
    const now = Date.now();
    let next = i + direction;
    const isCurrent = d.timestamp <= now &&
        (!(next in data.tracks) || data.tracks[next].timestamp > now);
    d3.select(this).classed("is-selected", isCurrent);
    if (isCurrent) {
        updatePagination(data.positions[i]);
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

const findTrack = (d) => {
    return data.tracks[data.reverse ? data.tracks.length - d : d - 1];
};

const stroke = d3.scaleOrdinal(d3.schemeObservable10);
const cycle = stroke.range().length;
const symbolType = d3.scaleOrdinal(d3.symbolsFill);
const symbols = d3.symbol(symbolType, 336);
const fill = symbolType.range().length - 2;
const symbolEmoji = [
    "\u2b24", // Circle
    "\u2795\ufe0f", // Plus
    "\u29eb", // Diamond
    "\u2b1b\ufe0f", // Square
    "\u2605", // Star
    "\u25b2\ufe0f" // Triangle
];
const getChartEmoji = (d, position, positionIndexes=null) => {
    if (positionIndexes && positionIndexes.has(d)) {
        return symbolEmoji[(positionIndexes.get(d) % fill) + 1];
    }
    if (d < position) {
        return data.reverse ? "\u2935\ufe0f" : "\u2934\ufe0f";
    }
    if (d > position) {
        return data.reverse ? "\u2934\ufe0f" : "\u2935\ufe0f";
    }
    return symbolEmoji[1];
};

const columns = ["position", "artist", "title", "timestamp"];
const artistColumns = ["position", "title", "year", "timestamp"];
const fields = {
    position: {
        column: data.columns.position,
        field: (d, i) => `${i}.`
    },
    artist: {
        column: data.columns.artist,
        field: d => `${d.artist} (${d.year})`
    },
    title: {
        column: data.columns.title,
        field: (d, i) => `${d.title}${d.album_version ? " \u29be" : ""} (${formatRankChange(d, i)}${formatArtistChart(d, i)})`
    },
    year: {
        column: data.columns.year,
        field: d => d.year
    },
    timestamp: {
        column: data.columns.timestamp,
        field: d => d.timestamp ? formatTime(new Date(d.timestamp)) : ""
    }
};

const createTable = () => {
    const table = container.append("table")
        .classed("table main is-narrow is-hoverable is-striped is-fullwidth",
            true
        );
    table.append("thead")
        .style("position", "sticky")
        .style("top", "2.5rem")
        .style("z-index", 10)
        .style("background-color", "inherit")
        .append("tr")
        .selectAll("th")
        .data(columns)
        .join("th")
        .text(d => fields[d].column);
    const rows = table.append("tbody").selectAll("tr")
        .data(data.tracks)
        .join("tr")
        .classed("is-clickable", true)
        .each(setCurrent);
    rows.on("click", function(event, d) {
        toggleInfoCell(this, d);
    });
    rows.selectAll("td")
        .data((d, i) => Array(columns.length).fill(i))
        .join("td")
        .text((pos, i) => fields[columns[i]].field(data.tracks[pos],
            data.positions[pos]
        ));
};

class Info {
    constructor(pos, cell, d) {
        this.pos = pos;
        this.cell = cell;
        this.track = d;
        this.setupPositions();
    }

    setupPositions() {
        this.positions = new Map();
        this.years = [];

        const progression = [];
        const lastDate = new Date(data.year, 0);

        for (let year = data.first_year; year < data.year; year++) {
            const date = new Date(year, 0);
            this.years.push(date);
            progression.push(this.track[year]);
        }
        this.years.push(lastDate);

        const position = data.positions[this.pos];
        progression.push(position);
        this.positions.set(position, progression);
    }

    addPositions(d) {
        const track = findTrack(d);
        const chart = [];
        for (let year = data.first_year; year < data.year; year++) {
            chart.push(track[year]);
        }
        chart.push(d);
        this.positions.set(d, chart);
    }

    makeProgressionChart() {
        // Progression chart
        const width = 800;
        const height = 500;
        const marginTop = 20;
        const marginRight = 20;
        const marginBottom = 30;
        const marginLeft = 40;

        this.x = d3.scaleUtc()
            .domain([this.years[0], this.years[this.years.length - 1]])
            .range([marginLeft, width - marginRight]);
        this.y = d3.scaleLinear()
            .range([height - marginBottom, marginTop]);
        const xTicks = this.x.ticks(data.year - data.first_year);
        xTicks.push(this.years[this.years.length - 1]);
        const xAxis = d3.axisBottom(this.x)
            .tickValues(xTicks)
            .tickFormat(formatYear);
        this.svg = this.cell.append("div")
            .classed("column is-narrow", true)
            .style("overflow", "auto")
            .style("max-width", "100vw")
            .append("svg")
            .attr("width", width)
            .attr("height", height);
        this.svg.append("g")
            .attr("transform", `translate(0,${height - marginBottom})`)
            .call(xAxis);
        this.svg.append("g")
            .classed("y", true)
            .attr("transform", `translate(${marginLeft},0)`);
        this.updateProgressionLines();
    }

    updateProgressionLines() {
        const maxPosition = d3.max(this.positions.values(), seq => d3.max(seq));
        const yDomain = data.reverse ? [front, Math.max(maxPosition, end)] :
            [Math.max(maxPosition, front), end];
        this.y.domain(yDomain);
        const yTicks = this.y.ticks(10);
        yTicks.push(yDomain[1]);
        this.svg.select("g.y")
            .call(d3.axisLeft(this.y).tickValues(yTicks));

        const line = d3.line()
            .defined(p => typeof p !== "undefined")
            .x((p, i) => this.x(this.years[i]))
            .y(p => this.y(p))
            .curve(d3.curveBumpX);
        this.svg.selectAll("g.lines")
            .data(this.positions.values(), key => key[key.length - 1])
            .join(
                enter => enter.append("g")
                    .classed("lines", true)
                    .append("path")
                    .attr("fill", "none")
                    .attr("stroke-width", 2),
                update => update.select("path"),
                exit => exit.remove()
            )
            .attr("stroke", (d, i) => stroke(i % cycle))
            .attr("d", d => line(d));
        const points = this.svg.selectAll("g.points")
            .data(this.positions.values(), key => key[key.length - 1])
            .join("g")
            .classed("points", true)
            .attr("font-size", 10)
            .attr("font-family", "sans-serif")
            .attr("text-anchor", "middle")
            .selectAll("g")
            .data((d, i) => d3.cross(d3.filter(d3.map(d, (pos, j) => [pos, j]),
                p => typeof p[0] !== "undefined"
            ), [i], (a, b) => [...a, b]))
            .join(
                enter => {
                    const point = enter.append("g").attr("transform", t =>
                        `translate(${this.x(this.years[t[1]])},${this.y(t[0])})`
                    );
                    point.append("path");
                    point.append("text").attr("dy", "0.32em");
                    return point;
                },
                update => update,
                exit => exit.remove()
            );
        points.select("path")
            .attr("fill", t => stroke(t[2] % cycle))
            .attr("d", t =>
                symbols(t[1] === this.years.length - 1 ? (t[2] % fill) + 1 : 0)
            );
        points.select("text")
            .text(t => t[0]);
    }

    makeArtistCharts() {
        const chartColumn = this.cell.append("div")
            .classed("column is-size-7-mobile", true);
        const chartCell = chartColumn.append("div");

        // Artist charts
        const artists = (
            data.artist_links ? Object.keys(data.artist_links[this.pos]) : []
        ).concat(data.keys[this.pos]);
        const charts = new Map();
        let chartLength = 0;

        d3.map(artists, (artist, i) => {
            chartLength += this.makeArtistChart(artist, i, chartCell, charts);
        });
        if (chartLength > 12) {
            chartColumn.classed("is-narrow", true)
                .style("max-width", "100vw");
            chartCell.classed("columns is-multiline is-centered", true);
        }
    }

    makeArtistChart(artist, i, chartCell, charts) {
        const link = data.artist_links && data.artist_links[this.pos][artist];
        const key = link ? link.toLowerCase() : artist[0];
        const chart = key in data.artists ? data.artists[key] :
            data.artists[data.keys[this.pos][i][0]];
        if (charts.has(chart.toString())) {
            if (link) {
                const artistTitle = chartCell.select(`.chart:nth-of-type(${i})`)
                    .select("p .artist");
                artistTitle.append("span")
                    .text(", ");
                artistTitle.append("a")
                    .attr("href", `${data.wiki_url}${artist}`)
                    .attr("target", "_blank")
                    .attr("title", artist)
                    .text(link);
            }
            return 0;
        }
        else {
            charts.set(chart.toString(), i);
        }
        const column = chartCell.append("div")
            .classed("container column is-narrow chart", true)
            .style("max-width", "fit-content");
        const title = column.append("p")
            .classed("has-text-centered has-text-weight-bold", true);
        if (link) {
            title.append("span")
                .classed("artist", true)
                .append("a")
                .attr("href", `${data.wiki_url}${artist}`)
                .attr("title", artist)
                .attr("target", "_blank")
                .text(link);
            title.append("span")
                .text("\u00a0\u2014\u00a0");
            title.append("a")
                .attr("href", `${data.wiki_url}${this.track.wiki.title_link}`)
                .attr("title", this.track.wiki.title_link)
                .attr("target", "_blank")
                .text(this.track.wiki.title);
        }
        else {
            title.append("span")
                .classed("artist", true)
                .append("span")
                .classed("is-capitalized", true)
                .text(artist[0]);
            title.append("span")
                .text("\u00a0\u2014\u00a0");
            title.append("span")
                .classed("is-capitalized",
                    this.track.title.toLowerCase() !== artist[1]
                )
                .text(this.track.title.toLowerCase() === artist[1] ?
                    this.track.title : artist[1]
                );
        }
        const position = data.positions[this.pos];
        const subtable = column.append("table")
            .classed("table is-narrow is-hoverable is-striped is-bordered",
                true
            );
        subtable.append("thead").append("tr").selectAll("th")
            .data([...artistColumns, ""])
            .join("th")
            .text(d => fields[d] ? fields[d].column : d);
        subtable.append("tbody").selectAll("tr")
            .data(chart)
            .join("tr")
            .classed("is-clickable", d => d !== position)
            .classed("is-selected", d => this.positions.has(d))
            .style("background", d => this.positions.has(d) ?
                stroke(d === position ? 0 : 1) : ""
            )
            .on("click", (event, d) => {
                if (d === position) {
                    return;
                }
                const deleted = this.positions.delete(d);
                if (!deleted) {
                    this.addPositions(d);
                }
                const positionIndexes = new Map(d3.zip(
                    [...this.positions.keys()],
                    d3.range(this.positions.size))
                );
                this.cell.selectAll("table tr")
                    .classed("is-selected", pos => this.positions.has(pos))
                    .style("background", pos => this.positions.has(pos) ?
                        stroke(positionIndexes.get(pos) % cycle) : ""
                    )
                    .select("td:last-child a")
                    .text(pos => getChartEmoji(pos, position, positionIndexes));
                this.updateProgressionLines();
            })
            .selectAll("td")
            .data(d => Array(artistColumns.length + 1).fill(d))
            .join("td")
            .each((d, i, nodes) => {
                const cell = d3.select(nodes[i]);
                if (i === artistColumns.length) {
                    cell.classed("has-text-centered", true)
                        .append("a")
                        .on("click", (event) => {
                            const posNode = findPositionRow(d);
                            if (posNode) {
                                // Expand info
                                toggleInfoCell(posNode, null, false, position);
                                event.stopPropagation();
                            }
                        })
                        .text(getChartEmoji(d, position));
                }
                else {
                    cell.text(fields[artistColumns[i]].field(findTrack(d), d));
                }
            });

        return chart.length;
    }
}

const toggleInfoCell = (node, d=null, toggle=true, other=null) => {
    const next = d3.select(node.nextSibling);
    if (!next.empty() && next.classed("info")) {
        if (toggle) {
            next.remove();
        }
        return;
    }
    if (d === null) {
        d = d3.select(node).datum();
    }
    const pos = d3.select(node.firstChild).datum();
    const cell = d3.select(node.parentNode).insert("tr", () => node.nextSibling)
        .classed("info", true)
        .append("td")
        .attr("colspan", "4")
        .style("padding", ".25em .5em 1.75em .5em")
        .append("div")
        .classed("columns is-multiline is-centered is-vcentered", true);

    const info = new Info(pos, cell, d);
    if (other) {
        info.addPositions(other);
    }
    info.makeProgressionChart();
    info.makeArtistCharts();
};

updatePagination();
createTable();
