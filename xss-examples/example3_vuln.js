//adding validiont/sanitization of input to fix vulnerability from SAST Scan
//this solution is based on the example code given in the slides
function sanitizeFunc(input){
  const sanitizedInput = input
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#x27;');

  return sanitizedInput;
}

app.get('/search', (req, res) => {
  const q = req.query.q || '';

  const cleanedInput = sanitizeFunc(q) //calling function

  res.send(`<h1>Results for ${sanitizeFunc(q)}</h1>`);
});
