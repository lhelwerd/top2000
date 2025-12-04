import MiniSearch from "minisearch";
import * as d3 from "d3";
import {toggleInfoCell} from "./info.js";

const searchColumns = ["position", "artist", "title"];

export default class SearchModal {
    constructor(locale, data, state, scroll) {
        this.locale = locale;
        this.data = data;
        this.state = state;
        this.scroll = scroll;

        this.search = new MiniSearch({
            fields: ['position', 'artist', 'title'],
            storeFields: [],
            extractField: (i, fieldName) => {
                if (fieldName === 'id') {
                    return i;
                }
                if (fieldName === 'position') {
                    return Number.isInteger(i) ? this.data.positions[i] : this.data.artists[i][0];
                }
                if (fieldName === 'title') {
                    return Number.isInteger(i) ? this.data.tracks[i].title : "";
                }
                return Number.isInteger(i) ? this.data.tracks[i][fieldName] :
                    this.data.findTrack(this.data.artists[i][0])[fieldName];
            }
        });
        for (const [key, value] of Object.entries(this.data)) {
            if (key === "positions") {
                this.search.addAllAsync(d3.range(value.length));
            }
            else if (key === "artists") {
                this.search.addAllAsync(Object.keys(value));
            }
        }
        this.artistFields = {
            position: d => `${this.data.artists[d][0]}.`,
            artist: d => this.data.findTrack(this.data.artists[d][0]).artist,
            title: d => `(${this.data.artists[d].length}\u00d7)`
        };
    }

    createModal = () => {
        const modal = d3.select("body").append("div")
            .attr("id", "search")
            .classed("modal", true);
        const closeModal = () => modal.classed("is-active", false);
        modal.append("div")
            .classed("modal-background", true)
            .on("click", closeModal);
        const container = modal.append("div")
            .classed("modal-content", true);
        const input = this.createBox(container, {
            filter: (r) => Number.isInteger(r.id),
            fuzzy: 0.2,
            prefix: true
        }, (r) => {
            const posNode = this.scroll.scrollPositionRow(this.data.positions[r.id]);
            if (posNode) {
                // Expand info
                toggleInfoCell(this.locale, this.data, this.state, this.scroll,
                    this, posNode, null, false
                );
                this.state.autoscroll = false;
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
    }

    createBox(container, searchOptions, handleClick) {
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
            this.performSearch(results, event.target.value, searchOptions, handleClick);
        });
        return input;
    }

    open() {
        const modal = d3.select("#search")
            .classed("is-active", true);
        const input = modal.select("input").node();
        input.focus();
        input.select();
    }

    performSearch(results, text, searchOptions, handleClick) {
        const docs = this.search.search(text, searchOptions);
        results.selectAll("tr")
            .data(docs.slice(0, 10))
            .join(enter => enter.append("tr")
                .classed("is-clickable", true)
            )
            .on("click", function(_, r) {
                handleClick(r, results, text);
            })
            .selectAll("td")
            .data(r => Array(searchColumns.length).fill(r.id))
            .join("td")
            .text((d, i) => Number.isInteger(d) ?
                this.data.fields[searchColumns[i]].field(this.data.tracks[d], this.data.positions[d],
                    this.data.keys[d]
                ) :
                this.artistFields[searchColumns[i]](d)
            );
    };
}
