"use strict";

const router = require("../router.js");
const api = require("../api.js");
const uri = require("../util/uri.js");
const misc = require("../util/misc.js");
const settings = require("../models/settings.js");
const FolderList = require("../models/folder_list.js");
const topNavigation = require("../models/top_navigation.js");
const PageController = require("../controllers/page_controller.js");
const FolderView = require("../views/folder_view.js");

const fields = [
    "id",
    "names",
    "posts",
    "creationTime",
    "postCount",
    "category",
];

class FolderController {
    constructor(ctx) {
        console.log(ctx);
        topNavigation.activate("folders");
        topNavigation.setTitle("Folders");

        // this._pageController = new PageController();

        this._ctx = ctx;

        this.requestPage().then((response) => {
            console.log(response);
            this._processResponse(response);
            this._syncPage();
        });

        this._syncPage();

        // this._folderView = new FolderView(this._ctx);

        // this._syncPageController();
    }

    _processResponse(response) {
        const parentId = this._ctx.parameters.id || null;
        this._folders = response.filter((r) => r.parent_id == parentId);
    }

    // _syncPageController() {
    //     console.log("_syncPageController");
    //     this._pageController.run({
    //         parameters: this._ctx.parameters,
    //         defaultLimit: 50,
    //         getClientUrlForPage: (offset, limit) => {
    //             const parameters = Object.assign({}, this._ctx.parameters, {
    //                 offset: offset,
    //                 limit: limit,
    //             });
    //             return uri.formatClientLink("folders", parameters);
    //         },
    //     });
    // }

    requestPage() {
        console.log("requestPage");
        return FolderList.all();
    }

    _syncPage() {
        return new FolderView({
            folders: this._folders,
        });
    }
}

module.exports = (router) => {
    router.enter(["folders"], (ctx, next) => {
        new FolderController(ctx);
    });
    router.enter(["folder", ":id"], (ctx, next) => {
        new FolderController(ctx);
    });
};
