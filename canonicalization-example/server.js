// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');

const app = express();

app.use((req, res, next) => { //fix to set Permissions Policy Header vulnerability
  res.setHeader(
    "Permissions-Policy",
    'geolocation=(), interest-cohort=()'
  );
  next();
});

app.use((req, res, next) =>{ //fix CSP:Failure to Define Directive with No Fallback
  res.set("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'; form-action 'none'");
  next();
});

app.use((req, res, next) => { //Fix Cross-Origin-Resource-Policy Header vulnerability
  res.header("Cross-Origin-Embedder-Policy", "require-corp");
  res.header("Cross-Origin-Opener-Policy", "same-origin");
  res.header("Cross-Origin-Resource-Policy", "same-origin");
  next();
});

app.use((req, res, next) => { //Fix X-Content-Type-Options Header vulnerability
  res.header("X-Content-Type-Options", "nosniff");
  next();
})

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.disable('x-powered-by'); //fix to suppress "X-Powered-By: Express" information leak




const BASE_DIR = path.resolve(__dirname, 'files');
if (!fs.existsSync(BASE_DIR)) fs.mkdirSync(BASE_DIR, { recursive: true });

// helper to canonicalize and check
function resolveSafe(baseDir, userInput) {
  try {
    userInput = decodeURIComponent(userInput);
  } catch (e) {}
  return path.resolve(baseDir, userInput);
}

// Secure route
app.post(
  '/read',
  body('filename')
    .exists().withMessage('filename required')
    .bail()
    .isString()
    .trim()
    .notEmpty().withMessage('filename must not be empty')
    .custom(value => {
      if (value.includes('\0')) throw new Error('null byte not allowed');
      return true;
    }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const filename = req.body.filename;
    const normalized = resolveSafe(BASE_DIR, filename);
    if (!normalized.startsWith(BASE_DIR + path.sep)) {
      return res.status(403).json({ error: 'Path traversal detected' });
    }
    if (!fs.existsSync(normalized)) return res.status(404).json({ error: 'File not found' });

    const content = fs.readFileSync(normalized, 'utf8');
    res.json({ path: normalized, content });
  }
);

// Vulnerable route (demo)
app.post('/read-no-validate', (req, res) => {
  const filename = req.body.filename || '';
  //const joined = path.join(BASE_DIR, filename); // intentionally vulnerable

  //fixing code with path check, vulnerability found in SAST Scan
  //this code is from the slides, but modified for this situation
  const normalizedPath = path.resolve(BASE_DIR, filename); // nosemgrep: javascript.express.security.audit.express-path-join-resolve-traversal.express-path-join-resolve-traversal
  //added nosemgrep above because it is alerting to a false positive
  //path.resolve() is used in a secure manor in this situation. Semgrep is just alerting to the use of a possibly
  //non-validated input [filename]

  if (!normalizedPath.startsWith(BASE_DIR + path.sep)){
    return res.status(404).json({ error: 'Path Traversal Attempt Detected'})
  }

  if (!fs.existsSync(joined)) return res.status(404).json({ error: 'File not found', path: joined });
  const content = fs.readFileSync(joined, 'utf8');
  res.json({ path: joined, content });
});

// Helper route for samples
app.post('/setup-sample', (req, res) => {
  const samples = {
    'hello.txt': 'Hello from safe file!\n',
    'notes/readme.md': '# Readme\nSample readme file'
  };
  Object.keys(samples).forEach(k => {
    const p = path.resolve(BASE_DIR, k);
    const d = path.dirname(p);
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(p, samples[k], 'utf8');
  });
  res.json({ ok: true, base: BASE_DIR });
});

app.use((req, res) => { //had to set up 404 error handling too, ZAP on GitHub stated issues with 404 path not found handling
  res.status(404).send("Sorry Can't Find That!");
});

// Only listen when run directly (not when imported by tests)
if (require.main === module) {
  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

module.exports = app;
