from typing import List

import sqlalchemy as sa
from sqlalchemy.ext.associationproxy import association_proxy
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.ext.orderinglist import ordering_list

from szurubooru.model.base import Base
from szurubooru.model.comment import Comment
from szurubooru.model.pool import PoolPost


class Folder(Base):
    __tablename__ = "folder"

    folder_id = sa.Column("id", sa.Integer, primary_key=True)
    name = sa.Column("name", sa.Unicode(256), nullable=False)
    description = sa.Column("description", sa.Unicode(1024), nullable=True, default="")
    thumbnail_url = sa.Column("thumbnail_url", sa.Unicode(2048), nullable=True)
    parent_id = sa.Column(
        "parent_id", sa.Integer, sa.ForeignKey("folder.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    parent = sa.orm.relationship(
        "Folder", remote_side=[folder_id], back_populates="children", lazy="joined"
    )
    children = sa.orm.relationship(
        "Folder", back_populates="parent", cascade="all, delete-orphan", lazy="select"
    )
    posts = sa.orm.relationship("Post", back_populates="folder")


    def __repr__(self) -> str:
        return f"<Folder(id={self.folder_id}, name='{self.name}', parent_id={self.parent_id})>"

    # Traversal Methods
    def get_ancestors(self) -> List["Folder"]:
        """
        Get all ancestors of the current folder (parent, grandparent, etc.).
        """
        ancestors = []
        current = self.parent
        while current:
            ancestors.append(current)
            current = current.parent
        return ancestors

    def get_descendants(self) -> List["Folder"]:
        """
        Get all descendants of the current folder (children, grandchildren, etc.).
        """
        descendants = []

        def _collect_descendants(folder):
            for child in folder.children:
                descendants.append(child)
                _collect_descendants(child)

        _collect_descendants(self)
        return descendants

    def get_sibling_folders(self) -> List["Folder"]:
        """
        Get all sibling folders (folders with the same parent).
        """
        if not self.parent:
            return []  # Root folders have no siblings
        return [child for child in self.parent.children if child.folder_id != self.folder_id]

    def get_hierarchy(self, level: int = 0) -> str:
        """
        Get a string representation of the folder hierarchy starting from the current folder.
        """
        hierarchy = "  " * level + f"{self.name}\n"
        for child in self.children:
            hierarchy += child.get_hierarchy(level + 1)
        return hierarchy
