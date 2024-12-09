"use strict";

const events = require("../events.js");
const settings = require("../models/settings.js");
const keyboard = require("../util/keyboard.js");
const misc = require("../util/misc.js");
const search = require("../util/search.js");
const views = require("../util/views.js");
const TagList = require("../models/tag_list.js");
const TagAutoCompleteControl = require("../controls/tag_auto_complete_control.js");

const template = views.getTemplate("posts-header");

class ToggleableEditor extends events.EventTarget {
    constructor(hostNode) {
        super();
        this._hostNode = hostNode;
        this._openLinkNode.addEventListener("click", (e) =>
            this._evtOpenLinkClick(e)
        );
        this._closeLinkNode.addEventListener("click", (e) =>
            this._evtCloseLinkClick(e)
        );
    }

    get opened() {
        return (
            this._hostNode.classList.contains("opened") &&
            !this._hostNode.classList.contains("hidden")
        );
    }

    get _openLinkNode() {
        return this._hostNode.querySelector(".open");
    }

    get _closeLinkNode() {
        return this._hostNode.querySelector(".close");
    }

    toggleOpen(state) {
        this._hostNode.classList.toggle("opened", state);
    }

    toggleHide(state) {
        this._hostNode.classList.toggle("hidden", state);
    }

    _evtOpenLinkClick(e) {
        throw new Error("Not implemented");
    }

    _evtCloseLinkClick(e) {
        throw new Error("Not implemented");
    }
}

class BulkEditor extends ToggleableEditor {
    constructor(hostNode) {
        super(hostNode);
        this._hostNode = hostNode;

        this._bulkEditButtonNode.addEventListener("click", (e) =>
            this._evtBulkEditButtonClick(e)
        );
        this._saveButtonNode.addEventListener("click", (e) =>
            this._evtSaveButtonClick(e)
        );
        this._cancelButtonNode.addEventListener("click", (e) =>
            this._evtCancelButtonClick(e)
        );

    }

    get _bulkEditButtonNode() {
        return this._hostNode.querySelector(".open");
    }

    get _saveButtonNode() {
        return this._hostNode.querySelector(".save");
    }

    get _cancelButtonNode() {
        return this._hostNode.querySelector(".cancel");
    }

    _evtBulkEditButtonClick(e) {
        e.preventDefault();
        this.toggleOpen(true);
        this.dispatchEvent(
            new CustomEvent("startBulkEdit", { detail: {} })
        );
    }

    _evtSaveButtonClick(e) {
        e.preventDefault();
        this.toggleOpen(false);
        this.dispatchEvent(
            new CustomEvent("bulkEditSaveClick", { detail: {} })
        );
    }

    _evtCancelButtonClick(e) {
        e.preventDefault();
        this.toggleOpen(false);
        this.dispatchEvent(
            new CustomEvent("bulkEditCancelClick", { detail: {} })
        );
    }
    
    _evtOpenLinkClick(e) {
        e.preventDefault();
        this.toggleOpen(true);
        this.dispatchEvent(new CustomEvent("open", { detail: {} }));
    }

    _evtCloseLinkClick(e) {
        e.preventDefault();
        this.toggleOpen(false);
        this.dispatchEvent(new CustomEvent("close", { detail: {} }));
    }
}

class BulkDeleteEditor extends ToggleableEditor {
    constructor(hostNode) {
        super(hostNode);
        this._hostNode.addEventListener("submit", (e) =>
            this._evtFormSubmit(e)
        );
    }

    _evtFormSubmit(e) {
        e.preventDefault();
        this.dispatchEvent(
            new CustomEvent("deleteSelectedPosts", { detail: {} })
        );
    }

    _evtOpenLinkClick(e) {
        e.preventDefault();
        this.toggleOpen(true);
        this.dispatchEvent(new CustomEvent("open", { detail: {} }));
    }

    _evtCloseLinkClick(e) {
        e.preventDefault();
        this.toggleOpen(false);
        this.dispatchEvent(new CustomEvent("close", { detail: {} }));
    }
}

class PostsHeaderView extends events.EventTarget {
    constructor(ctx) {
        super();

        ctx.settings = settings.get();
        this._ctx = ctx;
        this._hostNode = ctx.hostNode;
        views.replaceContent(this._hostNode, template(ctx));

        this._autoCompleteControl = new TagAutoCompleteControl(
            this._queryInputNode,
            {
                confirm: (tag) =>
                    this._autoCompleteControl.replaceSelectedText(
                        misc.escapeSearchTerm(tag.names[0]),
                        true
                    ),
            }
        );

        keyboard.bind("p", () => this._focusFirstPostNode());
        search.searchInputNodeFocusHelper(this._queryInputNode);

        this._formNode.addEventListener("submit", (e) =>
            this._evtFormSubmit(e)
        );

        this._bulkEditors = [];
        
        if (this._bulkEditNode) {
            this._bulkEditor = new BulkEditor(
                this._bulkEditNode
            );
            this._bulkEditors.push(this._bulkEditor);
        }

        if (this._bulkDeleteNode) {
            this._bulkDeleteEditor = new BulkDeleteEditor(
                this._bulkDeleteNode
            );
            this._bulkEditors.push(this._bulkDeleteEditor);
        }

        for (let editor of this._bulkEditors) {
            editor.addEventListener("submit", (e) => {
                this._navigate();
            });
            editor.addEventListener("open", (e) => {
                this._hideBulkEditorsExcept(editor);
                this._navigate();
            });
            editor.addEventListener("close", (e) => {
                this._closeAndShowAllBulkEditors();
                this._navigate();
            });
        }

        if (ctx.parameters.tag && this._bulkEditor) {
            this._openBulkEditor(this._bulkEditor);
        } else if (ctx.parameters.delete && this._bulkDeleteEditor) {
            this._openBulkEditor(this._bulkDeleteEditor);
        }
    }

    get _formNode() {
        return this._hostNode.querySelector("form.search");
    }

    get _queryInputNode() {
        return this._hostNode.querySelector("form [name=search-text]");
    }

    get _bulkEditNode() {
        return this._hostNode.querySelector(".bulk-edit");
    }

    get _bulkDeleteNode() {
        return this._hostNode.querySelector(".bulk-delete");
    }

    _openBulkEditor(editor) {
        editor.toggleOpen(true);
        this._hideBulkEditorsExcept(editor);
    }

    _hideBulkEditorsExcept(editor) {
        for (let otherEditor of this._bulkEditors) {
            if (otherEditor !== editor) {
                otherEditor.toggleOpen(false);
                otherEditor.toggleHide(true);
            }
        }
    }

    _closeAndShowAllBulkEditors() {
        for (let otherEditor of this._bulkEditors) {
            otherEditor.toggleOpen(false);
            otherEditor.toggleHide(false);
        }
    }

    _evtSafetyButtonClick(e, url) {
        e.preventDefault();
        e.target.classList.toggle("disabled");
        const safety = e.target.getAttribute("data-safety");
        let browsingSettings = settings.get();
        browsingSettings.listPosts[safety] =
            !browsingSettings.listPosts[safety];
        settings.save(browsingSettings, true);
        this.dispatchEvent(
            new CustomEvent("navigate", {
                detail: {
                    parameters: Object.assign({}, this._ctx.parameters, {
                        tag: null,
                        offset: 0,
                    }),
                },
            })
        );
    }

    _evtFormSubmit(e) {
        e.preventDefault();
        this._navigate();
    }

    _navigate() {
        this._autoCompleteControl.hide();
        let parameters = { query: this._queryInputNode.value };

        // convert falsy values to an empty string "" so that we can correctly compare with the current query
        const prevQuery = this._ctx.parameters.query
            ? this._ctx.parameters.query
            : "";
        parameters.offset =
            parameters.query === prevQuery ? this._ctx.parameters.offset : 0;
        if (this._bulkTagEditor && this._bulkTagEditor.opened) {
            parameters.tag = this._bulkTagEditor.value;
            this._bulkTagEditor.blur();
        } else {
            parameters.tag = null;
        }
        parameters.safety =
            this._bulkSafetyEditor && this._bulkSafetyEditor.opened
                ? "1"
                : null;
        parameters.delete =
            this._bulkDeleteEditor && this._bulkDeleteEditor.opened
                ? "1"
                : null;
        this.dispatchEvent(
            new CustomEvent("navigate", { detail: { parameters: parameters } })
        );
    }

    _focusFirstPostNode() {
        const firstPostNode = document.body.querySelector(
            ".post-list li:first-child a"
        );
        if (firstPostNode) {
            firstPostNode.focus();
        }
    }
}

module.exports = PostsHeaderView;
