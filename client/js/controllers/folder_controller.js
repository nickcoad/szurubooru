"use strict";

const router = require("../router.js");
const api = require("../api.js");
const uri = require("../util/uri.js");
const misc = require("../util/misc.js");
const settings = require("../models/settings.js");
const topNavigation = require("../models/top_navigation.js");
const FolderView = require("../views/folder_view.js");

class FolderController {
    constructor(ctx) {
        topNavigation.activate("folders");
        topNavigation.setTitle("Folders");
        this._folderView = new FolderView(ctx);
    }
}

module.exports = (router) => {
    router.enter(["folders"], (ctx, next) => {
        new FolderController(ctx);
    });
};
