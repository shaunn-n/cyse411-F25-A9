const escapeHtml = s => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#x27;');

app.get('/search', (req, res) => {
  const safeInput = escapeHtml(req.query.q || ''); //modified to not use q as the new variable name, causes false positive
  res.send(`<h1>Results for ${safeInput}</h1>`); 
});
