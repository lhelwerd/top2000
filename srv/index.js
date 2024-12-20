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
const updatePagination = (current) => {
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
                    const posCell = findPositionRow(d);
                    if (posCell) {
                        d3.select(this.parentNode.parentNode)
                            .selectAll(".pagination-link")
                            .classed("is-current", pos => d === pos);
                        container.selectAll("table.main > tbody > tr")
                            .classed("is-link", false);
                        d3.select(posCell.parentNode)
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
    return posCell;
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

const table = container.append("table")
    .classed("table main is-narrow is-hoverable is-striped is-fullwidth", true);
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
        field: d => formatTime(new Date(d.timestamp))
    }
};
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
    .each(setCurrent);
rows.on("click", function(event, d) {
    const next = d3.select(this.nextSibling);
    if (!next.empty() && next.classed("info")) {
        next.remove();
        return;
    }
    const pos = d3.select(this.firstChild).datum();
    const cell = d3.select(this.parentNode).insert("tr", () => this.nextSibling)
        .classed("info", true)
        .append("td")
        .attr("colspan", "4")
        .style("padding", ".25em .5em 1.75em .5em")
        .append("div")
        .classed("columns is-multiline is-centered is-vcentered", true);

    // Progression chart
    const width = 800;
    const height = 500;
    const marginTop = 20;
    const marginRight = 20;
    const marginBottom = 30;
    const marginLeft = 40;
    const lastDate = new Date(data.year, 0);

    const position = data.positions[pos];

    const years = [];
    const positions = new Map();
    const progression = [];
    for (let year = data.first_year; year < data.year; year++) {
        const date = new Date(year, 0);
        years.push(date);
        progression.push(d[year]);
    }
    years.push(lastDate);
    progression.push(position);
    positions.set(position, progression);

    const x = d3.scaleUtc()
        .domain([years[0], lastDate])
        .range([marginLeft, width - marginRight]);
    const y = d3.scaleLinear()
        .range([height - marginBottom, marginTop]);
    const xTicks = x.ticks(data.year - data.first_year);
    xTicks.push(lastDate);
    const xAxis = d3.axisBottom(x)
        .tickValues(xTicks)
        .tickFormat(formatYear);
    const svg = cell.append("div")
        .classed("column is-narrow", true)
        .style("overflow", "auto")
        .style("max-width", "100vw")
        .append("svg")
        .attr("width", width)
        .attr("height", height);
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(xAxis);
    svg.append("g")
        .classed("y", true)
        .attr("transform", `translate(${marginLeft},0)`);
    const updateLines = () => {
        const maxPosition = d3.max(positions.values(), seq => d3.max(seq));
        const yDomain = data.reverse ? [front, Math.max(maxPosition, end)] :
            [Math.max(maxPosition, front), end];
        y.domain(yDomain);
        const yTicks = y.ticks(10);
        yTicks.push(yDomain[1]);
        svg.select("g.y")
            .call(d3.axisLeft(y).tickValues(yTicks));

        const line = d3.line()
            .defined(p => typeof p !== "undefined")
            .x((p, i) => x(years[i]))
            .y(p => y(p))
            .curve(d3.curveMonotoneX);
        svg.selectAll("g.lines")
            .data(positions.values(), key => key[key.length - 1])
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
        const points = svg.selectAll("g.points")
            .data(positions.values(), key => key[key.length - 1])
            .join("g")
            .classed("points", true)
            .attr("font-size", 10)
            .attr("font-family", "sans-serif")
            .attr("text-anchor", "middle")
            .selectAll("g")
            .data((d, i) => d3.cross(d, [i]))
            .join(
                enter => {
                    const point = enter.append("g")
                        .attr("opacity",
                            d => typeof d[0] === "undefined" ? 0 : 1)
                        .attr("transform",
                            (d, i) => typeof d[0] === "undefined" ? "" :
                                `translate(${x(years[i])}, ${y(d[0])})`
                        );
                    point.append("path");
                    point.append("text")
                        .attr("dy", "0.32em");
                    return point;
                },
                update => update,
                exit => exit.remove()
            );
        points.select("path")
            .attr("fill", d => stroke(d[1] % cycle))
            .attr("d", (d, i) =>
                symbols(i === years.length - 1 ? (d[1] % fill) + 1 : 0)
            );
        points.select("text")
            .text(d => d[0]);
    };
    updateLines();

    const chartColumn = cell.append("div")
        .classed("column is-size-7-mobile", true);
    const chartCell = chartColumn.append("div");

    // Artist charts
    const artists = (
        data.artist_links ? Object.keys(data.artist_links[pos]) : []
    ).concat(data.keys[pos]);
    const charts = new Map();
    let chartLength = 0;
    d3.map(artists, (artist, i) => {
        const artistLink = data.artist_links && data.artist_links[pos][artist];
        const key = artistLink ? artistLink.toLowerCase() : artist[0];
        const chart = key in data.artists ? data.artists[key] :
                data.artists[data.keys[pos][i][0]];
        if (charts.has(chart.toString())) {
            if (artistLink) {
                const artistTitle = chartCell.select(`.chart:nth-of-type(${i})`)
                    .select("p .artist");
                artistTitle.append("span")
                    .text(", ");
                artistTitle.append("a")
                    .attr("href", `${data.wiki_url}${artist}`)
                    .attr("target", "_blank")
                    .attr("title", artist)
                    .text(artistLink);
            }
            return;
        }
        else {
            charts.set(chart.toString(), i);
            chartLength += chart.length;
        }
        const column = chartCell.append("div")
            .classed("container column is-narrow chart", true)
            .style("max-width", "fit-content");
        const title = column.append("p")
            .classed("has-text-centered has-text-weight-bold", true);
        if (artistLink) {
            title.append("span")
                .classed("artist", true)
                .append("a")
                .attr("href", `${data.wiki_url}${artist}`)
                .attr("title", artist)
                .attr("target", "_blank")
                .text(artistLink);
            title.append("span")
                .text("\u00a0\u2014\u00a0");
            title.append("a")
                .attr("href", `${data.wiki_url}${d.wiki.title_link}`)
                .attr("title", d.wiki.title_link)
                .attr("target", "_blank")
                .text(d.wiki.title);
        }
        else {
            title.append("span")
                .classed("artist", true)
                .append("span")
                .classed("is-capitalized", true)
                .text(artist[0]);
            title.append("span")
                .classed("is-capitalized", d.title.toLowerCase() !== artist[1])
                .text(`\u00a0\u2014\u00a0${d.title.toLowerCase() === artist[1] ?
                    d.title : artist[1]
                }`);
        }
        const subtable = column.append("table")
            .classed("table is-narrow is-hoverable is-striped is-bordered", true);
        subtable.append("thead").append("tr").selectAll("th")
            .data([...artistColumns, ""])
            .join("th")
            .text(d => fields[d] ? fields[d].column : d);
        subtable.append("tbody").selectAll("tr")
            .data(chart)
            .join("tr")
            .classed("is-selected", d => d === position)
            .style("background", d => d === position ? stroke(0) : "")
            .on("click", function(event, d) {
                if (d === position) {
                    return;
                }
                const deleted = positions.delete(d);
                if (!deleted) {
                    const track = findTrack(d);
                    const chart = [];
                    for (let year = data.first_year; year < data.year; year++) {
                        chart.push(track[year]);
                    }
                    chart.push(d);
                    positions.set(d, chart);
                }
                const positionIndexes = new Map(d3.zip([...positions.keys()],
                    d3.range(positions.size))
                );
                cell.selectAll("table tr")
                    .classed("is-selected", pos => positions.has(pos))
                    .style("background", pos => positions.has(pos) ?
                        stroke(positionIndexes.get(pos) % cycle) : ""
                    )
                    .select("td:last-child")
                    .text(pos => getChartEmoji(pos, position, positionIndexes));
                updateLines();
            })
            .selectAll("td")
            .data(d => Array(artistColumns.length + 1).fill(d))
            .join("td")
            .each(function(d, i) {
                if (i === artistColumns.length) {
                    d3.select(this)
                        .classed("has-text-centered", true)
                        .text(getChartEmoji(d, position));
                }
                else {
                    d3.select(this)
                        .text(fields[artistColumns[i]].field(findTrack(d), d));
                }
            });
    });
    if (chartLength > 12) {
        chartColumn.classed("is-narrow", true)
            .style("max-width", "100vw");
        chartCell.classed("columns is-multiline is-centered", true);
    }
});
rows.selectAll("td")
    .data((d, i) => Array(columns.length).fill(i))
    .join("td")
    .text((pos, i) => fields[columns[i]].field(data.tracks[pos],
        data.positions[pos]
    ));
