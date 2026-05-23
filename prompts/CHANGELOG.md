# Prompt Template Changelog

All notable changes to SyncHire AI prompt templates will be documented in this file.

## [1.0.0] - 2026-05-21

### Added
- **JD Analysis Prompt** (`jd_analysis.md`)
  - Initial version for extracting structured requirements from job descriptions
  - Bilingual support (Chinese/English)
  - JSON output format with 8 main categories

- **Resume Restructuring Prompt** (`resume_restructure.md`)
  - Initial version for optimizing resumes for JD alignment
  - STAR method framework
  - Zero fabrication policy
  - Gap handling strategies

- **Experience Retrieval RAG Prompt** (`experience_rag.md`)
  - Initial version for ranking user experiences against JD
  - Multi-factor relevance scoring (0-100)
  - Gap analysis with bridging recommendations

- **Interview Question Generator** (`interview_questions.md`)
  - Initial version for generating tailored interview questions
  - Three categories: HR, Technical, Reverse
  - Chinese job market context

- **Self-Introduction Generator** (`self_intro.md`)
  - Initial version for creating interview self-introductions
  - Two versions: 1-minute and 3-minute
  - Natural spoken Chinese focus

### Documentation
- Added comprehensive README.md
- Added CHANGELOG.md for version tracking

## Version Format

We use semantic versioning for prompts: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes to output format or core behavior
- **MINOR**: New features, enhancements, non-breaking format changes
- **PATCH**: Bug fixes, minor improvements, documentation updates

---

## Future Changes (Template)

### [1.1.0] - YYYY-MM-DD
### Changed
- **JD Analysis**: Added remote work detection
- **Resume Restructuring**: Improved gap handling for career changers

### Fixed
- **Interview Questions**: Fixed edge case with empty resume

### [1.0.1] - YYYY-MM-DD
### Fixed
- **JD Analysis**: Handle empty salary ranges correctly
