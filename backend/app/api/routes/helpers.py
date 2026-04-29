"""API routes for AI-powered GitHub helper features: Issues, Fix PRs, README, PR Reviews, Chat."""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.encryption import decrypt_token
from app.db.session import get_db_session
from app.models.debt_item import DebtItem
from app.models.repository import Repository
from app.models.user import User
from app.services.ai_helper_service import (
    generate_chat_response, generate_code_fix, generate_pr_review, generate_readme,
    generate_standup_report, generate_interview_question, evaluate_interview_answer,
    generate_file_documentation, generate_optimization_lesson, generate_local_setup_guide,
    generate_architecture_diagram, generate_security_scan, generate_issue_triage,
    generate_readme_content, generate_contributing_guide, generate_api_documentation,
    generate_ci_cd_pipeline, generate_issue_implementation_plan,
    generate_release_notes, chat_with_repo, generate_zombie_scan,
    generate_migration_risk, generate_cost_optimization
)
import sys
import os
import json
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../own_models")))
try:
    import zombie_scanner
    import security_scanner
    import cost_optimizer
    import migration_analyzer
    import issue_triage_inference
    import debt_scorer
except ImportError:
    pass
from app.services.github_service import GitHubService
from app.services.rag_chat_service import embed_repository, query_repository

settings = get_settings()
router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────

class CreateIssueResponse(BaseModel):
    issue_number: int
    html_url: str


class FixPRResponse(BaseModel):
    pr_number: int
    html_url: str


class ReadmeResponse(BaseModel):
    markdown: str


class ReadmePushResponse(BaseModel):
    pr_number: int
    html_url: str


class PRListItem(BaseModel):
    number: int
    title: str
    html_url: str
    user: str
    user_avatar: str
    created_at: str
    head_branch: str
    base_branch: str
    additions: int
    deletions: int
    changed_files: int


class PRListResponse(BaseModel):
    pull_requests: list[PRListItem]


class PRReviewRequest(BaseModel):
    post_to_github: bool = False


class PRReviewResponse(BaseModel):
    review_markdown: str
    posted_to_github: bool
    pr_html_url: str


class EmbedResponse(BaseModel):
    status: str
    chunks: int


class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[str]

class StandupRequest(BaseModel):
    days_back: int = 1

class StandupResponse(BaseModel):
    markdown: str

class InterviewQuestion(BaseModel):
    level: str
    question: str

class InterviewGenerateResponse(BaseModel):
    questions: list[InterviewQuestion]
    code_snippet: str
    file_path: str

class InterviewEvaluateRequest(BaseModel):
    question: str
    code_snippet: str
    user_answer: str

class InterviewEvaluateResponse(BaseModel):
    feedback: str
    score: int

class DocsGenerateRequest(BaseModel):
    file_path: str

class DocsGenerateResponse(BaseModel):
    pr_number: int
    html_url: str
    diff: str

class RepoTreeResponse(BaseModel):
    files: list[str]

class TutorLessonRequest(BaseModel):
    file_path: str

class TutorLessonResponse(BaseModel):
    markdown_lesson: str

class SetupGuideResponse(BaseModel):
    markdown_guide: str

class DiagramResponse(BaseModel):
    mermaid_code: str

class ReadmeGenerateResponse(BaseModel):
    markdown_content: str

class ContribGuideResponse(BaseModel):
    markdown_content: str

class ApiDocsResponse(BaseModel):
    markdown_content: str

class CiCdGenerateResponse(BaseModel):
    markdown_content: str

class IssuePlanGenerateRequest(BaseModel):
    issue_title: str
    issue_body: str

class IssuePlanGenerateResponse(BaseModel):
    markdown_content: str

class SecurityIssue(BaseModel):
    severity: str
    file: str
    issue: str
    fix: str

class SecurityScanResponse(BaseModel):
    issues: list[SecurityIssue]

class GitHubIssue(BaseModel):
    number: int
    title: str
    body: str
    labels: list[str]
    created_at: str
    user: str

class IssueTriageItem(BaseModel):
    number: int
    story_points: int
    suggested_labels: list[str]
    reasoning: str

class IssuesListResponse(BaseModel):
    issues: list[GitHubIssue]

class IssueTriageResponse(BaseModel):
    triage: list[IssueTriageItem]

# New Schemas
class PrReviewRequest(BaseModel):
    pr_number: int

class PrReviewResponse(BaseModel):
    markdown_content: str

class ReleaseNotesResponse(BaseModel):
    markdown_content: str

class ZombieIssue(BaseModel):
    file: str
    component: str
    reason: str
    safe_to_delete: bool

class ZombieScanResponse(BaseModel):
    issues: list[ZombieIssue]

class MigrationRisk(BaseModel):
    file: str
    risk_level: str
    description: str
    recommendation: str

class MigrationRiskResponse(BaseModel):
    risks: list[MigrationRisk]

class CostIssue(BaseModel):
    file: str
    issue_type: str
    description: str
    optimized_code: str

class CostOptimizationResponse(BaseModel):
    issues: list[CostIssue]

class PrListResponse(BaseModel):
    prs: list[dict]

class RepoChatRequest(BaseModel):
    message: str

class RepoChatResponse(BaseModel):
    markdown_content: str

# ── Helper: DB & GitHub Client ─────────────────────────────────────────

async def _get_github_and_repo(
    repo_id: int, user: User, session: AsyncSession
) -> tuple[GitHubService, Repository]:
    repo = (await session.execute(select(Repository).where(Repository.id == repo_id))).scalar_one_or_none()
    if repo is None:
        raise HTTPException(status_code=404, detail="Repository not found")
    if repo.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    token = decrypt_token(user.encrypted_access_token)
    return GitHubService(token), repo


# ═══════════════════════════════════════════════════════════════════════
# Feature 1: Auto-Generate GitHub Issues from Debt Items
# ═══════════════════════════════════════════════════════════════════════

@router.post("/debts/items/{item_id}/issue", response_model=CreateIssueResponse)
async def create_github_issue(
    item_id: int,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    item = (await session.execute(select(DebtItem).where(DebtItem.id == item_id))).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Debt item not found")

    repo = (await session.execute(select(Repository).where(Repository.id == item.repo_id))).scalar_one_or_none()
    if repo is None or repo.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    if item.github_issue_url:
        raise HTTPException(status_code=409, detail="Issue already created for this debt item")

    token = decrypt_token(current_user.encrypted_access_token)
    github = GitHubService(token)

    body = f"""## 🔍 Technical Debt: {item.title}

**Category:** `{item.debt_category}`
**Severity:** `{item.severity_level}`
**Debt Score:** {item.debt_score:.1f}
**Estimated Effort:** {item.estimated_effort_hours:.1f} hours

### 📄 Location
`{item.file_path}` — Lines {item.start_line}–{item.end_line}

### 📝 Description
{item.description}

### 🤖 AI Explanation
{item.ai_explanation}

### 💡 Suggested Fix
{item.ai_fix_suggestion}

### 🔬 Offending Code
```
{item.offending_code_snippet[:2000]}
```

---
*Created by [RepoNexus](https://github.com) AI Repo Assistant*
"""

    try:
        labels = ["tech-debt", item.severity_level, item.debt_category.replace("_", "-")]
        result = github.create_issue(
            full_name=repo.full_name,
            title=f"[RepoNexus] {item.title}",
            body=body,
            labels=labels,
        )
        item.github_issue_url = result["html_url"]
        await session.commit()
        return CreateIssueResponse(issue_number=result["number"], html_url=result["html_url"])
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to create issue: {exc}") from exc


# ═══════════════════════════════════════════════════════════════════════
# Feature 2: Auto-Fix Pull Requests
# ═══════════════════════════════════════════════════════════════════════

@router.post("/debts/items/{item_id}/fix-pr", response_model=FixPRResponse)
async def create_fix_pr(
    item_id: int,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    item = (await session.execute(select(DebtItem).where(DebtItem.id == item_id))).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Debt item not found")

    repo = (await session.execute(select(Repository).where(Repository.id == item.repo_id))).scalar_one_or_none()
    if repo is None or repo.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    if item.fix_pr_url:
        raise HTTPException(status_code=409, detail="Fix PR already created for this debt item")

    token = decrypt_token(current_user.encrypted_access_token)
    github = GitHubService(token)

    try:
        # 1. Get the current file content
        original_code, file_sha = github.get_file_content(repo.full_name, item.file_path, repo.default_branch)

        # 2. Generate the fix using AI
        fixed_code = generate_code_fix(
            file_path=item.file_path,
            original_code=original_code,
            debt_title=item.title,
            debt_description=item.description,
            fix_suggestion=item.ai_fix_suggestion,
        )

        # 3. Create a branch, commit, and open a PR
        branch_name = f"reponexus/fix-{item.id}-{item.debt_category.replace('_', '-')}"
        github.create_branch(repo.full_name, branch_name, repo.default_branch)

        github.update_file_on_branch(
            full_name=repo.full_name,
            file_path=item.file_path,
            new_content=fixed_code,
            file_sha=file_sha,
            branch=branch_name,
            commit_message=f"fix({item.debt_category}): {item.title}\n\nAuto-generated by RepoNexus AI",
        )

        pr_body = f"""## 🤖 AI-Generated Fix

**Debt Item:** {item.title}
**Category:** `{item.debt_category}`
**Severity:** `{item.severity_level}`
**File:** `{item.file_path}`

### What changed
{item.ai_fix_suggestion}

### Original Issue
{item.description}

---
*Auto-generated by RepoNexus AI. Please review carefully before merging.*
"""

        result = github.create_pull_request(
            full_name=repo.full_name,
            title=f"[RepoNexus Fix] {item.title}",
            body=pr_body,
            head=branch_name,
            base=repo.default_branch,
        )

        item.fix_pr_url = result["html_url"]
        await session.commit()
        return FixPRResponse(pr_number=result["number"], html_url=result["html_url"])

    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to create fix PR: {exc}") from exc


# ═══════════════════════════════════════════════════════════════════════
# Feature 3: Smart README Generator
# ═══════════════════════════════════════════════════════════════════════

@router.post("/repos/{repo_id}/readme", response_model=ReadmeResponse)
async def generate_readme_endpoint(
    repo_id: int,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, session)

    try:
        tree = github.get_repo_tree(repo.full_name, repo.default_branch)

        # Get a few key files for context
        sample_paths = [p for p in tree if any(p.endswith(ext) for ext in [".py", ".ts", ".js", ".go", ".java"])][:5]
        sample_files = {}
        for path in sample_paths:
            try:
                content, _ = github.get_file_content(repo.full_name, path, repo.default_branch)
                sample_files[path] = content
            except Exception:
                continue

        readme_md = generate_readme(repo.full_name, tree, sample_files)
        return ReadmeResponse(markdown=readme_md)

    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"README generation failed: {exc}") from exc


@router.post("/repos/{repo_id}/readme/push", response_model=ReadmePushResponse)
async def push_readme_as_pr(
    repo_id: int,
    payload: ReadmeResponse,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, session)

    try:
        branch_name = "reponexus/update-readme"
        github.create_branch(repo.full_name, branch_name, repo.default_branch)

        # Check if README exists
        try:
            _, sha = github.get_file_content(repo.full_name, "README.md", repo.default_branch)
            github.update_file_on_branch(
                full_name=repo.full_name,
                file_path="README.md",
                new_content=payload.markdown,
                file_sha=sha,
                branch=branch_name,
                commit_message="docs: update README.md\n\nAuto-generated by RepoNexus AI",
            )
        except Exception:
            # File doesn't exist, create it
            gh_repo = github.client.get_repo(repo.full_name)
            gh_repo.create_file(
                path="README.md",
                message="docs: add README.md\n\nAuto-generated by RepoNexus AI",
                content=payload.markdown,
                branch=branch_name,
            )

        result = github.create_pull_request(
            full_name=repo.full_name,
            title="[RepoNexus] Update README.md",
            body="## 📝 AI-Generated README\n\nThis README was automatically generated by RepoNexus based on your codebase structure and contents.\n\nPlease review and merge!",
            head=branch_name,
            base=repo.default_branch,
        )
        return ReadmePushResponse(pr_number=result["number"], html_url=result["html_url"])

    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to push README: {exc}") from exc


# ═══════════════════════════════════════════════════════════════════════
# Feature 4: Pull Request AI Reviewer
# ═══════════════════════════════════════════════════════════════════════

@router.get("/repos/{repo_id}/prs", response_model=PRListResponse)
async def list_pull_requests(
    repo_id: int,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, session)
    try:
        prs = github.list_open_pull_requests(repo.full_name)
        return PRListResponse(pull_requests=[PRListItem(**pr) for pr in prs])
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to list PRs: {exc}") from exc


@router.post("/repos/{repo_id}/prs/{pr_number}/review", response_model=PRReviewResponse)
async def review_pull_request(
    repo_id: int,
    pr_number: int,
    payload: PRReviewRequest = PRReviewRequest(),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, session)

    try:
        diff = github.get_pull_request_diff(repo.full_name, pr_number)
        # Get PR title
        prs = github.list_open_pull_requests(repo.full_name)
        pr_title = next((pr["title"] for pr in prs if pr["number"] == pr_number), f"PR #{pr_number}")

        review_md = generate_pr_review(repo.full_name, pr_title, diff)

        posted = False
        if payload.post_to_github:
            github.post_pr_review(repo.full_name, pr_number, review_md)
            posted = True

        pr_url = f"https://github.com/{repo.full_name}/pull/{pr_number}"
        return PRReviewResponse(review_markdown=review_md, posted_to_github=posted, pr_html_url=pr_url)

    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"PR review failed: {exc}") from exc


# ═══════════════════════════════════════════════════════════════════════
# Feature 5: Repository RAG Chatbot
# ═══════════════════════════════════════════════════════════════════════

@router.post("/repos/{repo_id}/embed", response_model=EmbedResponse)
async def embed_repo_endpoint(
    repo_id: int,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    try:
        result = await embed_repository(session, repo_id, current_user.id)
        return EmbedResponse(status=result["status"], chunks=result["count"])
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Embedding failed: {exc}") from exc


@router.post("/repos/{repo_id}/chat", response_model=ChatResponse)
async def chat_with_repo_endpoint(
    repo_id: int,
    payload: ChatRequest,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    # Verify access
    repo = (await session.execute(select(Repository).where(Repository.id == repo_id))).scalar_one_or_none()
    if repo is None or repo.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        try:
            context_chunks = query_repository(repo_id, payload.question, k=8)
            answer = generate_chat_response(payload.question, context_chunks, repo.full_name)
            sources = [chunk.split("\n")[0] for chunk in context_chunks[:5]]
            return ChatResponse(answer=answer, sources=sources)
        except ValueError:
            # Fallback for missing RAG
            token = decrypt_token(current_user.encrypted_access_token)
            github = GitHubService(token)
            files = github.fetch_repository_files(
                full_name=repo.full_name,
                branch=repo.default_branch,
                allowed_extensions=settings.supported_extensions,
                max_files=10,
            )
            context = "\n\n".join([f"File: {f.path}\n{f.content}" for f in files])
            answer = generate_chat_response(payload.question, [context], repo.full_name)
            return ChatResponse(answer=answer, sources=[f.path for f in files])

    except Exception as exc:
        err_msg = str(exc)
        if "rate_limit" in err_msg.lower() or "429" in err_msg:
            raise HTTPException(
                status_code=429,
                detail="Rate limit reached for the AI model. Please try again in about 45 minutes (Groq TPD limit)."
            )
        raise HTTPException(status_code=500, detail=f"AI Chat Error: {err_msg}")
# ═══════════════════════════════════════════════════════════════════════
# Feature 6: Daily Standup
# ═══════════════════════════════════════════════════════════════════════

@router.post("/repos/{repo_id}/standup", response_model=StandupResponse)
async def generate_standup(
    repo_id: int,
    payload: StandupRequest,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, session)
    try:
        commits = github.get_recent_commits(repo.full_name, payload.days_back)
        report = generate_standup_report(repo.full_name, commits, payload.days_back)
        return StandupResponse(markdown=report)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Standup generation failed: {exc}") from exc

# ═══════════════════════════════════════════════════════════════════════
# Feature 7: Interview Prep
# ═══════════════════════════════════════════════════════════════════════

@router.post("/repos/{repo_id}/interview/generate", response_model=InterviewGenerateResponse)
async def interview_generate(
    repo_id: int,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, session)
    try:
        # Fetch file tree
        tree = github.get_repo_tree(repo.full_name, repo.default_branch)
        tree_str = "\n".join(tree[:200])
        
        # Try to fetch README
        readme_content = ""
        for readme_name in ["README.md", "Readme.md", "readme.md"]:
            if readme_name in tree:
                try:
                    content, _ = github.get_file_content(repo.full_name, readme_name, repo.default_branch)
                    readme_content = f"## {readme_name}\n\n{content[:2000]}"
                    break
                except Exception:
                    continue
                    
        project_context = f"## Repository Tree (truncated):\n{tree_str}\n\n{readme_content}"
        
        questions_json = generate_interview_question(repo.full_name, project_context)
        import json
        try:
            questions_data = json.loads(questions_json)
        except Exception:
            # Fallback if json parsing fails
            questions_data = [{"level": "Medium", "question": questions_json}]
            
        questions = [InterviewQuestion(**q) for q in questions_data]
        return InterviewGenerateResponse(questions=questions, code_snippet=project_context[:1500], file_path="Project Context (README + Tree)")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to generate interview question: {exc}") from exc

@router.post("/repos/{repo_id}/interview/evaluate", response_model=InterviewEvaluateResponse)
async def interview_evaluate(
    repo_id: int,
    payload: InterviewEvaluateRequest,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, session)
    try:
        feedback, score = evaluate_interview_answer(payload.question, payload.code_snippet, payload.user_answer)
        return InterviewEvaluateResponse(feedback=feedback, score=score)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to evaluate answer: {exc}") from exc

# ═══════════════════════════════════════════════════════════════════════
# Feature 8: Auto-Docs & Tutor
# ═══════════════════════════════════════════════════════════════════════

@router.get("/repos/{repo_id}/tree", response_model=RepoTreeResponse)
async def get_repo_tree_endpoint(
    repo_id: int,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, session)
    try:
        tree = github.get_repo_tree(repo.full_name, repo.default_branch)
        return RepoTreeResponse(files=tree)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch tree: {exc}") from exc

@router.post("/repos/{repo_id}/docs/pr", response_model=DocsGenerateResponse)
async def auto_docs_pr(
    repo_id: int,
    payload: DocsGenerateRequest,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    from datetime import datetime
    github, repo = await _get_github_and_repo(repo_id, current_user, session)
    try:
        content, sha = github.get_file_content(repo.full_name, payload.file_path, repo.default_branch)
        new_content = generate_file_documentation(payload.file_path, content)
        
        # Compute unified diff
        import difflib
        diff_lines = list(difflib.unified_diff(
            content.splitlines(keepends=True),
            new_content.splitlines(keepends=True),
            fromfile=f"a/{payload.file_path}",
            tofile=f"b/{payload.file_path}",
        ))
        diff_str = "".join(diff_lines)
        
        branch_name = f"reponexus/docs-{payload.file_path.split('/')[-1]}-{int(datetime.now().timestamp())}"
        github.create_branch(repo.full_name, branch_name, repo.default_branch)
        github.update_file_on_branch(
            repo.full_name, payload.file_path, new_content, sha, branch_name, 
            f"docs: auto-document {payload.file_path}"
        )
        
        result = github.create_pull_request(
            repo.full_name,
            f"[RepoNexus] Auto-Documentation for {payload.file_path}",
            "## 📝 AI-Generated Documentation\nAdded docstrings/JSDoc comments to this file.",
            branch_name,
            repo.default_branch
        )
        return DocsGenerateResponse(pr_number=result["number"], html_url=result["html_url"], diff=diff_str)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to generate docs PR: {exc}") from exc

@router.post("/repos/{repo_id}/tutor/lesson", response_model=TutorLessonResponse)
async def code_tutor_lesson(
    repo_id: int,
    payload: TutorLessonRequest,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, session)
    try:
        content, _ = github.get_file_content(repo.full_name, payload.file_path, repo.default_branch)
        lesson = generate_optimization_lesson(payload.file_path, content)
        return TutorLessonResponse(markdown_lesson=lesson)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to generate tutor lesson: {exc}") from exc

# ═══════════════════════════════════════════════════════════════════════
# Feature 9: Local Setup Guide
# ═══════════════════════════════════════════════════════════════════════

@router.post("/repos/{repo_id}/setup-guide", response_model=SetupGuideResponse)
async def generate_setup_guide(
    repo_id: int,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, session)
    try:
        tree = github.get_repo_tree(repo.full_name, repo.default_branch)
        tree_str = "\n".join(tree[:300])
        
        # Look for standard config files
        config_files_content = f"## Repository File Tree\n{tree_str}\n\n"
        target_files = ["README.md", "package.json", "requirements.txt", "docker-compose.yml", "Dockerfile", "pyproject.toml", "pom.xml"]
        
        for file_name in target_files:
            # Find all matching files in the tree (case-insensitive)
            matching_files = [f for f in tree if f.lower().endswith(file_name.lower())]
            
            # Prioritize root files, otherwise take the first few
            matching_files.sort(key=lambda x: (x.count("/"), x))
            
            # Take up to 2 files of the same type (e.g. backend/requirements.txt, frontend/package.json)
            for actual_name in matching_files[:2]:
                try:
                    content, _ = github.get_file_content(repo.full_name, actual_name, repo.default_branch)
                    config_files_content += f"## {actual_name}\n\n{content[:1000]}\n\n"
                except Exception:
                    continue
                    
        guide = generate_local_setup_guide(repo.full_name, config_files_content)
        return SetupGuideResponse(markdown_guide=guide)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to generate setup guide: {exc}") from exc

# ═══════════════════════════════════════════════════════════════════════
# Feature 10: Architecture Diagram
# ═══════════════════════════════════════════════════════════════════════

@router.post("/repos/{repo_id}/diagram", response_model=DiagramResponse)
async def generate_diagram(
    repo_id: int,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, session)
    try:
        tree = github.get_repo_tree(repo.full_name, repo.default_branch)
        tree_str = "\n".join(tree[:1000])
        
        readme_content = ""
        for readme_name in ["README.md", "Readme.md", "readme.md"]:
            if readme_name in tree:
                try:
                    content, _ = github.get_file_content(repo.full_name, readme_name, repo.default_branch)
                    readme_content = content[:3000]
                    break
                except Exception:
                    continue
                    
        mermaid_code = generate_architecture_diagram(repo.full_name, tree_str, readme_content)
        return DiagramResponse(mermaid_code=mermaid_code)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to generate diagram: {exc}") from exc

# ═══════════════════════════════════════════════════════════════════════
# Feature 11: Security Scanner
# ═══════════════════════════════════════════════════════════════════════

@router.post("/repos/{repo_id}/security-scan", response_model=SecurityScanResponse)
async def generate_security_audit(
    repo_id: int,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    import json
    import importlib
    import security_scanner
    importlib.reload(security_scanner) # Ensure we use the latest scanner logic

    github, repo = await _get_github_and_repo(repo_id, current_user, session)
    try:
        tree = github.get_repo_tree(repo.full_name, repo.default_branch)
        target_files = ["package.json", "requirements.txt", "docker-compose.yml", "Dockerfile", ".env", ".env.example", "config.py", "settings.py"]
        
        all_issues = []
        for file_pattern in target_files:
            matching_files = [f for f in tree if f.lower().endswith(file_pattern.lower())]
            for actual_name in matching_files[:5]:
                try:
                    content, _ = github.get_file_content(repo.full_name, actual_name, repo.default_branch)
                    raw_json = security_scanner.scan(content, actual_name)
                    file_issues = json.loads(raw_json)
                    # Filter out the "No issues" low-severity filler if we found real ones
                    all_issues.extend(file_issues)
                except Exception:
                    continue
        
        # If multiple files were scanned, filter out the placeholder "Low" findings if any High/Medium exist
        has_real_issues = any(i["severity"] in ["Critical", "High", "Medium"] for i in all_issues)
        if has_real_issues:
            all_issues = [i for i in all_issues if i["severity"] != "Low"]
        elif not all_issues:
            all_issues = [{
                "severity": "Low",
                "file": "Project",
                "issue": "No significant vulnerabilities found in configuration files.",
                "fix": "Continue following security best practices."
            }]

        return SecurityScanResponse(issues=all_issues)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to run security scan: {exc}") from exc

# ═══════════════════════════════════════════════════════════════════════
# Feature 12: Smart Issue Triage
# ═══════════════════════════════════════════════════════════════════════

@router.get("/repos/{repo_id}/issues", response_model=IssuesListResponse)
async def list_issues(
    repo_id: int,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, session)
    try:
        issues = github.list_open_issues(repo.full_name)
        return IssuesListResponse(issues=issues)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch issues: {exc}") from exc

@router.post("/repos/{repo_id}/issues/triage", response_model=IssueTriageResponse)
async def triage_issues(
    repo_id: int,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    import json
    github, repo = await _get_github_and_repo(repo_id, current_user, session)
    try:
        issues = github.list_open_issues(repo.full_name)

        # Try local ML model first (zero token cost, 82% F1)
        try:
            triage = issue_triage_inference.triage_issues(issues)
            if triage:  # Model loaded and returned results
                return IssueTriageResponse(triage=triage)
        except Exception:
            pass  # Fall through to Groq

        # Fallback: Groq LLM
        issues_json = json.dumps(issues, indent=2)
        raw_json = generate_issue_triage(repo.full_name, issues_json)
        triage = json.loads(raw_json)
        return IssueTriageResponse(triage=triage)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to triage issues: {exc}") from exc


# ── README Generator ──────────────────────────────────────────────
@router.post(
    "/repos/{repo_id}/readme-gen",
    response_model=ReadmeGenerateResponse,
    summary="Generate a professional README.md",
)
async def readme_generator(
    repo_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, session)
    try:
        tree = github.get_repo_tree(repo.full_name, repo.default_branch)
        file_tree = "\n".join(tree)
        # Fetch config files
        config_content = ""
        for cfg in ["package.json", "requirements.txt", "pyproject.toml", "Cargo.toml", "go.mod"]:
            if cfg in tree:
                try:
                    config_content += f"--- {cfg} ---\n{github.get_file_content(repo.full_name, cfg, repo.default_branch)[0]}\n\n"
                except Exception:
                    pass
        # Fetch existing README
        readme_existing = ""
        for name in ["README.md", "readme.md", "README.rst"]:
            if name in tree:
                try:
                    readme_existing = github.get_file_content(repo.full_name, name, repo.default_branch)[0]
                except Exception:
                    pass
                break
        content = generate_readme_content(repo.full_name, file_tree, config_content, readme_existing)
        return ReadmeGenerateResponse(markdown_content=content)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to generate README: {exc}") from exc


# ── Contributing Guide Generator ──────────────────────────────────
@router.post(
    "/repos/{repo_id}/contributing-gen",
    response_model=ContribGuideResponse,
    summary="Generate a CONTRIBUTING.md guide",
)
async def contributing_generator(
    repo_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, session)
    try:
        tree = github.get_repo_tree(repo.full_name, repo.default_branch)
        file_tree = "\n".join(tree)
        config_content = ""
        for cfg in ["package.json", "requirements.txt", "pyproject.toml", ".eslintrc", ".prettierrc", "Makefile"]:
            if cfg in tree:
                try:
                    config_content += f"--- {cfg} ---\n{github.get_file_content(repo.full_name, cfg, repo.default_branch)[0]}\n\n"
                except Exception:
                    pass
        content = generate_contributing_guide(repo.full_name, file_tree, config_content)
        return ContribGuideResponse(markdown_content=content)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to generate contributing guide: {exc}") from exc


# ── API Endpoint Documenter ───────────────────────────────────────
@router.post(
    "/repos/{repo_id}/api-docs-gen",
    response_model=ApiDocsResponse,
    summary="Generate API endpoint documentation",
)
async def api_docs_generator(
    repo_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, session)
    try:
        tree = github.get_repo_tree(repo.full_name, repo.default_branch)
        # Find route/controller files
        route_patterns = ["route", "controller", "endpoint", "api", "views", "handler", "server"]
        route_files = [f for f in tree if any(p in f.lower() for p in route_patterns)
                       and f.endswith((".py", ".ts", ".js", ".go", ".rs"))]
        if not route_files:
            # Fallback: try to find main app files
            route_files = [f for f in tree if f.endswith((".py", ".ts", ".js"))
                          and any(k in f.lower() for k in ["app", "main", "index", "server"])]
        route_content = ""
        for rf in route_files[:10]:  # limit to 10 files
            try:
                content = github.get_file_content(repo.full_name, rf, repo.default_branch)[0]
                route_content += f"\n--- {rf} ---\n{content}\n"
            except Exception:
                pass
        if not route_content.strip():
            raise ValueError("No route or controller files found in this repository.")
        content = generate_api_documentation(repo.full_name, route_content)
        return ApiDocsResponse(markdown_content=content)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to generate API docs: {exc}") from exc


# ── CI/CD Pipeline Generator ──────────────────────────────────────
@router.post(
    "/repos/{repo_id}/cicd-gen",
    response_model=CiCdGenerateResponse,
    summary="Generate a GitHub Actions CI/CD pipeline",
)
async def cicd_generator(
    repo_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, session)
    try:
        tree = github.get_repo_tree(repo.full_name, repo.default_branch)
        file_tree = "\n".join(tree)
        config_content = ""
        for cfg in ["package.json", "requirements.txt", "pyproject.toml", "Cargo.toml", "go.mod", "Dockerfile", "docker-compose.yml", "Makefile"]:
            if cfg in tree:
                try:
                    config_content += f"--- {cfg} ---\n{github.get_file_content(repo.full_name, cfg, repo.default_branch)[0]}\n\n"
                except Exception:
                    pass
        content = generate_ci_cd_pipeline(repo.full_name, file_tree, config_content)
        return CiCdGenerateResponse(markdown_content=content)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to generate CI/CD pipeline: {exc}") from exc


# ── Issue-to-PR Scaffold (Epic Builder) ───────────────────────────
@router.post(
    "/repos/{repo_id}/issue-plan-gen",
    response_model=IssuePlanGenerateResponse,
    summary="Generate an Implementation Plan for an issue",
)
async def issue_plan_generator(
    repo_id: int,
    request: IssuePlanGenerateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, session)
    try:
        tree = github.get_repo_tree(repo.full_name, repo.default_branch)
        file_tree = "\n".join(tree)
        content = generate_issue_implementation_plan(repo.full_name, request.issue_title, request.issue_body, file_tree)
        return IssuePlanGenerateResponse(markdown_content=content)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to generate Implementation Plan: {exc}") from exc


# ── PR Reviewer ────────────────────────────────────────────────────────
@router.post(
    "/repos/{repo_id}/pr-review",
    response_model=PrReviewResponse,
    summary="Generate AI Review for a PR",
)
async def pr_review_generator(
    repo_id: int,
    request: PrReviewRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, session)
    try:
        # Get PR details
        github_repo = github.client.get_repo(repo.full_name)
        pr = github_repo.get_pull(request.pr_number)
        diff_text = github.get_pull_request_diff(repo.full_name, request.pr_number)
        
        content = generate_pr_review(repo.full_name, pr.title, pr.body or "", diff_text)
        return PrReviewResponse(markdown_content=content)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to generate PR review: {exc}") from exc


# ── PR List ────────────────────────────────────────────────────────────
@router.get(
    "/repos/{repo_id}/prs",
    response_model=PrListResponse,
    summary="Get open PRs for a repo",
)
async def list_prs_handler(
    repo_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, session)
    try:
        prs = github.get_pull_requests(repo.full_name)
        return PrListResponse(prs=prs)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch PRs: {exc}") from exc


# ── Release Notes Generator ────────────────────────────────────────────
@router.post(
    "/repos/{repo_id}/release-notes",
    response_model=ReleaseNotesResponse,
    summary="Generate Release Notes from recent commits",
)
async def release_notes_generator(
    repo_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, session)
    try:
        commits = github.get_recent_commits(repo.full_name, days_back=30)
        content = generate_release_notes(repo.full_name, commits)
        return ReleaseNotesResponse(markdown_content=content)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to generate release notes: {exc}") from exc



@router.post("/repos/{repo_id}/zombie-scan", response_model=ZombieScanResponse)
async def analyze_zombie_code(
    repo_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, db)
    try:
        tree = github.get_repo_tree(repo.full_name, repo.default_branch)
        sample_paths = [p for p in tree if any(p.endswith(ext) for ext in [".py", ".ts", ".tsx", ".js", ".jsx"])][:50]
        sample_files = {}
        for path in sample_paths:
            try:
                content, _ = github.get_file_content(repo.full_name, path, repo.default_branch)
                sample_files[path] = content
            except Exception:
                continue
        issues = zombie_scanner.scan(sample_files)
        return {"issues": issues}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Zombie scan failed: {exc}") from exc

@router.post("/repos/{repo_id}/migration-risk", response_model=MigrationRiskResponse)
async def analyze_migration_risk(
    repo_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, db)
    try:
        tree = github.get_repo_tree(repo.full_name, repo.default_branch)
        sample_paths = [p for p in tree if any(p.endswith(ext) for ext in [".py", ".sql", ".ts"]) or "migration" in p.lower() or "alembic" in p.lower()][:50]
        sample_files = {}
        for path in sample_paths:
            try:
                content, _ = github.get_file_content(repo.full_name, path, repo.default_branch)
                sample_files[path] = content
            except Exception:
                continue
        risks = migration_analyzer.scan(sample_files)
        return {"risks": risks}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Migration risk analysis failed: {exc}") from exc

@router.post("/repos/{repo_id}/cost-optimizer", response_model=CostOptimizationResponse)
async def analyze_cost_optimization(
    repo_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, db)
    try:
        tree = github.get_repo_tree(repo.full_name, repo.default_branch)
        sample_paths = [p for p in tree if any(p.endswith(ext) for ext in [".py", ".ts", ".tsx", ".js"])][:5]
        sample_files = {}
        for path in sample_paths:
            try:
                content, _ = github.get_file_content(repo.full_name, path, repo.default_branch)
                sample_files[path] = content
            except Exception:
                continue
        issues = cost_optimizer.scan(sample_files)
        return {"issues": issues}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Cost optimization failed: {exc}") from exc


# ══════════════════════════════════════════════════════════════════════
# Phase 2: Technical Debt Health Scorer (XGBoost — local model)
# ══════════════════════════════════════════════════════════════════════

@router.post("/repos/{repo_id}/debt-score")
async def score_repo_debt(
    repo_id: int,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    github, repo = await _get_github_and_repo(repo_id, current_user, db)
    try:
        tree = github.get_repo_tree(repo.full_name, repo.default_branch)
        sample_paths = [
            p for p in tree
            if any(p.endswith(ext) for ext in [".py", ".ts", ".tsx", ".js", ".jsx"])
        ][:40]

        sample_files = {}
        for path in sample_paths:
            try:
                content, _ = github.get_file_content(repo.full_name, path, repo.default_branch)
                sample_files[path] = content
            except Exception:
                continue

        scored = debt_scorer.score_files(sample_files)
        avg_debt = sum(r["debt_score"] for r in scored) / max(len(scored), 1)
        health_score = round(100 - avg_debt, 1)
        return {
            "health_score": health_score,
            "files": scored,
            "summary": (
                f"Scanned {len(scored)} files. "
                f"Average debt score: {avg_debt:.1f}/100. "
                f"Repository health: {health_score}/100."
            )
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Debt scoring failed: {exc}") from exc
