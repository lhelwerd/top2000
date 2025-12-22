import * as d3 from "d3";

export default class Modal {
    constructor() {
        this.closeCallback = null;
    }

    createModal() {
        d3.select(`#${this.MODAL_ID}`).remove();
        const modal = d3.select("body").append("div")
            .attr("id", this.MODAL_ID)
            .classed("modal", true);
        modal.append("div")
            .classed("modal-background", true)
            .on("click", () => this.close());
        const container = modal.append("div")
            .classed("modal-content", true);
        this.createContent(modal, container);
        modal.append("button")
            .classed("modal-close is-large", true)
            .on("click", () => this.close());
    }

    createContent(_container) {
    }

    open(closeCallback = null) {
        this.closeCallback = closeCallback;
        d3.select(`#${this.MODAL_ID}`)
            .classed("is-active", true);
    }

    close() {
        d3.select(`#${this.MODAL_ID}`)
            .classed("is-active", false);
        this.closeCallback?.();
    }

}
