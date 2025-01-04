"use strict";

const api = require("../api.js");
const uri = require("../util/uri.js");
const AbstractList = require("./abstract_list.js");
const Folder = require("./folder.js");

class FolderList extends AbstractList {
    static all() {
        return api.get(uri.formatApiLink("folders", {})).then((response) => {
            return response;
        });
    }
}

FolderList._itemClass = Folder;
FolderList._itemName = "folder";

module.exports = FolderList;
