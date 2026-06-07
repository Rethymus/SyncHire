"""Compatibility module exposing the canonical FastAPI app.

Some tests and integrations import ``app.main`` while the executable entrypoint
is the top-level ``main.py`` module. Keep a single app instance by re-exporting
that entrypoint here.
"""

from importlib import import_module

app = import_module("main").app
