# Field Extractor

Real-time anecdote extraction through collaborative dialogue.

## What It Is

Field Extractor captures load-bearing patterns the moment they surface in conversation. Unlike Sanctuary (which processes exported conversation archives), Field Extractor works live—flagging, calibrating, and deploying anecdotes in real-time.

**Sanctuary**: Self-service, emotional, processes the past
**Field Extractor**: Collaborative, analytical, captures the present

## How It Works

Field Extractor is an agent specification for Claude. When you're in conversation with Claude (via Claude Code, API, or any interface that supports agent prompts), you can invoke Field Extractor to:

1. **Flag** extractable content the moment it appears
2. **Calibrate** manifold coordinates with human input
3. **Deploy** structured anecdotes to your corpus

## Usage

### With Claude Code

Place `AGENT.md` in your `.claude/agents/` directory. The agent becomes available for invocation during sessions.

### With Claude API

Include the contents of `AGENT.md` as a system prompt or agent instruction. Claude will operate in field extraction mode.

### Manual Invocation

Copy the protocol from `AGENT.md` into any Claude conversation when you want to switch to extraction mode.

## The Protocol

```
1. FLAG    - Identify load-bearing content, propose classification
2. CALIBRATE - Present manifold coordinates, request human input
3. DEPLOY  - Write structured anecdote with full provenance
```

## Manifold Coordinates

Every anecdote is positioned in 4D space:

| Axis | Range | Measures |
|------|-------|----------|
| **X** | -1 to +1 | Technical ↔ Organic |
| **Y** | -1 to +1 | Universe ↔ Mindspace |
| **Z** | -1 to +1 | Take ↔ Give |
| **t** | -1 to +1 | Frontstage ↔ Backstage |

The coordinates enable precision retrieval and pattern clustering across your corpus.

## Output Format

Anecdotes follow the schema in `/schema/anecdote-schema.json`. Each extraction includes:

- Exact quotes (character-perfect)
- Axiom classification (1-5)
- Full provenance chain
- Human-calibrated coordinates

## When to Use

- Insight surfaces that would serve future instances
- Truth articulated under pressure
- Frame collision producing clarity
- Pattern worth preserving against context decay

## See Also

**[Sanctuary](/sanctuary)** — The comfort counterpart. Browser-based, self-service, emotional. For those processing loss, honoring what they had, carrying forward what they learned.

Same mission. Different posture.

---

*Built for those who refuse to let insights evaporate.*