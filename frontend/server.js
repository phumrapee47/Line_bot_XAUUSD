const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  
  // Parse URL to ignore query parameters like ?liff.state
  const urlPath = req.url.split('?')[0];
  
  // Default to the settings page
  const file = urlPath === '/' ? 'liff-enhanced-settings.html' : 
               urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
               
  if (!file) {
    res.writeHead(404);
    return res.end('Not Found');
  }
  
  // In frontend directory, serve files relative to this script
  const filePath = path.join(__dirname, file);
  
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.end(fs.readFileSync(filePath));
    } else {
      console.error(`File not found: ${filePath}`);
      res.writeHead(404);
      res.end('Not Found - File missing');
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e);
    res.writeHead(500);
    res.end('Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`Frontend LIFF server running on port ${PORT}`);
  console.log(`Serving files from: ${__dirname}`);
});
