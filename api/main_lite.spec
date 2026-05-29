# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for packaging main_lite.py as a standalone executable.

Usage:
    pyinstaller main_lite.spec

The output will be in api/dist/main_lite/
"""

import os
import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# Collect data files for included packages
datas = [
    ('app/templates', 'app/templates'),
    ('app/static', 'app/static'),
    ('alembic', 'alembic'),
    ('alembic.ini', '.'),
]

# Collect hidden imports for SQLAlchemy, FastAPI, and other packages
hiddenimports = [
    # FastAPI and dependencies
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',

    # SQLAlchemy
    'sqlalchemy',
    'sqlalchemy.dialects.sqlite',
    'sqlalchemy.dialects.postgresql',
    'sqlalchemy.ext.asyncio',
    'sqlalchemy.orm',
    'sqlalchemy.sql',

    # Pydantic
    'pydantic',
    'pydantic.deprecated',
    'pydantic.deprecated.decorator',

    # Other dependencies
    'jose',
    'passlib',
    'pyotp',
    'qrcode',
    'httpx',
    'magic',
    'pdfplumber',
    'docx',
    'PIL',
    'jinja2',
    'aiosmtplib',
    'redis',
    'aiobotocore',
]

# Analysis
a = Analysis(
    ['main_lite.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Exclude test modules
        'pytest',
        'pytest_asyncio',
        'pytest_cov',
        'pytest_xdist',
        'pytest_benchmark',
        'pytest_timeout',
        'faker',
        'factory',
        'freezegun',
        'testcontainers',
        'bandit',
        'safety',
        'mypy',
        'ruff',
        'black',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# PYZ
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# EXE
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='main_lite',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

# COLLECT
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='main_lite',
)
