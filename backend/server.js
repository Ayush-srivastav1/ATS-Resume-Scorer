// backend/server.js

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { calculateATSScore } = require('./atsResumeScorer');

const app = express();
app.use(cors());
app.use(bodyParser.json({limit: '5mb'}));

app.use(express.static(path.join(__dirname, '..', 'frontend')));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function extractTextFromFile(file) {
	const mimetype = file.mimetype || '';
	const originalname = file.originalname || '';
	const lower = originalname.toLowerCase();
	try {
		if (mimetype === 'application/pdf' || lower.endsWith('.pdf')) {
			const data = await pdfParse(file.buffer);
			return data.text || '';
		} else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || lower.endsWith('.docx')) {
			const result = await mammoth.extractRawText({ buffer: file.buffer });
			return result.value || '';
		} else if (mimetype === 'text/plain' || lower.endsWith('.txt')) {
			return file.buffer.toString('utf8');
		} else {
			return file.buffer.toString('utf8') || '';
		}
	} catch (err) {
		console.error('Error extracting file text:', err);
		return '';
	}
}

app.post('/upload', upload.single('file'), async (req, res) => {
	try {
		const file = req.file;
		const jobDescription = req.body.jobDescription || '';
		if (!file) return res.status(400).json({ error: 'No file uploaded. Use form field name `file`.' });

		const text = await extractTextFromFile(file);
		if (!text || text.trim().length === 0) {
			return res.status(400).json({ error: 'Unable to extract text from uploaded file.' });
		}

		const result = calculateATSScore(text, jobDescription);
		result.preview = text.slice(0, 800);
		res.json(result);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Server error during file processing.' });
	}
});

app.post('/score', (req, res) => {
	const { resume, jobDescription } = req.body || {};
	if (!resume || !jobDescription) return res.status(400).json({ error: 'Both resume and jobDescription required.' });
	const result = calculateATSScore(resume, jobDescription);
	res.json(result);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`✅ Server running at http://localhost:${PORT}`);
});
