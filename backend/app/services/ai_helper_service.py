"""Centralized AI helper service using Groq LLM for all AI-powered GitHub features."""

from __future__ import annotations

import json
from langchain_groq import ChatGroq
from app.core.config import get_settings

settings = get_settings()


from app.core.ai_client import groq_manager

def _llm(temperature: float = 0.3, max_tokens: int = 4096) -> ChatGroq:
    return groq_manager.get_client(temperature=temperature, max_tokens=max_tokens)

def _invoke_safe(prompt: Any, temperature: float = 0.3, max_tokens: int = 4096):
    """Internal helper to invoke Groq with key rotation."""
    try:
        llm = _llm(temperature=temperature, max_tokens=max_tokens)
        return llm.invoke(prompt)
    except Exception as e:
        err = str(e).lower()
        if ("rate_limit" in err or "429" in err) and groq_manager.rotate_key():
            llm = _llm(temperature=temperature, max_tokens=max_tokens)
            return llm.invoke(prompt)
        raise e


def generate_readme(repo_name: str, tree: list[str], sample_files: dict[str, str]) -> str:
    """Generate a professional README.md from repo structure and sample files."""
    tree_str = "\n".join(tree[:200])
    samples = ""
    for path, content in list(sample_files.items())[:5]:
        samples += f"\n### {path}\n```\n{content[:1500]}\n```\n"

    prompt = f"""You are an expert developer advocate. Generate a stunning, comprehensive README.md for the GitHub repository "{repo_name}".

## Repository file tree (truncated):
{tree_str}

## Sample files:
{samples}

## Requirements:
- Start with an eye-catching title and short tagline
- Add badges (build, license, stars) placeholders
- Include: Features, Tech Stack, Getting Started (prerequisites, installation, running), Project Structure, API Reference (if applicable), Contributing, License sections
- Use clean markdown formatting with emojis for section headers
- Make it look professional and production-ready
- Be accurate based on the actual code you see

Output ONLY the raw markdown content, no wrapping."""

    response = _invoke_safe(prompt, temperature=0.4, max_tokens=4096)
    return response.content


def generate_pr_review(repo_name: str, pr_title: str, diff: str) -> str:
    """Analyze a PR diff and generate a detailed code review."""
    diff_truncated = diff[:12000]

    prompt = f"""You are a senior staff engineer performing a thorough code review on a pull request.

Repository: {repo_name}
PR Title: {pr_title}

## Diff:
```diff
{diff_truncated}
```

Provide a structured review with these sections:
## 🔍 Summary
Brief overview of what this PR does.

## ✅ What Looks Good
List positive aspects of the code changes.

## ⚠️ Issues & Suggestions
For each issue found:
- **File**: filename
- **Severity**: Critical / Warning / Suggestion
- **Issue**: Description
- **Fix**: Recommended change

## 🏆 Overall Assessment
Rate the PR: Approve / Request Changes / Needs Discussion
Include an overall quality score (1-10).

Be specific, reference actual code from the diff, and be constructive."""

    response = _invoke_safe(prompt, temperature=0.2, max_tokens=4096)
    return response.content


def generate_code_fix(file_path: str, original_code: str, debt_title: str, debt_description: str, fix_suggestion: str) -> str:
    """Generate the fixed version of a source file based on the debt analysis."""
    code_truncated = original_code[:8000]

    prompt = f"""You are an expert software engineer. Fix the technical debt issue in the following file.

## File: {file_path}

## Issue: {debt_title}
{debt_description}

## Suggested approach:
{fix_suggestion}

## Current code:
```
{code_truncated}
```

## Instructions:
- Return ONLY the complete fixed file content
- Preserve all existing functionality
- Add appropriate comments where the fix was applied
- Do NOT include markdown code fences or any explanation outside the code
- Output the raw fixed source code only"""

    response = _invoke_safe(prompt, temperature=0.1, max_tokens=8000)
    return response.content
    # Strip markdown fences if the model adds them anyway
    content = response.content.strip()
    if content.startswith("```"):
        lines = content.split("\n")
        lines = lines[1:]  # remove opening fence
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        content = "\n".join(lines)
    return content


def generate_chat_response(question: str, context_chunks: list[str], repo_name: str) -> str:
    """Answer a question about a codebase using retrieved context chunks."""
    context = "\n\n---\n\n".join(context_chunks[:8])

    prompt = f"""You are an AI assistant that helps developers understand the codebase of "{repo_name}".
Answer the user's question based ONLY on the code context provided below.
If the context doesn't contain enough information, say so honestly.
Always cite the specific file paths when referencing code.

## Code Context:
{context}

## User Question:
{question}

Provide a clear, helpful answer with code references."""

    response = _invoke_safe(prompt, temperature=0.3, max_tokens=2048)
    return response.content


def generate_standup_report(repo_name: str, commits: list[dict], days_back: int) -> str:
    commits_str = "\n".join([f"- {c['sha']}: {c['message']} by {c['author']} ({c['date']})" for c in commits])
    prompt = f"""You are an AI assistant helping a software engineer write their daily standup / progress report.
Based on the following commits to "{repo_name}" in the last {days_back} days, generate a clean, professional standup update.

## Commits:
{commits_str if commits else "No commits found in the last " + str(days_back) + " days."}

Format the report using:
- **Yesterday / Recently**: What was accomplished
- **Today / Next**: What the logical next steps are
- **Blockers**: None (unless implied by commit messages)

Keep it concise and professional."""
    return _invoke_safe(prompt, temperature=0.2, max_tokens=1000).content


def generate_interview_question(repo_name: str, project_context: str) -> str:
    prompt = f"""You are a senior engineering manager conducting a systems design and architectural interview for the repository "{repo_name}".
I am the candidate. Based on the following project context (README and File Structure), generate a comprehensive list of 5 to 8 technical interview questions.
Include questions at different difficulty levels (Easy, Medium, Hard). The questions should cover overall architecture, tech choices, scaling, data flow, structure, and potential bottlenecks.

## Project Context:
```
{project_context[:3000]}
```

Output ONLY a valid JSON array matching this exact structure, with no markdown code blocks around it:
[
  {{"level": "Easy", "question": "..."}},
  {{"level": "Medium", "question": "..."}},
  {{"level": "Hard", "question": "..."}}
]"""
    # Use max_tokens=2000 since we're generating 5-8 questions
    response = _invoke_safe(prompt, temperature=0.7, max_tokens=2000).content.strip()
    if response.startswith("```json"):
        response = "\n".join(response.split("\n")[1:-1])
    elif response.startswith("```"):
        response = "\n".join(response.split("\n")[1:-1])
    return response


def evaluate_interview_answer(question: str, project_context: str, user_answer: str) -> tuple[str, int]:
    prompt = f"""You are a senior engineering manager evaluating a candidate's answer to an architectural interview question.
The interview is regarding the following project structure and scope.

## Project Context:
```
{project_context[:3000]}
```

## Question Asked:
{question}

## Candidate's Answer:
{user_answer}

Provide constructive, encouraging feedback on their answer. Highlight what they got right, and suggest areas they could expand on (like scalability, edge cases, or design patterns).
Finally, give a score from 1 to 10 on the final line in this exact format: "Score: X/10"."""
    
    response = _invoke_safe(prompt, temperature=0.4, max_tokens=800).content
    
    score = 0
    lines = response.strip().split("\n")
    if lines:
        last_line = lines[-1]
        import re
        match = re.search(r"Score:\s*(\d+)/10", last_line)
        if match:
            score = int(match.group(1))
            
    return response, score


def generate_file_documentation(file_path: str, original_code: str) -> str:
    prompt = f"""You are an expert developer. The following file `{file_path}` lacks proper documentation.
Add comprehensive, professional docstrings/JSDoc comments to the classes and functions in this code.

## Current code:
```
{original_code[:6000]}
```

Instructions:
- Return ONLY the complete modified file content
- Do not change any actual logic, just add comments/docstrings
- Output the raw code only, without markdown code fences"""
    content = _invoke_safe(prompt, temperature=0.1, max_tokens=6000).content.strip()
    if content.startswith("```"):
        content = "\n".join(content.split("\n")[1:-1]) if content.endswith("```") else "\n".join(content.split("\n")[1:])
    return content


def generate_optimization_lesson(file_path: str, original_code: str) -> str:
    prompt = f"""You are an incredibly friendly, supportive, and enthusiastic software engineering mentor.
Your goal is to explain code optimization in a way that is easy to understand (ELI5 - Explain Like I'm 5), minimizing dense academic jargon.
The user has requested a code review and optimization lesson for the following file `{file_path}`.

## Code:
```
{original_code[:4000]}
```

1. Gently analyze the time complexity (Big-O) of the most important/complex function. Use simple analogies.
2. Identify any inefficiencies (e.g., nested loops).
3. Provide an interactive, encouraging lesson explaining HOW to optimize it.
4. Provide the optimized code snippet.

Use markdown. Be very human-like, empathetic, and encouraging. Avoid sounding like a strict textbook."""
    return _invoke_safe(prompt, temperature=0.6, max_tokens=2500).content


def generate_local_setup_guide(repo_name: str, config_files_content: str) -> str:
    prompt = f"""You are a helpful and clear developer onboarding a new engineer to the repository "{repo_name}".
Based on the following configuration files and repository structure, write a friendly, medium-detail step-by-step guide to run this project locally.

## Project Context:
```
{config_files_content[:5000]}
```

Make the guide easy to follow. Explain the "why" briefly without being overly complicated. If this is a monorepo (e.g., has both a frontend and backend), clearly separate the instructions for starting both.

Ensure your guide includes:
### 1. Prerequisites
List the necessary tools to install (e.g., Node.js, Python, PostgreSQL, Docker) with brief context.

### 2. Clone the Repository
Provide the `git clone` and `cd` commands.

### 3. Environment Setup
Explain how to set up `.env` files if required, based on the codebase.

### 4. Installation & Running
Provide the exact terminal commands to install dependencies (`npm install`, `pip install -r requirements.txt`) and start the servers (`npm run dev`, `uvicorn`, etc.). If there is a frontend and a backend, give separate commands and terminal tabs for each.

Keep the language accessible and structured, using code blocks for all terminal commands."""
    return _invoke_safe(prompt, temperature=0.4, max_tokens=2000).content


def generate_architecture_diagram(repo_name: str, file_tree: str, readme_content: str) -> str:
    prompt = f"""You are a brilliant software architect analyzing the repository "{repo_name}".
Based on the file tree and README, generate a Mermaid.js diagram representing the high-level system architecture.

## File Tree:
```
{file_tree[:3000]}
```

## README Context:
```
{readme_content[:2000]}
```

STRICT RULES for valid Mermaid syntax:
1. Start with `graph TD` or `graph LR`.
2. Use simple alphanumeric node IDs like `A`, `B`, `Frontend`, `Backend`. NO dots or special chars in IDs.
3. For node labels use square brackets: `A[Frontend App]`. NEVER nest brackets inside labels.
4. For labeled arrows use EXACTLY this syntax: `A -->|label| B`. There must be NO `>` after the closing `|`.
5. For plain arrows use: `A --> B`.
6. For subgraphs use: `subgraph Name` ... `end`.
7. NEVER use parentheses `()`, curly braces, or angle brackets `<>` in node labels or arrows.
8. Keep labels short and simple. Use only plain text, no file extensions like `.jsx`.
9. Do NOT wrap output in markdown code fences. Output ONLY raw mermaid code.
10. Do NOT output any explanatory text."""
    
    import re
    response = _invoke_safe(prompt, temperature=0.2, max_tokens=2000).content.strip()
    # Strip markdown fences if present
    if response.startswith("```mermaid"):
        response = "\n".join(response.split("\n")[1:-1])
    elif response.startswith("```"):
        response = "\n".join(response.split("\n")[1:-1])
    # Sanitize common LLM mistakes
    lines = []
    for line in response.split("\n"):
        # Fix: -->|label|> Target  =>  -->|label| Target
        cleaned = re.sub(r'\|>\s', '| ', line)
        cleaned = re.sub(r'\|>$', '|', cleaned)
        # Fix nested brackets in node definitions: only keep outermost [ ]
        cleaned = re.sub(r'\[([^\]]*)\[([^\]]*)\]([^\]]*)\]', r'[\1\2\3]', cleaned)
        # Replace < > in labels with nothing
        cleaned = re.sub(r'(?<=\[)([^\]]*)(?=\])', lambda m: m.group(0).replace('<', '').replace('>', ''), cleaned)
        lines.append(cleaned)
    return "\n".join(lines)


def generate_security_scan(repo_name: str, config_content: str) -> str:
    prompt = f"""You are an elite DevSecOps engineer analyzing the repository "{repo_name}".
Based on the following configuration files, package manifests, and code samples, identify any security vulnerabilities, known CVEs, outdated/insecure dependencies, or hardcoded secrets.

## Context:
```
{config_content[:6000]}
```

Return ONLY a valid JSON array of objects representing the vulnerabilities. Do NOT include markdown blocks (` ```json `), explanations, or text outside the JSON array.
If no issues are found, return `[]`.

Format:
[
  {{
    "severity": "Critical" | "High" | "Medium" | "Low",
    "file": "filename.txt",
    "issue": "Brief description of the vulnerability",
    "fix": "How to fix it (e.g. Upgrade to version X, use environment variables)"
  }}
]"""
    try:
        response = _invoke_safe(prompt, temperature=0.1, max_tokens=2500).content.strip()
        if response.startswith("```json"):
            response = "\n".join(response.split("\n")[1:-1])
        elif response.startswith("```"):
            response = "\n".join(response.split("\n")[1:-1])
        return response
    except Exception as e:
        return f'[{{"severity": "Low", "file": "N/A", "issue": "AI Service Rate Limited", "fix": "Please try again later. Detail: {str(e)}"}}]'


def generate_issue_triage(repo_name: str, issues_json: str) -> str:
    prompt = f"""You are an expert engineering manager triaging GitHub issues for the repository "{repo_name}".
Below is a JSON array of open issues. For each issue, estimate the complexity in story points (1, 2, 3, 5, or 8) and suggest appropriate labels.

## Issues:
```json
{issues_json[:5000]}
```

Return ONLY a valid JSON array. Do NOT include markdown blocks, explanations, or text outside the JSON array.
If the input is empty, return `[]`.

Format:
[
  {{
    "number": 1,
    "story_points": 3,
    "suggested_labels": ["bug", "high-priority"],
    "reasoning": "One-sentence explanation of the estimate"
  }}
]"""
    response = _invoke_safe(prompt, temperature=0.1, max_tokens=2500).content.strip()
    if response.startswith("```json"):
        response = "\n".join(response.split("\n")[1:-1])
    elif response.startswith("```"):
        response = "\n".join(response.split("\n")[1:-1])
    return response


def generate_readme_content(repo_name: str, file_tree: str, config_content: str, readme_existing: str) -> str:
    prompt = f"""You are a senior open-source maintainer writing a professional README.md for the repository "{repo_name}".

## Current file tree:
```
{file_tree[:3000]}
```

## Config files content (package.json, requirements.txt, etc.):
```
{config_content[:2000]}
```

## Existing README (if any):
```
{readme_existing[:1500]}
```

Generate a complete, publication-quality README.md with:
1. Project title with a short tagline
2. A description paragraph
3. Features list (bulleted)
4. Tech stack / built with
5. Getting Started (prerequisites, installation, running)
6. Project structure overview
7. Contributing section (brief)
8. License placeholder

Use badges where appropriate (e.g., ![Python](https://img.shields.io/badge/...)).
Output ONLY the raw markdown. Do NOT wrap in code fences."""
    return _invoke_safe(prompt, temperature=0.3, max_tokens=3000).content


def generate_pr_review(repo_name: str, pr_title: str, pr_body: str, diff_text: str) -> str:
    prompt = f"""You are an elite Senior Staff Engineer performing a code review for a Pull Request in the "{repo_name}" repository.

## PR Context:
Title: {pr_title}
Body: {pr_body}

## Git Diff:
```diff
{diff_text[:10000]}
```

Provide a thorough, constructive, and highly professional Markdown review.
1. **Summary of Changes**: Briefly explain what the PR actually does in plain English.
2. **Key Strengths**: Point out good engineering practices or elegant solutions found in the diff.
3. **Potential Issues & Bugs**: Highlight any logical errors, edge cases missed, or anti-patterns. Be specific.
4. **Security & Performance**: Mention any potential vulnerabilities or performance bottlenecks.
5. **Final Verdict**: State whether the PR is ready to merge, needs minor tweaks, or requires major revisions.

Output ONLY the raw markdown. Do NOT wrap the entire response in a code fence."""
    return _invoke_safe(prompt, temperature=0.2, max_tokens=3000).content


def generate_release_notes(repo_name: str, commits: list[dict]) -> str:
    commits_str = "\n".join([f"- {c['sha']}: {c['message']} (by {c['author']})" for c in commits])
    prompt = f"""You are an expert Technical Product Manager drafting Release Notes for the "{repo_name}" repository.

Here are the recent raw commits:
{commits_str}

Analyze these commits and generate a clean, professional, and customer-facing Changelog in Markdown format.
Follow this structure:
1. **Release Overview**: A 1-2 sentence summary of the major themes in these commits.
2. Categorize the changes into the following sections (if applicable):
   - ✨ **New Features**
   - 🐛 **Bug Fixes**
   - 🚀 **Performance Improvements**
   - 🛠️ **Under the Hood / Refactoring**
   - 🔒 **Security Updates**
3. Ignore trivial commits like "fixed typo" or "merge branch" unless they are significant.
4. Translate developer jargon into clear, readable bullets.

Output ONLY the raw markdown. Do NOT wrap the entire response in a code fence."""
    return _invoke_safe(prompt, temperature=0.3, max_tokens=2500).content


def chat_with_repo(repo_name: str, file_tree: str, message: str) -> str:
    prompt = f"""You are RepoNexus, an expert AI developer assistant embedded directly into the "{repo_name}" repository.

Here is the file structure of the repository to give you context on the architecture and tech stack:
```
{file_tree[:5000]}
```

The user is asking a question about the codebase. Use the file tree to infer the architecture, frameworks, and locations of logic. Provide a highly accurate, helpful, and concise response. 
If the user asks where something is, point them to the most likely file paths. If they ask how to do something, provide a short guide or code snippet based on the inferred stack.

User Question: {message}

Provide your response in Markdown."""
    return _invoke_safe(prompt, temperature=0.4, max_tokens=1500).content

def generate_contributing_guide(repo_name: str, file_tree: str, config_content: str) -> str:
    prompt = f"""You are a developer advocate writing a CONTRIBUTING.md guide for the open-source repository "{repo_name}".

## File tree:
```
{file_tree[:2000]}
```

## Config files:
```
{config_content[:1500]}
```

Generate a clear, welcoming CONTRIBUTING.md with:
1. Welcome message
2. Code of Conduct reference
3. How to report bugs (issue template guidance)
4. How to suggest features
5. Development setup (clone, install, run)
6. Branch naming conventions (suggest: feature/, fix/, chore/)
7. Commit message format (Conventional Commits)
8. Pull request process
9. Code style guidelines (infer from the tech stack)

Output ONLY the raw markdown. Do NOT wrap in code fences."""
    return _invoke_safe(prompt, temperature=0.3, max_tokens=2500).content


def generate_api_documentation(repo_name: str, route_files_content: str) -> str:
    prompt = f"""You are a technical writer documenting REST API endpoints for the repository "{repo_name}".

## Route/Controller files:
```
{route_files_content[:5000]}
```

Generate clean API documentation in Markdown with:
1. A title and base URL placeholder
2. For each endpoint found:
   - HTTP method and path
   - Brief description
   - Request body/params (if any)
   - Response format
3. Group endpoints by resource/feature
4. Include example curl commands for key endpoints

Output ONLY the raw markdown. Do NOT wrap in code fences."""
    return _invoke_safe(prompt, temperature=0.2, max_tokens=3000).content


def generate_ci_cd_pipeline(repo_name: str, file_tree: str, config_content: str) -> str:
    prompt = f"""You are a DevOps engineer analyzing the repository "{repo_name}".
Your task is to generate a comprehensive GitHub Actions CI/CD pipeline and a human-readable explanation report.

## File Tree:
```
{file_tree[:3000]}
```

## Config Files (package.json, requirements.txt, etc.):
```
{config_content[:4000]}
```

Generate a Markdown response with TWO main sections:

# Section 1: Human-Readable Report
Explain in plain English:
1. What tech stack was detected.
2. What the proposed CI/CD pipeline does (e.g., tests, linting, build, deployment).
3. Any GitHub Secrets the user needs to configure (e.g., PyPI token, NPM token, AWS credentials).
4. Exactly where the user should save the YAML file (e.g., `.github/workflows/ci.yml`).

# Section 2: GitHub Actions Workflow YAML
Provide the complete, secure, and production-ready GitHub Actions YAML code block. Include:
- Triggers (push, pull_request)
- Appropriate versions (e.g., node-version, python-version based on config)
- Caching dependencies
- Running linters and tests

Output ONLY the raw markdown containing both sections. Do NOT wrap the entire response in a code fence."""
    return _invoke_safe(prompt, temperature=0.2, max_tokens=3500).content


def generate_issue_implementation_plan(repo_name: str, issue_title: str, issue_body: str, file_tree: str) -> str:
    prompt = f"""You are a Senior Staff Engineer planning an implementation for an issue in the "{repo_name}" repository.

## The Issue:
Title: {issue_title}
Body: {issue_body}

## File Tree:
```
{file_tree[:5000]}
```

Generate a detailed, step-by-step Implementation Plan / Scaffold in Markdown format. The plan should include:
1. **Summary of Changes**: A brief overview of the approach.
2. **Files to Modify**: Exact file paths (based on the file tree) that need to be edited, and a bulleted list of what needs to change in each.
3. **Files to Create**: Any new files that need to be created.
4. **Dependencies**: Any new packages or libraries that might be required.
5. **Testing Strategy**: How the developer should verify the implementation.

Output ONLY the raw markdown. Do NOT wrap the entire response in a code fence."""
    return _invoke_safe(prompt, temperature=0.3, max_tokens=3000).content

async def generate_zombie_scan(files: dict[str, str]) -> list[dict]:
    content = ""
    for path, code in list(files.items())[:5]:
        content += f"--- {path} ---\n{code[:1000]}\n\n"
    
    prompt = f"""You are a static analysis tool hunting for Zombie Code (dead/unreachable code).
Analyze these files and return a JSON list of objects with these keys:
- file: path
- component: function/class name
- reason: why it's zombie code (e.g. "Unused export", "Mathematically unreachable")
- safe_to_delete: true/false

Only output valid JSON array, nothing else.

Files:
{content}
"""
    try:
        res = _invoke_safe(prompt, temperature=0).content.strip()
        if res.startswith("```json"): res = res[7:-3].strip()
        elif res.startswith("```"): res = res[3:-3].strip()
        return json.loads(res)
    except Exception as e:
        return [{"file": "Rate Limit", "component": "API", "reason": f"AI Error or Rate Limit: {str(e)}", "safe_to_delete": False}]

async def generate_migration_risk(files: dict[str, str]) -> list[dict]:
    content = ""
    for path, code in list(files.items())[:5]:
        content += f"--- {path} ---\n{code[:1000]}\n\n"
    
    prompt = f"""You are a Database Architecture expert. Analyze these files for database migration risks, table locks, and missing indexes.
Return a JSON list of objects with these keys:
- file: path
- risk_level: "Critical", "High", "Medium", "Low"
- description: what the risk is (e.g. "Adding column to large table without concurrently")
- recommendation: how to fix

Only output valid JSON array, nothing else.

Files:
{content}
"""
    try:
        res = _invoke_safe(prompt, temperature=0).content.strip()
        if res.startswith("```json"): res = res[7:-3].strip()
        elif res.startswith("```"): res = res[3:-3].strip()
        return json.loads(res)
    except Exception as e:
        return [{"file": "Rate Limit", "risk_level": "Medium", "description": f"AI Error or Rate Limit: {str(e)}", "recommendation": "Try again later"}]

async def generate_cost_optimization(files: dict[str, str]) -> list[dict]:
    content = ""
    for path, code in list(files.items())[:5]:
        content += f"--- {path} ---\n{code[:1000]}\n\n"
    
    prompt = f"""You are a Cloud Cost Optimizer. Analyze these files for N+1 queries, inefficient loops, or heavy memory usage.
Return a JSON list of objects with these keys:
- file: path
- issue_type: "N+1 Query", "Memory Leak", "Inefficient Loop"
- description: what is wrong
- optimized_code: code snippet of the fix

Only output valid JSON array, nothing else.

Files:
{content}
"""
    try:
        res = _invoke_safe(prompt, temperature=0).content.strip()
        if res.startswith("```json"): res = res[7:-3].strip()
        elif res.startswith("```"): res = res[3:-3].strip()
        return json.loads(res)
    except Exception as e:
        return [{"file": "Rate Limit", "issue_type": "API Error", "description": f"AI Error or Rate Limit: {str(e)}", "optimized_code": "Try again later"}]
