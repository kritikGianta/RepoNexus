from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import PlanTier


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    github_user_id: int
    username: str
    email: str | None
    avatar_url: str | None
    plan_tier: PlanTier
    created_at: datetime
