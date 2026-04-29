from __future__ import annotations

import hashlib
import re
from collections import Counter, defaultdict
from pathlib import Path

from app.core.config import get_settings
from app.ml.ast_parser import ASTParser
from app.ml.complexity import ComplexityAnalyzer
from app.ml.debt_scorer import DebtScorer
from app.ml.dependency_analyzer import DependencyAnalyzer
from app.ml.effort_estimator import EffortEstimator
from app.ml.embedder import CodebaseEmbedder
from app.ml.mlflow_tracker import MLflowTracker
from app.ml.nlp_analyzer import NLPAnalyzer
from app.ml.rag_engine import RAGEngine
from app.ml.static_analysis import StaticAnalyzer
from app.ml.types import CodeFile, DebtFindingDraft
from app.models.enums import DebtCategory, SeverityLevel
from app.services.github_service import GitHubService

settings = get_settings()


class AnalysisPipeline:
    def __init__(self) -> None:
        self.ast_parser = ASTParser()
        self.complexity_analyzer = ComplexityAnalyzer()
        self.static_analyzer = StaticAnalyzer()
        self.nlp_analyzer = NLPAnalyzer()
        self.embedder = CodebaseEmbedder()
        self.rag_engine = RAGEngine()
        self.scorer = DebtScorer()
        self.effort_estimator = EffortEstimator()
        self.dependency_analyzer = DependencyAnalyzer()
        self.mlflow = MLflowTracker()

    def run(self, repo_full_name: str, default_branch: str, access_token: str, commit_sha: str | None = None) -> dict:
        github = GitHubService(access_token)
        files = github.fetch_repository_files(
            full_name=repo_full_name,
            branch=default_branch,
            allowed_extensions=settings.supported_extensions,
            max_files=settings.max_files_per_analysis,
        )

        code_files = [CodeFile(path=f.path, content=f.content, sha=f.sha, size=f.size) for f in files]
        if not code_files:
            return {
                "total_files_analyzed": 0,
                "overall_debt_score": 0.0,
                "category_breakdown": {},
                "debt_items_payload": [],
                "trend_payload": {
                    "overall_score": 0.0,
                    "complexity_score": 0.0,
                    "duplication_score": 0.0,
                    "security_score": 0.0,
                    "test_coverage_score": 10.0,
                    "total_estimated_debt_hours": 0.0,
                },
                "mlflow_run_id": "",
            }

        vector_index = self.embedder.build_index(code_files)
        graph = self.dependency_analyzer.build_graph(code_files)
        centrality = self.dependency_analyzer.centrality(graph)

        findings: list[DebtFindingDraft] = []
        findings.extend(self._detect_duplication(code_files, centrality))
        findings.extend(self._detect_outdated_dependencies(code_files, centrality))

        has_tests = any(self._is_test_file(f.path) for f in code_files)

        for file in code_files:
            ast_result = self.ast_parser.parse(file.path, file.content)
            complexity_result = self.complexity_analyzer.analyze(file.path, file.content)
            static_issues = self.static_analyzer.analyze_python(file.path, file.content)
            nlp_result = self.nlp_analyzer.analyze_documentation(file.content)

            findings.extend(self._detect_high_complexity(file, complexity_result, centrality))
            findings.extend(self._detect_dead_code(file, static_issues, centrality))
            findings.extend(self._detect_poor_naming(file, ast_result, centrality))
            findings.extend(self._detect_security_smells(file, centrality))
            findings.extend(self._detect_performance_antipatterns(file, complexity_result, centrality))
            findings.extend(self._detect_tight_coupling(file, centrality))
            findings.extend(self._detect_missing_documentation(file, ast_result, nlp_result, centrality))

            if not has_tests and self._is_source_file(file.path):
                findings.extend(self._detect_missing_tests(file, centrality))

        with self.mlflow.run_context(repo_full_name=repo_full_name, commit_sha=commit_sha) as mlflow_run_id:
            findings = self._attach_ai_context(findings, vector_index)
            payload_items = [self._to_payload(finding) for finding in findings]

            category_counter = Counter([f.debt_category.value for f in findings])
            total_score = sum(f.raw_score for f in findings)
            overall_score = round(total_score / max(len(findings), 1), 2)
            total_effort = round(sum(f.estimated_effort_hours for f in findings), 2)

            trend_payload = {
                "overall_score": overall_score,
                "complexity_score": self._average_score(findings, DebtCategory.HIGH_COMPLEXITY),
                "duplication_score": self._average_score(findings, DebtCategory.CODE_DUPLICATION),
                "security_score": self._average_score(findings, DebtCategory.SECURITY_SMELLS),
                "test_coverage_score": self._test_coverage_score(findings),
                "total_estimated_debt_hours": total_effort,
            }

            self.mlflow.log_params(
                {
                    "repo_full_name": repo_full_name,
                    "default_branch": default_branch,
                    "files_analyzed": len(code_files),
                }
            )
            self.mlflow.log_metrics(
                {
                    "overall_debt_score": overall_score,
                    "total_debt_items": len(findings),
                    "total_debt_hours": total_effort,
                    **{f"category_{k}": v for k, v in category_counter.items()},
                }
            )

        return {
            "total_files_analyzed": len(code_files),
            "overall_debt_score": overall_score,
            "category_breakdown": dict(category_counter),
            "debt_items_payload": payload_items,
            "trend_payload": trend_payload,
            "mlflow_run_id": mlflow_run_id,
        }

    def _detect_high_complexity(self, file: CodeFile, result: dict, centrality: dict[str, float]) -> list[DebtFindingDraft]:
        findings = []
        for span in result.get("high_complexity_spans", []):
            complexity = span.get("complexity", 0.0)
            severity = SeverityLevel.CRITICAL if complexity >= 20 else SeverityLevel.HIGH
            effort = self.effort_estimator.estimate(
                severity=severity,
                category=DebtCategory.HIGH_COMPLEXITY,
                complexity_factor=complexity / 10,
            )
            score = self.scorer.score(severity, DebtCategory.HIGH_COMPLEXITY, centrality[file.path], effort)
            snippet = self._snippet(file.content, span["start_line"], span["end_line"])
            findings.append(
                DebtFindingDraft(
                    file_path=file.path,
                    start_line=span["start_line"],
                    end_line=span["end_line"],
                    debt_category=DebtCategory.HIGH_COMPLEXITY,
                    severity_level=severity,
                    title=f"High complexity in {span.get('name', 'function')}",
                    description=f"Cyclomatic complexity reached {complexity:.1f}, which raises bug risk and slows refactors.",
                    offending_code_snippet=snippet,
                    raw_score=score,
                    estimated_effort_hours=effort,
                )
            )
        return findings

    def _detect_duplication(self, files: list[CodeFile], centrality: dict[str, float]) -> list[DebtFindingDraft]:
        fingerprints: dict[str, list[tuple[CodeFile, int, str]]] = defaultdict(list)
        window = 8

        for file in files:
            lines = [line.rstrip() for line in file.content.splitlines()]
            for idx in range(0, max(0, len(lines) - window + 1)):
                chunk = lines[idx : idx + window]
                normalized = "\n".join(line.strip() for line in chunk if line.strip())
                if len(normalized) < 120:
                    continue
                digest = hashlib.sha1(normalized.encode()).hexdigest()
                fingerprints[digest].append((file, idx + 1, normalized))

        findings = []
        for matches in fingerprints.values():
            unique_files = {m[0].path for m in matches}
            if len(unique_files) < 2:
                continue
            first_file, first_line, snippet = matches[0]
            severity = SeverityLevel.MEDIUM if len(unique_files) == 2 else SeverityLevel.HIGH
            effort = self.effort_estimator.estimate(severity, DebtCategory.CODE_DUPLICATION, complexity_factor=len(unique_files))
            score = self.scorer.score(severity, DebtCategory.CODE_DUPLICATION, centrality[first_file.path], effort)
            findings.append(
                DebtFindingDraft(
                    file_path=first_file.path,
                    start_line=first_line,
                    end_line=first_line + 7,
                    debt_category=DebtCategory.CODE_DUPLICATION,
                    severity_level=severity,
                    title="Duplicated logic block detected",
                    description=f"Similar code appears across {len(unique_files)} files; shared abstraction is recommended.",
                    offending_code_snippet=snippet,
                    raw_score=score,
                    estimated_effort_hours=effort,
                )
            )
        return findings

    def _detect_dead_code(self, file: CodeFile, static_issues: list[dict], centrality: dict[str, float]) -> list[DebtFindingDraft]:
        findings = []
        dead_symbols = {"unused-import", "unused-variable", "unused-argument"}

        for issue in static_issues:
            if issue.get("symbol") not in dead_symbols:
                continue
            line = issue.get("line", 1)
            severity = SeverityLevel.LOW
            effort = self.effort_estimator.estimate(severity, DebtCategory.DEAD_CODE)
            score = self.scorer.score(severity, DebtCategory.DEAD_CODE, centrality[file.path], effort)
            findings.append(
                DebtFindingDraft(
                    file_path=file.path,
                    start_line=line,
                    end_line=line,
                    debt_category=DebtCategory.DEAD_CODE,
                    severity_level=severity,
                    title="Potential dead code",
                    description=issue.get("message", "Unused symbol detected by static analyzer."),
                    offending_code_snippet=self._snippet(file.content, line, line),
                    raw_score=score,
                    estimated_effort_hours=effort,
                )
            )
        return findings

    def _detect_poor_naming(self, file: CodeFile, ast_result: dict, centrality: dict[str, float]) -> list[DebtFindingDraft]:
        identifiers = ast_result.get("identifiers", [])
        poor = [name for name in identifiers if len(name) <= 2 and name not in {"i", "j", "k", "x", "y", "id"}]
        if not poor:
            return []

        severity = SeverityLevel.LOW if len(poor) < 8 else SeverityLevel.MEDIUM
        effort = self.effort_estimator.estimate(severity, DebtCategory.POOR_NAMING, complexity_factor=len(poor) / 3)
        score = self.scorer.score(severity, DebtCategory.POOR_NAMING, centrality[file.path], effort)

        return [
            DebtFindingDraft(
                file_path=file.path,
                start_line=1,
                end_line=min(40, len(file.content.splitlines()) or 1),
                debt_category=DebtCategory.POOR_NAMING,
                severity_level=severity,
                title="Low-signal variable naming",
                description=f"Detected short or ambiguous identifiers: {', '.join(sorted(set(poor))[:12])}.",
                offending_code_snippet=self._snippet(file.content, 1, min(40, len(file.content.splitlines()) or 1)),
                raw_score=score,
                estimated_effort_hours=effort,
            )
        ]

    def _detect_missing_tests(self, file: CodeFile, centrality: dict[str, float]) -> list[DebtFindingDraft]:
        severity = SeverityLevel.MEDIUM
        effort = self.effort_estimator.estimate(severity, DebtCategory.MISSING_TESTS, complexity_factor=1.2)
        score = self.scorer.score(severity, DebtCategory.MISSING_TESTS, centrality[file.path], effort)
        return [
            DebtFindingDraft(
                file_path=file.path,
                start_line=1,
                end_line=1,
                debt_category=DebtCategory.MISSING_TESTS,
                severity_level=severity,
                title="No associated test coverage",
                description="Repository has source files but no detected test suite for this module.",
                offending_code_snippet=self._snippet(file.content, 1, min(25, len(file.content.splitlines()) or 1)),
                raw_score=score,
                estimated_effort_hours=effort,
            )
        ]

    def _detect_security_smells(self, file: CodeFile, centrality: dict[str, float]) -> list[DebtFindingDraft]:
        patterns = [
            (r"\beval\(", "Dynamic eval usage can lead to code injection."),
            (r"\bexec\(", "Dynamic exec usage can execute untrusted input."),
            (r"password\s*=\s*['\"].+['\"]", "Hardcoded credential literal detected."),
            (r"subprocess\..*shell\s*=\s*True", "shell=True increases command injection risk."),
        ]
        findings = []
        lines = file.content.splitlines()
        for index, line in enumerate(lines, start=1):
            for pattern, message in patterns:
                if re.search(pattern, line):
                    severity = SeverityLevel.HIGH
                    effort = self.effort_estimator.estimate(severity, DebtCategory.SECURITY_SMELLS, complexity_factor=1.3)
                    score = self.scorer.score(severity, DebtCategory.SECURITY_SMELLS, centrality[file.path], effort)
                    findings.append(
                        DebtFindingDraft(
                            file_path=file.path,
                            start_line=index,
                            end_line=index,
                            debt_category=DebtCategory.SECURITY_SMELLS,
                            severity_level=severity,
                            title="Security smell detected",
                            description=message,
                            offending_code_snippet=self._snippet(file.content, index, index),
                            raw_score=score,
                            estimated_effort_hours=effort,
                        )
                    )
        return findings

    def _detect_performance_antipatterns(self, file: CodeFile, complexity_result: dict, centrality: dict[str, float]) -> list[DebtFindingDraft]:
        findings = []
        cc_max = complexity_result.get("cyclomatic_max", 0.0)
        if cc_max >= 18:
            severity = SeverityLevel.HIGH
            effort = self.effort_estimator.estimate(
                severity, DebtCategory.PERFORMANCE_ANTIPATTERNS, complexity_factor=cc_max / 12
            )
            score = self.scorer.score(severity, DebtCategory.PERFORMANCE_ANTIPATTERNS, centrality[file.path], effort)
            findings.append(
                DebtFindingDraft(
                    file_path=file.path,
                    start_line=1,
                    end_line=min(60, len(file.content.splitlines()) or 1),
                    debt_category=DebtCategory.PERFORMANCE_ANTIPATTERNS,
                    severity_level=severity,
                    title="Potential performance anti-pattern",
                    description="Highly complex control flow can produce hot paths that are difficult to optimize.",
                    offending_code_snippet=self._snippet(file.content, 1, min(60, len(file.content.splitlines()) or 1)),
                    raw_score=score,
                    estimated_effort_hours=effort,
                )
            )
        return findings

    def _detect_outdated_dependencies(self, files: list[CodeFile], centrality: dict[str, float]) -> list[DebtFindingDraft]:
        findings = []
        deprecated_patterns = {
            "imp": "Deprecated Python module 'imp' detected; migrate to importlib.",
            "optparse": "Deprecated Python module 'optparse' detected; migrate to argparse.",
            "request": "Legacy request package usage may indicate stale HTTP stack; validate dependencies.",
        }

        for file in files:
            lines = file.content.splitlines()
            for index, line in enumerate(lines, start=1):
                for symbol, message in deprecated_patterns.items():
                    if f"import {symbol}" in line or f"from {symbol} " in line:
                        severity = SeverityLevel.MEDIUM
                        effort = self.effort_estimator.estimate(
                            severity, DebtCategory.OUTDATED_DEPENDENCIES, complexity_factor=1.1
                        )
                        score = self.scorer.score(severity, DebtCategory.OUTDATED_DEPENDENCIES, centrality[file.path], effort)
                        findings.append(
                            DebtFindingDraft(
                                file_path=file.path,
                                start_line=index,
                                end_line=index,
                                debt_category=DebtCategory.OUTDATED_DEPENDENCIES,
                                severity_level=severity,
                                title="Potential outdated dependency",
                                description=message,
                                offending_code_snippet=self._snippet(file.content, index, index),
                                raw_score=score,
                                estimated_effort_hours=effort,
                            )
                        )
        return findings

    def _detect_tight_coupling(self, file: CodeFile, centrality: dict[str, float]) -> list[DebtFindingDraft]:
        if centrality[file.path] < 0.45:
            return []

        severity = SeverityLevel.HIGH if centrality[file.path] > 0.7 else SeverityLevel.MEDIUM
        effort = self.effort_estimator.estimate(
            severity=severity,
            category=DebtCategory.TIGHT_COUPLING,
            complexity_factor=1 + centrality[file.path],
        )
        score = self.scorer.score(severity, DebtCategory.TIGHT_COUPLING, centrality[file.path], effort)

        return [
            DebtFindingDraft(
                file_path=file.path,
                start_line=1,
                end_line=1,
                debt_category=DebtCategory.TIGHT_COUPLING,
                severity_level=severity,
                title="High dependency centrality",
                description="This file is highly connected in the dependency graph and likely difficult to change safely.",
                offending_code_snippet=self._snippet(file.content, 1, min(30, len(file.content.splitlines()) or 1)),
                raw_score=score,
                estimated_effort_hours=effort,
            )
        ]

    def _detect_missing_documentation(
        self,
        file: CodeFile,
        ast_result: dict,
        nlp_result: dict,
        centrality: dict[str, float],
    ) -> list[DebtFindingDraft]:
        function_count = len(ast_result.get("functions", []))
        comment_lines = ast_result.get("comment_lines", 0)
        density = nlp_result.get("doc_density", 0)

        if function_count == 0:
            return []
        if density >= 0.03 and comment_lines >= 3:
            return []

        severity = SeverityLevel.LOW if function_count < 10 else SeverityLevel.MEDIUM
        effort = self.effort_estimator.estimate(
            severity=severity,
            category=DebtCategory.MISSING_DOCUMENTATION,
            complexity_factor=max(1.0, function_count / 6),
        )
        score = self.scorer.score(severity, DebtCategory.MISSING_DOCUMENTATION, centrality[file.path], effort)

        return [
            DebtFindingDraft(
                file_path=file.path,
                start_line=1,
                end_line=min(40, len(file.content.splitlines()) or 1),
                debt_category=DebtCategory.MISSING_DOCUMENTATION,
                severity_level=severity,
                title="Insufficient inline documentation",
                description="Low comment/docstring density detected relative to function count.",
                offending_code_snippet=self._snippet(file.content, 1, min(40, len(file.content.splitlines()) or 1)),
                raw_score=score,
                estimated_effort_hours=effort,
            )
        ]

    def _attach_ai_context(self, findings: list[DebtFindingDraft], vector_index) -> list[DebtFindingDraft]:
        enriched = []
        # Sort by score descending so we enrich the most important findings first
        sorted_findings = sorted(findings, key=lambda f: f.raw_score, reverse=True)
        MAX_AI_ENRICHMENTS = 10  # Keep analysis fast — each Groq call takes 2-3s
        for index, finding in enumerate(sorted_findings):
            if index < MAX_AI_ENRICHMENTS:
                query = f"{finding.debt_category.value} in {finding.file_path}: {finding.title}"
                context = self.embedder.query(vector_index, query_text=query, k=4)
                explanation, fix = self.rag_engine.generate_explanation_and_fix(finding=finding, context_chunks=context)
                finding.ai_explanation = explanation
                finding.ai_fix_suggestion = fix
            else:
                finding.ai_explanation = (
                    "AI enrichment was skipped for this item to keep analysis latency bounded."
                )
                finding.ai_fix_suggestion = (
                    "Prioritize this item by severity and refactor the affected code with targeted tests."
                )
            enriched.append(finding)
        return enriched

    def _to_payload(self, finding: DebtFindingDraft) -> dict:
        return {
            "file_path": finding.file_path,
            "start_line": finding.start_line,
            "end_line": finding.end_line,
            "debt_category": finding.debt_category,
            "severity_level": finding.severity_level,
            "debt_score": finding.raw_score,
            "estimated_effort_hours": finding.estimated_effort_hours,
            "title": finding.title,
            "description": finding.description,
            "ai_explanation": finding.ai_explanation,
            "ai_fix_suggestion": finding.ai_fix_suggestion,
            "offending_code_snippet": finding.offending_code_snippet,
            "is_fixed": False,
        }

    def _average_score(self, findings: list[DebtFindingDraft], category: DebtCategory) -> float:
        scoped = [f.raw_score for f in findings if f.debt_category == category]
        if not scoped:
            return 0.0
        return round(sum(scoped) / len(scoped), 2)

    def _test_coverage_score(self, findings: list[DebtFindingDraft]) -> float:
        missing_tests = sum(1 for finding in findings if finding.debt_category == DebtCategory.MISSING_TESTS)
        return round(max(0.0, 10.0 - missing_tests * 0.4), 2)

    def _snippet(self, content: str, start_line: int, end_line: int) -> str:
        lines = content.splitlines()
        if not lines:
            return ""
        start = max(1, start_line)
        end = min(len(lines), max(start, end_line))
        return "\n".join(lines[start - 1 : end])[:3000]

    def _is_test_file(self, path: str) -> bool:
        lower = path.lower()
        return lower.startswith("tests/") or "test_" in lower or lower.endswith(".spec.ts") or lower.endswith(".test.ts")

    def _is_source_file(self, path: str) -> bool:
        suffix = Path(path).suffix.lower()
        return suffix in {".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".go"}
