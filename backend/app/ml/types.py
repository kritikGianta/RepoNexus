from dataclasses import dataclass, field

from app.models.enums import DebtCategory, SeverityLevel


@dataclass
class CodeFile:
    path: str
    content: str
    sha: str
    size: int


@dataclass
class DebtFindingDraft:
    file_path: str
    start_line: int
    end_line: int
    debt_category: DebtCategory
    severity_level: SeverityLevel
    title: str
    description: str
    offending_code_snippet: str
    raw_score: float
    estimated_effort_hours: float
    ai_explanation: str = ""
    ai_fix_suggestion: str = ""
    metadata: dict = field(default_factory=dict)
