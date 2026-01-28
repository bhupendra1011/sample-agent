# Claude Code Learning Journal

## Project Context
- **Project name:** My Agora App
- **Tech stack:** React 19, TypeScript 5.8, Vite 6.3, Agora SDKs (RTC/RTM), Zustand, TailwindCSS 4, React Router 7
- **Started:** January 28, 2026

---

## Setup & Configuration

### CLAUDE.md Setup
- [x] Created CLAUDE.md file
- [x] Added project-specific context
- [x] Documented coding conventions
- [x] Added Claude Code Customizations section with auto-documentation rule

### MCP Servers/Plugins Added
- [x] **frontend-design** (claude-plugins-official) - Jan 28, 2026
- [x] **feature-dev** (claude-plugins-official) - Jan 28, 2026

### Configuration Tweaks
- [ ] (None yet)

---

## Prompting Patterns That Worked

*(To be filled as I discover effective prompts)*

| Prompt Pattern | Why It Worked |
|----------------|---------------|
| "Analyze this codebase and give me a summary of: [specific list]" | Structured asks get structured responses |
| | |

---

## Prompting Patterns That Didn't Work

*(To be filled as I learn what to avoid)*

| Prompt Pattern | Why It Failed |
|----------------|---------------|
| | |

---

## Workflows Discovered

*(Efficient ways to work with Claude Code)*

1. **Codebase Analysis First** - Start sessions by asking Claude to analyze the codebase structure before making changes
2. **Plugin Installation Flow** - Add marketplace → Install plugin → Restart Claude Code → Update CLAUDE.md → Update journey doc

---

## Useful Commands & Shortcuts

| Command | Description |
|---------|-------------|
| `/help` | Get help with Claude Code |
| `/plugin marketplace add [source]` | Add a plugin marketplace |
| `/plugin install [name]@[marketplace]` | Install a plugin from marketplace |
| `/plugin list` | View installed plugins |
| `/plugin remove [name]` | Remove a plugin |

---

## Tips & Tricks

1. **Restart after plugin install** - Claude Code needs restart to load new plugins
2. **frontend-design auto-activates** - No need to invoke manually, it detects UI work automatically

---

## Mistakes I Made (So You Don't Have To)

*(To be filled)*

---

## Plugins & Customizations Log

### Plugin: frontend-design

| Field | Details |
|-------|---------|
| **Source** | [claude-plugins-official](https://github.com/anthropics/claude-plugins-official) |
| **Installed** | January 28, 2026 |
| **Type** | Skill (auto-invoked) |
| **Purpose** | Improves UI/frontend design quality |

**What This Plugin Does:**
- Auto-activates when Claude detects frontend/UI work
- Pushes toward distinctive design choices instead of generic "AI slop"
- Improves typography, color palettes, animations, spatial composition
- No manual invocation needed - context-aware activation

**Things to Test:**
- [ ] Create a new UI component and compare design quality
- [ ] Use Shift+Tab (plan mode) before UI tasks for better results
- [ ] Check if TailwindCSS suggestions become more creative

**Observations:**
_(To be filled after testing)_

---

### Plugin: feature-dev

| Field | Details |
|-------|---------|
| **Source** | [claude-plugins-official](https://github.com/anthropics/claude-plugins-official) |
| **Installed** | January 28, 2026 |
| **Type** | Skill (invoked via `/feature-dev:feature-dev`) |
| **Purpose** | Guided feature development with codebase understanding |

**What This Plugin Does:**
- Provides structured workflow for building features
- Analyzes codebase before implementation
- Focuses on architecture and code quality
- Invoke with `/feature-dev:feature-dev` command

**Things to Test:**
- [ ] Use `/feature-dev:feature-dev` to build a new feature
- [ ] Compare workflow vs. direct prompting
- [ ] Check if it follows project conventions from CLAUDE.md

**Observations:**
_(To be filled after testing)_

---

## Session Logs

### Session 1 - January 28, 2026
**Goal:** Initial setup and codebase analysis

**What I did:**
- Ran Claude Code on the My Agora App project
- Asked for comprehensive codebase analysis

**Prompts used:**
```
Analyze this codebase and give me a summary of:
- Tech stack and dependencies
- Folder structure and architecture
- Key patterns used (state management, styling, testing)
- Coding conventions you observe
```

**What I learned:**
- Claude Code can quickly analyze an entire codebase and identify patterns
- Asking for specific categories (tech stack, patterns, conventions) gives structured, useful output
- The Explore agent is used automatically for codebase-wide analysis tasks
- Results include file path references which is helpful for navigation

**Observations:**
- Analysis was thorough - identified Zustand store patterns, custom hooks, Tailwind theming approach
- Claude recognized the feature-based architecture and separation of concerns
- TypeScript configuration details were included (strict mode, ESLint setup)

**Next steps:**
- Set up CLAUDE.md with project context
- Try some code generation/modification tasks
- Document what prompting styles work best

---

### Session 2 - January 28, 2026
**Goal:** Install plugins and set up documentation workflow

**What I did:**
- Added Anthropic's official plugin marketplace (claude-plugins-official)
- Installed two plugins: **frontend-design** and **feature-dev**
- Updated CLAUDE.md with Customizations section
- Updated journey doc with plugin details

**Commands used:**
```bash
# Add marketplace
/plugin marketplace add anthropics/claude-plugins-official

# Install plugins
/plugin install frontend-design@claude-plugins-official
/plugin install feature-dev@claude-plugins-official
```

**What I learned:**
- Plugins are installed via `/plugin` slash commands
- Marketplace name is `claude-plugins-official` (not `claude-code`)
- Two plugin types:
  - **frontend-design**: Auto-invoked (detects UI work automatically)
  - **feature-dev**: Manual invocation via `/feature-dev:feature-dev` command
- Need to restart Claude Code after plugin installation
- Good practice: Document every customization in both CLAUDE.md and journey doc

**Observations:**
- Plugin installation is straightforward via UI or commands
- Plugins panel shows installed plugins with toggle to enable/disable
- Adding documentation rules to CLAUDE.md helps maintain consistency

**Next steps:**
- Test frontend-design plugin by creating a UI component
- Test feature-dev plugin with `/feature-dev:feature-dev` command
- Compare output quality and document observations

**Resources:**
- Official plugins repo: https://github.com/anthropics/claude-plugins-official

---

### Session 3 - [Date]
**Goal:**
**What I learned:**
-

---