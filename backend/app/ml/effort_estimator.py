from app.models.enums import DebtCategory, SeverityLevel


SEVERITY_BASE_HOURS = {
    SeverityLevel.LOW: 0.8,
    SeverityLevel.MEDIUM: 2.0,
    SeverityLevel.HIGH: 4.0,
    SeverityLevel.CRITICAL: 8.0,
}

CATEGORY_MULTIPLIER = {
    DebtCategory.HIGH_COMPLEXITY: 1.3,
    DebtCategory.CODE_DUPLICATION: 1.1,
    DebtCategory.DEAD_CODE: 0.7,
    DebtCategory.POOR_NAMING: 0.5,
    DebtCategory.MISSING_TESTS: 1.4,
    DebtCategory.SECURITY_SMELLS: 1.8,
    DebtCategory.PERFORMANCE_ANTIPATTERNS: 1.5,
    DebtCategory.OUTDATED_DEPENDENCIES: 1.0,
    DebtCategory.TIGHT_COUPLING: 2.0,
    DebtCategory.MISSING_DOCUMENTATION: 0.6,
}


class EffortEstimator:
    def estimate(self, severity: SeverityLevel, category: DebtCategory, complexity_factor: float = 1.0) -> float:
        base = SEVERITY_BASE_HOURS[severity]
        category_scale = CATEGORY_MULTIPLIER[category]
        effort = base * category_scale * max(0.5, complexity_factor)
        return round(effort, 2)
