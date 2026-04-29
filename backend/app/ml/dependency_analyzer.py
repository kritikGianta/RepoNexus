from __future__ import annotations

import re
from collections import defaultdict

import networkx as nx

from app.ml.types import CodeFile

IMPORT_PATTERNS = [
    re.compile(r"^\s*import\s+([a-zA-Z0-9_\.]+)", re.MULTILINE),
    re.compile(r"^\s*from\s+([a-zA-Z0-9_\.]+)\s+import", re.MULTILINE),
    re.compile(r"^\s*const\s+.*?=\s*require\(['\"](.*?)['\"]\)", re.MULTILINE),
    re.compile(r"^\s*import\s+.*?from\s+['\"](.*?)['\"]", re.MULTILINE),
]


class DependencyAnalyzer:
    def build_graph(self, files: list[CodeFile]) -> nx.DiGraph:
        graph = nx.DiGraph()
        files_by_stem = {f.path.split("/")[-1].split(".")[0]: f.path for f in files}

        for file in files:
            graph.add_node(file.path)
            imports = self._extract_imports(file.content)
            for module in imports:
                candidate = module.split("/")[-1].split(".")[-1]
                target = files_by_stem.get(candidate)
                if target:
                    graph.add_edge(file.path, target)

        return graph

    def centrality(self, graph: nx.DiGraph) -> dict[str, float]:
        if graph.number_of_nodes() == 0:
            return {}
        undirected = graph.to_undirected()
        return defaultdict(float, nx.degree_centrality(undirected))

    def _extract_imports(self, content: str) -> list[str]:
        modules: list[str] = []
        for pattern in IMPORT_PATTERNS:
            modules.extend(pattern.findall(content))
        return modules
