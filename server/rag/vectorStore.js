// In-memory vector store using TF-IDF cosine similarity
// No external API or database needed — perfect for a student project

const documents = []; // { id, docId, docName, text, tfidf }

// Build a TF-IDF vector from text
function buildTFIDF(text, globalIDF) {
  const tokens = tokenize(text);
  const tf = computeTF(tokens);

  const vector = {};
  for (const [term, tfVal] of Object.entries(tf)) {
    const idf = globalIDF[term] || Math.log(1 + 1);
    vector[term] = tfVal * idf;
  }
  return vector;
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t));
}

function computeTF(tokens) {
  const freq = {};
  tokens.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
  const total = tokens.length || 1;
  const tf = {};
  for (const [term, count] of Object.entries(freq)) {
    tf[term] = count / total;
  }
  return tf;
}

function cosineSimilarity(vecA, vecB) {
  const keys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  let dot = 0, normA = 0, normB = 0;

  for (const key of keys) {
    const a = vecA[key] || 0;
    const b = vecB[key] || 0;
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Recompute IDF across all stored chunks
function computeGlobalIDF() {
  const N = documents.length || 1;
  const df = {};

  documents.forEach(doc => {
    const terms = new Set(tokenize(doc.text));
    terms.forEach(t => { df[t] = (df[t] || 0) + 1; });
  });

  const idf = {};
  for (const [term, count] of Object.entries(df)) {
    idf[term] = Math.log((N + 1) / (count + 1)) + 1;
  }
  return idf;
}

// Rebuild all TF-IDF vectors when documents change
function rebuildVectors() {
  const idf = computeGlobalIDF();
  documents.forEach(doc => {
    doc.tfidf = buildTFIDF(doc.text, idf);
  });
  return idf;
}

let globalIDF = {};

function addChunks(docId, docName, chunks) {
  // Remove old chunks for this doc if re-uploading
  removeDocument(docId);

  chunks.forEach((text, idx) => {
    documents.push({
      id: `${docId}-chunk-${idx}`,
      docId,
      docName,
      text,
      tfidf: {},
    });
  });

  globalIDF = rebuildVectors();
}

function removeDocument(docId) {
  const before = documents.length;
  const indices = [];
  for (let i = documents.length - 1; i >= 0; i--) {
    if (documents[i].docId === docId) indices.push(i);
  }
  indices.forEach(i => documents.splice(i, 1));

  if (documents.length !== before) {
    globalIDF = rebuildVectors();
  }
}

function search(query, topK = 5) {
  if (documents.length === 0) return [];

  const queryVec = buildTFIDF(query, globalIDF);

  const scored = documents.map(doc => ({
    ...doc,
    score: cosineSimilarity(queryVec, doc.tfidf),
  }));

  return scored
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ id, docId, docName, text, score }) => ({ id, docId, docName, text, score }));
}

function getDocumentList() {
  const seen = new Set();
  const list = [];
  documents.forEach(d => {
    if (!seen.has(d.docId)) {
      seen.add(d.docId);
      list.push({ id: d.docId, name: d.docName, chunks: documents.filter(c => c.docId === d.docId).length });
    }
  });
  return list;
}

function getTotalChunks() {
  return documents.length;
}

const STOPWORDS = new Set([
  'the','is','are','was','were','be','been','being','have','has','had','do','does','did',
  'will','would','could','should','may','might','shall','can','need','dare','ought','used',
  'a','an','and','or','but','in','on','at','to','for','of','with','by','from','up','about',
  'into','through','during','before','after','above','below','between','each','this','that',
  'these','those','than','then','so','yet','both','neither','nor','not','just','also',
  'its','our','your','their','my','his','her','we','you','they','it','he','she','who','what',
  'which','when','where','why','how','all','some','any','few','more','most','other','such',
  'no','only','own','same','too','very','here','there','as','if','while','although',
]);

module.exports = { addChunks, removeDocument, search, getDocumentList, getTotalChunks };
