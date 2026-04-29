from app.models.enums import DebtCategory, SeverityLevel


SEVERITY_WEIGHT = {
    SeverityLevel.LOW: 0.25,
    SeverityLevel.MEDIUM: 0.5,
    SeverityLevel.HIGH: 0.75,
    SeverityLevel.CRITICAL: 1.0,
}

CATEGORY_WEIGHT = {
    DebtCategory.HIGH_COMPLEXITY: 0.9,
    DebtCategory.CODE_DUPLICATION: 0.8,
    DebtCategory.DEAD_CODE: 0.6,
    DebtCategory.POOR_NAMING: 0.4,
    DebtCategory.MISSING_TESTS: 0.9,
    DebtCategory.SECURITY_SMELLS: 1.0,
    DebtCategory.PERFORMANCE_ANTIPATTERNS: 0.9,
    DebtCategory.OUTDATED_DEPENDENCIES: 0.7,
    DebtCategory.TIGHT_COUPLING: 1.0,
    DebtCategory.MISSING_DOCUMENTATION: 0.5,
}


class DebtScorer:
    def score(
        self,
        severity: SeverityLevel,
        category: DebtCategory,
        file_centrality: float,
        estimated_effort_hours: float,
    ) -> float:
        severity_component = SEVERITY_WEIGHT[severity] * 4.0
        category_component = CATEGORY_WEIGHT[category] * 2.5
        centrality_component = min(file_centrality, 1.0) * 2.0
        effort_component = min(estimated_effort_hours / 8.0, 1.0) * 1.5
        raw = severity_component + category_component + centrality_component + effort_component
        return round(min(raw, 10.0), 2)
