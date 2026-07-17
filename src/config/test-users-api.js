const http = require('http');

const testApi = async () => {
  // Register a new test user to get a token
  const registerData = JSON.stringify({
    username: 'api_test_user_' + Math.floor(Math.random() * 10000),
    password: 'password123'
  });

  const reqOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(registerData)
    }
  };

  const postReq = http.request(reqOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('Register Status:', res.statusCode);
      try {
        const result = JSON.parse(data);
        console.log('Register Response:', result);

        if (result.success && result.data && result.data.token) {
          const token = result.data.token;
          
          // Now test GET /api/users
          const getOptions = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/users',
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          };

          const getReq = http.request(getOptions, (res2) => {
            let data2 = '';
            res2.on('data', (chunk) => data2 += chunk);
            res2.on('end', () => {
              console.log('GET Users Status:', res2.statusCode);
              try {
                const result2 = JSON.parse(data2);
                console.log('GET Users Response:', result2);
              } catch (e) {
                console.log('Error parsing GET Users response:', e, data2);
              }
            });
          });

          getReq.on('error', (e) => console.error('GET Users Request Error:', e));
          getReq.end();
        }
      } catch (e) {
        console.log('Error parsing Register response:', e, data);
      }
    });
  });

  postReq.on('error', (e) => console.error('Register Request Error:', e));
  postReq.write(registerData);
  postReq.end();
};

testApi();
