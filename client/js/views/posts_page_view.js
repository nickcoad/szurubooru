"use strict";

const events = require("../events.js");
const misc = require("../util/misc.js");
const views = require("../util/views.js");
const TagInputControl = require("../controls/tag_input_control.js");
const TagList = require("../models/tag_list.js");

const template = views.getTemplate("posts-page");

class PostsPageView extends events.EventTarget {
    constructor(ctx) {
        super();
        this._ctx = ctx;
        this._hostNode = ctx.hostNode;
        views.replaceContent(this._hostNode, template(ctx));

        this._postIdToPost = {};
        for (let post of ctx.response.results) {
            this._postIdToPost[post.id] = post;
            post.addEventListener("change", (e) => this._evtPostChange(e));
        }

        if (this._bulkEditTagInputNode) {
            this._tagControl = new TagInputControl(
                this._bulkEditTagInputNode,
                new TagList()
            );

            this._tagControl.addEventListener("change", (e) => {
                this.dispatchEvent(new CustomEvent("bulkEditTagChange", { detail: { tags: this._tagControl.tags } }));
            });
        }

        this._postIdToListItemNode = {};

        for (let listItemNode of this._listItemNodes) {
            const postId = listItemNode.getAttribute("data-post-id");
            const post = this._postIdToPost[postId];
            this._postIdToListItemNode[postId] = listItemNode;

            const deleteFlipperNode = this._getDeleteFlipperNode(listItemNode);
            if (deleteFlipperNode) {
                deleteFlipperNode.addEventListener("click", (e) =>
                    this._evtBulkToggleDeleteClick(e, post)
                );
            }

            if (ctx.isBulkEditing) {
                listItemNode.addEventListener("click", (e) => {
                    e.preventDefault();
                    this._evtBulkEditPostClicked(e, postId);
                })
            }
        }

        this._syncBulkEditorsHighlights();
    }

    get _listItemNodes() {
        return this._hostNode.querySelectorAll("li");
    }

    _getDeleteFlipperNode(listItemNode) {
        return listItemNode.querySelector(".delete-flipper");
    }

    get _bulkEditTagInputNode() {
        return this._hostNode.querySelector(".bulk-edit-form .tags input");
    }

    _evtPostChange(e) {
        const listItemNode = this._postIdToListItemNode[e.detail.post.id];
        for (let node of listItemNode.querySelectorAll("[data-disabled]")) {
            node.removeAttribute("data-disabled");
        }
        this._syncBulkEditorsHighlights();
    }

    _evtBulkEditPostClicked(e, postId) {
        this.dispatchEvent(
            new CustomEvent("postClick", {
                detail: {
                    postId: parseInt(postId),
                    shiftHeld: e.getModifierState("Shift")
                },
            })
        );
    }

    _evtBulkToggleDeleteClick(e, post) {
        e.preventDefault();
        const linkNode = e.target;
        linkNode.classList.toggle("delete");
        this.dispatchEvent(
            new CustomEvent("markForDeletion", {
                detail: {
                    post,
                    delete: linkNode.classList.contains("delete"),
                },
            })
        );
    }

    _syncBulkEditorsHighlights() {
        for (let listItemNode of this._listItemNodes) {
            const postId = listItemNode.getAttribute("data-post-id");
            const post = this._postIdToPost[postId];

            const deleteFlipperNode = this._getDeleteFlipperNode(listItemNode);
            if (deleteFlipperNode) {
                deleteFlipperNode.classList.toggle(
                    "delete",
                    this._ctx.bulkEdit.markedForDeletion.some(
                        (x) => x.id == postId
                    )
                );
            }
        }
    }
}

module.exports = PostsPageView;
