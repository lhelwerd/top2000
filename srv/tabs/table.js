import * as d3 from "d3";
import { toggleInfoCell } from "../info.js";

export default class Table {
    constructor(locale, data, search, scroll, state) {
        this.locale = locale;
        this.data = data;
        this.search = search;
        this.scroll = scroll;
        this.state = state;
    }

    create() {
        const table = d3.select("#container").append("table")
            .classed("table main is-narrow is-hoverable is-striped is-fullwidth",
                true
            );

        const head = table.append("thead");

        const setOffset = (node) => head.style("top", `${node.getBoundingClientRect().height}px`);
        const header = d3.select("#head-container").node();
        setOffset(header);
        new ResizeObserver(entries => setOffset(entries[0].target)).observe(header);

        head.append("tr")
            .selectAll("th")
            .data([...this.data.trackColumns, "search"])
            .join("th")
            .each((d, i, nodes) => {
                const cell = d3.select(nodes[i]);
                if (d === "current") {
                    cell.append("a")
                        .attr("href", `#/${this.data.latest_year}`)
                        .text(this.data.latest_year);
                }
                else if (d === "search") {
                    cell.append("a")
                        .attr("href", `#/search/${this.data.year}`)
                        .text(String.fromCodePoint(0x1f50e));
                }
                else {
                    cell.text(this.data.fields[d].column);
                }
            });
        const rows = table.append("tbody").selectAll("tr")
            .data(this.data.tracks)
            .join("tr")
            .classed("is-clickable", true)
            .classed("is-hour-start", (d, i) => d.timestamp &&
                i - this.data.direction in this.data.tracks &&
                new Date(d.timestamp).getHours() !== new Date(this.data.tracks[i - this.data.direction].timestamp).getHours()
            )
            .each((d, i, nodes) => this.scroll.setCurrent(d, i, nodes));
        const infoParams = {
            locale: this.locale,
            data: this.data,
            state: this.state,
            scroll: this.scroll,
            search: this.search
        };
        const state = this.state;
        rows.on("click", function(_, d) {
            toggleInfoCell(infoParams, this, d);
            state.autoscroll = false;
        });
        rows.selectAll("td")
            .data((_, i) => new Array(this.data.trackColumns.length + 1).fill(i))
            .join("td")
            .text((pos, i) => i === this.data.trackColumns.length ? "\u25b6" :
                this.data.fields[this.data.trackColumns[i]].field(this.data.tracks[pos],
                    this.data.positions[pos], this.data.keys[pos]
                )
            );
    }
}
