"use strict";

const router = require("../router.js");
const api = require("../api.js");
const settings = require("../models/settings.js");
const uri = require("../util/uri.js");
const PostList = require("../models/post_list.js");
const topNavigation = require("../models/top_navigation.js");
const PageController = require("../controllers/page_controller.js");
const PostsHeaderView = require("../views/posts_header_view.js");
const PostsPageView = require("../views/posts_page_view.js");
const EmptyView = require("../views/empty_view.js");
const TagInputControl = require("../controls/tag_input_control.js");

const fields = [
    "id",
    "thumbnailUrl",
    "title",
    "type",
    "safety",
    "score",
    "favoriteCount",
    "commentCount",
    "tags",
    "version",
];

class PostListController {
    constructor(ctx) {
        this._pageController = new PageController();

        if (!api.hasPrivilege("posts:list")) {
            this._view = new EmptyView();
            this._view.showError("You don't have privileges to view posts.");
            return;
        }

        this._ctx = ctx;

        this._selectedPosts = new Set();

        topNavigation.activate("photos");
        topNavigation.setTitle("Listing posts");

        this._headerCtx = {
            hostNode: this._pageController.view.pageHeaderHolderNode,
            parameters: ctx.parameters,
            enableSafety: api.safetyEnabled(),
            canBulkEditTags: api.hasPrivilege("posts:bulk-edit:tags"),
            canBulkEditSafety: api.hasPrivilege("posts:bulk-edit:safety"),
            canBulkDelete: api.hasPrivilege("posts:bulk-edit:delete"),
            isSelecting: this._isSelecting,
            bulkEdit: {
                tags: this._bulkEditTags,
            },
        };

        this._headerView = new PostsHeaderView(this._headerCtx);
        this.addHeaderEvents(this._headerView);

        if (this._bulkEditTagInputNode) {
            this._tagControl = new TagInputControl(
                this._bulkEditTagInputNode,
                []
            );
        }

        this._postsMarkedForDeletion = [];
        this._syncPageController();
    }

    get _isSelecting() {
        return this._selectedPosts.size > 0;
    }

    addHeaderEvents(headerView) {
        headerView.addEventListener("navigate", (e) => this._evtNavigate(e));

        headerView.addEventListener("bulkEditClick", (e) => {
            this._evtBulkEditClick(e);
        });

        headerView.addEventListener("deselectAllClick", (e) => {
            this._evtDeselectAllClick(e);
        });

        if (headerView._bulkEditor) {
            headerView._bulkEditor.addEventListener("startBulkEdit", (e) => {
                this._evtStartBulkEdit(e);
            });
            headerView._bulkEditor.addEventListener(
                "bulkEditSaveClick",
                (e) => {
                    this._evtBulkEditSaveClick(e);
                }
            );
            headerView._bulkEditor.addEventListener(
                "bulkEditCancelClick",
                (e) => {
                    this._evtBulkEditCancelClick(e);
                }
            );
        }

        if (headerView._bulkDeleteEditor) {
            headerView._bulkDeleteEditor.addEventListener(
                "deleteSelectedPosts",
                (e) => {
                    this._evtDeleteSelectedPosts(e);
                }
            );
        }
    }

    showSuccess(message) {
        this._pageController.showSuccess(message);
    }

    _evtNavigate(e) {
        router.showNoDispatch(
            uri.formatClientLink("photos", e.detail.parameters)
        );
        Object.assign(this._ctx.parameters, e.detail.parameters);
        this._syncPageController();
    }

    _evtBulkEditClick(e) {
        this._isBulkEditing = true;
        this._syncPageController();
    }

    _evtDeselectAllClick(e) {
        this._selectedPosts = new Set();
        this._syncPageController();
    }

    _evtBulkEditCancelClick() {
        this._isBulkEditing = false;
    }

    _evtTag(e) {
        Promise.all(
            this._bulkEditTags.map((tag) => e.detail.post.tags.addByName(tag))
        )
            .then(e.detail.post.save())
            .catch((error) => window.alert(error.message));
    }

    _evtUntag(e) {
        for (let tag of this._bulkEditTags) {
            e.detail.post.tags.removeByName(tag);
        }
        e.detail.post.save().catch((error) => window.alert(error.message));
    }

    _evtChangeSafety(e) {
        e.detail.post.safety = e.detail.safety;
        e.detail.post.save().catch((error) => window.alert(error.message));
    }

    _evtMarkForDeletion(e) {
        // Add or remove post from delete list
        if (e.detail.delete) {
            this._postsMarkedForDeletion.push(e.detail.post);
        } else {
            this._postsMarkedForDeletion = this._postsMarkedForDeletion.filter(
                (x) => x.id != e.detail.post.id
            );
        }
    }

    _evtDeleteSelectedPosts(e) {
        if (this._postsMarkedForDeletion.length == 0) return;

        if (
            confirm(
                `Are you sure you want to delete ${this._postsMarkedForDeletion.length} posts?`
            )
        ) {
            Promise.all(
                this._postsMarkedForDeletion.map((post) => post.delete())
            )
                .catch((error) => window.alert(error.message))
                .then(() => {
                    this._postsMarkedForDeletion = [];
                    this._headerView._navigate();
                });
        }
    }

    isPostSelected(postId) {
        const selected = this._selectedPosts.has(postId);
        return selected;
    }

    _evtPostSelectorClick(e) {
        const postId = e.detail.post.id;

        if (
            e.detail.shiftHeld &&
            this._lastSelectedPost &&
            e.detail.postId !== this._lastSelectedPost
        ) {
            const [start, finish] =
                postId > this._lastSelectedPost
                    ? [this._lastSelectedPost, postId]
                    : [postId, this._lastSelectedPost];

            for (const currPostId of this._validPostIds) {
                if (currPostId >= start && currPostId <= finish) {
                    if (!this.isPostSelected(postId)) {
                        this._selectedPosts.add(currPostId);
                    }
                }
            }
        } else {
            if (this.isPostSelected(postId)) {
                this._selectedPosts.delete(postId);
                this._lastSelectedPost = null;
            } else {
                this._selectedPosts.add(postId);
                this._lastSelectedPost = postId;
            }
        }

        this._syncPageController();
    }

    _evtBulkEditTagChange(e) {
        this._bulkEditTagsToApply = e.detail.tags;
    }

    async _evtBulkEditSaveClick(e) {
        for (const postId of this._selectedPosts) {
            const post = this._postIdToPost[postId];
            for (const tagToApply of this._bulkEditTagsToApply) {
                post.tags.addByName(tagToApply.names[0]);
            }
            await post.save();
        }
        this._isBulkEditing = false;
        this._selectedPosts = new Set();
        this._syncPageController();
    }

    _evtBulkEditCancelClick(e) {
        this._isBulkEditing = false;
        this._syncPageController();
    }

    _syncPageController() {
        this._headerCtx.isSelecting = this._isSelecting;
        this._headerView = new PostsHeaderView(this._headerCtx);
        this.addHeaderEvents(this._headerView);

        this._pageController.run({
            parameters: this._ctx.parameters,
            defaultLimit: parseInt(settings.get().postsPerPage),
            getClientUrlForPage: (offset, limit) => {
                const parameters = Object.assign({}, this._ctx.parameters, {
                    offset: offset,
                    limit: limit,
                });
                return uri.formatClientLink("photos", parameters);
            },
            requestPage: (offset, limit) => {
                return PostList.search(
                    "type:image " + (this._ctx.parameters.query || ""),
                    offset,
                    limit,
                    fields
                );
            },
            pageRenderer: (pageCtx) => {
                this._validPostIds = pageCtx.response.results.map((p) => p.id);
                this._postIdToPost = {};
                for (let post of pageCtx.response.results) {
                    this._postIdToPost[post.id] = post;
                }
                Object.assign(pageCtx, {
                    canViewPosts: api.hasPrivilege("posts:view"),
                    canBulkEdit: api.hasPrivilege("posts:bulk-edit:tags"),
                    canBulkEditTags: api.hasPrivilege("posts:bulk-edit:tags"),
                    canBulkEditSafety: api.hasPrivilege(
                        "posts:bulk-edit:safety"
                    ),
                    canBulkDelete: api.hasPrivilege("posts:bulk-edit:delete"),
                    isSelecting: this._isSelecting,
                    isBulkEditing: this._isBulkEditing,
                    bulkEdit: {
                        tags: this._bulkEditTags,
                        markedForDeletion: this._postsMarkedForDeletion,
                    },
                    selectedPosts: this._selectedPosts || new Set(),
                    bulkEditTagsToApply: this._bulkEditTagsToApply,
                    isSelected: this.isPostSelected,
                    postFlow: settings.get().postFlow,
                });
                const view = new PostsPageView(pageCtx);
                view.addEventListener("postSelectorClick", (e) =>
                    this._evtPostSelectorClick(e)
                );
                view.addEventListener("postClick", (e) =>
                    this._evtPostClick(e)
                );
                view.addEventListener("bulkEditTagChange", (e) =>
                    this._evtBulkEditTagChange(e)
                );
                view.addEventListener("bulkEditSaveClick", (e) =>
                    this._evtBulkEditSaveClick(e)
                );
                view.addEventListener("bulkEditCancelClick", (e) =>
                    this._evtBulkEditCancelClick(e)
                );
                // view.addEventListener("startBulkEdit", (e) => this._evtStartBulkEdit(e));
                // view.addEventListener("applyBulkEdit", (e) => this._evtApplyBulkEdit(e));
                // view.addEventListener("cancelBulkEdit", (e) => this._evtCancelBulkEdit(e));
                view.addEventListener("tag", (e) => this._evtTag(e));
                view.addEventListener("untag", (e) => this._evtUntag(e));
                view.addEventListener("changeSafety", (e) =>
                    this._evtChangeSafety(e)
                );
                view.addEventListener("markForDeletion", (e) =>
                    this._evtMarkForDeletion(e)
                );
                return view;
            },
        });
    }
}

module.exports = (router) => {
    router.enter(["photos"], (ctx, next) => {
        ctx.controller = new PostListController(ctx);
    });
};
