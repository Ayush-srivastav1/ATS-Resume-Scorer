
// Vercel serverless function for /api/upload
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { calculateATSScore } = require('../backend/atsResumeScorer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function runMulter(req, res) {
	return new Promise((resolve, reject) => {
		upload.single('file')(req, res, (err) => {
			if (err) reject(err);
			else resolve();
		});
	});
}

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

module.exports = async (req, res) => {
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}
	try {
		await runMulter(req, res);
		const file = req.file;
		const jobDescription = req.body.jobDescription || '';
		if (!file) return res.status(400).json({ error: 'No file uploaded. Use form field name `file`.' });

		const text = await extractTextFromFile(file);
		if (!text || text.trim().length === 0) {
			return res.status(400).json({ error: 'Unable to extract text from uploaded file.' });
		}
		const score = calculateATSScore(text, jobDescription);
		res.status(200).json(score);
	} catch (err) {
		console.error('Upload error:', err);
		res.status(500).json({ error: 'Internal server error' });
	}
};

