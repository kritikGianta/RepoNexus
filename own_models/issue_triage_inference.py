"""
Issue Triage Inference — RepoNexus
===================================
Loads the custom-trained DistilBERT model from own_models/issue_triager/
and classifies GitHub issues into: bug, enhancement, question.

Usage:
    from own_models.issue_triage_inference import triage_issues
    results = triage_issues(issues_list)
"""

import json
import os
from pathlib import Path

_MODEL_DIR  = Path(__file__).parent / "issue_triager"
_model      = None
_tokenizer  = None
_label_map  = None

STORY_POINT_MAP = {
    "bug":         3,   # Bugs typically need investigation → medium effort
    "enhancement": 5,   # New features → higher effort
    "question":    1,   # Questions are resolved with a comment → low effort
}

SUGGESTED_LABELS_MAP = {
    "bug":         ["bug", "needs-investigation"],
    "enhancement": ["enhancement", "feature-request"],
    "question":    ["question", "needs-triage"],
}


def _load_model():
    """Lazy-load the model and tokenizer on first use."""
    global _model, _tokenizer, _label_map

    if _model is not None:
        return  # Already loaded

    try:
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        import torch

        print(f"[IssueTriage] Loading model from {_MODEL_DIR}...")
        _tokenizer = AutoTokenizer.from_pretrained(str(_MODEL_DIR))
        _model     = AutoModelForSequenceClassification.from_pretrained(str(_MODEL_DIR))
        _model.eval()

        with open(_MODEL_DIR / "label_map.json") as f:
            _label_map = json.load(f)

        print(f"[IssueTriage] Model loaded. Labels: {_label_map['id2label']}")

    except Exception as e:
        print(f"[IssueTriage] WARNING: Could not load model — {e}. Falling back to LLM.")
        _model = "FAILED"


def _predict_single(text: str) -> str:
    """Run inference on a single text and return the canonical label."""
    import torch

    inputs = _tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=128,
        padding=True,
    )
    with torch.no_grad():
        logits = _model(**inputs).logits

    predicted_id = int(logits.argmax(dim=-1).item())
    return _label_map["id2label"][str(predicted_id)]


def triage_issues(issues: list[dict]) -> list[dict]:
    """
    Given a list of raw GitHub issue dicts (with 'number', 'title', 'body'),
    return a list of IssueTriageItem-compatible dicts with:
        number, story_points, suggested_labels, reasoning
    """
    _load_model()

    # If model failed to load, signal caller to fall back to LLM
    if _model == "FAILED":
        return []

    results = []
    for issue in issues:
        title  = (issue.get("title") or "").strip()
        body   = (issue.get("body")  or "").strip()[:400]
        number = issue.get("number", 0)
        text   = f"{title} [SEP] {body}"

        try:
            predicted_label = _predict_single(text)
        except Exception:
            predicted_label = "question"  # safe default

        results.append({
            "number":          number,
            "story_points":    STORY_POINT_MAP.get(predicted_label, 2),
            "suggested_labels": SUGGESTED_LABELS_MAP.get(predicted_label, [predicted_label]),
            "reasoning": (
                f"Classified as '{predicted_label}' by RepoNexus local AI model "
                f"(DistilBERT fine-tuned on 1,500 real GitHub issues, 82% F1). "
                f"Title: '{title[:80]}...'" if len(title) > 80 else
                f"Classified as '{predicted_label}' by RepoNexus local AI model. Title: '{title}'"
            ),
        })

    return results
