import * as d3 from "d3";
import changelog from "../../CHANGELOG.md";

export default class Changelog {
    constructor(locale) {
        this.locale = locale;
    }

    create() {
        const section = d3.select("#container").append("div")
            .attr("id", "tags")
            .classed("container is-overlay is-hidden", true)
            .append("div")
            .classed("content section", true)
            .html(changelog);
        section.selectAll("h2 time")
            .text((_, i, nodes) => this.locale.formatDate(new Date(nodes[i].textContent)));
    }
}
