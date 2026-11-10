export interface Tool {
  id: string
  label: string
  shortDesc: string
  longDesc: string
}

export const tools: Tool[] = [
  {
    id: 'zombie',
    label: 'Zombie Code Exterminator',
    shortDesc: 'Statically analyzes your repo to find mathematically unreachable code.',
    longDesc:
      'Afraid to delete old code? Our static analyzer maps your execution paths to find dead functions, unused endpoints, and orphaned files. It proves why the code can be safely deleted.',
  },
  {
    id: 'migration',
    label: 'Migration Risk Analyzer',
    shortDesc: 'Predict database downtime and table locks before you run migrations.',
    longDesc:
      'Adding a column to a 10M row table without a concurrent index will lock your database. We analyze your migration schemas and SQL to warn you of downtime risks before they reach production.',
  },
  {
    id: 'cost',
    label: 'Cloud Cost Optimizer',
    shortDesc: 'Detect N+1 queries and compute-heavy loops before they spike your cloud bill.',
    longDesc:
      'Inefficient ORM queries work fine locally but cost a fortune on AWS. RepoNexus flags N+1 queries, memory leaks, and oversized data fetches, suggesting optimized SQL or batching strategies.',
  },
  {
    id: 'pr',
    label: 'PR Reviewer',
    shortDesc: 'Automated code review, bug detection, and plain-English PR summaries.',
    longDesc:
      'Code reviews usually suck up your afternoon. RepoNexus reads the diff like a senior engineer, catching logic bugs and security flaws so you can just click approve with confidence. It even writes a plain-English summary of what changed.',
  },
  {
    id: 'chat',
    label: 'Code Chat',
    shortDesc: 'Ask anything about your codebase and get accurate, grounded answers.',
    longDesc:
      'Navigating a new codebase is daunting. Instead of hunting through files, just ask RepoNexus: "Where is auth handled?" or "How do I add a new endpoint?" It indexes your code and gives you exact, grounded answers.',
  },
  {
    id: 'notes',
    label: 'Release Notes',
    shortDesc: 'Turn messy commits into professional, categorised markdown changelogs.',
    longDesc:
      'Nobody likes writing release notes. We take your last 30 days of messy, unformatted commits and turn them into a beautiful, categorized changelog perfect for your next product update.',
  },
  {
    id: 'interview',
    label: 'Interview Prep',
    shortDesc: 'AI-generated questions from your actual codebase.',
    longDesc:
      "Generic LeetCode questions don't help you pass the onsite. We scan your actual project code and generate the exact architecture and logic questions an interviewer would ask about your work.",
  },
  {
    id: 'diagrams',
    label: 'Architecture Diagrams',
    shortDesc: 'Auto-generate Mermaid.js system diagrams from your repo in seconds.',
    longDesc:
      "A picture is worth a thousand lines of code. Instantly visualize your repository's component structure and dependencies to help onboard new hires or plan your next refactor.",
  },
  {
    id: 'security',
    label: 'Security Audit',
    shortDesc: 'Detect CVEs, exposed secrets and outdated packages.',
    longDesc:
      "Don't let a leaked key ruin your weekend. We proactively scan your dependency files and codebase for known vulnerabilities and exposed secrets before they reach production.",
  },
  {
    id: 'tutor',
    label: 'Code Tutor',
    shortDesc: 'Detailed optimization lessons with Big-O analysis.',
    longDesc:
      "Writing code is one thing; writing efficient code is another. Highlight any messy function, and we'll break down its Big-O complexity and teach you how to optimize it like a pro.",
  },
  {
    id: 'setup',
    label: 'Local Setup Guide',
    shortDesc: 'Generate onboarding docs from package files — get running fast.',
    longDesc:
      '"Works on my machine" is dead. We analyze your package.json, requirements.txt, or Dockerfiles to write a foolproof, step-by-step local setup guide for the next developer joining your team.',
  },
  {
    id: 'triage',
    label: 'Issue Triage',
    shortDesc: 'Story-point estimates and prioritisation for every open GitHub issue.',
    longDesc:
      'Backlog refinement takes hours. We instantly analyze all open issues in your repo and estimate story points, flagging the ones that are actually high-priority.',
  },
  {
    id: 'standup',
    label: 'Daily Standup',
    shortDesc: 'Auto-generate your standup report from the last N days of commits.',
    longDesc:
      "Can't remember what you did yesterday? RepoNexus summarizes your commit history into a concise, professional update ready to paste into your team's Slack channel.",
  },
  {
    id: 'readme',
    label: 'README Generator',
    shortDesc: 'Generate a publication-quality README.md from your repo structure.',
    longDesc:
      'First impressions matter. We analyze your entire project structure and generate a comprehensive README complete with installation steps, usage examples, and badges.',
  },
  {
    id: 'contributing',
    label: 'Contributing Guide',
    shortDesc: 'Auto-generate CONTRIBUTING.md with setup, conventions, and PR process.',
    longDesc:
      "Make it easy for open-source contributors or new hires to jump in. We document your exact project structure and PR conventions so you don't have to answer the same questions twice.",
  },
  {
    id: 'api',
    label: 'API Documenter',
    shortDesc: 'Scan route files and produce OpenAPI-style API reference docs.',
    longDesc:
      'Keeping API docs in sync with code is impossible. We scan your router files (Express, FastAPI, etc.) and generate accurate API references automatically.',
  },
  {
    id: 'cicd',
    label: 'CI/CD Pipeline',
    shortDesc: 'Generate secure GitHub Actions workflows for testing and deployment.',
    longDesc:
      "Don't waste hours debugging YAML files. We look at your tech stack and generate the exact GitHub Actions workflows you need for linting, testing, and secure deployment.",
  },
  {
    id: 'planner',
    label: 'Issue Planner',
    shortDesc: 'Turn any open issue into a detailed step-by-step implementation plan.',
    longDesc:
      'Stuck on a complex bug? Pick an issue, and RepoNexus will break down exactly which files need to change and write a step-by-step implementation plan for you to follow.',
  },
]

export const featured = [
  { image: '/landing/pr-review.svg', tool: 'PR Reviewer', caption: 'Reads the diff like a senior engineer and writes the summary for you.' },
  { image: '/landing/chat.svg', tool: 'Code Chat', caption: 'Ask where things live and get answers that cite the exact files.' },
  { image: '/landing/architecture.svg', tool: 'Architecture Diagrams', caption: 'Mermaid system maps generated straight from your repository.' },
  { image: '/landing/security.svg', tool: 'Security Audit', caption: 'Secrets, CVEs and risky calls flagged before they reach production.' },
]

export const pillars = [
  {
    title: 'For the Maintainer',
    desc: 'Automate the heavy lifting of repo management. Features like Issue Triage, Security Audits, and Architecture Diagrams keep your project organized without the manual overhead.',
  },
  {
    title: 'For the Contributor',
    desc: 'Ship code faster and safer. Use the PR Reviewer for instant feedback, auto-generate CI/CD Pipelines, or let RepoNexus generate an Auto-Fix PR for a complex bug.',
  },
  {
    title: 'For the New Hire',
    desc: 'Skip the painful onboarding. Generate foolproof Local Setup Guides, comprehensive READMEs, and API Docs instantly so new devs can push their first commit on day one.',
  },
  {
    title: 'For the Student',
    desc: 'Learn from real-world code. The interactive Code Tutor explains Big-O complexity, while the Interview Prep tool generates mock questions based on your actual repo.',
  },
]

export const process = [
  { title: 'Connect GitHub', desc: 'Sign in with GitHub OAuth and pick a repository. Access tokens are encrypted at rest.' },
  { title: 'Analyze', desc: 'AST parsing, complexity metrics, duplication and security heuristics run on a background worker.' },
  { title: 'Understand', desc: 'Every finding gets a severity, an effort estimate and an AI explanation grounded in your code.' },
  { title: 'Fix & track', desc: 'Open a GitHub issue or an auto-fix PR in one click, then watch the debt trend fall.' },
]

export const stack = [
  { name: 'React 18', role: 'Frontend' },
  { name: 'FastAPI', role: 'Backend API' },
  { name: 'Groq · Llama 3.3', role: 'LLM engine' },
  { name: 'PostgreSQL', role: 'Database' },
  { name: 'Redis + Celery', role: 'Job queue' },
  { name: 'scikit-learn · XGBoost', role: 'Local models' },
  { name: 'MLflow', role: 'Experiment tracking' },
  { name: 'Docker', role: 'Runtime' },
]

export const faqs = [
  {
    q: 'What does it cost to run?',
    a: 'RepoNexus runs entirely on your own machine with Docker. You bring a GitHub OAuth app and a Groq API key, both of which have free tiers.',
  },
  {
    q: 'Which languages are analyzed?',
    a: 'Python, JavaScript, TypeScript (including JSX/TSX), Java and Go. Python gets the deepest analysis with full cyclomatic-complexity metrics.',
  },
  {
    q: 'Where does my code go?',
    a: 'Files are fetched from GitHub into your own instance and indexed locally. Only the snippets needed for an explanation are sent to the LLM provider.',
  },
  {
    q: 'Does anything work without an AI key?',
    a: 'Yes. Static analysis, debt scoring, trends and the local models work without one. Explanations, chat and the document generators need a Groq key.',
  },
  {
    q: 'Can it analyze every push automatically?',
    a: 'Yes. Register a webhook from the Repositories page and every push to the default branch queues a new analysis run.',
  },
]
