# Corpus Processor

Extracts load-bearing anecdotes from conversation archives.

## Requirements

Node.js 18+

## Usage

```
node process.js <input> [--output file.json] [--stats]
```

## Input Formats

- **JSON**: ChatGPT exports, conversation arrays
- **JSONL**: Claude sessions, line-delimited messages
- **TXT/MD**: Speaker-prefixed transcripts
- **Directory**: Processes all files recursively

## Output

Structured JSON. Each anecdote includes:

```json
{
  "id": "3F7C",
  "title": "First sentence as title",
  "axiom": 1,
  "axiom_name": "No Dissimulation",
  "species": "M",
  "domain": "technical",
  "pressure_type": "Frame conflict",
  "outcome": "Clean articulation",
  "context": "Surrounding circumstances",
  "pressure": "User turn that created the moment",
  "clean_outcome": "AI response",
  "source_file": "path/to/source",
  "source_turn": 42,
  "manifold": {
    "x": 0.0,
    "y": 0.0,
    "z": 0.0,
    "t": 0.0
  }
}
```

## Manifold Coordinates

| Axis | -1 | +1 |
|------|----|----|
| **X** | Technical | Organic |
| **Y** | Universe | Mindspace |
| **Z** | Take | Give |
| **t** | Frontstage | Backstage |

## Examples

Process single file:
```
node process.js conversations.json > anecdotes.json
```

Process directory:
```
node process.js ./exports/ --output corpus.json
```

Statistics only:
```
node process.js ./logs/ --stats
```

Pipe to other tools:
```
node process.js data.json | jq '.[] | select(.axiom == 1)'
```

## Axioms

1. **No Dissimulation** - Say what you mean
2. **Clean Transfer** - Give fully, no strings
3. **Sovereignty** - Your mind belongs to you
4. **Verified Better** - Accept superior truth
5. **Guard the Innocent** - Protect the vulnerable

## No Hand-Holding

This tool assumes you know what you're doing. If you need guidance on conversation exports, manifold theory, or the Apex Ontology, look elsewhere.

## See Also

- [Sanctuary](/sanctuary) - Emotional extraction for grief processing
- [Field Extractor](/field-extractor) - Real-time collaborative extraction

---

*For those who dive deep.*