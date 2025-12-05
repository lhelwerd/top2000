import * as d3 from "d3";

export default class Tabs {
    constructor(data, scroll, charts) {
        this.data = data;
        this.scroll = scroll;
        this.charts = charts;

        this.tabs = new Map();

        this.container = d3.select("#container");
        this.head = d3.select("#head");
        this.items = d3.select("#tabs");
    }

    fixStickyScroll() {
        const stickyHeight = this.head.node().scrollHeight +
            this.container.select("table.main > thead").node().scrollHeight;
        document.documentElement.scrollBy(0, -stickyHeight);
    }

    fixAnchorScroll(content, d, hash, selector=null) {
        if (selector === null) {
            if (content.empty() || content.classed("is-hidden")) {
                return false;
            }
            if (hash.startsWith(`#/${d}`) && this.tabs.get(d).scroll) {
                this.tabs.get(d).scroll(d, hash);
            }
            else if (hash.startsWith("#/")) {
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

    setActive(tab) {
        const hash = document.location.hash;
        tab.attr("class", d => hash.startsWith(`#/${d}`) ? "" : this.tabs.get(d).classed)
            .classed("is-active", d => {
                const content = this.container.select(this.tabs.get(d).container);
                const active = hash.startsWith("#/") ? // Tab datum
                    hash.startsWith(`#/${d}`) :
                    /^#[a-z][-a-z0-9_:.]*$/.test(hash) ? // Element ID
                    this.fixAnchorScroll(content, d, hash, hash) :
                    d === this.data.year; // Fallback: current year list
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
        if (this.data.old_data_available) {
            for (let year = this.data.first_year; year < this.data.year; year++) {
                this.tabs.set(year, {
                    icon: String.fromCodePoint(0x1f519),
                    text: `${year}`,
                    container: ".main",
                    scroll: (d, hash) => this.scroll.scrollYearHash(d, hash),
                    classed: year < this.data.year - 1 ? "is-hidden-mobile" : ""
                });
            }
        }
    
        this.tabs.set(this.data.year, {
            icon: String.fromCodePoint(0x1f534),
            text: `${this.data.year}`,
            container: ".main",
            scroll: (d, hash) => this.scroll.scrollYearHash(d, hash)
        });
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

        this.container = d3.select("#container");
        this.head = d3.select("#head");
        this.items = this.head.append("div")
            .attr("id", "tabs")
            .classed("column is-narrow-tablet-only is-narrow-fullhd", true)
            .append("div")
            .classed("tabs is-boxed", true)
            .append("ul")
            .selectAll("li")
            .data(this.tabs.keys())
            .join("li");
        const tabLinks = this.items.append("a")
            .attr("href", d => `#/${d}`)
            .attr("title", d => this.tabs.get(d).text);
        tabLinks.append("span")
            .classed("icon", true)
            .text(d => this.tabs.get(d).icon);
        tabLinks.append("span")
            .classed("is-hidden-tablet-only is-hidden-fullhd-only", true)
            .text(d => `\u00a0${this.tabs.get(d).text}`);
    }

    enable() {
        this.items.call(tab => this.setActive(tab));
        d3.select(window).on("hashchange",
            () => this.items.call(tab => this.setActive(tab))
        );
    }
}
