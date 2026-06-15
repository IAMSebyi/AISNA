from fastapi import APIRouter
from app.api.v1.endpoints import stocks, analysis, portfolio

api_router = APIRouter()
api_router.include_router(stocks.router, prefix="/stocks", tags=["stocks"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
api_router.include_router(portfolio.router, prefix="/analysis", tags=["portfolio"])
