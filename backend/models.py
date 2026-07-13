from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, Float,
    ForeignKey, Enum as SAEnum, JSON,
)
from sqlalchemy.orm import relationship
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
    story_points = Column(Integer, nullable=True)
    order = Column(Integer, default=0)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    time_entries = relationship("TimeEntry", back_populates="task")
    category = relationship("Category")
    subtasks = relationship("Task", backref="parent", remote_side="Task.id", foreign_keys="Task.parent_task_id")


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
