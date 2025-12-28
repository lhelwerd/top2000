import MiniSearch from "minisearch";
import * as d3 from "d3";
import { toggleInfoCell } from "../info.js";
import Modal from "./index.js";

const searchColumns = ["position", "artist", "title"];

export default class SearchModal extends Modal {
    MODAL_ID = "search";

    constructor(locale, data, state, scroll) {
        super();
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
        this.fill();
        this.artistFields = {
            position: d => `${this.data.artists[d][0]}.`,
            artist: d => this.data.findTrack(this.data.artists[d][0]).artist,
            title: d => `(${this.data.artists[d].length}\u00d7)`
        };
    }

    fill() {
        for (const [key, value] of Object.entries(this.data)) {
            if (key === "positions") {
                this.search.addAllAsync(d3.range(value.length));
            }
            else if (key === "artists") {
                this.search.addAllAsync(Object.keys(value));
            }
        }
    }

    createContent(modal, container) {
        const input = this.createBox(container, {
            filter: (r) => Number.isInteger(r.id),
            fuzzy: 0.2,
            prefix: true
        }, (r) => {
            this.state.autoscroll = false;
            globalThis.history.pushState({ modalClosed: "search" }, "",
                `#/${this.data.year}/${this.data.positions[r.id]}`
            );
            this.close();
            const posNode = this.scroll.scrollPositionRow(this.data.positions[r.id]);
            if (posNode) {
                // Expand info
                toggleInfoCell(
                    {
                        locale: this.locale,
                        data: this.data,
                        state: this.state,
                        scroll: this.scroll,
                        search: this
                    },
                    posNode, null, false
                );
            }
        });
        input.on("keydown", (event) => {
            if (event.key === "Escape") {
                this.close();
            }
        });
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

    open(closeCallback = null) {
        super.open(closeCallback);
        const input = d3.select("#search input").node();
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
            .data(r => new Array(searchColumns.length).fill(r.id))
            .join("td")
            .text((d, i) => Number.isInteger(d) ?
                this.data.fields[searchColumns[i]].field(this.data.tracks[d], this.data.positions[d],
                    this.data.keys[d]
                ) :
                this.artistFields[searchColumns[i]](d)
            );
    };
}
