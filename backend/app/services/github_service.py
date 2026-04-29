from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from github import Github, GithubException


@dataclass
class RepositoryFile:
    path: str
    content: str
    sha: str
    size: int


class GitHubService:
    def __init__(self, access_token: str) -> None:
        self.client = Github(access_token, timeout=30, retry=3)

    def list_user_repositories(self) -> list[dict]:
        repos = self.client.get_user().get_repos(sort="updated")
        return [
            {
                "id": repo.id,
                "full_name": repo.full_name,
                "default_branch": repo.default_branch,
                "language": repo.language,
            }
            for repo in repos
        ]

    def get_repo_metadata(self, full_name: str) -> dict:
        repo = self.client.get_repo(full_name)
        return {
            "id": repo.id,
            "full_name": repo.full_name,
            "default_branch": repo.default_branch,
            "language": repo.language,
        }

    def get_default_branch_head_sha(self, full_name: str, branch: str) -> str:
        repo = self.client.get_repo(full_name)
        return repo.get_branch(branch).commit.sha

    # Directories to skip for performance — rarely contain meaningful source code
    _SKIP_DIRS = {
        "node_modules", "vendor", "dist", "build", ".git", "__pycache__",
        ".tox", ".mypy_cache", ".pytest_cache", "venv", ".venv", "env",
        "site-packages", "coverage", ".next", ".nuxt",
    }

    def fetch_repository_files(
        self,
        full_name: str,
        branch: str,
        allowed_extensions: Iterable[str],
        max_files: int,
    ) -> list[RepositoryFile]:
        """Fetch source files using the Git Tree API (single API call for the tree)."""
        repo = self.client.get_repo(full_name)
        extension_set = set(allowed_extensions)
        files: list[RepositoryFile] = []

        try:
            # Single API call to get the entire repo tree
            tree = repo.get_git_tree(branch, recursive=True)
            candidate_paths = []
            for element in tree.tree:
                if element.type != "blob":
                    continue
                # Skip files in vendor/build directories
                parts = element.path.split("/")
                if any(p in self._SKIP_DIRS for p in parts):
                    continue
                if not any(element.path.endswith(ext) for ext in extension_set):
                    continue
                if element.size > 300_000:
                    continue
                candidate_paths.append(element)
                if len(candidate_paths) >= max_files:
                    break
        except GithubException:
            # Fallback: use the old recursive get_contents approach
            return self._fetch_files_fallback(repo, branch, extension_set, max_files)

        # Fetch content for each candidate concurrently (with error handling)
        import concurrent.futures
        import base64

        def _fetch_blob(element):
            try:
                blob = repo.get_git_blob(element.sha)
                decoded = base64.b64decode(blob.content).decode("utf-8", errors="ignore")
                return RepositoryFile(
                    path=element.path, content=decoded,
                    sha=element.sha, size=element.size
                )
            except Exception:
                return None

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            results = list(executor.map(_fetch_blob, candidate_paths[:max_files]))

        for res in results:
            if res is not None:
                files.append(res)

        return files

    def _fetch_files_fallback(
        self, repo, branch: str, extension_set: set, max_files: int
    ) -> list[RepositoryFile]:
        """Fallback: recursive get_contents for repos where git tree isn't available."""
        stack = [""]
        files: list[RepositoryFile] = []

        while stack and len(files) < max_files:
            current_path = stack.pop()
            try:
                contents = repo.get_contents(current_path, ref=branch)
            except GithubException:
                continue

            if not isinstance(contents, list):
                contents = [contents]

            for item in contents:
                if item.type == "dir":
                    if item.name not in self._SKIP_DIRS:
                        stack.append(item.path)
                    continue
                if item.type != "file":
                    continue
                if not any(item.path.endswith(ext) for ext in extension_set):
                    continue
                if item.size > 300_000:
                    continue
                try:
                    decoded = item.decoded_content.decode("utf-8", errors="ignore")
                except Exception:
                    continue
                files.append(RepositoryFile(path=item.path, content=decoded, sha=item.sha, size=item.size))
                if len(files) >= max_files:
                    break

        return files

    def register_push_webhook(self, full_name: str, callback_url: str, secret: str | None = None) -> int:
        repo = self.client.get_repo(full_name)
        config = {
            "url": callback_url,
            "content_type": "json",
            "insecure_ssl": "0",
        }
        if secret:
            config["secret"] = secret

        webhook = repo.create_hook(name="web", config=config, events=["push"], active=True)
        return webhook.id

    # ── Feature: Auto-create GitHub Issues ────────────────────────────
    def create_issue(self, full_name: str, title: str, body: str, labels: list[str] | None = None) -> dict:
        repo = self.client.get_repo(full_name)
        issue = repo.create_issue(title=title, body=body, labels=labels or [])
        return {"number": issue.number, "html_url": issue.html_url}

    # ── Feature: Auto-fix PRs ─────────────────────────────────────────
    def get_file_content(self, full_name: str, file_path: str, branch: str) -> tuple[str, str]:
        """Returns (decoded_content, file_sha)."""
        repo = self.client.get_repo(full_name)
        content_file = repo.get_contents(file_path, ref=branch)
        if isinstance(content_file, list):
            content_file = content_file[0]
        return content_file.decoded_content.decode("utf-8", errors="ignore"), content_file.sha

    def create_branch(self, full_name: str, new_branch: str, source_branch: str) -> str:
        repo = self.client.get_repo(full_name)
        source_ref = repo.get_git_ref(f"heads/{source_branch}")
        sha = source_ref.object.sha
        repo.create_git_ref(f"refs/heads/{new_branch}", sha)
        return sha

    def update_file_on_branch(
        self, full_name: str, file_path: str, new_content: str, file_sha: str, branch: str, commit_message: str
    ) -> str:
        repo = self.client.get_repo(full_name)
        result = repo.update_file(
            path=file_path, message=commit_message, content=new_content, sha=file_sha, branch=branch
        )
        return result["commit"].sha

    def create_pull_request(self, full_name: str, title: str, body: str, head: str, base: str) -> dict:
        repo = self.client.get_repo(full_name)
        pr = repo.create_pull(title=title, body=body, head=head, base=base)
        return {"number": pr.number, "html_url": pr.html_url}

    # ── Feature: PR AI Reviewer ───────────────────────────────────────
    def list_open_pull_requests(self, full_name: str) -> list[dict]:
        repo = self.client.get_repo(full_name)
        prs = repo.get_pulls(state="open", sort="created", direction="desc")
        result = []
        for pr in prs:
            if len(result) >= 30:
                break
            result.append({
                "number": pr.number,
                "title": pr.title,
                "html_url": pr.html_url,
                "user": pr.user.login,
                "user_avatar": pr.user.avatar_url,
                "created_at": pr.created_at.isoformat(),
                "head_branch": pr.head.ref,
                "base_branch": pr.base.ref,
                "additions": pr.additions,
                "deletions": pr.deletions,
                "changed_files": pr.changed_files,
            })
        return result

    def get_pull_request_diff(self, full_name: str, pr_number: int) -> str:
        repo = self.client.get_repo(full_name)
        pr = repo.get_pull(pr_number)
        files = pr.get_files()
        diff_parts: list[str] = []
        for f in files:
            diff_parts.append(f"--- a/{f.filename}\n+++ b/{f.filename}\n{f.patch or ''}")
        return "\n\n".join(diff_parts)

    def post_pr_review(self, full_name: str, pr_number: int, body: str) -> dict:
        repo = self.client.get_repo(full_name)
        pr = repo.get_pull(pr_number)
        review = pr.create_review(body=body, event="COMMENT")
        return {"id": review.id, "html_url": pr.html_url}

    # ── Feature: Smart README + repo tree ─────────────────────────────
    def get_repo_tree(self, full_name: str, branch: str) -> list[str]:
        """Returns a flat list of file paths in the repo (max 3000 entries)."""
        repo = self.client.get_repo(full_name)
        tree = repo.get_git_tree(branch, recursive=True)
        return [item.path for item in tree.tree if item.type == "blob"][:3000]

    # ── Feature: Daily Standup ────────────────────────────────────────
    def get_recent_commits(self, full_name: str, days_back: int) -> list[dict]:
        from datetime import datetime, timedelta, timezone
        repo = self.client.get_repo(full_name)
        since = datetime.now(timezone.utc) - timedelta(days=days_back)
        commits = repo.get_commits(since=since)
        result = []
        count = 0
        for c in commits:
            if count >= 50:
                break
            result.append({
                "sha": c.sha[:7],
                "message": c.commit.message.split("\n")[0],
                "author": c.commit.author.name if c.commit.author else "Unknown",
                "date": c.commit.author.date.isoformat() if c.commit.author else "",
            })
            count += 1
        return result

    def list_open_issues(self, full_name: str, limit: int = 30) -> list[dict]:
        """Fetch open issues (excluding PRs) from the repository."""
        repo = self.client.get_repo(full_name)
        issues = repo.get_issues(state="open", sort="created", direction="desc")
        result = []
        count = 0
        for issue in issues:
            if count >= limit:
                break
            # Skip pull requests (GitHub treats PRs as issues too)
            if issue.pull_request is not None:
                continue
            result.append({
                "number": issue.number,
                "title": issue.title,
                "body": (issue.body or "")[:500],
                "labels": [l.name for l in issue.labels],
                "created_at": issue.created_at.isoformat() if issue.created_at else "",
                "user": issue.user.login if issue.user else "Unknown",
            })
            count += 1
        return result
