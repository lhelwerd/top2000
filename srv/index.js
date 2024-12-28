import "./style.scss";
import * as d3 from "d3";
import MiniSearch from "minisearch";
import packageInfo from "../package.json";
import data from "../output-sorted.json";
import doc from "../doc/app.nl.md";

const currentDisplayDelay = 10000;
const currentUpdateDelay = 1000;
const chartLimit = 12;
const sep = "\u00a0\u2014\u00a0";
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
const formatTime = nl.format("%d-%m %H:%M");
const formatYear = nl.format("'%y");
const formatTimerLong = nl.utcFormat("%-j:%H:%M:%S");
const formatTimerShort = nl.utcFormat("%H:%M:%S");

const firstYear = data.first_year;
const currentYear = data.year;
const direction = data.reverse ? 1 : -1;
const front = data.positions[data.positions.length - 1];
const end = data.positions[0];

const findTrack = (d) => {
    return data.tracks[data.reverse ? data.tracks.length - d : d - 1];
};

const search = new MiniSearch({
    fields: ['position', 'artist', 'title'],
    storeFields: [],
    extractField: (i, fieldName) => {
        if (fieldName === 'id') {
            return i;
        }
        if (fieldName === 'position') {
            return Number.isInteger(i) ? data.positions[i] : data.artists[i][0];
        }
        if (fieldName === 'title') {
            return Number.isInteger(i) ? data.tracks[i].title : "";
        }
        return Number.isInteger(i) ? data.tracks[i][fieldName] :
            findTrack(data.artists[i][0])[fieldName];
    }
});
for (const [key, value] of Object.entries(data)) {
    if (key === "positions") {
        search.addAllAsync(d3.range(value.length));
    }
    else if (key === "artists") {
        search.addAllAsync(Object.keys(value));
    }
}

let autoscroll = true;
let currentTimer = null;
let currentTimerParams = null;
let startTimer = null;
let startPos = null;

const tabs = new Map();
if (data.old_data_available) {
    for (let year = data.first_year; year < data.year; year++) {
        tabs.set(year, {
            icon: String.fromCodePoint(0x1f519),
            text: `${year}`,
            container: ".main",
            classed: year < data.year - 1 ? "is-hidden-mobile" : ""
        });
    }
}
tabs.set(data.year, {
    icon: String.fromCodePoint(0x1f534),
    text: `${data.year}`,
    container: ".main"
});
tabs.set("charts", {
    icon: String.fromCodePoint(0x1f4ca),
    text: "Charts",
    container: "#charts"
});
tabs.set("info", {
    icon: "\u2139\ufe0f",
    text: "Info",
    container: "#info"
});

const rowsSelector = "table.main > tbody > tr:not(.info)";
const container = d3.select("body")
    .append("div")
    .attr("id", "container");
const head = container.append("div")
    .attr("id", "head")
    .append("div")
    .classed("columns is-multiline is-gapless is-centered", true);

const scrollPage = (d, current=null) => {
    const posNode = scrollPositionRow(d);
    if (posNode) {
        pagination.selectAll(".pagination-link")
            .classed("is-current", pos => d === pos);
        container.selectAll(rowsSelector)
            .classed("is-link", false);
        d3.select(posNode)
            .classed("is-selected", d === current)
            .classed("is-link", d !== current);
        autoscroll = (d === current);
    }
};
const scrollPositionRow = (d) => {
    const posCell = container.selectAll(`${rowsSelector} > td:first-child`)
        .select(function(pos) {
            return d === data.positions[pos] ? this : null;
        })
        .node();
    if (posCell) {
        posCell.scrollIntoView({
            behavior: "smooth", block: "center"
        });
        return posCell.parentNode;
    }
    return null;
};
const fixStickyScroll = () => {
    const stickyHeight = head.node().scrollHeight +
        container.select("table.main > thead").node().scrollHeight;
    document.documentElement.scrollBy(0, -stickyHeight);
};
const fixAnchorScroll = (content, hash, selector=null) => {
    if (selector === null) {
        if (content.empty()) {
            return false;
        }
        const prefix = `#/${data.year}`;
        if (hash.startsWith(prefix)) {
            scrollPositionRow(Number(hash.startsWith(`${prefix}/`) ?
                hash.slice(`${prefix}/`.length) : nextPage.datum()
            ));
        }
        else if (hash.startsWith("#/")) {
            content.node().scrollIntoView(true);
            fixStickyScroll();
        }
        return true;
    }
    const element = content.select(selector);
    if (!element.empty()) {
        fixStickyScroll();
        return true;
    }
    return false;
};
const updateActiveTab = (tab) => {
    const hash = document.location.hash;
    tab.attr("class", d => hash.startsWith(`#/${d}`) ? "" : tabs.get(d).classed)
        .classed("is-active", d => {
            const content = container.select(tabs.get(d).container);
            const active = hash.startsWith("#/") ? // Tab datum
                hash.startsWith(`#/${d}`) :
                /^#[a-z][-a-z0-9_:.]*$/.test(hash) ? // Element ID
                fixAnchorScroll(content, hash, hash) :
                d === data.year; // Fallback: current year list
            content.classed("is-hidden", !active)
                .classed("is-overlay", active && d !== data.year);
            return active;
        })
        .each(d => {
            const content = container.select(tabs.get(d).container);
            fixAnchorScroll(content, document.location.hash);
        });
};
const tabItems = head.append("div")
    .attr("id", "tabs")
    .classed("column is-narrow-tablet-only is-narrow-fullhd", true)
    .append("div")
    .classed("tabs is-boxed", true)
    .append("ul")
    .selectAll("li")
    .data(tabs.keys())
    .join("li")
    .call(updateActiveTab);
const tabLinks = tabItems.append("a")
    .attr("href", d => `#/${d}`)
    .attr("title", d => tabs.get(d).text);
tabLinks.append("span")
    .classed("icon", true)
    .text(d => tabs.get(d).icon);
tabLinks.append("span")
    .classed("is-hidden-tablet-only is-hidden-fullhd-only", true)
    .text(d => `\u00a0${tabs.get(d).text}`);

const nav = head.append("div")
    .attr("id", "pagination")
    .classed("column is-full-mobile is-full-desktop-only is-full-widescreen-only", true)
    .append("nav")
    .classed("pagination is-centered is-flex-wrap-nowrap", true);
const pagination = nav.append("ul")
    .classed("pagination-list is-flex-wrap-nowrap", true);
const nextPage = nav.append("a")
    .classed("pagination-next has-background-danger-dark is-hidden", true)
    .on("click", (event, d) => {
        scrollPage(d, d);
    });
const updatePagination = (current=null) => {
    const pages = d3.ticks(...d3.nice(end, front, 20), 20);
    if (current) {
        const currentIndex = d3.bisectRight(pages, current);
        if (pages[currentIndex-1] !== current) {
            pages.splice(currentIndex, 0, current);
        }
        const d = findTrack(current);
        nextPage.datum(current)
            .attr("href", d => `#/${data.year}/${d}`)
            .classed("is-hidden", false)
            .classed("track", true)
            .text(`${current}. ${d.artist} (${d.year})${sep}${d.title}`);
        d3.timeout(() => nextPage.classed("is-hidden", true)
            .text(""), currentDisplayDelay
        );
    }
    pagination.selectAll("li")
        .data(d3.map(pages, d => d3.median([d, end, front]))) // Clamp
        .join(
            enter => enter.append("li")
                .append("a")
                .classed("pagination-link", true),
            update => update.select("a"),
            exit => exit.remove()
        )
        .attr("href", d => `#/${data.year}/${d}`)
        .on("click", (event, d) => {
            scrollPage(d, current);
        })
        .classed("has-background-primary has-text-dark", d => d === current)
        .classed("is-hidden-desktop-only",
            (d, i) => i !== 0 && d !== current && d % 200 !== 0
        )
        .classed("is-hidden-touch",
            (d, i) => i !== 0 && d !== current && d % 500 !== 0
        )
        .text(d => d);
};

const isInView = (node) => {
    const rect = node.getBoundingClientRect();
    return rect.top >= 0 && rect.left >= 0 &&
        rect.bottom <= document.documentElement.clientHeight &&
        rect.right <= document.documentElement.clientWidth;
};
const getCurrentDate = () => Date.now();
const setCurrent = (d, i, nodes) => {
    const now = getCurrentDate();
    const previous = i - direction;
    const next = i + direction;
    const isCurrent = d.timestamp <= now &&
        (!(next in data.tracks) || data.tracks[next].timestamp > now);
    d3.select(nodes[i]).classed("is-selected", isCurrent);
    if (isCurrent) {
        updatePagination(data.positions[i]);
        if (!autoscroll && isInView(nodes[i])) {
            // Check twice if the next is in view to reenable autoscroll
            autoscroll = (autoscroll === null ? true : null);
        }
        if (autoscroll) {
            window.requestAnimationFrame(() => {
                nodes[i].scrollIntoView({behavior: "smooth", block: "center"});
            });
        }
        setNextCurrent(next, i, nodes, now);
    }
    else if (!(previous in data.tracks) && d.timestamp > now) {
        setNextCurrent(i, i, nodes, now);
        createNextTimer(i, d.timestamp, now);
    }
    else if (!(next in data.tracks)) {
        currentTimer = null;
    }
    return isCurrent;
};
const setNextCurrent = (next, i, nodes, now) => {
    currentTimerParams = [next, i];
    currentTimer = d3.timeout(() => {
        const d = d3.select(nodes[i]).datum();
        if (setCurrent(d, i, nodes)) {
            return;
        }
        while (next in data.tracks) {
            if (setCurrent(d3.select(nodes[next]).datum(), next, nodes)) {
                break;
            }
            next += direction;
        }
    }, Math.max(data.tracks[next].timestamp - now, 0) + currentUpdateDelay);
};
const createNextTimer = (pos, timestamp, now) => {
    let diff = timestamp - now + currentUpdateDelay;
    const day = 24 * 60 * 60 * 1000;
    nextPage.datum(data.positions[pos])
        .attr("href", d => `#/${data.year}/${d}`)
        .classed("is-hidden", false)
        .text(diff > day ? formatTimerLong(new Date(diff - day)) :
            formatTimerShort(new Date(diff))
        );
    startPos = pos;
    startTimer = d3.interval((elapsed) => {
        if (diff < elapsed) {
            startTimer.stop();
            startPos = null;
            nextPage.classed("is-hidden", true);
        }
        else {
            window.requestAnimationFrame(() => {
                nextPage.text(diff - elapsed > day ?
                    formatTimerLong(new Date(diff - elapsed - day)) :
                    formatTimerShort(new Date(diff - elapsed))
                );
            });
        }
    }, 1000);
};
d3.select(document).on("visibilitychange", () => {
    if (!document.hidden && currentTimer !== null) {
        const previousTimer = currentTimer;
        d3.timerFlush();
        if (currentTimer !== null && currentTimer === previousTimer) {
            currentTimer.stop();
            setNextCurrent(...currentTimerParams,
                container.selectAll(rowsSelector).nodes(), getCurrentDate()
            );
        }
        if (startTimer !== null && startPos !== null) {
            startTimer.stop();
            createNextTimer(startPos, data.tracks[startPos].timestamp,
                getCurrentDate()
            );
        }
    }
});

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
const formatArtistChart = (d, position, keys) => {
    const artistTracks = data.artists[d.max_artist_key] ?
        data.artists[d.max_artist_key] : data.artists[keys[0][0]];
    if (artistTracks) {
        const artistPos = artistTracks.indexOf(position) + 1;
        return ` ${artistPos}/${artistTracks.length}`;
    }
    return "";
};
const getWikiUrl = (page) => {
    return `${data.wiki_url}${encodeURIComponent(page.replaceAll(" ", "_"))}`;
};

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

const columns = ["position", "artist", "title"];
const artistColumns = ["position", "title", "year"];
if (data.tracks[0].timestamp) {
    columns.push("timestamp");
    artistColumns.push("timestamp");
}
const searchColumns = ["position", "artist", "title"];
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
        field: (d, i, keys) => `${d.title}${d.album_version ? " \u29be" : ""} (${formatRankChange(d, i)}${formatArtistChart(d, i, keys)})`
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
const artistFields = {
    position: d => `${data.artists[d][0]}.`,
    artist: d => findTrack(data.artists[d][0]).artist,
    title: d => `(${data.artists[d].length}\u00d7)`
};

const createTable = () => {
    const table = container.append("table")
        .classed("table main is-narrow is-hoverable is-striped is-fullwidth",
            true
        );
    table.append("thead")
        .append("tr")
        .selectAll("th")
        .data([...columns, ""])
        .join("th")
        .each((d, i, nodes) => {
            const cell = d3.select(nodes[i]);
            if (i === columns.length) {
                cell.append("a")
                    .on("click", openSearchModal)
                    .text(String.fromCodePoint(0x1f50e));
            }
            else {
                cell.text(fields[d].column);
            }
        });
    const rows = table.append("tbody").selectAll("tr")
        .data(data.tracks)
        .join("tr")
        .classed("is-clickable", true)
        .each(setCurrent);
    rows.on("click", function(event, d) {
        toggleInfoCell(this, d);
        autoscroll = false;
    });
    rows.selectAll("td")
        .data((d, i) => Array(columns.length + 1).fill(i))
        .join("td")
        .text((pos, i) => i === columns.length ? "\u25b6" :
            fields[columns[i]].field(data.tracks[pos], data.positions[pos],
                data.keys[pos]
            )
        );
};

class Info {
    constructor(pos, cell, d) {
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
        this.positionIndexes.set(position, 0);
    }

    addPositions(d) {
        if (this.positions.has(d)) {
            return;
        }
        const track = findTrack(d);
        const chart = [];
        for (let year = data.first_year; year < data.year; year++) {
            chart.push(track[year]);
        }
        chart.push(d);
        this.positionIndexes.set(d, this.positions.size);
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
        const column = this.cell.append("div")
            .classed("column progression is-narrow", true);
        this.svg = column.append("svg")
            .attr("width", width)
            .attr("height", height);
        this.svg.append("g")
            .attr("transform", `translate(0,${height - marginBottom})`)
            .call(xAxis);
        this.svg.append("g")
            .classed("y", true)
            .attr("transform", `translate(${marginLeft},0)`);
        this.updateProgressionLines();
        column.node().scrollTo(width, 0);
    }

    updateProgressionLines() {
        const maxPosition = d3.max(this.positions.values(), seq => d3.max(seq));
        const yDomain = data.reverse ? [front, Math.max(maxPosition, end)] :
            [Math.max(maxPosition, front), end];
        this.y.domain(yDomain);
        const yTicks = this.y.ticks(10);
        yTicks.push(yDomain[1]);
        this.svg.select("g.y")
            .call(d3.axisLeft(this.y)
                .tickFormat(d3.format(".0f"))
                .tickValues(yTicks)
            );

        const line = d3.line()
            .defined(p => typeof p !== "undefined")
            .x((p, i) => this.x(this.years[i]))
            .y(p => this.y(p))
            .curve(d3.curveMonotoneX);
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
                symbols(t[1] === this.years.length - 1 ? (t[2] % fill) + 1 : 0)
            );
        points.select("text")
            .text(t => t[0]);
    }

    makeArtistCharts() {
        const chartColumn = this.cell.append("div")
            .classed("column artists is-size-7-mobile", true);
        const chartCell = chartColumn.append("div");

        // Artist charts
        const artists = (data.artist_links ?
            Object.entries(data.artist_links[this.pos]) : []
        ).concat(data.keys[this.pos]);
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
        const isLink = data.artist_links &&
            data.artist_links[this.pos][artist[0]];
        let key = isLink ? artist[1].toLowerCase() : artist[0];
        if (!data.artists[key]) {
            key = data.keys[this.pos][i][0];
        }
        this.artists.add(key);
        const chart = data.artists[key];
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
                .attr("href", getWikiUrl(this.track.wiki.title_link))
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

    addArtistTitle(artistTitle, artist, isLink=false, appendLinkOnly=false) {
        if (!artistTitle.select(":first-child").empty()) {
            if (appendLinkOnly && !isLink) {
                return;
            }
            artistTitle.append("span")
                .text(", ");
        }
        if (isLink) {
            artistTitle.append("a")
                .attr("href", getWikiUrl(artist[0]))
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
            .data([...artistColumns, ""])
            .join("th")
            .each((d, i, nodes) => {
                const cell = d3.select(nodes[i]);
                if (i === artistColumns.length) {
                    cell.append("a")
                        .on("click", () => {
                            subtable.select("tbody")
                                .selectAll("tr")
                                .each(d => this.toggleTrack(d));
                        })
                        .text(String.fromCodePoint(0x1f501));
                }
                else {
                    cell.text(fields[d].column);
                }
            });
        subtable.append("tbody");
        return subtable;
    }

    fillArtistTable(subtable, chart, keys) {
        const position = data.positions[this.pos];
        subtable.select("tbody")
            .selectAll("tr")
            .data(chart)
            .join(enter => enter.append("tr")
                .each(d => this.artistPositions.add(d))
                .on("click", (event, d) => {
                    this.toggleTrack(d);
                })
            )
            .classed("is-clickable", d => d !== position)
            .call(row => this.setTrackSelection(row))
            .selectAll("td")
            .data(d => Array(artistColumns.length + 1).fill(d))
            .join(enter => enter.append("td").each((d, i, nodes) => {
                const cell = d3.select(nodes[i]);
                if (i === artistColumns.length) {
                    cell.classed("has-text-centered", true)
                        .append("a")
                        .attr("href", `#/${data.year}/${d}`)
                        .on("click", (event) => {
                            const posNode = scrollPositionRow(d);
                            if (posNode) {
                                // Expand info
                                toggleInfoCell(posNode, null, false, position);
                                autoscroll = false;
                                event.stopPropagation();
                            }
                        })
                        .text(this.getChartEmoji(d, position));
                }
                else {
                    cell.text(fields[artistColumns[i]].field(findTrack(d), d,
                        typeof keys === "string" ? [[keys, ""]] : keys[i]
                    ));
                }
            }));
    }

    toggleTrack(d) {
        const position = data.positions[this.pos];
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
            return data.reverse ? "\u2935\ufe0f" : "\u2934\ufe0f";
        }
        if (d > position) {
            return data.reverse ? "\u2934\ufe0f" : "\u2935\ufe0f";
        }
        return symbolEmoji[1];
    }

    makeChartSearch(chartColumn, chartCell) {
        const position = data.positions[this.pos];
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
            const track = findTrack(p[0]);
            if (track.max_artist_key) {
                if (!artists.has(track.max_artist_key)) {
                    artists.set(track.max_artist_key, track.artist);
                    this.addArtistTitle(artistTitle, [track.artist]);
                }
                keys.push([[track_max_artist_key, track.title.lower()]]);
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
            this.addPositions(pos);
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
            d3.map(data.artists[artist],
                pos => addSearchChart(pos, findTrack(pos))
            );
        };

        const filter = (r) => Number.isInteger(r.id) ?
            !this.artistPositions.has(data.positions[r.id]) :
            data.artists[r.id].length > 1 && !this.artists.has(r.id);
        const searchOptions = {
            boost: {artist: 1.5},
            filter: filter,
            fuzzy: 0.2,
            prefix: true
        };
        const handleClick = (r, results, text) => {
            if (Number.isInteger(r.id)) {
                addSearchChart(data.positions[r.id], data.tracks[r.id]);
            }
            else {
                addArtistSearch(r.id);
            }
            performSearch(results, text, searchOptions, handleClick);
        };

        if (chart.length) {
            this.chartLength += chart.length;
            fillSearchChart();
        }

        createSearchBox(column, searchOptions, handleClick);
    }
}

const toggleInfoCell = (node, d=null, toggle=true, other=null) => {
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
        .attr("colspan", columns.length + 1)
        .append("div")
        .classed("columns is-multiline is-centered is-vcentered", true);

    const info = new Info(pos, cell, d);
    if (other) {
        info.addPositions(other);
    }
    info.makeProgressionChart();
    info.makeArtistCharts();
};

const createSearchModal = () => {
    const modal = d3.select("body").append("div")
        .attr("id", "search")
        .classed("modal", true);
    const closeModal = () => modal.classed("is-active", false);
    modal.append("div")
        .classed("modal-background", true)
        .on("click", closeModal);
    const container = modal.append("div")
        .classed("modal-content", true);
    const input = createSearchBox(container, {
        filter: (r) => Number.isInteger(r.id),
        fuzzy: 0.2,
        prefix: true
    }, (r) => {
        const posNode = scrollPositionRow(data.positions[r.id]);
        if (posNode) {
            // Expand info
            toggleInfoCell(posNode, null, false);
            autoscroll = false;
            modal.classed("is-active", false);
        }
    });
    input.on("keydown", (event) => {
        if (event.key === "Escape") {
            closeModal();
        }
    });
    modal.append("button")
        .classed("modal-close is-large", true)
        .on("click", closeModal);
};
const createSearchBox = (container, searchOptions, handleClick) => {
    const box = container.append("div")
        .classed("box", true);
    const control = box.append("p")
        .classed("control has-icons-left", true);
    const input = control.append("input")
        .classed("input is-large", true)
        .attr("type", "search");
    control.append("span")
        .classed("icon is-left", true)
        .text(String.fromCodePoint(0x1f50e));
    const results = box.append("table")
        .classed("table search is-fullwidth is-narrow is-hoverable is-striped",
            true
        )
        .append("tbody");
    input.on("input", (event) => {
        performSearch(results, event.target.value, searchOptions, handleClick);
    });
    return input;
};
const openSearchModal = () => {
    const modal = d3.select("#search")
        .classed("is-active", true);
    const input = modal.select("input").node();
    input.focus();
    input.select();
};
const performSearch = (results, text, searchOptions, handleClick) => {
    const docs = search.search(text, searchOptions);
    results.selectAll("tr")
        .data(docs.slice(0, 10))
        .join(enter => enter.append("tr")
            .classed("is-clickable", true)
        )
        .on("click", function(event, r) {
            handleClick(r, results, text);
        })
        .selectAll("td")
        .data(r => Array(searchColumns.length).fill(r.id))
        .join("td")
        .text((d, i) => Number.isInteger(d) ?
            fields[searchColumns[i]].field(data.tracks[d], data.positions[d],
                data.keys[d]
            ) :
            artistFields[searchColumns[i]](d)
        );
};

const createCharts = () => {
    container.append("div")
        .attr("id", "charts")
        .classed("container is-overlay is-hidden", true)
        .append("div")
        .attr("id", "current")
        .classed("section", true)
        .append("div")
        .classed("box", true)
        .text("Coming Soon");
};

const createInfo = () => {
    const info = container.append("div")
        .attr("id", "info")
        .classed("container is-overlay is-hidden", true);
    info.append("div")
        .attr("id", "doc")
        .classed("content section", true)
        .html(doc);

    const credits = info.append("div")
        .attr("id", "credits")
        .classed("section", true);
    credits.append("h1")
        .classed("title is-3", true)
        .text("Credits");

    const dataSources = credits.append("section")
        .attr("id", "data")
        .classed("section", true);
    dataSources.append("h2")
        .classed("title is-4", true)
        .text(`${String.fromCodePoint(0x1f4c4)} Data`);
    const dataCredits = dataSources.append("div")
        .classed("box", true)
        .selectAll("p")
        .data(data.credits)
        .join("p");
    dataCredits.append("span")
        .text(d => `${d.publisher}.\u00a0`);
    dataCredits.append("a")
        .attr("href", d => d.url)
        .attr("target", "_blank")
        .text(d => d.name);
    dataCredits.append("span")
        .text(" (");
    dataCredits.append("a")
        .attr("href", d => d.terms)
        .attr("target", "_blank")
        .text("Terms");
    dataCredits.append("span")
        .text(")");

    const code = credits.append("div")
        .attr("id", "code")
        .classed("section", true);
    code.append("h2")
        .classed("title is-4", true)
        .text(`${String.fromCodePoint(0x1f4bb)} Code`);
    code.append("div")
        .classed("box", true)
        .append("nav")
        .classed("level", true)
        .append("div")
        .classed("level-left", true)
        .selectAll("p")
        .data([
            {
                icon: `${String.fromCodePoint(0x1f5a5)}\ufe0f`,
                text: packageInfo.description,
                url: data.web_url
            },
            {
                icon: `${String.fromCodePoint(0x1f9d1)}\u200d${String.fromCodePoint(0x1f4bb)}`,
                text: packageInfo.author.split(" <", 1)[0],
                url: new URL(".", packageInfo.homepage)
            },
            {
                icon: String.fromCodePoint(0x1f47e),
                text: "GitHub",
                url: packageInfo.homepage
            },
            {
                icon: String.fromCodePoint(0x1fab2),
                text: "Bugs",
                url: packageInfo.bugs.url
            },
            {
                icon: `\u2696\ufe0f`,
                text: packageInfo.license,
                url: new URL("#license", packageInfo.homepage)
            }
        ])
        .join(enter => {
            const item = enter.append("p")
                .classed("level-item has-text-centered", true)
                .append("a")
                .attr("href", d => d.url);
            item.append("p")
                .text(d => d.icon);
            item.append("p")
                .text(d => d.text);
        });
};

updatePagination();
createTable();
createCharts();
createInfo();
createSearchModal();

tabItems.call(updateActiveTab);
d3.select(window).on("hashchange", () => tabItems.call(updateActiveTab));
