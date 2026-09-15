# KisanSarthi — Development Rules

## Git

- Do NOT add any `Co-Authored-By`, attribution lines, or sign-off trailers to git commits or pull request descriptions.
- Commit messages should contain only the subject line and body written by the user.

## Project

- KisanSarthi is a BCA final year project (2025-2026).
- Phases 1-9F complete, all 133 tests passing.
- All AI responses go through the grounding layer (Phase 9E). Never modify AI grounding rules.
- Do NOT modify the recommendation engine's deterministic ranking logic.
- Do NOT modify the AI grounding rules or CHAT_SYSTEM prompt unless explicitly instructed.
- Preserve all existing test suites (133 assertions across 4 files).
- Do NOT hardcode API keys or secrets in source files.
- Do NOT push to remote unless explicitly instructed.
