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
        table.append("thead")
            .append("tr")
            .selectAll("th")
            .data([...this.data.columns, ""])
            .join("th")
            .each((d, i, nodes) => {
                const cell = d3.select(nodes[i]);
                if (i === this.data.columns.length) {
                    cell.append("a")
                        .on("click", () => this.search.open())
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
            .each((d, i, nodes) => this.scroll.setCurrent(d, i, nodes));
        const infoParams = {
            locale: this.locale,
            data: this.data,
            state: this.state,
            scroll: this.scroll,
            search: this.search
        };
        const state = this.state;
        rows.on("click", function (_, d) {
            toggleInfoCell(infoParams, this, d);
            state.autoscroll = false;
        });
        rows.selectAll("td")
            .data((_, i) => new Array(this.data.columns.length + 1).fill(i))
            .join("td")
            .text((pos, i) => i === this.data.columns.length ? "\u25b6" :
                this.data.fields[this.data.columns[i]].field(this.data.tracks[pos],
                    this.data.positions[pos], this.data.keys[pos]
                )
            );
    }
}
