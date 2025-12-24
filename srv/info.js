import * as d3 from "d3";
import { EXPECTED_POSITIONS } from "./data.js";
import { sep } from "./format.js";

const chartLimit = 12;

const stroke = d3.scaleOrdinal(d3.schemeTableau10);
const cycle = stroke.range().length;
const symbolType = d3.scaleOrdinal(d3.symbolsFill);
const symbols = d3.symbol(symbolType, 336);
const fill = symbolType.range().length - 2;
const symbolEmoji = [
    "\u2b24", // Circle
    "\u2795\ufe0e", // Plus
    "\u29eb", // Diamond
    "\u2b1b\ufe0e", // Square
    "\u2605", // Star
    "\u25b2\ufe0e" // Triangle
];

export class Info {
    constructor(context, pos, cell, d) {
        this.locale = context.locale;
        this.data = context.data;
        this.state = context.state;
        this.scroll = context.scroll;
        this.search = context.search;

        this.pos = pos;
        this.cell = cell;
        this.track = d;

        this.chartLength = 0;
        this.artists = new Set();
        this.artistPositions = new Set();

        this.setupPositions();
    }

    setupPositions() {
        this.positions = new Map();
        this.positionIndexes = new Map();
        this.years = [];
        this.currentYearIndex = -1;

        const progression = [];
        const position = this.data.positions[this.pos];

        this.latestYear = this.data.latest_year || this.data.year;
        for (let year = this.data.first_year; year <= this.latestYear; year++) {
            const date = new Date(year, 0);
            if (year === this.data.year) {
                this.currentYearIndex = this.years.length;
                progression.push(position);
            }
            else {
                progression.push(this.track[year]);
            }
            this.years.push(date);
        }

        this.positions.set(position, progression);
        this.positionIndexes.set(position, 0);
    }

    addPositions(d) {
        if (this.positions.has(d)) {
            return false;
        }
        const track = this.data.findTrack(d);
        const chart = [];
        for (let year = this.data.first_year; year <= this.latestYear; year++) {
            if (year === this.data.year) {
                chart.push(d);
            }
            else {
                chart.push(track[year]);
            }
        }
        this.positionIndexes.set(d, this.positions.size);
        this.positions.set(d, chart);
        return true;
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
            .domain([this.years[0], this.years.at(-1)])
            .range([marginLeft, width - marginRight]);
        this.y = d3.scaleLinear()
            .range([height - marginBottom, marginTop]);
        const xTicks = this.x.ticks(this.latestYear - this.data.first_year);
        xTicks.push(this.years.at(-1));
        const xAxis = d3.axisBottom(this.x)
            .tickValues(xTicks)
            .tickFormat(this.locale.formatYear);
        const column = this.cell.append("div")
            .classed("column progression is-narrow", true);
        this.svg = column.append("svg")
            .attr("width", width)
            .attr("height", height);
        this.svg.append("g")
            .attr("transform", `translate(0,${height - marginBottom})`)
            .call(xAxis);
        this.svg.append("g")
            .classed("x-extra", true)
            .append("line")
            .attr("stroke", "currentColor")
            .attr("x1", this.x(this.years[0]))
            .attr("x2", width - marginLeft);
        this.svg.append("g")
            .classed("y", true)
            .attr("transform", `translate(${marginLeft},0)`);
        this.svg.append("g")
            .classed("y-current-year", true)
            .append("line")
            .attr("stroke", "currentColor")
            .attr("y1", marginTop)
            .attr("y2", height - marginBottom);
        this.updateProgressionLines();
        column.node().scrollTo(width, 0);
    }

    updateProgressionLines() {
        const maxPosition = d3.max(this.positions.values(), seq => d3.max(seq));
        const yDomain = this.data.reverse ? [this.data.front, Math.max(maxPosition, this.data.end)] :
            [Math.max(maxPosition, this.data.front), this.data.end];

        this.y.domain(yDomain);

        this.svg.select("g.x-extra")
            .classed("is-hidden", maxPosition <= EXPECTED_POSITIONS)
            .attr("transform", `translate(0,${this.y(EXPECTED_POSITIONS + 1)})`);

        const yTicks = this.y.ticks(10);
        yTicks.push(yDomain[1]);
        this.svg.select("g.y")
            .call(d3.axisLeft(this.y)
                .tickFormat(d3.format(".0f"))
                .tickValues(yTicks)
            );

        this.svg.select("g.y-current-year")
            .attr("transform", `translate(${this.x(this.years[this.currentYearIndex])},0)`);

        const line = d3.line()
            .defined(p => p !== undefined)
            .x((_, i) => this.x(this.years[i]))
            .y(p => this.y(p))
            .curve(d3.curveMonotoneX);
        this.svg.selectAll("g.lines")
            .data(this.positions.values(), key => key.at(-1))
            .join(
                enter => enter.append("g")
                    .classed("lines", true)
                    .append("path")
                    .attr("fill", "none")
                    .attr("stroke-width", 2),
                update => update.select("path"),
                exit => exit.remove()
            )
            .attr("stroke", (_, i) => stroke(i % cycle))
            .attr("d", d => line(d));
        const points = this.svg.selectAll("g.points")
            .data(this.positions.values(), key => key.at(-1))
            .join("g")
            .classed("points", true)
            .attr("font-size", 10)
            .attr("font-family", "sans-serif")
            .attr("text-anchor", "middle")
            .selectAll("g")
            .data((d, i) => d3.cross(d3.filter(d3.map(d, (pos, j) => [pos, j]),
                p => p[0] !== undefined
            ), [i], (a, b) => [...a, b]))
            .join(
                enter => {
                    const point = enter.append("g");
                    point.append("path");
                    point.append("text").attr("dy", "0.32em");
                    return point;
                },
                update => update,
                exit => exit.remove()
            )
            .attr("transform",
                t => `translate(${this.x(this.years[t[1]])},${this.y(t[0])})`
            );
        points.select("path")
            .attr("fill", t => stroke(t[2] % cycle))
            .attr("d", t =>
                symbols(t[1] === this.currentYearIndex ? (t[2] % fill) + 1 : 0)
            );
        points.select("text")
            .text(t => t[0]);
    }

    makeArtistCharts() {
        const chartColumn = this.cell.append("div")
            .classed("column artists is-size-7-mobile", true);
        const chartCell = chartColumn.append("div");

        // Artist charts
        const artists = (this.data.artist_links?.[this.pos] ?
            Object.entries(this.data.artist_links[this.pos]) : []
        ).concat(this.data.keys[this.pos]);
        const charts = new Map();

        d3.map(artists, (artist, i) => {
            this.makeArtistChart(artist, i, chartCell, charts);
        });
        this.checkArtistChartLength(chartColumn, chartCell);
        this.makeChartSearch(chartColumn, chartCell);
    }

    checkArtistChartLength(chartColumn, chartCell) {
        const large = this.chartLength > chartLimit;
        chartColumn.classed("is-narrow", large);
        chartCell.classed("columns is-multiline is-centered", large);
    }

    makeArtistChart(artist, i, chartCell, charts) {
        const isLink = this.data.artist_links?.[this.pos]?.[artist[0]];
        let key = isLink ? artist[1].toLowerCase() : artist[0];
        if (!this.data.artists[key]) {
            key = this.data.keys[this.pos]?.[i]?.[0];
            if (!this.data.artists[key]) {
                return;
            }
        }
        this.artists.add(key);
        const chart = this.data.artists[key];
        if (charts.has(chart.toString())) {
            const j = charts.get(chart.toString()) + 1;
            const artistTitle = chartCell
                .select(`.artist-chart:nth-of-type(${j})`)
                .select("p .artist");
            this.addArtistTitle(artistTitle, artist, isLink, true);
            return;
        }
        charts.set(chart.toString(), i);
        this.chartLength += chart.length;
        const column = chartCell.append("div")
            .classed("container column is-narrow artist-chart", true);
        const title = column.append("p")
            .classed("is-size-5 has-text-centered has-text-weight-bold", true);
        const artistTitle = title.append("span")
            .classed("artist", true);
        this.addArtistTitle(artistTitle, artist, isLink, true);
        title.append("span")
            .text(sep);
        if (this.track.wiki) {
            title.append("a")
                .attr("href", this.data.getWikiUrl(this.track.wiki.title_link))
                .attr("title", this.track.wiki.title_link)
                .attr("target", "_blank")
                .text(this.track.wiki.title);
        }
        else {
            title.append("span")
                .classed("is-capitalized",
                    this.track.title.toLowerCase() !== artist[1]
                )
                .text(this.track.title.toLowerCase() === artist[1] ?
                    this.track.title : artist[1]
                );
        }
        const subtable = this.createArtistTable(column);
        this.fillArtistTable(subtable, chart, key);
    }

    addArtistTitle(artistTitle, artist, isLink = false, appendLinkOnly = false) {
        if (!artistTitle.select(":first-child").empty()) {
            if (appendLinkOnly && !isLink) {
                return;
            }
            artistTitle.append("span")
                .text(", ");
        }
        if (isLink) {
            artistTitle.append("a")
                .attr("href", this.data.getWikiUrl(artist[0]))
                .attr("title", artist[0])
                .attr("target", "_blank")
                .text(artist[1]);
        }
        else {
            artistTitle.append("span")
                .classed("is-capitalized", true)
                .text(artist[0]);
        }
    }

    createArtistTable(column) {
        const subtable = column.append("table")
            .classed(
                "table chart is-narrow is-hoverable is-striped is-bordered",
                true
            );
        subtable.append("thead").append("tr").selectAll("th")
            .data([...this.data.artistColumns, ""])
            .join("th")
            .each((d, i, nodes) => {
                const cell = d3.select(nodes[i]);
                if (i === this.data.artistColumns.length) {
                    cell.append("a")
                        .on("click", () => {
                            subtable.select("tbody")
                                .selectAll("tr")
                                .each(d => this.toggleTrack(d));
                        })
                        .text(String.fromCodePoint(0x1f501));
                }
                else {
                    cell.text(this.data.fields[d].column);
                }
            });
        subtable.append("tbody");
        return subtable;
    }

    fillArtistTable(subtable, chart, keys) {
        const position = this.data.positions[this.pos];
        subtable.select("tbody")
            .selectAll("tr")
            .data(chart)
            .join(enter => enter.append("tr")
                .each(d => this.artistPositions.add(d))
                .on("click", (_, d) => {
                    this.toggleTrack(d);
                })
            )
            .classed("is-clickable", d => d !== position)
            .call(row => this.setTrackSelection(row))
            .selectAll("td")
            .data(d => new Array(this.data.artistColumns.length + 1).fill(d))
            .join(enter => enter.append("td").each((d, i, nodes) => {
                const cell = d3.select(nodes[i]);
                if (i === this.data.artistColumns.length) {
                    cell.classed("has-text-centered", true)
                        .append("a")
                        .attr("href", `#/${this.data.year}/${d}`)
                        .on("click", (event) => {
                            const posNode = this.scroll.scrollPositionRow(d);
                            if (posNode) {
                                // Expand info
                                toggleInfoCell(
                                    {
                                        locale: this.locale,
                                        data: this.data,
                                        state: this.state,
                                        scroll: this.scroll,
                                        search: this.search
                                    },
                                    posNode, null, false, position
                                );
                                this.state.autoscroll = false;
                                event.stopPropagation();
                            }
                        })
                        .text(this.getChartEmoji(d, position));
                }
                else {
                    cell.text(this.data.fields[this.data.artistColumns[i]].field(
                        this.data.findTrack(d), d,
                        typeof keys === "string" ? [[keys, ""]] : keys[i]
                    ));
                }
            }));
    }

    toggleTrack(d) {
        const position = this.data.positions[this.pos];
        if (d === position) {
            return;
        }
        const deleted = this.positions.delete(d);
        if (deleted) {
            const index = this.positionIndexes.get(d);
            this.positionIndexes.delete(d);
            this.positionIndexes.forEach((value, key) => {
                if (value > index) {
                    this.positionIndexes.set(key, value - 1);
                }
            });
        }
        else {
            this.addPositions(d);
        }
        this.cell.selectAll("table.chart > tbody > tr")
            .call(row => this.setTrackSelection(row))
            .select("td:last-child > a")
            .text(pos => this.getChartEmoji(pos, position));
        this.updateProgressionLines();
    }

    setTrackSelection(row) {
        row.classed("is-selected", pos => this.positions.has(pos))
            .style("background", pos => this.positions.has(pos) ?
                stroke(this.positionIndexes.get(pos) % cycle) : ""
            );
    }

    getChartEmoji(d, position) {
        if (this.positionIndexes.has(d)) {
            return symbolEmoji[(this.positionIndexes.get(d) % fill) + 1];
        }
        if (d < position) {
            return this.data.reverse ? "\u2935\ufe0f" : "\u2934\ufe0f";
        }
        if (d > position) {
            return this.data.reverse ? "\u2934\ufe0f" : "\u2935\ufe0f";
        }
        return symbolEmoji[1];
    }

    makeChartSearch(chartColumn, chartCell) {
        const position = this.data.positions[this.pos];
        const column = chartCell.append("div")
            .classed("container column is-narrow artist-chart", true);
        const title = column.append("p")
            .classed("has-text-centered has-text-weight-bold is-hidden", true);
        title.append("span")
            .text(`${String.fromCodePoint(0x1f50e)} `);
        const artistTitle = title.append("span")
            .classed("artist is-size-5", true);
        const subtable = this.createArtistTable(column);
        subtable.classed("is-hidden", true);

        const artists = new Map();
        const keys = [];
        const chart = d3.map(d3.filter(this.positions.entries(),
            p => p[0] !== position && !this.artistPositions.has(p[0])
        ), p => {
            this.artistPositions.add(p[0]);
            const track = this.data.findTrack(p[0]);
            if (track.max_artist_key) {
                if (!artists.has(track.max_artist_key)) {
                    artists.set(track.max_artist_key, track.artist);
                    this.addArtistTitle(artistTitle, [track.artist]);
                }
                keys.push([[track.max_artist_key, track.title.toLowerCase()]]);
            }
            else {
                keys.push([]);
            }
            return p[0];
        });

        const fillSearchChart = () => {
            title.classed("is-hidden", false);
            subtable.classed("is-hidden", false);
            this.fillArtistTable(subtable, chart, keys);
            this.updateProgressionLines();
            this.checkArtistChartLength(chartColumn, chartCell);
        };
        const addSearchChart = (pos, track) => {
            if (!this.addPositions(pos)) {
                return;
            }
            if (!artists.has(track.max_artist_key)) {
                artists.set(track.max_artist_key, track.artist);
                this.addArtistTitle(artistTitle, [track.artist]);
            }
            chart.push(pos);
            this.chartLength += 1;
            fillSearchChart();
        };
        const addArtistSearch = (artist) => {
            this.artists.add(artist);
            d3.map(this.data.artists[artist],
                pos => addSearchChart(pos, this.data.findTrack(pos))
            );
        };

        const filter = (r) => Number.isInteger(r.id) ?
            !this.artistPositions.has(this.data.positions[r.id]) :
            this.data.artists[r.id].length > 1 && !this.artists.has(r.id);
        const searchOptions = {
            boost: { artist: 1.5 },
            filter: filter,
            fuzzy: 0.2,
            prefix: true
        };
        const handleClick = (r, results, text) => {
            if (Number.isInteger(r.id)) {
                addSearchChart(this.data.positions[r.id], this.data.tracks[r.id]);
            }
            else {
                addArtistSearch(r.id);
            }
            this.search.performSearch(results, text, searchOptions, handleClick);
        };

        if (chart.length) {
            this.chartLength += chart.length;
            fillSearchChart();
        }

        this.search.createBox(column, searchOptions, handleClick);
    }
}

export const toggleInfoCell = (context, node, d = null, toggle = true, other = null) => {
    const next = d3.select(node.nextSibling);
    if (!next.empty() && next.classed("info")) {
        if (toggle) {
            d3.select(node)
                .classed("is-info", false)
                .select("td:last-child")
                .text("\u25b6");
            next.remove();
        }
        return;
    }
    if (d === null) {
        d = d3.select(node).datum();
    }
    d3.select(node)
        .classed("is-info", true)
        .select("td:last-child")
        .text("\u25bc");
    const pos = d3.select(node.firstChild).datum();
    const cell = d3.select(node.parentNode).insert("tr", () => node.nextSibling)
        .classed("info", true)
        .append("td")
        .attr("colspan", context.data.trackColumns.length + 1)
        .append("div")
        .classed("columns is-multiline is-centered is-vcentered", true);

    const info = new Info(context, pos, cell, d);
    if (other) {
        info.addPositions(other);
    }
    info.makeProgressionChart();
    info.makeArtistCharts();
};
