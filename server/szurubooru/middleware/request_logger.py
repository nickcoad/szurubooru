import logging

from szurubooru import db, rest
from szurubooru.rest import middleware

logger = logging.getLogger(__name__)


@middleware.pre_hook
def process_request(ctx: rest.Context) -> None:
    logger.info(
        "%s %s Received request (user=%s)",
        ctx.method,
        ctx.url,
        ctx.user.name,
    )
    db.reset_query_count()


@middleware.post_hook
def process_response(ctx: rest.Context) -> None:
    logger.info(
        "%s %s (user=%s, queries=%d)",
        ctx.method,
        ctx.url,
        ctx.user.name,
        db.get_query_count(),
    )
