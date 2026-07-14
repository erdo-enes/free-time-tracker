from fastapi import FastAPI
from contextlib import asynccontextmanager
from database import engine, Base
from routers import tasks, time_entries, categories, analytics, gaming, watched_accounts, comments, sprints
from tracker_daemon import start_tracker, stop_tracker


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    start_tracker()
    yield
    stop_tracker()


app = FastAPI(title="FreeTime Jira", version="1.0.0", lifespan=lifespan)


app.include_router(categories.router, prefix="/api/categories", tags=["categories"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(time_entries.router, prefix="/api/time-entries", tags=["time-entries"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(gaming.router, prefix="/api/gaming", tags=["gaming"])
app.include_router(watched_accounts.router, prefix="/api/watched-accounts", tags=["watched-accounts"])
app.include_router(comments.router, prefix="/api/tasks", tags=["comments"])
app.include_router(sprints.router, prefix="/api/sprints", tags=["sprints"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
