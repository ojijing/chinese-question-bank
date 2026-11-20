from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class QuestionUpdate(BaseModel):
    content: str = Field(min_length=1)
    analysis: str = ""
    qtype_id: int = Field(gt=0)
    difficulty_id: int = Field(gt=0)
    knowledge_id: int = Field(gt=0)

    @field_validator("content", "analysis")
    @classmethod
    def clean_empty_paragraphs(cls, value: str) -> str:
        value = value.strip()
        for empty in ("<p><br></p>", "<p><br/></p>", "<p> </p>"):
            value = value.replace(empty, "")
        return value


class RandomQuestionRequest(BaseModel):
    count: int = Field(default=10, ge=1, le=100)
    qtype_ids: list[int] = Field(default_factory=list)
    difficulty_ids: list[int] = Field(default_factory=list)
    knowledge_ids: list[int] = Field(default_factory=list)
    keyword: str = ""
    exclude_ids: list[int] = Field(default_factory=list, max_length=500)


class ExportRequest(BaseModel):
    title: str = Field(default="试题", max_length=100)
    question_ids: list[int] = Field(min_length=1, max_length=300)
    mode: Literal["none", "inline", "end"] = "none"
    subtitle: str = Field(default="", max_length=120)

