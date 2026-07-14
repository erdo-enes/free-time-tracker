from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, Float,
    ForeignKey, Enum as SAEnum, JSON, Table,
)
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property
from datetime import datetime, timezone
from database import Base

import enum


class TaskStatus(str, enum.Enum):
    backlog = "backlog"
    selected = "selected"
    in_progress = "in_progress"
    review = "review"
    done = "done"


class TaskPriority(str, enum.Enum):
    lowest = "lowest"
    low = "low"
    medium = "medium"
    high = "high"
    highest = "highest"


class IssueType(str, enum.Enum):
    epic = "epic"
    story = "story"
    task = "task"
    bug = "bug"
    subtask = "subtask"


class EntryType(str, enum.Enum):
    manual = "manual"
    gaming = "gaming"


class Platform(str, enum.Enum):
    steam = "steam"
    psn = "psn"
    xbox = "xbox"
    switch = "switch"
    switch2 = "switch2"
    pc = "pc"
    manual = "manual"


class AccountPlatform(str, enum.Enum):
    psn = "psn"
    xbox = "xbox"
    switch2 = "switch2"
    steam = "steam"


class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(10), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, default="")
    style_color = Column(String(7), default="#0052CC")
    lead = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    tasks = relationship("Task", back_populates="project")

    def next_issue_number(self, db_session):
        from sqlalchemy import func
        max_num = db_session.query(func.max(Task.issue_number)).filter(Task.project_id == self.id).scalar() or 0
        return max_num + 1


class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    color = Column(String(7), default="#6366f1")
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    time_entries = relationship("TimeEntry", back_populates="category")


class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    description = Column(Text, default="")
    status = Column(SAEnum(TaskStatus), default=TaskStatus.backlog)
    priority = Column(SAEnum(TaskPriority), default=TaskPriority.medium)
    issue_type = Column(SAEnum(IssueType), default=IssueType.task)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    parent_task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    issue_number = Column(Integer, nullable=True, index=True)
    sprint_id = Column(Integer, ForeignKey("sprints.id"), nullable=True, index=True)
    story_points = Column(Integer, nullable=True)
    order = Column(Integer, default=0)
    start_date = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    labels = Column(JSON, default=list)
    original_estimate_minutes = Column(Integer, nullable=True)
    remaining_estimate_minutes = Column(Integer, nullable=True)
    assignee = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    time_entries = relationship("TimeEntry", back_populates="task")
    comments = relationship("Comment", back_populates="task", order_by="Comment.created_at", cascade="all, delete-orphan")
    category = relationship("Category")
    project = relationship("Project", back_populates="tasks")
    sprint = relationship("Sprint", back_populates="tasks")
    subtasks = relationship("Task", backref="parent", remote_side="Task.id", foreign_keys="Task.parent_task_id")

    @hybrid_property
    def key(self):
        if self.project and self.issue_number is not None:
            return f"{self.project.key}-{self.issue_number}"
        return f"FTJ-{self.id}"


class IssueLink(Base):
    __tablename__ = "issue_links"
    id = Column(Integer, primary_key=True, index=True)
    source_task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    target_task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    link_type = Column(String(30), nullable=False)  # blocks, relates, duplicates
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    source = relationship("Task", foreign_keys=[source_task_id])
    target = relationship("Task", foreign_keys=[target_task_id])


class IssueHistory(Base):
    __tablename__ = "issue_history"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    field = Column(String(50), nullable=False)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    actor = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)


class TimeEntry(Base):
    __tablename__ = "time_entries"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    title = Column(String(300), nullable=False)
    entry_type = Column(SAEnum(EntryType), default=EntryType.manual)
    platform = Column(SAEnum(Platform), default=Platform.manual)
    started_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    ended_at = Column(DateTime, nullable=True)
    duration_minutes = Column(Float, default=0.0)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    task = relationship("Task", back_populates="time_entries")
    category = relationship("Category", back_populates="time_entries")


class GamingSession(Base):
    __tablename__ = "gaming_sessions"
    id = Column(Integer, primary_key=True, index=True)
    platform = Column(SAEnum(Platform), nullable=False)
    game_name = Column(String(300), nullable=False)
    game_id = Column(String(100), nullable=True)
    account_username = Column(String(100), nullable=True)
    started_at = Column(DateTime, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    duration_minutes = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    raw_data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class WatchedAccount(Base):
    __tablename__ = "watched_accounts"
    id = Column(Integer, primary_key=True, index=True)
    platform = Column(SAEnum(AccountPlatform), nullable=False)
    username = Column(String(100), nullable=False)
    display_name = Column(String(100), nullable=True)
    platform_account_id = Column(String(200), nullable=True)
    is_active = Column(Boolean, default=True)
    last_checked = Column(DateTime, nullable=True)
    last_status = Column(String(200), default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    author = Column(String(100), default="You")
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    task = relationship("Task", back_populates="comments")


class Sprint(Base):
    __tablename__ = "sprints"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    goal = Column(Text, default="")
    is_active = Column(Boolean, default=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    tasks = relationship("Task", back_populates="sprint")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(200), nullable=True)
    display_name = Column(String(100), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
