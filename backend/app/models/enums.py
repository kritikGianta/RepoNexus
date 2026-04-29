from enum import Enum


class PlanTier(str, Enum):
    FREE = "free"
    TEAM = "team"
    ENTERPRISE = "enterprise"


class AnalysisRunStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class TriggerType(str, Enum):
    MANUAL = "manual"
    WEBHOOK = "webhook"
    SCHEDULED = "scheduled"


class DebtCategory(str, Enum):
    HIGH_COMPLEXITY = "high_complexity"
    CODE_DUPLICATION = "code_duplication"
    DEAD_CODE = "dead_code"
    POOR_NAMING = "poor_naming"
    MISSING_TESTS = "missing_tests"
    SECURITY_SMELLS = "security_smells"
    PERFORMANCE_ANTIPATTERNS = "performance_antipatterns"
    OUTDATED_DEPENDENCIES = "outdated_dependencies"
    TIGHT_COUPLING = "tight_coupling"
    MISSING_DOCUMENTATION = "missing_documentation"


class SeverityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"
