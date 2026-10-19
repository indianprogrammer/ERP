const express = require('express');
const path = require('path');

const router = express.Router();

// Public API documentation (HTML + OpenAPI JSON)
router.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'docs', 'index.html')));
router.get('/openapi.json', (req, res) => res.sendFile(path.join(__dirname, '..', 'docs', 'openapi.json')));

module.exports = router;
