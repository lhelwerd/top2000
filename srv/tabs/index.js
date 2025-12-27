import * as d3 from "d3";
import Data from "../data.js";
import Upload from "../modal/upload.js";

export default class Tabs {
    constructor(locale, data, search, scroll, charts) {
        this.locale = locale;
        this.data = data;

        this.search = search;
        this.scroll = scroll;
        this.charts = charts;

        this.tabs = new Map();

        this.container = d3.select("#container");
        this.head = d3.select("#head");
        this.list = d3.select("#tabs-list");
    }

    fixStickyScroll() {
        const stickyHeight = this.head.node().scrollHeight +
            this.container.select("table.main > thead").node().scrollHeight;
        document.documentElement.scrollBy(0, -stickyHeight);
    }

    fixAnchorScroll(content, d, hash, selector = null) {
        if (selector === null) {
            this.updateVisible(content, d, hash);
        }
        const element = content.select(selector);
        if (!element.empty()) {
            this.fixStickyScroll();
            return true;
        }
        return false;
    }

    fixContentScroll(content) {
        content.node().scrollIntoView(true);
        this.fixStickyScroll();
    }

    updateVisible(content, d, hash) {
        const tab = this.tabs.get(d);
        const active = hash.startsWith(`#/${d}`);
        if (content.empty() || content.classed("is-hidden")) {
            if (active && tab.activate) {
                tab.activate(d, hash);
                return false;
            }
            return false;
        }
        if (!active && tab.activate && content.classed("is-active")) {
            content.classed("is-active", false);
            return false;
        }
        const scroll = tab.scroll || (() => this.fixContentScroll(content));
        if (active && !tab.activate) {
            scroll(d, hash);
        }
        return true;
    }

    checkActive(content, d, hash) {
        if (hash.startsWith("#/")) { // Tab datum
            return hash.startsWith(`#/${d}`);
        }
        return /^#[a-z][-a-z0-9_:.]*$/.test(hash) ? // Element ID
            this.fixAnchorScroll(content, d, hash, hash) :
            d === this.data.year; // Fallback: current year list
    }

    setActive(tab) {
        const hash = document.location.hash;
        tab.attr("class", d => hash.startsWith(`#/${d}`) ? "" : this.tabs.get(d).classed)
            .classed("is-active", d => {
                const content = this.container.select(this.tabs.get(d).container);
                const active = this.checkActive(content, d, hash);
                const found = /^#\/(?<tab>\d{4}|search|upload)/.exec(hash);
                if (!active && found &&
                    (this.tabs.get(d).year || this.tabs.get(found.groups.tab)?.activate)
                ) {
                    return active;
                }
                content.classed("is-hidden", !active)
                    .classed("is-overlay", active && d !== this.data.year);
                return active;
            })
            .each(d => {
                const content = this.container.select(this.tabs.get(d).container);
                this.fixAnchorScroll(content, d, document.location.hash);
            });
    }

    create() {
        this.container = d3.select("#container");
        this.head = d3.select("#head");
        this.list = this.head.append("div")
            .attr("id", "tabs")
            .classed("column is-narrow-tablet-only is-narrow-fullhd", true)
            .append("div")
            .classed("tabs is-boxed", true)
            .append("ul")
            .attr("id", "tabs-list");
    }

    selectYearIcon(year) {
        const latestYear = this.data.latest_year || this.data.year;
        if (year === latestYear) {
            return String.fromCodePoint(0x1f534);
        }
        if (year === this.data.year) {
            return String.fromCodePoint(0x1f535);
        }
        return String.fromCodePoint(year < this.data.year ? 0x1f519 : 0x1f51c);
    }

    enable(load, yearData) {
        const latestYear = this.data.latest_year || this.data.year;
        const years = this.data.old_data_available ?
            [...new Array(latestYear - this.data.first_year + 1).keys()] :
            [latestYear - this.data.first_year];
        const loadYear = async (d, hash) => {
            if (d === this.data.year) {
                this.scroll.scrollYearHash(d, hash);
            }
            else if (yearData[d]) {
                load(new Data(yearData[d], this.locale)).enable(load, yearData);
            }
            else if (d === latestYear) {
                load().enable(load, yearData);
                this.scroll.scrollYearHash(d, hash);
            }
            else {
                const data = await import(
                    /* webpackInclude: /output-\d\d\d\d\.json$/ */
                    `@output/output-${d}.json`
                );
                load(new Data(data, this.locale)).enable(load, yearData);
                this.scroll.scrollYearHash(d, hash);
            }
        };
        const updateActive = () => {
            items.call(tab => this.setActive(tab));
            const activeTab = items.filter(".is-active");
            if (activeTab.empty()) {
                return;
            }
            activeTab.node().scrollIntoView({
                container: "nearest",
                inline: "center",
            });
            const active = activeTab.datum();
            const activeYear = this.tabs.get(active).year ? "" : `/${this.data.year}`;
            items.selectAll("a")
                .attr("href", d => {
                    const tab = this.tabs.get(d);
                    if (d === active || tab.year) {
                        return `#/${d}`;
                    }
                    if (!tab.activate) {
                        return `#/${d}${activeYear}`;
                    }
                    return `#/${d}/${active}${activeYear}`;
                });
        };
        const closeActive = (d) => {
            const extraHash = document.location.hash.startsWith(`#/${d}/`) ?
                document.location.hash.slice(`#/${d}`.length) : `/${this.data.year}`;
            document.location.hash = `#${extraHash}`;
        };

        for (const index of years) {
            const year = this.data.first_year + index;
            this.tabs.set(year, {
                icon: this.selectYearIcon(year),
                text: `${year}`,
                container: ".main",
                year: true,
                scroll: loadYear,
                classed: year !== latestYear && (year < this.data.year - 1 || year > this.data.year + 1) ?
                    "is-hidden" : ""
            });
        }

        const upload = new Upload(this.data, this.locale, load, yearData);
        upload.createModal();

        this.tabs.set("charts", {
            icon: String.fromCodePoint(0x1f4ca),
            text: "Charts",
            container: "#charts",
            scroll: (d, hash) => {
                let chart = "";
                const hashPrefix = `#/${d}/`;
                if (hash.startsWith(`${hashPrefix}${this.data.year}`)) {
                    chart = hash.slice(`${hashPrefix}${this.data.year}/`.length);
                }
                else if (/^#\/charts\/\d{4}(?:\/|$)/.test(hash)) {
                    loadYear(Number(hash.substr(hashPrefix.length, 4)), hash);
                    return;
                }
                else if (hash.startsWith(hashPrefix)) {
                    chart = hash.slice(hashPrefix.length);
                }
                const content = this.charts.select(chart || this.charts.sources[0].id);
                this.fixContentScroll(content);
            }
        });
        this.tabs.set("info", {
            icon: "\u2139\ufe0f",
            text: "Info",
            container: "#info"
        });
        this.tabs.set("search", {
            icon: String.fromCodePoint(0x1f50e),
            container: "#search",
            activate: (d) => this.search.open(() => closeActive(d))
        });
        this.tabs.set("upload", {
            icon: String.fromCodePoint(0x1f4e4),
            container: "#upload",
            activate: (d) => upload.open(() => closeActive(d))
        });

        const items = this.list.selectAll("li")
            .data(this.tabs.keys())
            .join("li");
        const tabLinks = items.append("a")
            .attr("href", d => `#/${d}`)
            .attr("title", d => this.tabs.get(d).text || null);
        tabLinks.append("span")
            .classed("icon", true)
            .text(d => this.tabs.get(d).icon);
        tabLinks.append("span")
            .classed("is-hidden-tablet-only is-hidden-fullhd-only", true)
            .text(d => `\u00a0${this.tabs.get(d).text || ""}`);

        updateActive();
        d3.select(globalThis).on("hashchange", updateActive);
    }
}
