from pydantic import BaseModel


class PageMeta(BaseModel):
    total: int
    page: int
    page_size: int


class HealthResponse(BaseModel):
    status: str
    service: str
