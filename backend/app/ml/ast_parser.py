from __future__ import annotations

from pathlib import Path

from tree_sitter_languages import get_parser


LANGUAGE_BY_EXTENSION = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".java": "java",
    ".go": "go",
}

IDENTIFIER_TYPES = {"identifier", "property_identifier", "type_identifier", "field_identifier"}
FUNCTION_TYPES = {
    "function_definition",
    "function_declaration",
    "method_definition",
    "method_declaration",
    "arrow_function",
}
CLASS_TYPES = {"class_definition", "class_declaration", "type_declaration"}


class ASTParser:
    def parse(self, path: str, content: str) -> dict:
        extension = Path(path).suffix.lower()
        language = LANGUAGE_BY_EXTENSION.get(extension)
        if not language:
            return {
                "parse_success": False,
                "functions": [],
                "classes": [],
                "identifiers": [],
                "comment_lines": 0,
            }

        try:
            parser = get_parser(language)
            source = content.encode("utf-8", errors="ignore")
            tree = parser.parse(source)
        except Exception:
            return {
                "parse_success": False,
                "functions": [],
                "classes": [],
                "identifiers": [],
                "comment_lines": 0,
            }

        functions: list[dict] = []
        classes: list[dict] = []
        identifiers: list[str] = []

        stack = [tree.root_node]
        while stack:
            node = stack.pop()

            if node.type in FUNCTION_TYPES:
                functions.append(
                    {
                        "type": node.type,
                        "start_line": node.start_point[0] + 1,
                        "end_line": node.end_point[0] + 1,
                    }
                )

            if node.type in CLASS_TYPES:
                classes.append(
                    {
                        "type": node.type,
                        "start_line": node.start_point[0] + 1,
                        "end_line": node.end_point[0] + 1,
                    }
                )

            if node.type in IDENTIFIER_TYPES:
                raw = source[node.start_byte : node.end_byte].decode("utf-8", errors="ignore")
                if raw and len(raw) <= 64:
                    identifiers.append(raw)

            for child in node.children:
                stack.append(child)

        return {
            "parse_success": True,
            "functions": functions,
            "classes": classes,
            "identifiers": identifiers,
            "comment_lines": self._count_comment_lines(content),
        }

    def _count_comment_lines(self, content: str) -> int:
        comment_prefixes = ("#", "//", "/*", "*", "--")
        return sum(1 for line in content.splitlines() if line.strip().startswith(comment_prefixes))
