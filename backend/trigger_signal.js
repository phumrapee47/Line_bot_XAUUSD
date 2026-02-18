const http = require('http');

// Force a high technical score to trigger BUY signal
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/check-signal',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n✅ Signal Check Response:');
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

console.log('📤 Triggering manual trading signal check...');
req.write(JSON.stringify({}));
req.end();
