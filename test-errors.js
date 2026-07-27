const http = require('http');

http.get('http://localhost:3000/api/services/offers', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
  });
}).on('error', err => {
  console.log('Error:', err.message);
});

http.get('http://localhost:3000/api/users', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Users Status:', res.statusCode);
    console.log('Users Body:', data);
  });
});
