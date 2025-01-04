import logging
from typing import Dict

from szurubooru import rest
from szurubooru.func import auth, file_uploads

logger = logging.getLogger(__name__)

@rest.routes.post("/uploads/?")
def create_temporary_file(
    ctx: rest.Context, _params: Dict[str, str] = {}
) -> rest.Response:
    logger.info("Starting upload by creating temporary file")

    logger.info("Verifying privileges...")
    auth.verify_privilege(ctx.user, "uploads:create")
    logger.info("Privileges verified.")

    logger.info("Getting file from request...")
    content = ctx.get_file(
        "content",
        allow_tokens=False,
        use_video_downloader=auth.has_privilege(
            ctx.user, "uploads:use_downloader"
        ),
    )
    logger.info("File retrieved from request.")

    logger.info("Saving file to disk...")
    token = file_uploads.save(content)
    logger.info("File saved to disk.")
    
    return {"token": token}
