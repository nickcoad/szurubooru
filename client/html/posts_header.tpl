<div class='post-list-header'><%
    %><form class='horizontal search'><%
        %><%= ctx.makeTextInput({text: 'Search query', id: 'search-text', name: 'search-text', value: ctx.parameters.query}) %><%
        %><wbr/><%
        %><input class='mousetrap' type='submit' value='Search'/><%
        %><wbr/><%
        %><% if (ctx.enableSafety) { %><%
            %><input data-safety=safe type='button' class='mousetrap safety safety-safe <%- ctx.settings.listPosts.safe ? '' : 'disabled' %>'/><%
            %><input data-safety=sketchy type='button' class='mousetrap safety safety-sketchy <%- ctx.settings.listPosts.sketchy ? '' : 'disabled' %>'/><%
            %><input data-safety=unsafe type='button' class='mousetrap safety safety-unsafe <%- ctx.settings.listPosts.unsafe ? '' : 'disabled' %>'/><%
        %><% } %><%
        %><wbr/><%
        %><a class='mousetrap button append' href='<%- ctx.formatClientLink('help', 'search', 'posts') %>'>Syntax help</a><%
    %></form><%
    %><div style='display: none'><%
        %><% if (ctx.canBulkEditTags) { %><%
            %><form class='horizontal bulk-edit'><%
                %><a href class='mousetrap button append open'>Bulk edit</a><%
                %><input href class='mousetrap save close' type='submit' value='Save edits'/><%
                %><a href class='mousetrap button append cancel close'>Cancel</a><%
            %></form><%
        %><% } %><%
        %><% if (ctx.canBulkDelete) { %><%
            %><form class='horizontal bulk-delete'><%
                %><a href class='mousetrap button append open'>Bulk delete</a><%
                %><input class='mousetrap start' type='submit' value='Delete selected posts'/><%
                %><a href class='mousetrap button append close'>Stop deleting</a><%
            %></form><%
        %><% } %><%
    %></div><%
    %><div class='<%- ctx.isSelecting ? 'show' : 'hide' %>'><%
        %><a href class='mousetrap button btn--bulk-edit'>Bulk edit</a><%
        %><a href class='mousetrap button btn--deselect-all'>Deselect all</a><%
    %></div><%
%></div>
