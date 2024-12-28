"use strict";

const views = require("../util/views.js");
const template = views.getTemplate("folders-page");

class FolderView {
    constructor(ctx) {
        this._hostNode = document.getElementById("content-holder");
        views.replaceContent(this._hostNode, template(ctx));
        views.syncScrollPosition();
    }

    showError(message) {
        views.showError(this._hostNode, message);
    }
}

module.exports = FolderView;
