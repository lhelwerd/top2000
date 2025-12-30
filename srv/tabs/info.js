import * as d3 from "d3";
import packageInfo from "../../package.json" with { type: "json" };
import doc from "../../doc/app.nl.md";

export default class Info {
    constructor(data) {
        this.data = data;
    }

    create() {
        const info = d3.select("#container").append("div")
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
            .data(this.data.credits)
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
                    url: this.data.web_url
                },
                {
                    icon: `${String.fromCodePoint(0x1f3f7)}\ufe0f`,
                    text: packageInfo.version,
                    url: `#/changelog/v${packageInfo.version.replace(/\./g, "-")}`
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
    }
}
