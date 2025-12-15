import * as d3 from "d3";
import Data from "../data.js";

export default class Tabs {
    constructor(data, scroll, charts) {
        this.data = data;
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
            if (content.empty() || content.classed("is-hidden")) {
                return false;
            }
            if (hash.startsWith(`#/${d}`) && this.tabs.get(d).scroll) {
                this.tabs.get(d).scroll(d, hash);
            }
            else if (hash.startsWith("#/") &&
                (!this.tabs.get(d).year || d === this.data.year)
            ) {
                content.node().scrollIntoView(true);
                this.fixStickyScroll();
            }
            return true;
        }
        const element = content.select(selector);
        if (!element.empty()) {
            this.fixStickyScroll();
            return true;
        }
        return false;
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
                if (!active && /^#\/\d{4}/.test(hash) &&
                    this.tabs.get(d).year
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

    enable(load) {
        const latestYear = this.data.latest_year || this.data.year;
        const years = this.data.old_data_available ?
            [...new Array(latestYear - this.data.first_year + 1).keys()] :
            [latestYear - this.data.first_year];
        for (const index of years) {
            const year = this.data.first_year + index;
            this.tabs.set(year, {
                icon: this.selectYearIcon(year),
                text: `${year}`,
                container: ".main",
                year: true,
                scroll: (d, hash) => {
                    if (d === this.data.year) {
                        this.scroll.scrollYearHash(d, hash);
                    }
                    else if (d === latestYear) {
                        load().enable(load);
                        this.scroll.scrollYearHash(d, hash);
                    }
                    else {
                        import(
                            /* webpackInclude: /output-\d\d\d\d\.json$/ */
                            `@output/output-${d}.json`
                        ).then(data => {
                            load(new Data(data, this.locale)).enable(load);
                            this.scroll.scrollYearHash(d, hash);
                        });
                    }
                },
                classed: year !== latestYear && (year < this.data.year - 1 || year > this.data.year + 1) ?
                    "is-hidden" : ""
            });
        }

        this.tabs.set("charts", {
            icon: String.fromCodePoint(0x1f4ca),
            text: "Charts",
            container: "#charts",
            scroll: (d, hash) => this.charts.select(hash.startsWith(`#/${d}/`) ?
                hash.slice(`#/${d}/`.length) : this.charts.sources[0].id
            )
        });
        this.tabs.set("info", {
            icon: "\u2139\ufe0f",
            text: "Info",
            container: "#info"
        });

        const items = this.list.selectAll("li")
            .data(this.tabs.keys())
            .join("li");
        const tabLinks = items.append("a")
            .attr("href", d => `#/${d}`)
            .attr("title", d => this.tabs.get(d).text);
        tabLinks.append("span")
            .classed("icon", true)
            .text(d => this.tabs.get(d).icon);
        tabLinks.append("span")
            .classed("is-hidden-tablet-only is-hidden-fullhd-only", true)
            .text(d => `\u00a0${this.tabs.get(d).text}`);

        items.call(tab => this.setActive(tab));
        d3.select(globalThis).on("hashchange",
            () => items.call(tab => this.setActive(tab))
        );
    }
}
