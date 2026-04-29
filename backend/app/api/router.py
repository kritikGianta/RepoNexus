from fastapi import APIRouter

from app.api.routes import analysis, auth, debts, helpers, repositories, trends, webhooks

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(repositories.router, prefix="/repos", tags=["repos"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
api_router.include_router(debts.router, prefix="/debts", tags=["debts"])
api_router.include_router(trends.router, prefix="/trends", tags=["trends"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(helpers.router, prefix="/helpers", tags=["helpers"])
