import * as d3 from "d3";
import Data from "../data.js";
import Modal from "./index.js";

export default class UploadModal extends Modal {
    MODAL_ID = "upload";

    constructor(data, locale, load, yearData) {
        super();
        this.data = data;
        this.locale = locale;
        this.load = load;
        this.yearData = yearData;
    }

    createContent(modal, container) {
        const box = container.append("box")
            .classed("box", true);

        const file = box.append("div")
            .classed("file is-large is-boxed", true);
        const label = file.append("label")
            .classed("file-label", true);
        label.append("input")
            .classed("file-input", true)
            .attr("type", "file")
            .attr("accept", ".json,application/json");
        const text = label.append("span")
            .classed("file-cta", true);
        text.append("span")
            .classed("file-icon", true)
            .text(String.fromCodePoint(0x1f4e4));
        text.append("span")
            .classed("file-label", true)
            .text("[ Upload / drag-&-drop dump ]");
        box.append("table")
            .classed("table is-fullwidth is-narrow is-hoverable is-striped",
                true
            )
            .append("tbody");
    }

    open(closeCallback = null) {
        super.open(closeCallback);

        const box = d3.select("#upload .box");
        const file = box.select(".file");
        const input = box.select(".file-input");
        const text = box.select(".file-cta");
        const rows = box.select(".table tbody");

        const updateRows = () => rows.selectAll("tr")
            .data(Object.keys(this.yearData))
            .join(enter => {
                const row = enter.append("tr");
                row.append("td")
                    .append("a")
                    .attr("href", y => `#/${y}`)
                    .on("click", () => this.close())
                    .text(y => y);
                row.append("td").text(y => Object.values(this.yearData[y].columns || []).join(", "));
                row.append("td")
                    .classed("is-clickable", true)
                    .on("click", (_, y) => {
                        delete this.yearData[y];
                        globalThis.localStorage.setItem("data", JSON.stringify(this.yearData));
                        updateRows();
                        if (Number(y) === this.data?.latest_year) {
                            globalThis.location.reload();
                        }
                    })
                    .text(String.fromCodePoint(0x1f5d1));
            });
        updateRows();

        const uploadFile = (dump) => {
            if (!dump) {
                file.classed("is-error", true);
                return;
            }
            dump.text().then((rawData) => {
                try {
                    const data = JSON.parse(rawData);
                    this.yearData[data.year] = data;
                    globalThis.localStorage.setItem("data", JSON.stringify(this.yearData));
                    updateRows();
                    file.classed("is-error", false);
                    this.load(new Data(data, this.locale)).enable(this.load, this.yearData);
                }
                catch {
                    file.classed("is-error", true);
                }
            }).catch(() => {
                file.classed("is-error", true);
            });
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
                text.classed("drag", true);
            })
            .on("drop", (event) => {
                event.stopPropagation();
                event.preventDefault();
                uploadFile(event.dataTransfer.files[0]);
            });
    }
}
