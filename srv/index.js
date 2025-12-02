import "./style.scss";
import * as d3 from "d3";
import packageInfo from "../package.json" with { type: "json" };
import currentData from "../output-sorted.json" with { type: "json" };
import doc from "../doc/app.nl.md";

import Charts from "./charts.js";
import Data from "./data.js";
import toggleInfoCell from "./info.js";
import Locale from "./locale.js";
import Search from "./search.js";

const locale = new Locale();

class State {
    constructor() {
        this.autoscroll = true;
    }
}

const data = Data(currentData);
const state = new State();
const charts = new Charts(locale, data);
const search = new Search(locale, data, state);

const currentDisplayDelay = 10000;
const currentUpdateDelay = 1000;
const sep = "\u00a0\u2014\u00a0";

const findTrack = (d, field="tracks") => {
    return data[field][data.reverse ? data.tracks.length - d : d - 1];
};
const formatTrack = (position, d=null) => {
    if (d === null) {
        d = findTrack(position);
    }
    return `${position}. ${d.artist} (${d.year})${sep}${d.title}`;
};

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
    scroll: (d, hash) => charts.select(hash.startsWith(`#/${d}/`) ?
        hash.slice(`#/${d}/`.length) : charts.sources[0].id
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
    const pages = d3.ticks(...d3.nice(data.end, data.front, 20), 20);
    if (current) {
        const currentIndex = data.reverse ? d3.bisectLeft(pages, current) :
            d3.bisectRight(pages, current);
        const page = Math.max(Math.min(data.end, data.front),
            pages[currentIndex + data.direction]
        );
        if (page !== current) {
            pages.splice(currentIndex, 0, current);
        }
        const d = data.findTrack(current);
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
        .data(d3.map(pages, d => d3.median([d, data.end, data.front]))) // Clamp
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
    const previous = i - data.direction;
    const next = i + data.direction;
    const isCurrent = d.timestamp <= now && (
        next in data.tracks ? data.tracks[next].timestamp > now :
        new Date(data.year + 1, 0) > now
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
            next += data.direction;
        }
    }, Math.max(data.tracks[next].timestamp - now, 0) + currentUpdateDelay);
};
const createNextTimer = (pos, timestamp, now) => {
    const diff = timestamp - now + currentUpdateDelay;
    const day = 24 * 60 * 60 * 1000;
    nextPage.datum(data.positions[pos])
        .attr("href", d => `#/${data.year}/${d}`)
        .classed("is-hidden", false)
        .text(diff > day ? locale.formatTimerLong(new Date(diff - day)) :
            locale.formatTimerShort(new Date(diff))
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
                    locale.formatTimerLong(new Date(diff - elapsed - day)) :
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
                    .on("click", search.openModal)
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
    rows.on("click", function(_, d) {
        toggleInfoCell(locale, data, state, this, d);
        autoscroll = false;
    });
    rows.selectAll("td")
        .data((_, i) => Array(columns.length + 1).fill(i))
        .join("td")
        .text((pos, i) => i === columns.length ? "\u25b6" :
            fields[columns[i]].field(data.tracks[pos], data.positions[pos],
                data.keys[pos]
            )
        );
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
charts.create();
createInfo();
search.createModal();

tabItems.call(updateActiveTab);
d3.select(window).on("hashchange", () => tabItems.call(updateActiveTab));
