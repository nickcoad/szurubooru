<%= JSON.stringify(ctx) %>
<div class='folders'>
    <h1>Folders</h1>
    <% function outputFolder(folder) { %>
        <h1><%= folder.name %></h1>
        <%= JSON.stringify(folder) %>
    <% } %>
    <% for (const folder of ctx.folders) { %>
        <p><% outputFolder(folder); %></p>
    <% } %>
</div>
