const fs = require('fs');
const path = require('path');

// Split text into overlapping chunks for better RAG recall
function chunkText(text, chunkSize = 500, overlap = 100) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 50) {
      chunks.push(chunk.trim());
    }
    if (i + chunkSize >= words.length) break;
  }

  return chunks;
}

// Clean up raw extracted text
function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\t/g, ' ')
    .replace(/ {3,}/g, ' ')
    .trim();
}

async function parsePDF(filePath) {
  const pdfParse = require('pdf-parse');
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return cleanText(data.text);
}

async function parseDOCX(filePath) {
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ path: filePath });
  return cleanText(result.value);
}

function parseTXT(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');
  return cleanText(text);
}

async function parseDocument(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  let text = '';
  switch (ext) {
    case '.pdf':
      text = await parsePDF(filePath);
      break;
    case '.docx':
    case '.doc':
      text = await parseDOCX(filePath);
      break;
    case '.txt':
    case '.md':
      text = parseTXT(filePath);
      break;
    default:
      throw new Error(`Unsupported file type: ${ext}. Please upload PDF, DOCX, or TXT files.`);
  }

  if (!text || text.length < 10) {
    throw new Error('Could not extract text from this file. Make sure the file is not empty or image-only.');
  }

  const chunks = chunkText(text);
  return { fullText: text, chunks, wordCount: text.split(/\s+/).length };
}

module.exports = { parseDocument };
