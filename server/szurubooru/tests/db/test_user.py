from datetime import datetime
from szurubooru import db

def test_saving_user():
    user = db.User()
    user.name = 'name'
    user.password_salt = 'salt'
    user.password_hash = 'hash'
    user.email = 'email'
    user.rank = 'rank'
    user.creation_time = datetime(1997, 1, 1)
    user.avatar_style = db.User.AVATAR_GRAVATAR
    db.session.add(user)
    db.session.flush()
    db.session.refresh(user)
    assert not db.session.dirty
    assert user.name == 'name'
    assert user.password_salt == 'salt'
    assert user.password_hash == 'hash'
    assert user.email == 'email'
    assert user.rank == 'rank'
    assert user.creation_time == datetime(1997, 1, 1)
    assert user.avatar_style == db.User.AVATAR_GRAVATAR

def test_upload_count(user_factory, post_factory):
    user = user_factory()
    db.session.add(user)
    db.session.flush()
    assert user.post_count == 0
    post1 = post_factory()
    post1.user = user
    post2 = post_factory()
    db.session.add_all([post1, post2])
    db.session.flush()
    db.session.refresh(user)
    assert user.post_count == 1

def test_comment_count(user_factory, comment_factory):
    user = user_factory()
    db.session.add(user)
    db.session.flush()
    assert user.comment_count == 0
    db.session.add_all([
        comment_factory(user=user),
        comment_factory(),
    ])
    db.session.flush()
    db.session.refresh(user)
    assert user.comment_count == 1

def test_favorite_count(user_factory, post_factory):
    user = user_factory()
    db.session.add(user)
    db.session.flush()
    assert user.comment_count == 0
    post1 = post_factory()
    post2 = post_factory()
    db.session.add_all([
        db.PostFavorite(post=post1, time=datetime.utcnow(), user=user),
        db.PostFavorite(post=post2, time=datetime.utcnow(), user=user_factory()),
    ])
    db.session.flush()
    db.session.refresh(user)
    assert user.favorite_post_count == 1

def test_liked_post_count(user_factory, post_factory):
    user = user_factory()
    db.session.add(user)
    db.session.flush()
    assert user.liked_post_count == 0
    assert user.disliked_post_count == 0
    post1 = post_factory()
    post2 = post_factory()
    db.session.add_all([
        db.PostScore(post=post1, time=datetime.utcnow(), user=user, score=1),
        db.PostScore(post=post2, time=datetime.utcnow(), user=user_factory(), score=1),
    ])
    db.session.flush()
    db.session.refresh(user)
    assert user.liked_post_count == 1
    assert user.disliked_post_count == 0

def test_disliked_post_count(user_factory, post_factory):
    user = user_factory()
    db.session.add(user)
    db.session.flush()
    assert user.liked_post_count == 0
    assert user.disliked_post_count == 0
    post1 = post_factory()
    post2 = post_factory()
    db.session.add_all([
        db.PostScore(post=post1, time=datetime.utcnow(), user=user, score=-1),
        db.PostScore(post=post2, time=datetime.utcnow(), user=user_factory(), score=1),
    ])
    db.session.flush()
    db.session.refresh(user)
    assert user.liked_post_count == 0
    assert user.disliked_post_count == 1

def test_cascade_deletions(post_factory, user_factory, comment_factory):
    user = user_factory()

    post = post_factory()
    post.user = user

    post_score = db.PostScore()
    post_score.post = post
    post_score.user = user
    post_score.time = datetime(1997, 1, 1)
    post_score.score = 1
    post.scores.append(post_score)

    post_favorite = db.PostFavorite()
    post_favorite.post = post
    post_favorite.user = user
    post_favorite.time = datetime(1997, 1, 1)
    post.favorited_by.append(post_favorite)

    post_feature = db.PostFeature()
    post_feature.post = post
    post_feature.user = user
    post_feature.time = datetime(1997, 1, 1)
    post.features.append(post_feature)

    comment = comment_factory(post=post, user=user)
    comment_score = db.CommentScore()
    comment_score.comment = comment
    comment_score.user = user
    comment_score.time = datetime(1997, 1, 1)
    comment_score.score = 1
    comment.scores.append(comment_score)

    snapshot = db.Snapshot()
    snapshot.user = user
    snapshot.creation_time = datetime(1997, 1, 1)
    snapshot.resource_type = '-'
    snapshot.resource_id = '-'
    snapshot.resource_repr = '-'
    snapshot.operation = '-'

    db.session.add_all([user, post, comment, snapshot])
    db.session.flush()

    assert not db.session.dirty
    assert post.user is not None and post.user.user_id is not None
    assert db.session.query(db.User).count() == 1
    assert db.session.query(db.Post).count() == 1
    assert db.session.query(db.PostScore).count() == 1
    assert db.session.query(db.PostFeature).count() == 1
    assert db.session.query(db.PostFavorite).count() == 1
    assert db.session.query(db.Comment).count() == 1
    assert db.session.query(db.CommentScore).count() == 1
    assert db.session.query(db.Snapshot).count() == 1

    db.session.delete(user)
    db.session.commit()

    assert not db.session.dirty
    assert db.session.query(db.User).count() == 0
    assert db.session.query(db.Post).count() == 1
    assert db.session.query(db.Post)[0].user is None
    assert db.session.query(db.PostScore).count() == 0
    assert db.session.query(db.PostFeature).count() == 0
    assert db.session.query(db.PostFavorite).count() == 0
    assert db.session.query(db.Comment).count() == 1
    assert db.session.query(db.Comment)[0].user is None
    assert db.session.query(db.CommentScore).count() == 0
    assert db.session.query(db.Snapshot).count() == 1
    assert db.session.query(db.Snapshot)[0].user is None
