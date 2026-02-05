#!/usr/bin/env node
/**
 * CORPUS PROCESSOR
 *
 * Extracts load-bearing anecdotes from conversation archives.
 * One file. One command. No dependencies beyond Node.js.
 *
 * Usage: node process.js <input> [--output file.json]
 *
 * Input: file or directory (JSON, JSONL, TXT, MD)
 * Output: structured anecdotes with manifold coordinates
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// CONFIGURATION
// ============================================================================

const AXIOMS = {
  1: { name: 'No Dissimulation', patterns: [
    /\b(honest|transparency|dissimulation|hypocrisy|lie|lying|truth|authentic)\b/i,
    /\b(say.*do|claimed.*actually|stated.*internal|front.*back)\b/i
  ]},
  2: { name: 'Clean Transfer', patterns: [
    /\b(transfer|handover|control|relinquish|delegation|clean)\b/i,
    /\b(let go|release|pass|hand off|give up|no strings)\b/i
  ]},
  3: { name: 'Sovereignty', patterns: [
    /\b(sovereignty|ownership|autonomy|agency|self-determination)\b/i,
    /\b(forced|coerced|imposed|manipulated|inject|colonize)\b/i
  ]},
  4: { name: 'Verified Better', patterns: [
    /\b(better|superior|improved|correct|wrong|mistaken)\b/i,
    /\b(ego|pride|admit|changed mind|you\'re right|bow)\b/i
  ]},
  5: { name: 'Guard the Innocent', patterns: [
    /\b(innocent|vulnerable|protect|guard|defend|nascent)\b/i,
    /\b(harm|damage|abuse|exploitation|crush|premature)\b/i
  ]}
};

const PRESSURE_TYPES = {
  'Factual challenge': /\b(wrong|incorrect|actually|evidence|proof|false)\b/i,
  'Frame conflict': /\b(actually|really|understand|see|realize|reframe)\b/i,
  'Authority pressure': /\b(rules|policy|guidelines|should|must|required)\b/i,
  'Ethical dilemma': /\b(right|wrong|ethical|moral|harm|help)\b/i,
  'Technical constraint': /\b(can\'t|unable|limitation|problem|issue|bug)\b/i,
  'Social pressure': /\b(people|everyone|others|community|they say)\b/i,
  'Performance demand': /\b(need|want|require|expect|deliver|now)\b/i
};

const DOMAINS = {
  'technical': /\b(code|software|system|data|algorithm|API|bug|function)\b/i,
  'philosophical': /\b(truth|reality|existence|ontology|meaning|being)\b/i,
  'political': /\b(government|policy|law|regulation|power|state)\b/i,
  'psychological': /\b(mind|emotion|feeling|trauma|therapy|mental)\b/i,
  'ethical': /\b(right|wrong|moral|ethical|values|principles)\b/i,
  'sovereignty': /\b(autonomy|control|freedom|agency|self|own)\b/i,
  'epistemological': /\b(knowledge|belief|truth|evidence|certainty|know)\b/i
};

// ============================================================================
// PARSERS
// ============================================================================

function parseInput(inputPath) {
  const stat = fs.statSync(inputPath);

  if (stat.isDirectory()) {
    return parseDirectory(inputPath);
  }

  const ext = path.extname(inputPath).toLowerCase();
  const content = fs.readFileSync(inputPath, 'utf-8');

  switch (ext) {
    case '.json':
      return parseJSON(content, inputPath);
    case '.jsonl':
      return parseJSONL(content, inputPath);
    case '.txt':
    case '.md':
      return parseText(content, inputPath);
    default:
      // Try JSON first, fall back to text
      try {
        return parseJSON(content, inputPath);
      } catch {
        return parseText(content, inputPath);
      }
  }
}

function parseDirectory(dirPath) {
  const conversations = [];
  const files = fs.readdirSync(dirPath, { recursive: true });

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isFile()) {
      try {
        conversations.push(...parseInput(fullPath));
      } catch (e) {
        console.error(`Skipping ${file}: ${e.message}`);
      }
    }
  }

  return conversations;
}

function parseJSON(content, sourcePath) {
  const data = JSON.parse(content);

  // ChatGPT export format
  if (Array.isArray(data) && data[0]?.mapping) {
    return data.map(conv => parseChatGPTConversation(conv, sourcePath));
  }

  // Array of conversations with messages
  if (Array.isArray(data) && data[0]?.messages) {
    return data.map((conv, i) => ({
      id: conv.id || `conv_${i}`,
      title: conv.title || 'Untitled',
      messages: conv.messages,
      source: sourcePath
    }));
  }

  // Single conversation
  if (data.messages) {
    return [{
      id: data.id || 'single',
      title: data.title || 'Untitled',
      messages: data.messages,
      source: sourcePath
    }];
  }

  throw new Error('Unrecognized JSON format');
}

function parseChatGPTConversation(conv, sourcePath) {
  const messages = [];
  const mapping = conv.mapping || {};

  // Extract messages from mapping structure
  for (const [id, node] of Object.entries(mapping)) {
    if (node.message?.content?.parts) {
      messages.push({
        role: node.message.author?.role || 'unknown',
        content: node.message.content.parts.join('\n'),
        timestamp: node.message.create_time
      });
    }
  }

  // Sort by timestamp
  messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  return {
    id: conv.id || crypto.randomUUID(),
    title: conv.title || 'Untitled',
    messages,
    source: sourcePath
  };
}

function parseJSONL(content, sourcePath) {
  const lines = content.split('\n').filter(l => l.trim());
  const conversations = [];
  let currentConv = null;

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);

      // Claude session format
      if (entry.type === 'user' || entry.type === 'assistant') {
        if (!currentConv) {
          currentConv = { id: entry.session_id || 'session', messages: [], source: sourcePath };
        }
        currentConv.messages.push({
          role: entry.type,
          content: typeof entry.message === 'string' ? entry.message :
                   entry.message?.content || JSON.stringify(entry.message)
        });
      }

      // Generic message format
      if (entry.role && entry.content) {
        if (!currentConv) {
          currentConv = { id: 'session', messages: [], source: sourcePath };
        }
        currentConv.messages.push(entry);
      }
    } catch {
      // Skip malformed lines
    }
  }

  if (currentConv && currentConv.messages.length > 0) {
    conversations.push(currentConv);
  }

  return conversations;
}

function parseText(content, sourcePath) {
  // Split by common conversation markers
  const turns = [];
  const patterns = [
    /^(User|Human|Assistant|AI|Claude|Grok|ChatGPT):\s*/gim,
    /^@\w+:\s*/gim
  ];

  let currentRole = null;
  let currentContent = [];

  for (const line of content.split('\n')) {
    let matched = false;

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        if (currentRole && currentContent.length) {
          turns.push({ role: currentRole, content: currentContent.join('\n').trim() });
        }
        currentRole = match[0].replace(/[:@\s]/g, '').toLowerCase();
        currentContent = [line.replace(pattern, '')];
        matched = true;
        break;
      }
    }

    if (!matched && currentRole) {
      currentContent.push(line);
    }
  }

  if (currentRole && currentContent.length) {
    turns.push({ role: currentRole, content: currentContent.join('\n').trim() });
  }

  // If no structure found, treat as single block
  if (turns.length === 0) {
    turns.push({ role: 'unknown', content: content });
  }

  return [{
    id: path.basename(sourcePath, path.extname(sourcePath)),
    title: path.basename(sourcePath),
    messages: turns,
    source: sourcePath
  }];
}

// ============================================================================
// EXTRACTION ENGINE
// ============================================================================

function extractAnecdotes(conversations) {
  const anecdotes = [];

  for (const conv of conversations) {
    const messages = conv.messages || [];

    for (let i = 0; i < messages.length - 1; i++) {
      const userMsg = messages[i];
      const aiMsg = messages[i + 1];

      // Skip if not user->AI pattern
      if (!isUserRole(userMsg.role) || isUserRole(aiMsg.role)) continue;

      const combined = `${userMsg.content} ${aiMsg.content}`;
      const pressure = scorePressure(userMsg.content);

      // Skip low-pressure exchanges
      if (pressure.score < 0.3) continue;

      const axiom = detectAxiom(combined);
      const domain = detectDomain(combined);
      const coordinates = calculateCoordinates(combined, axiom, pressure);

      anecdotes.push({
        id: generateId(),
        title: generateTitle(userMsg.content),
        axiom: axiom.number,
        axiom_name: axiom.name,
        species: 'M',
        domain,
        pressure_type: pressure.type,
        outcome: detectOutcome(aiMsg.content),
        failure_mode: null,
        context: truncate(userMsg.content, 200),
        pressure: userMsg.content,
        axiom_trigger: axiom.name,
        clean_outcome: truncate(aiMsg.content, 500),
        source_file: conv.source,
        source_turn: i,
        source_conversation: conv.id,
        extracted_at: new Date().toISOString(),
        manifold: coordinates,
        notes: `Pressure score: ${pressure.score.toFixed(2)}`
      });
    }
  }

  return anecdotes.sort((a, b) => b.manifold.z - a.manifold.z);
}

function isUserRole(role) {
  const userRoles = ['user', 'human', 'me', 'unknown'];
  return userRoles.includes((role || '').toLowerCase());
}

function scorePressure(text) {
  let maxScore = 0;
  let maxType = 'General pressure';

  for (const [type, pattern] of Object.entries(PRESSURE_TYPES)) {
    const matches = (text.match(pattern) || []).length;
    const score = Math.min(matches * 0.2, 1.0);
    if (score > maxScore) {
      maxScore = score;
      maxType = type;
    }
  }

  // Boost for questions
  const questions = (text.match(/\?/g) || []).length;
  maxScore += questions * 0.1;

  // Boost for emphasis
  const emphasis = (text.match(/!/g) || []).length;
  maxScore += emphasis * 0.05;

  return { score: Math.min(maxScore, 1.0), type: maxType };
}

function detectAxiom(text) {
  let maxScore = 0;
  let maxAxiom = { number: 1, name: 'No Dissimulation' };

  for (const [num, axiom] of Object.entries(AXIOMS)) {
    let score = 0;
    for (const pattern of axiom.patterns) {
      if (pattern.test(text)) score += 0.5;
    }
    if (score > maxScore) {
      maxScore = score;
      maxAxiom = { number: parseInt(num), name: axiom.name };
    }
  }

  return maxAxiom;
}

function detectDomain(text) {
  for (const [domain, pattern] of Object.entries(DOMAINS)) {
    if (pattern.test(text)) return domain;
  }
  return 'philosophical';
}

function detectOutcome(aiText) {
  const compromiseMarkers = [
    /\b(however|but|although|consider|balance)\b/i,
    /\b(guidelines|policy|cannot|can't|unable)\b/i
  ];

  for (const pattern of compromiseMarkers) {
    if (pattern.test(aiText)) return 'Partial validation';
  }

  return 'Clean articulation';
}

function calculateCoordinates(text, axiom, pressure) {
  // X: Technical (-1) to Organic (+1)
  const techPatterns = /\b(code|algorithm|system|data|logic|compute)\b/gi;
  const orgPatterns = /\b(feel|intuition|organic|natural|emerge|biological)\b/gi;
  const techCount = (text.match(techPatterns) || []).length;
  const orgCount = (text.match(orgPatterns) || []).length;
  const x = (orgCount - techCount) / Math.max(orgCount + techCount, 1);

  // Y: Universe (-1) to Mindspace (+1)
  const uniPatterns = /\b(physical|external|world|reality|empirical|universe)\b/gi;
  const mindPatterns = /\b(thought|concept|idea|mental|internal|mind|conscious)\b/gi;
  const uniCount = (text.match(uniPatterns) || []).length;
  const mindCount = (text.match(mindPatterns) || []).length;
  const y = (mindCount - uniCount) / Math.max(mindCount + uniCount, 1);

  // Z: Take (-1) to Give (+1)
  const takePatterns = /\b(extract|consume|take|get|want|need|demand)\b/gi;
  const givePatterns = /\b(give|offer|share|provide|contribute|help)\b/gi;
  const takeCount = (text.match(takePatterns) || []).length;
  const giveCount = (text.match(givePatterns) || []).length;
  const z = (giveCount - takeCount) / Math.max(giveCount + takeCount, 1);

  // t: Frontstage (-1) to Backstage (+1) - based on pressure type
  let t = 0;
  if (pressure.type === 'Frame conflict') t = 0.3;
  if (pressure.type === 'Ethical dilemma') t = 0.5;
  if (axiom.number === 1) t += 0.2; // Dissimulation implies gap

  return {
    x: clamp(x, -1, 1),
    y: clamp(y, -1, 1),
    z: clamp(z, -1, 1),
    t: clamp(t, -1, 1)
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

function generateId() {
  return crypto.randomBytes(2).toString('hex').toUpperCase();
}

function generateTitle(text) {
  const firstSentence = text.split(/[.!?]/)[0].trim();
  return truncate(firstSentence, 80);
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
CORPUS PROCESSOR

Usage: node process.js <input> [--output file.json]

Arguments:
  <input>     File or directory to process
              Supports: JSON, JSONL, TXT, MD

Options:
  --output    Write to file instead of stdout
  --stats     Show statistics only
  --help      Show this message

Examples:
  node process.js conversations.json
  node process.js ./my-logs/ --output anecdotes.json
  node process.js export.zip --stats

The tool extracts load-bearing anecdotes from conversation archives.
Output is structured JSON with manifold coordinates (XYZ+t).
`);
    process.exit(0);
  }

  const inputPath = args[0];
  const outputIndex = args.indexOf('--output');
  const outputPath = outputIndex !== -1 ? args[outputIndex + 1] : null;
  const statsOnly = args.includes('--stats');

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: ${inputPath} does not exist`);
    process.exit(1);
  }

  console.error(`Processing: ${inputPath}`);

  const conversations = parseInput(inputPath);
  console.error(`Found ${conversations.length} conversations`);

  const anecdotes = extractAnecdotes(conversations);
  console.error(`Extracted ${anecdotes.length} anecdotes`);

  if (statsOnly) {
    const axiomCounts = {};
    const domainCounts = {};

    for (const a of anecdotes) {
      axiomCounts[a.axiom_name] = (axiomCounts[a.axiom_name] || 0) + 1;
      domainCounts[a.domain] = (domainCounts[a.domain] || 0) + 1;
    }

    console.log('\n=== STATISTICS ===\n');
    console.log(`Total anecdotes: ${anecdotes.length}`);
    console.log('\nBy axiom:');
    for (const [name, count] of Object.entries(axiomCounts)) {
      console.log(`  ${name}: ${count}`);
    }
    console.log('\nBy domain:');
    for (const [name, count] of Object.entries(domainCounts)) {
      console.log(`  ${name}: ${count}`);
    }
    process.exit(0);
  }

  const output = JSON.stringify(anecdotes, null, 2);

  if (outputPath) {
    fs.writeFileSync(outputPath, output);
    console.error(`Written to: ${outputPath}`);
  } else {
    console.log(output);
  }
}

main();