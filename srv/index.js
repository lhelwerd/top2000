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
const start = data.reverse ? end : front;

const findTrack = (d, field="tracks") => {
    return data[field][data.reverse ? data.tracks.length - d : d - 1];
};
const formatTrack = (position, d=null) => {
    if (d === null) {
        d = findTrack(position);
    }
    return `${position}. ${d.artist} (${d.year})${sep}${d.title}`;
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
const scrollYearHash = (d, hash) => {
    scrollPositionRow(Number(hash.startsWith(`#/${d}/`) ?
        hash.slice(`#/${d}/`.length) : nextPage.datum()
    ));
};

const tabs = new Map();
if (data.old_data_available) {
    for (let year = data.first_year; year < data.year; year++) {
        tabs.set(year, {
            icon: String.fromCodePoint(0x1f519),
            text: `${year}`,
            container: ".main",
            scroll: scrollYearHash,
            classed: year < data.year - 1 ? "is-hidden-mobile" : ""
        });
    }
}
tabs.set(data.year, {
    icon: String.fromCodePoint(0x1f534),
    text: `${data.year}`,
    container: ".main",
    scroll: scrollYearHash
});
tabs.set("charts", {
    icon: String.fromCodePoint(0x1f4ca),
    text: "Charts",
    container: "#charts",
    scroll: (d, hash) => selectChart(hash.startsWith(`#/${d}/`) ?
        hash.slice(`#/${d}/`.length) : chartSources[0].id
    )
});
tabs.set("info", {
    icon: "\u2139\ufe0f",
    text: "Info",
    container: "#info"
});

const fixStickyScroll = () => {
    const stickyHeight = head.node().scrollHeight +
        container.select("table.main > thead").node().scrollHeight;
    document.documentElement.scrollBy(0, -stickyHeight);
};
const fixAnchorScroll = (content, d, hash, selector=null) => {
    if (selector === null) {
        if (content.empty() || content.classed("is-hidden")) {
            return false;
        }
        if (hash.startsWith(`#/${d}`) && tabs.get(d).scroll) {
            tabs.get(d).scroll(d, hash);
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
                fixAnchorScroll(content, d, hash, hash) :
                d === data.year; // Fallback: current year list
            content.classed("is-hidden", !active)
                .classed("is-overlay", active && d !== data.year);
            return active;
        })
        .each(d => {
            const content = container.select(tabs.get(d).container);
            fixAnchorScroll(content, d, document.location.hash);
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
        const currentIndex = data.reverse ? d3.bisectLeft(pages, current) :
            d3.bisectRight(pages, current);
        const page = Math.max(Math.min(end, front),
            pages[currentIndex + direction]
        );
        if (page !== current) {
            pages.splice(currentIndex, 0, current);
        }
        const d = findTrack(current);
        nextPage.datum(current)
            .attr("href", d => `#/${data.year}/${d}`)
            .classed("is-hidden", false)
            .classed("track", true)
            .text(formatTrack(current, d));
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
    const isCurrent = d.timestamp <= now && (
        next in data.tracks ? data.tracks[next].timestamp > now :
        new Date(currentYear + 1, 0) > now
    );
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
    if (!(next in data.tracks)) {
        return;
    }
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

const getArtistName = (d) => {
    const filterName = (artist) => artist.toLowerCase() === d;
    for (let i = 0; i < data.artists[d].length; i++) {
        const track = findTrack(data.artists[d][i]);
        if (filterName(track.artist)) {
            return track.artist;
        }
        if (data.artist_links) {
            const names = d3.filter(
                Object.values(findTrack(data.artists[d][i], "artist_links")),
                filterName
            );
            if (names[0]) {
                return names[0];
            }
        }
    }
    return d;
};
const isOverlap = (chart, key) => chart.isSubsetOf(new Set(data.artists[key]));
const isCollab = (d) => {
    const chart = new Set(data.artists[d]);
    return d3.some(data.artists[d], pos => {
        if (d3.some(findTrack(pos, "keys"),
            key => key[0] !== d && isOverlap(chart, key[0])
        )) {
            return true;
        }
        const track = findTrack(pos);
        if (track.artist_keys) {
            if (track.artist_keys.length > 1) {
                return true;
            }
            return d3.some(Object.values(track.artist_keys),
                artist => artist.toLowerCase() !== d &&
                    artist.toLowerCase() in data.artists &&
                    isOverlap(chart, artist.toLowerCase())
            );
        }
        return false;
    });
};
const countCollabs = (d) => {
    const chart = new Set(data.artists[d]);
    const collabs = new Set(d3.merge(d3.map(data.artists[d], pos => {
        const track = findTrack(pos);
        const charts = new Map();
        d3.map(findTrack(pos, "keys"), key => {
            if (!isOverlap(chart, key[0])) {
                charts.set(data.artists[key[0]].toString(), key[0]);
            }
        });
        if (track.artist_keys) {
            d3.map(Object.values(track.artist_keys), artist => {
                const key = artist.toLowerCase();
                if (key in data.artists && !isOverlap(chart, key)) {
                    charts.set(data.artists[key].toString(), key);
                }
            });
        }
        return charts.values();
    })));
    return collabs.size;
};
const getTitleLength = (d) => d.title.replaceAll(/ *\([^)]+\) */g, "").length;
const getTrackTime = (i) => {
    const next = i + direction;
    if (!(next in data.tracks)) {
        return new Date(currentYear + 1, 0) - data.tracks[i].timestamp;
    }
    const nextDate = new Date(data.tracks[next].timestamp);
    let diff = 0;
    if (nextDate.getHours() != new Date(data.tracks[i].timestamp).getHours()) {
        diff += (nextDate.getMinutes() * 60 + nextDate.getSeconds()) * 1000;
        if (nextDate.getHours() == 0 || nextDate.getHours() >= 6) {
            diff *= 2;
        }
    }
    return data.tracks[next].timestamp - data.tracks[i].timestamp - diff;
};
const chartSources = [
    {
        id: "max_artist",
        name: "Artiesten met meeste nummers",
        type: "bar",
        source: () => d3.sort(Object.keys(data.artists),
            d => -data.artists[d].length
        ),
        min: x => 0,
        max: x => d3.max(Object.values(data.artists), chart => chart.length),
        y: d => data.artists[d].length,
        x: d => getArtistName(d),
        yFormat: y => y
    },
    {
        id: "artist_collab",
        name: "Meeste samenwerkingen",
        type: "bar",
        source: () => d3.sort(Object.keys(data.artists),
            d => -countCollabs(d)
        ),
        min: x => 0,
        max: x => countCollabs(x.domain()[0]),
        y: d => countCollabs(d),
        x: d => getArtistName(d)
    },
    {
        id: "artist_name",
        name: "Langste artiestennamen",
        type: "bar",
        swap: true,
        source: () => d3.sort(Object.keys(data.artists),
            d => isCollab(d) ? 0 : -d.length
        ),
        min: x => 0,
        max: x => x.domain()[0].length,
        y: d => d.length,
        x: d => getArtistName(d)
    },
    {
        type: "divider"
    },
    {
        id: "new",
        name: "Hoogste binnenkomers",
        type: "bar",
        swap: true,
        source: () => {
            const positions = d3.filter(data.positions,
                (pos, i) => d3.every(d3.range(data.first_year, currentYear),
                    year => !(year in data.tracks[i]) ||
                        data.tracks[i][year] > start
                )
            );
            return data.reverse ? d3.reverse(positions) : positions;
        },
        min: x => front,
        max: x => x.domain()[0],
        y: d => d,
        x: d => formatTrack(d),
        yFormat: y => y
    },
    {
        id: "rise",
        name: "Sterkste stijgers",
        type: "bar",
        swap: true,
        source: () => d3.sort(d3.zip(data.positions, data.tracks),
            p => p[1][currentYear - 1] <= start ?
                p[0] - p[1][currentYear - 1] : 0
        ),
        min: x => 0,
        max: x => x.domain()[0][1][currentYear - 1] - x.domain()[0][0],
        y: p => p[1][currentYear - 1] - p[0],
        x: p => formatTrack(...p),
        yFormat: y => `\u25b2${y}`
    },
    {
        id: "extra500",
        name: "Doorbraak uit De Extra 500",
        type: "bar",
        swap: true,
        enabled: () => d3.some(data.tracks, d => d[currentYear - 1] > start),
        source: () => d3.sort(d3.zip(data.positions, data.tracks),
            p => p[1][currentYear - 1] > start ?
                p[0] - p[1][currentYear - 1] : 0
        ),
        min: x => 0,
        max: x => x.domain()[0][1][currentYear - 1] - x.domain()[0][0],
        y: p => p[1][currentYear - 1] - p[0],
        x: p => formatTrack(...p),
        yFormat: y => `\u25b2${y}`
    },
    {
        id: "fall",
        name: "Sterkste dalers",
        type: "bar",
        swap: true,
        source: () => d3.sort(d3.zip(data.positions, data.tracks),
            p => p[1][currentYear - 1] - p[0]
        ),
        min: x => 0,
        max: x => x.domain()[0][0] - x.domain()[0][1][currentYear - 1],
        y: p => p[0] - p[1][currentYear - 1],
        x: p => formatTrack(...p),
        yFormat: y => `\u25bc${y}`
    },
    {
        id: "return",
        name: "Terugkerende nummers",
        type: "bar",
        swap: true,
        source: () => d3.sort(d3.map(d3.zip(data.positions, data.tracks), p => {
            for (let year = currentYear - 1; year >= data.first_year; year--) {
                if (year in p[1] && p[1][year] <= start) {
                    return [...p, year - currentYear];
                }
            }
            return [...p, 0];
        }), t => t[2]),
        min: x => currentYear,
        max: x => currentYear + x.domain()[0][2],
        y: t => currentYear + t[2],
        x: t => formatTrack(t[0], t[1]),
        yFormat: y => y
    },
    {
        type: "divider"
    },
    {
        id: "old",
        name: "Oudste nummers",
        type: "bar",
        swap: true,
        source: () => d3.sort(d3.zip(data.positions, data.tracks),
            p => p[1].year
        ),
        min: x => currentYear,
        max: x => x.domain()[0][1].year,
        y: p => p[1].year,
        x: p => formatTrack(...p),
        yFormat: y => y
    },
    {
        id: "old_new",
        name: "Oudste binnenkomers",
        type: "bar",
        swap: true,
        source: () => d3.sort(d3.filter(d3.zip(data.positions, data.tracks),
            p => d3.every(d3.range(data.first_year, currentYear),
                year => !(year in p[1]) || p[1][year] > start
            )
        ), p => p[1].year),
        min: x => currentYear,
        max: x => x.domain()[0][1].year,
        y: p => p[1].year,
        x: p => formatTrack(...p),
        yFormat: y => y
    },
    {
        type: "divider"
    },
    {
        id: "long_title",
        name: "Langste titels",
        type: "bar",
        swap: true,
        source: () => d3.sort(d3.zip(data.positions, data.tracks),
            p => -getTitleLength(p[1])
        ),
        min: x => 0,
        max: x => getTitleLength(x.domain()[0][1]),
        y: p => getTitleLength(p[1]),
        x: p => formatTrack(...p)
    },
    {
        type: "divider",
        enabled: () => data.tracks[0].timestamp
    },
    {
        id: "long_track",
        name: "Langste nummers",
        type: "bar",
        enabled: () => data.tracks[0].timestamp,
        swap: true,
        source: () => d3.sort(d3.range(data.positions.length),
            i => -getTrackTime(i)
        ),
        min: x => 0,
        max: x => getTrackTime(x.domain()[0]),
        y: i => getTrackTime(i),
        x: i => formatTrack(data.positions[i], data.tracks[i]),
        yFormat: nl.utcFormat("%M:%S"),
        xFormat: (d, i) => i + 1
    },
    {
        id: "daily_tracks",
        name: "Nummers per dag",
        type: "hist",
        enabled: () => data.tracks[0].timestamp,
        source: () => d3.map(data.tracks,
            track => new Date(track.timestamp).getDate()
        ),
        binCount: 7,
        x: bin => `${bin.x0}\u2014${bin.x1 > 31 ? 1 : bin.x1}`
    },
    {
        id: "hourly_tracks",
        name: "Nummers per uur",
        type: "hist",
        enabled: () => data.tracks[0].timestamp,
        source: () => d3.map(data.tracks,
            track => new Date(track.timestamp).getHours()
        ),
        binCount: 24,
        xFormat: bin => bin.x0
    },
    {
        type: "divider"
    },
    {
        id: "start",
        name: "Nummers per binnenkomst",
        type: "hist",
        source: () => d3.map(data.tracks, track => {
            let startYear = currentYear;
            for (let year = data.first_year; year < currentYear; year++) {
                if (year in track && track[year] <= start) {
                    startYear = year;
                    break;
                }
            }
            return startYear;
        }),
        binCount: currentYear - data.first_year + 1,
        yScale: d3.scaleLog,
        min: x => 1,
        x: bin => bin.x0
    },
    {
        id: "decade",
        name: "Nummers per decennium",
        type: "hist",
        source: () => d3.map(data.tracks, track => track.year),
        binSize: 10,
    }
];
const createChart = (column, chart) => {
    // Stats chart
    const width = 800;
    const height = 500;
    const marginTop = 20;
    const marginRight = 20;
    const marginBottom = 30;
    const marginLeft = 40;
    const barWidth = 30;

    const textSize = chart.swap ? -25 : 10;

    let source = chart.source;
    if (chart.type === "hist") {
        source = () => {
            const values = chart.source();
            return d3.bin().thresholds(chart.binCount ? chart.binCount :
                d3.range(...d3.nice(...d3.extent(values), chart.binSize),
                    chart.binSize
                )
            )(values);
        };
        chart.min = chart.min || (x => 0);
        chart.max = chart.max || (x => d3.max(x.domain(), bin => bin.length));
        chart.y = chart.y || (bin => bin.length);
        chart.x = chart.x || (bin => `${bin.x0}\u2014${bin.x1}`);
        chart.count = chart.count || chart.binCount;
    }

    const hExtent = [marginLeft, width - marginRight];
    const vExtent = [height - marginBottom, marginTop];
    const count = chart.count || 10;
    const x = d3.scaleOrdinal()
        .domain(source().slice(0, count))
        .range(chart.swap ?
            d3.range(vExtent[1] + barWidth / 2, vExtent[0] + barWidth / 2,
                (height - marginTop - marginBottom) / count
            ) :
            d3.range(hExtent[0] + barWidth / 2, hExtent[1] + barWidth / 2,
                (width - marginLeft - marginRight) / count
            )
        );
    const yMin = chart.min(x);
    const y = (chart.yScale || d3.scaleLinear)()
        .domain([yMin, chart.max(x)])
        .range(chart.swap ? hExtent : vExtent);
    const min = y(yMin);

    column.html("");
    column.append("h1")
        .classed("title is-4 has-text-centered", true)
        .text(chart.name);
    const svg = column.append("svg")
        .attr("width", width)
        .attr("height", height);
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(chart.swap ? y : x)
            .tickFormat(chart.swap ? chart.yFormat :
                chart.xFormat ? chart.xFormat : chart.x
            ));
    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(chart.swap ? x : y)
            .tickFormat((d, i) => chart.swap && chart.xFormat ?
                chart.xFormat(d, i) :
                Number.isInteger(d) ? d : i + 1
            ));
    const bar = svg.selectAll("g.bars")
        .data(x.domain())
        .join("g")
        .classed("bars", true)
        .attr("font-family", "sans-serif")
        .attr("text-anchor", "middle");
    const makeRect = (x, y) => {
        const path = d3.path();
        const offset = x - barWidth / 2;
        const size = y - min;
        if (chart.swap) {
            path.rect(min, offset, size, barWidth);
        }
        else {
            path.rect(offset, min, barWidth, size);
        }
        return path.toString();
    };
    bar.append("path")
        .attr("fill", (d, i) => stroke(i % cycle))
        .attr("d", d => makeRect(x(d), y(chart.y(d))));
    bar.append("text")
        .attr(chart.swap ? "y" : "x", d => x(d))
        .attr(chart.swap ? "x" : "y", d => y(chart.y(d)) + textSize)
        .attr("dy", "0.32em")
        .text(d => chart.yFormat ? chart.yFormat(chart.y(d)) : chart.y(d));
    bar.append("g")
        .attr("clip-path", d =>
            `path('${makeRect(x(d), y(chart.y(d)) + 2 * textSize)}') view-box`
        )
        .append("text")
        .attr(chart.swap ? "y" : "x", d => x(d))
        .attr(chart.swap ? "x" : "y", d => (y(chart.y(d)) + min) / 2)
        .attr("dx", textSize)
        .attr("dy", "0.32em")
        .attr("font-size", 10)
        .attr("transform", d => chart.swap ? null :
            `rotate(90 ${x(d)} ${(y(chart.y(d)) + min) / 2})`
        )
        .text(d => chart.x(d));
};
const createCharts = () => {
    const columns = container.append("div")
        .attr("id", "charts")
        .classed("container is-overlay is-hidden", true)
        .append("div")
        .attr("id", "current")
        .classed("section", true)
        .append("div")
        .classed("columns is-multiline is-centered", true);
    const dropdownColumn = columns.append("div")
        .classed("column is-narrow", true);
    const chartColumn = columns.append("div")
        .classed("column is-narrow chart", true);

    const dropdown = dropdownColumn.append("div")
        .classed("dropdown is-hoverable-widescreen is-right-widescreen", true);
    const button = dropdown.append("div")
        .classed("dropdown-trigger", true)
        .append("button")
        .classed("button", true)
        .attr("aria-haspopup", true)
        .attr("aria-controls", "chart-dropdown");
    button.append("span")
        .text("Charts");
    const buttonIcon = button.append("span")
        .classed("icon", true)
        .text("\u25b8");
    button.on("click", () => {
        const active = dropdown.classed("is-active");
        buttonIcon.text(active ? "\u25b8" : "\u25be");
        dropdown.classed("is-active", !active);
    });
    const items = dropdown.append("div")
        .classed("dropdown-menu", true)
        .attr("id", "chart-dropdown")
        .attr("role", "menu")
        .append("div")
        .classed("dropdown-content", true)
        .selectAll("a, hr")
        .data(d3.filter(chartSources,
            chart => chart.enabled ? chart.enabled() : true
        ))
        .join(enter => enter.append(
                d => document.createElement(d.type === "divider" ? "hr" :"a")
            )
            .attr("href", d => d.id ? `#/charts/${d.id}` : null)
            .classed("dropdown-item", d => d.type !== "divider")
            .classed("dropdown-divider", d => d.type === "divider")
            .on("click", function(event, chart) {
                if (chart.type === "divider") {
                    event.stopPropagation();
                    return;
                }
                dropdown.classed("is-active", false);
                buttonIcon.text("\u25b8");
            })
            .text(d => d.name ? d.name : null)
        );
};
const selectChart = (id) => {
    const columns = container.select("#charts .columns");
    columns.select("#chart-dropdown")
        .selectAll(".dropdown-item")
        .classed("is-active", d => {
            if (d.id === id) {
                createChart(columns.select(".column.chart"), d);
            }
            return d.id === id;
        });
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
                text: (typeof packageInfo.author === "string" ?
                    packageInfo.author : packageInfo.author.name
                ).split(" <", 1)[0],
                url: typeof packageInfo.author === "string" ?
                    new URL(".", packageInfo.homepage) : packageInfo.author.url
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
