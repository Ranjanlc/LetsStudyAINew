// Per-user in-memory TF-IDF vectors (chunks rebuilt from DB + disk on demand)

const userChunkArrays = new Map(); // userId -> Array<{ id, docId, docName, text, tfidf }>

function getUserChunks(userId) {
  if (!userChunkArrays.has(userId)) {
    userChunkArrays.set(userId, []);
  }
  return userChunkArrays.get(userId);
}

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
  let dot = 0;
  let normA = 0;
  let normB = 0;

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

function computeGlobalIDF(documents) {
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

function rebuildVectorsForUser(userId) {
  const documents = getUserChunks(userId);
  const idf = computeGlobalIDF(documents);
  documents.forEach(doc => {
    doc.tfidf = buildTFIDF(doc.text, idf);
  });
  return idf;
}

function addChunks(userId, docId, docName, chunks) {
  removeDocument(userId, docId);
  const arr = getUserChunks(userId);
  chunks.forEach((text, idx) => {
    arr.push({
      id: `${docId}-chunk-${idx}`,
      docId,
      docName,
      text,
      tfidf: {},
    });
  });
  rebuildVectorsForUser(userId);
}

function removeDocument(userId, docId) {
  const arr = getUserChunks(userId);
  const before = arr.length;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].docId === docId) arr.splice(i, 1);
  }
  if (arr.length !== before) {
    rebuildVectorsForUser(userId);
  }
}

function search(userId, query, topK = 5, documentId = null) {
  const userDocuments = getUserChunks(userId);
  const documents = documentId
    ? userDocuments.filter(d => d.docId === documentId)
    : userDocuments;
  if (documents.length === 0) return [];

  const idf = computeGlobalIDF(documents);
  const queryVec = buildTFIDF(query, idf);

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

function getDocumentList(userId) {
  const documents = getUserChunks(userId);
  const seen = new Set();
  const list = [];
  documents.forEach(d => {
    if (!seen.has(d.docId)) {
      seen.add(d.docId);
      list.push({
        id: d.docId,
        name: d.docName,
        chunks: documents.filter(c => c.docId === d.docId).length,
      });
    }
  });
  return list;
}

function getTotalChunks(userId, documentId = null) {
  if (!documentId) return getUserChunks(userId).length;
  return getUserChunks(userId).filter(d => d.docId === documentId).length;
}

function getDocumentChunks(userId, docId) {
  return getUserChunks(userId)
    .filter(d => d.docId === docId)
    .map(({ id, docId: dId, docName, text }) => ({ id, docId: dId, docName, text }));
}

const STOPWORDS = new Set([
  'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought', 'used',
  'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about',
  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'each', 'this', 'that',
  'these', 'those', 'than', 'then', 'so', 'yet', 'both', 'neither', 'nor', 'not', 'just', 'also',
  'its', 'our', 'your', 'their', 'my', 'his', 'her', 'we', 'you', 'they', 'it', 'he', 'she', 'who', 'what',
  'which', 'when', 'where', 'why', 'how', 'all', 'some', 'any', 'few', 'more', 'most', 'other', 'such',
  'no', 'only', 'own', 'same', 'too', 'very', 'here', 'there', 'as', 'if', 'while', 'although',
]);

module.exports = {
  addChunks,
  removeDocument,
  search,
  getDocumentList,
  getTotalChunks,
  getDocumentChunks,
};
