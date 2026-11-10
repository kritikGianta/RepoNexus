class AppError(Exception):
    """Base class for domain errors that map onto HTTP responses."""

    status_code = 400


class NotFoundError(AppError):
    status_code = 404


class ForbiddenError(AppError):
    status_code = 403


class BadRequestError(AppError):
    status_code = 400


class ConflictError(AppError):
    status_code = 409


class AIUnavailableError(AppError):
    """Raised when an AI feature is used but no LLM provider key is configured."""

    status_code = 503
