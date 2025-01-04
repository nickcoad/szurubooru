"use strict";

const api = require("../api.js");
const uri = require("../util/uri.js");
const events = require("../events.js");
const misc = require("../util/misc.js");
const PostList = require("./post_list.js");

class Folder extends events.EventTarget {
    constructor() {
        super();
        this._orig = {};

        for (let obj of [this, this._orig]) {
            obj._posts = new PostList();
        }

        this._updateFromResponse({});
    }

    get id() {
        return this._id;
    }

    get name() {
        return this._name;
    }

    get description() {
        return this._description;
    }

    get thumbnailUrl() {
        return this._thumbnailUrl;
    }

    get parent() {
        return this._parent;
    }

    get children() {
        return this._children;
    }

    get posts() {
        return this._posts;
    }

    set name(value) {
        this._name = value;
    }

    set description(value) {
        this._description = value;
    }

    set thumbnailUrl(value) {
        this._thumbnailUrl = value;
    }

    static fromResponse(response) {
        const ret = new Folder();
        ret._updateFromResponse(response);
        return ret;
    }

    static get(id) {
        return api.get(uri.formatApiLink("folder", id)).then((response) => {
            return Promise.resolve(Folder.fromResponse(response));
        });
    }

    save() {
        const detail = { version: this._version };

        // send only changed fields to avoid user privilege violation
        if (this._name !== this._orig._name) {
            detail.name = this._name;
        }
        if (this._description !== this._orig._description) {
            detail.description = this._description;
        }
        if (this._thumbnailUrl !== this._orig._thumbnailUrl) {
            detail.thumbnailUrl = this._thumbnailUrl;
        }
        if (misc.arraysDiffer(this._posts, this._orig._posts)) {
            detail.posts = this._posts.map((post) => post.id);
        }
        let promise = this._id
            ? api.put(uri.formatApiLink("folder", this._id), detail)
            : api.post(uri.formatApiLink("folders"), detail);

        return promise.then((response) => {
            this._updateFromResponse(response);
            this.dispatchEvent(
                new CustomEvent("change", {
                    detail: {
                        folder: this,
                    },
                })
            );
            return Promise.resolve();
        });
    }

    delete() {
        return api
            .delete(uri.formatApiLink("folder", this._id), {
                version: this._version,
            })
            .then((response) => {
                this.dispatchEvent(
                    new CustomEvent("delete", {
                        detail: {
                            folder: this,
                        },
                    })
                );
                return Promise.resolve();
            });
    }

    _updateFromResponse(response) {
        const map = {
            _id: response.id,
            _version: response.version,
            _name: response.name,
            _description: response.description,
            _thumbnailUrl: response.thumbnailUrl,
            // _children: response.children,
        };

        for (let obj of [this, this._orig]) {
            obj._posts.sync(response.posts);
        }

        Object.assign(this, map);
        Object.assign(this._orig, map);
    }
}

module.exports = Folder;
