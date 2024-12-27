<div class="modal-container <%- ctx.isBulkEditing ? 'show' : 'hide' %>">
    <div class="modal-overlay">
        <div class="modal-box">
            <h2>Bulk edit</h2>
            <div class='bulk-edit-form'>
                <form>
                    <section class='tags'>
                        <%= ctx.makeTextInput({}) %>
                    </section>
                </form>
            </div>
            <button class="btn--bulk-edit-save btn--primary">Save</button>
            <button class="btn--bulk-edit-cancel close-button">Cancel</button>
        </div>
    </div>
</div>
<% if (ctx.postFlow) { %><div class='post-list post-flow<%= ctx.isBulkEditing || ctx.isSelecting ? ' select-mode' : '' %>'><% } else { %><div class='post-list<%= ctx.isBulkEditing || ctx.isSelecting ? ' select-mode' : '' %>'><% } %>
    <% if (ctx.response.results.length) { %>
        <ul>
            <% for (let post of ctx.response.results) { %>
                <li data-post-id='<%= post.id %>' class='<%= ctx.selectedPosts.has(post.id) ? 'selected' : '' %>'>
                    <a class='thumbnail-wrapper <%= post.tags.length > 0 ? "tags" : "no-tags" %>'
                            title='<%- post.title %> (<%- post.type %>)&#10;&#10;Tags: <%- post.tags.map(tag => '#' + tag.names[0]).join(' ') || 'none' %>'
                            href='<%= ctx.canViewPosts ? ctx.getPostUrl(post.id, ctx.parameters) : '' %>'>
                        <%= ctx.makeThumbnail(post.thumbnailUrl) %>
                        <span class="post-selector"><div class="post-selected"></div></span>
                        <span class="post-title" style='
                            position: absolute;
                            bottom: 2.3em;
                            left: 0;
                            padding: .33em .5em;
                            color: #fff;
                            line-height: 1.2em;
                            margin: 0.5em;
                            font-size: 12px;
                            background: rgba(0,0,0,0.5);
                        '><%= post.title %></span>
                        <span class='type' data-type='<%- post.type %>'>
                            <% if (post.type == 'video' || post.type == 'flash' || post.type == 'animation') { %>
                                <span class='icon'><i class='fa fa-film'></i></span>
                            <% } else { %>
                                <%- post.type %>
                            <% } %>
                        </span>
                        <% if (post.score || post.favoriteCount || post.commentCount) { %>
                            <span class='stats'>
                                <% if (post.score) { %>
                                    <span class='icon'>
                                        <i class='fa fa-thumbs-up'></i>
                                        <%- post.score %>
                                    </span>
                                <% } %>
                                <% if (post.favoriteCount) { %>
                                    <span class='icon'>
                                        <i class='fa fa-heart'></i>
                                        <%- post.favoriteCount %>
                                    </span>
                                <% } %>
                                <% if (post.commentCount) { %>
                                    <span class='icon'>
                                        <i class='fa fa-commenting'></i>
                                        <%- post.commentCount %>
                                    </span>
                                <% } %>
                            </span>
                        <% } %>
                    </a>
                    <span class='edit-overlay'>
                        <% if (ctx.canBulkEditTags && ctx.parameters && ctx.parameters.tag) { %>
                            <a href class='tag-flipper'>
                            </a>
                        <% } %>
                        <% if (ctx.canBulkEditSafety && ctx.parameters && ctx.parameters.safety) { %>
                            <span class='safety-flipper'>
                                <% for (let safety of ['safe', 'sketchy', 'unsafe']) { %>
                                    <a href data-safety='<%- safety %>' class='safety-<%- safety %><%- post.safety === safety ? ' active' : '' %>'>
                                    </a>
                                <% } %>
                            </span>
                        <% } %>
                        <% if (ctx.canBulkDelete && ctx.parameters && ctx.parameters.delete) { %>
                            <a href class='delete-flipper'>
                            </a>
                        <% } %>
                    </span>
                </li>
            <% } %>
            <%= ctx.makeFlexboxAlign() %>
        </ul>
    <% } %>
</div>
