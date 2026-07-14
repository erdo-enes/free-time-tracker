from fastapi import FastAPI
from contextlib import asynccontextmanager
from sqlalchemy import inspect, text
from database import engine, Base, SessionLocal
from routers import tasks, time_entries, categories, analytics, gaming, watched_accounts, comments, sprints, auth, projects, issue_relations
from tracker_daemon import start_tracker, stop_tracker
from models import User, Project, Task
from security import hash_password


def _has_column(table: str, column: str) -> bool:
    insp = inspect(engine)
    if table not in insp.get_table_names():
        return False
    return column in [c["name"] for c in insp.get_columns(table)]


def migrate_schema():
    """Add columns added after initial release to existing SQLite tables."""
    with engine.begin() as conn:
        if not _has_column("tasks", "project_id"):
            conn.execute(text("ALTER TABLE tasks ADD COLUMN project_id INTEGER REFERENCES projects(id)"))
        if not _has_column("tasks", "issue_number"):
            conn.execute(text("ALTER TABLE tasks ADD COLUMN issue_number INTEGER"))
        if not _has_column("tasks", "sprint_id"):
            conn.execute(text("ALTER TABLE tasks ADD COLUMN sprint_id INTEGER REFERENCES sprints(id)"))
        if not _has_column("sprints", "project_id"):
            conn.execute(text("ALTER TABLE sprints ADD COLUMN project_id INTEGER REFERENCES projects(id)"))
        if not _has_column("tasks", "start_date"):
            conn.execute(text("ALTER TABLE tasks ADD COLUMN start_date DATETIME"))


def seed_default_user():
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            db.add(User(
                username="admin",
                display_name="Admin",
                hashed_password=hash_password("admin123"),
            ))
            db.commit()
    finally:
        db.close()


def migrate_default_project():
    """Create a default FTJ project and backfill any existing tasks into it."""
    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.key == "FTJ").first()
        if not project:
            project = Project(key="FTJ", name="FreeTime Board", description="Personal board", style_color="#0052CC")
            db.add(project)
            db.commit()
            db.refresh(project)
        orphans = db.query(Task).filter(Task.project_id.is_(None)).all()
        for t in orphans:
            t.project_id = project.id
            if t.issue_number is None:
                t.issue_number = t.id
        if orphans:
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    migrate_schema()
    migrate_default_project()
    seed_default_user()
    start_tracker()
    yield
    stop_tracker()


app = FastAPI(title="FreeTime Jira", version="1.0.0", lifespan=lifespan)


app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(categories.router, prefix="/api/categories", tags=["categories"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(time_entries.router, prefix="/api/time-entries", tags=["time-entries"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(gaming.router, prefix="/api/gaming", tags=["gaming"])
app.include_router(watched_accounts.router, prefix="/api/watched-accounts", tags=["watched-accounts"])
app.include_router(comments.router, prefix="/api/tasks", tags=["comments"])
app.include_router(issue_relations.router, prefix="/api/tasks", tags=["issue-relations"])
app.include_router(sprints.router, prefix="/api/sprints", tags=["sprints"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
