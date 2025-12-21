import * as d3 from "d3";
import Data from "../data.js";

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
            const tab = this.tabs.get(d);
            if (content.empty() || content.classed("is-hidden")) {
                if (hash === `#/${d}` && tab.activate) {
                    tab.activate(d, hash);
                    return false;
                }
                return false;
            }
            if (hash.startsWith(`#/${d}`) && tab.scroll) {
                tab.scroll(d, hash);
            }
            else if (hash.startsWith("#/") &&
                (!tab.year || d === this.data.year)
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
                if (!active && /^#\/(?:\d{4}|search|upload)/.test(hash) &&
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

    enable(load, yearData) {
        const latestYear = this.data.latest_year || this.data.year;
        const years = this.data.old_data_available ?
            [...new Array(latestYear - this.data.first_year + 1).keys()] :
            [latestYear - this.data.first_year];
        const loadYear = (d, hash) => {
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
                import(
                    /* webpackInclude: /output-\d\d\d\d\.json$/ */
                    `@output/output-${d}.json`
                ).then(data => {
                    load(new Data(data, this.locale)).enable(load, yearData);
                    this.scroll.scrollYearHash(d, hash);
                });
            }
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
        this.tabs.set("search", {
            icon: String.fromCodePoint(0x1f50e),
            container: "#search",
            activate: () => this.search.open()
        });
        this.tabs.set("upload", {
            icon: String.fromCodePoint(0x1f4e4),
            container: "#upload",
            activate: () => this.openUpload(load, yearData)
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

        items.call(tab => this.setActive(tab));
        d3.select(globalThis).on("hashchange",
            () => items.call(tab => this.setActive(tab))
        );
    }

    openUpload(load, yearData) {
        d3.select("#upload").remove();
        const modal = d3.select("body").append("div")
            .attr("id", "upload")
            .classed("modal is-active", true);
        const closeModal = () => modal.classed("is-active", false);
        modal.append("div")
            .classed("modal-background", true)
            .on("click", closeModal);
        const container = modal.append("div")
            .classed("modal-content", true);
        const box = container.append("box")
            .classed("box", true);

        const file = box.append("div")
            .classed("file is-large is-boxed", true);
        const label = file.append("label")
            .classed("file-label", true);
        const input = label.append("input")
            .classed("file-input", true)
            .attr("type", "file");
        const text = label.append("span")
            .classed("file-cta", true);
        text.append("span")
            .classed("file-icon", true)
            .text(String.fromCodePoint(0x1f4e4));
        text.append("span")
            .classed("file-label", true)
            .text("[ Upload / drag-&-drop dump ]");

        const rows = box.append("table")
            .classed("table is-fullwidth is-narrow is-hoverable is-striped",
                true
            )
            .append("tbody");
        const updateRows = () => {
            rows.selectAll("tr")
                .data(Object.entries(yearData))
                .join(enter => {
                    const row = enter.append("tr")
                        .classed("is-clickable", true)
                        .on("click", (_, y) => {
                            delete yearData[y[0]];
                            globalThis.localStorage.setItem("data", JSON.stringify(yearData));
                            updateRows();
                            if (Number(y[0]) === this.data.latest_year) {
                                globalThis.location.reload();
                            }
                        });
                    row.append("td").text(y => y[0]);
                    row.append("td").text(y => Object.values(y[1].columns).join(", "));
                    row.append("td").text("\u2716");
                })
        };
        updateRows();

        const uploadFile = (dump) => {
            if (!dump) {
                file.classed("is-error", true);
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result);
                    yearData[data.year] = data;
                    globalThis.localStorage.setItem("data", JSON.stringify(yearData));
                    updateRows();
                    file.classed("is-error", false);
                    load(new Data(yearData[data.year], this.locale)).enable(load, yearData);
                }
                catch {
                    file.classed("is-error", true);
                }
            };
            reader.onerror = () => {
                file.classed("is-error", true);
            };
            reader.readAsText(dump);
        };
        input.on("change", (event) => uploadFile(event.target.files[0]));
        file.on("dragenter", (event) => {
            // Adjust the display to show we are a proper drop zone
            event.stopPropagation();
            event.preventDefault();
        })
            .on("dragover", (event) => {
                event.stopPropagation();
                event.preventDefault();
            })
            .on("drop", (event) => {
                event.stopPropagation();
                event.preventDefault();
                uploadFile(event.dataTransfer.files[0]);
            });
    }
}
