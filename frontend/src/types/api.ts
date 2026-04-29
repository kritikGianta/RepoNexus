/* ── API types matching backend Pydantic schemas exactly ── */

export interface User {
  id: number
  github_user_id: number
  username: string
  email: string | null
  avatar_url: string | null
  plan_tier: 'free' | 'team' | 'enterprise'
  created_at: string
}

export interface Repository {
  id: number
  github_repo_id: number
  full_name: string
  default_branch: string
  primary_language: string | null
  last_analyzed_at: string | null
  current_overall_debt_score: number | null
  rag_embedded_at: string | null
}

export interface RepoListResponse {
  repositories: Repository[]
}

export interface RepoConnectRequest {
  full_name: string
}

export interface WebhookRegisterResponse {
  success: boolean
  webhook_id: number | null
}

export type AnalysisRunStatus = 'queued' | 'running' | 'completed' | 'failed'
export type TriggerType = 'manual' | 'webhook' | 'scheduled'

export interface AnalysisRun {
  id: number
  repo_id: number
  commit_sha: string | null
  status: AnalysisRunStatus
  trigger_type: TriggerType
  total_files_analyzed: number
  total_debt_items_found: number
  overall_debt_score: number | null
  category_breakdown: Record<string, number> | null
  started_at: string | null
  ended_at: string | null
  mlflow_run_id: string | null
  error_message: string | null
}

export interface PageMeta {
  total: number
  page: number
  page_size: number
}

export interface AnalysisRunListResponse {
  items: AnalysisRun[]
  page: PageMeta
}

export interface TriggerAnalysisResponse {
  run_id: number
  status: AnalysisRunStatus
}

export type DebtCategory =
  | 'high_complexity'
  | 'code_duplication'
  | 'dead_code'
  | 'poor_naming'
  | 'missing_tests'
  | 'security_smells'
  | 'performance_antipatterns'
  | 'outdated_dependencies'
  | 'tight_coupling'
  | 'missing_documentation'

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical'

export interface DebtItem {
  id: number
  analysis_run_id: number
  repo_id: number
  file_path: string
  start_line: number
  end_line: number
  debt_category: DebtCategory
  severity_level: SeverityLevel
  debt_score: number
  estimated_effort_hours: number
  title: string
  description: string
  ai_explanation: string
  ai_fix_suggestion: string
  offending_code_snippet: string
  is_fixed: boolean
  github_issue_url: string | null
  fix_pr_url: string | null
  created_at: string
}

export interface DebtItemListResponse {
  items: DebtItem[]
  page: PageMeta
}

export interface TrendPoint {
  analysis_run_id: number
  timestamp: string
  overall_score: number
  complexity_score: number
  duplication_score: number
  security_score: number
  test_coverage_score: number
  total_estimated_debt_hours: number
}

export interface TrendSeriesResponse {
  period: string
  points: TrendPoint[]
}

export interface GitHubLoginResponse {
  authorize_url: string
  state: string
}

export interface AuthTokenResponse {
  access_token: string
  token_type: string
}

// ── New Feature Types ────────────────────────────────────────────────

export interface CreateIssueResponse {
  issue_number: number
  html_url: string
}

export interface FixPRResponse {
  pr_number: number
  html_url: string
}

export interface ReadmeResponse {
  markdown: string
}

export interface ReadmePushResponse {
  pr_number: number
  html_url: string
}

export interface PullRequest {
  number: number
  title: string
  html_url: string
  user: string
  user_avatar: string
  created_at: string
  head_branch: string
  base_branch: string
  additions: number
  deletions: number
  changed_files: number
}

export interface PRListResponse {
  pull_requests: PullRequest[]
}

export interface PRReviewResponse {
  review_markdown: string
  posted_to_github: boolean
  pr_html_url: string
}

export interface StandupResponse {
  markdown: string
}

export interface InterviewQuestion {
  level: string
  question: string
}

export interface InterviewGenerateResponse {
  questions: InterviewQuestion[]
  code_snippet: string
  file_path: string
}

export interface InterviewEvaluateResponse {
  feedback: string
  score: number
}

export interface DocsGenerateResponse {
  pr_number: number
  html_url: string
  diff: string
}

export interface RepoTreeResponse {
  files: string[]
}

export interface TutorLessonResponse {
  markdown_lesson: string
}

export interface EmbedResponse {
  status: string
  chunks: number
}

export interface ChatResponse {
  answer: string
  sources: string[]
}

export interface ZombieIssue {
  file: string
  component: string
  reason: string
  safe_to_delete: boolean
}

export interface ZombieScanResponse {
  issues: ZombieIssue[]
}

export interface MigrationRisk {
  file: string
  risk_level: string
  description: string
  recommendation: string
}

export interface MigrationRiskResponse {
  risks: MigrationRisk[]
}

export interface CostIssue {
  file: string
  issue_type: string
  description: string
  optimized_code: string
}

export interface CostOptimizationResponse {
  issues: CostIssue[]
}
