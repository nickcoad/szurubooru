from datetime import datetime
from typing import Dict, List, Optional

from szurubooru import db, errors, model, rest
from szurubooru.func import auth, snapshots, versions


def _get_folder_id(params: Dict[str, str]) -> int:
    """Extract and validate folder_id from the request parameters."""
    try:
        return int(params["folder_id"])
    except (ValueError, TypeError):
        raise ValueError(f"Invalid folder ID: {params['folder_id']}.")


def _get_folder(params: Dict[str, str]) -> model.Folder:
    """Retrieve a folder by its ID or raise an error if not found."""
    folder_id = _get_folder_id(params)
    folder = db.session.query(model.Folder).filter_by(folder_id=folder_id).first()
    if not folder:
        raise ValueError(f"Folder with ID {folder_id} not found.")
    return folder


def _serialize_folder(ctx: rest.Context, folder: model.Folder) -> rest.Response:
    """Serialize a folder into a dictionary representation."""
    return {
        "id": folder.folder_id,
        "name": folder.name,
        "description": folder.description,
        "thumbnail_url": folder.thumbnail_url,
        "parent_id": folder.parent_id,
        "posts": [post.post_id for post in folder.posts],
    }


@rest.routes.get("/folders/?")
def list_folders(ctx: rest.Context, _params: Dict[str, str] = {}) -> rest.Response:
    """List all folders."""
    auth.verify_privilege(ctx.user, "folders:list")
    folders = db.session.query(model.Folder).all()
    return [_serialize_folder(ctx, folder) for folder in folders]


@rest.routes.post("/folders/?")
def create_folder(ctx: rest.Context, _params: Dict[str, str] = {}) -> rest.Response:
    """Create a new folder."""
    auth.verify_privilege(ctx.user, "folders:create")

    name = ctx.get_param_as_string("name")
    description = ctx.get_param_as_string("description", default="")
    thumbnail_url = ctx.get_param_as_string("thumbnail_url", default="")
    parent_id = ctx.get_param_as_int("parent_id", default=None)

    folder = model.Folder(
        name=name,
        description=description,
        thumbnail_url=thumbnail_url,
        parent_id=parent_id,
    )

    db.session.add(folder)
    snapshots.create(folder, ctx.user)
    db.session.commit()
    return _serialize_folder(ctx, folder)


@rest.routes.get("/folder/(?P<folder_id>[^/]+)/?")
def get_folder(ctx: rest.Context, params: Dict[str, str]) -> rest.Response:
    """Retrieve a folder by its ID."""
    auth.verify_privilege(ctx.user, "folders:view")
    folder = _get_folder(params)
    return _serialize_folder(ctx, folder)


@rest.routes.put("/folder/(?P<folder_id>[^/]+)/?")
def update_folder(ctx: rest.Context, params: Dict[str, str]) -> rest.Response:
    """Update a folder's details."""
    auth.verify_privilege(ctx.user, "folders:edit")
    folder = _get_folder(params)

    versions.verify_version(folder, ctx)
    versions.bump_version(folder)

    if ctx.has_param("name"):
        folder.name = ctx.get_param_as_string("name")
    if ctx.has_param("description"):
        folder.description = ctx.get_param_as_string("description")
    if ctx.has_param("thumbnail_url"):
        folder.thumbnail_url = ctx.get_param_as_string("thumbnail_url")
    if ctx.has_param("parent_id"):
        folder.parent_id = ctx.get_param_as_int("parent_id")

    db.session.flush()
    snapshots.modify(folder, ctx.user)
    db.session.commit()
    return _serialize_folder(ctx, folder)


@rest.routes.delete("/folder/(?P<folder_id>[^/]+)/?")
def delete_folder(ctx: rest.Context, params: Dict[str, str]) -> rest.Response:
    """Delete a folder."""
    auth.verify_privilege(ctx.user, "folders:delete")
    folder = _get_folder(params)

    versions.verify_version(folder, ctx)
    snapshots.delete(folder, ctx.user)
    db.session.delete(folder)
    db.session.commit()
    return {"status": "success"}


@rest.routes.post("/folder/(?P<folder_id>[^/]+)/assign-posts/?")
def assign_posts_to_folder(ctx: rest.Context, params: Dict[str, str]) -> rest.Response:
    """Assign one or more posts to a folder."""
    auth.verify_privilege(ctx.user, "folders:assign-posts")
    folder = _get_folder(params)

    post_ids = ctx.get_param_as_int_list("posts")
    posts = db.session.query(model.Post).filter(model.Post.post_id.in_(post_ids)).all()

    if not posts:
        raise ValueError("No valid posts found to assign.")

    for post in posts:
        post.folder_id = folder.folder_id

    db.session.commit()
    return _serialize_folder(ctx, folder)
