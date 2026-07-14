from pydantic import BaseModel, ConfigDict, EmailStr, Field
from datetime import datetime
from typing import Optional, Any, List
from models import TaskStatus, TaskPriority, IssueType, EntryType, Platform, AccountPlatform


class ProjectBase(BaseModel):
    key: str = Field(min_length=2, max_length=10)
    name: str
    description: str = ""
    style_color: str = "#0052CC"
    lead: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    style_color: Optional[str] = None
    lead: Optional[str] = None


class ProjectOut(ProjectBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CategoryBase(BaseModel):
    name: str
    color: str = "#6366f1"
    is_default: bool = False


class CategoryCreate(CategoryBase):
    pass


class CategoryOut(CategoryBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TaskBase(BaseModel):
    title: str
    description: str = ""
    status: TaskStatus = TaskStatus.backlog
    priority: TaskPriority = TaskPriority.medium
    issue_type: IssueType = IssueType.task
    category_id: Optional[int] = None
    parent_task_id: Optional[int] = None
    project_id: Optional[int] = None
    sprint_id: Optional[int] = None
    story_points: Optional[int] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    labels: Optional[List[str]] = None
    original_estimate_minutes: Optional[int] = None
    remaining_estimate_minutes: Optional[int] = None
    assignee: Optional[str] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    issue_type: Optional[IssueType] = None
    category_id: Optional[int] = None
    parent_task_id: Optional[int] = None
    project_id: Optional[int] = None
    sprint_id: Optional[int] = None
    story_points: Optional[int] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    labels: Optional[List[str]] = None
    original_estimate_minutes: Optional[int] = None
    remaining_estimate_minutes: Optional[int] = None
    assignee: Optional[str] = None
    order: Optional[int] = None


class TaskOut(TaskBase):
    id: int
    issue_number: Optional[int] = None
    key: str
    order: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TimeEntryBase(BaseModel):
    task_id: Optional[int] = None
    category_id: Optional[int] = None
    title: str
    entry_type: EntryType = EntryType.manual
    platform: Platform = Platform.manual
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_minutes: Optional[float] = None
    metadata_json: Optional[dict[str, Any]] = None


class TimeEntryCreate(TimeEntryBase):
    pass


class TimeEntryUpdate(BaseModel):
    task_id: Optional[int] = None
    category_id: Optional[int] = None
    title: Optional[str] = None
    entry_type: Optional[EntryType] = None
    platform: Optional[Platform] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_minutes: Optional[float] = None
    metadata_json: Optional[dict[str, Any]] = None


class TimeEntryOut(TimeEntryBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class GamingSessionOut(BaseModel):
    id: int
    platform: Platform
    game_name: str
    game_id: Optional[str]
    account_username: Optional[str]
    started_at: datetime
    ended_at: Optional[datetime]
    duration_minutes: float
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


class SwitchIngestPayload(BaseModel):
    game_name: str
    game_id: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    device_name: Optional[str] = None


class WatchedAccountBase(BaseModel):
    platform: AccountPlatform
    username: str
    display_name: Optional[str] = None


class WatchedAccountCreate(WatchedAccountBase):
    pass


class WatchedAccountOut(WatchedAccountBase):
    id: int
    platform_account_id: Optional[str]
    is_active: bool
    last_checked: Optional[datetime]
    last_status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CommentCreate(BaseModel):
    body: str
    author: str = "You"


class CommentOut(BaseModel):
    id: int
    task_id: int
    author: str
    body: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class SprintBase(BaseModel):
    name: str
    goal: str = ""
    project_id: Optional[int] = None


class SprintCreate(SprintBase):
    pass


class SprintOut(SprintBase):
    id: int
    is_active: bool
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=6, max_length=128)
    email: Optional[EmailStr] = None
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str]
    display_name: Optional[str]
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class IssueLinkCreate(BaseModel):
    target_task_id: int
    link_type: str  # blocks, relates, duplicates


class IssueLinkOut(BaseModel):
    id: int
    source_task_id: int
    target_task_id: int
    target_key: str | None = None
    target_title: str | None = None
    target_status: str | None = None
    link_type: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class IssueHistoryOut(BaseModel):
    id: int
    task_id: int
    field: str
    old_value: str | None
    new_value: str | None
    actor: str | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
