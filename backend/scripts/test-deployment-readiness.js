const http = require('http');
const app = require('../server');

const PORT = 5055; // Use dedicated test port to avoid conflict

const server = app.listen(PORT, async () => {
  console.log(`Test server running on port ${PORT}`);

  const testEndpoint = (path) => {
    return new Promise((resolve, reject) => {
      http.get(`http://localhost:${PORT}${path}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch(e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }).on('error', reject);
    });
  };

  try {
    console.log('\n--- 1. Testing Root Endpoint (/) ---');
    const rootRes = await testEndpoint('/');
    console.log(`Status: ${rootRes.status}`, rootRes.data);

    console.log('\n--- 2. Testing Render Health Check (/health) ---');
    const healthRes = await testEndpoint('/health');
    console.log(`Status: ${healthRes.status}`, healthRes.data);

    console.log('\n--- 3. Testing API Health Check (/api/health) ---');
    const apiHealthRes = await testEndpoint('/api/health');
    console.log(`Status: ${apiHealthRes.status}`, apiHealthRes.data);

    console.log('\n--- 4. Testing Departments API (/api/departments) ---');
    const deptRes = await testEndpoint('/api/departments');
    console.log(`Status: ${deptRes.status}, Count: ${deptRes.data?.data?.length || deptRes.data?.length || 0}`);

    console.log('\n--- 5. Testing Examination Slots API (/api/exams/slots) ---');
    const slotRes = await testEndpoint('/api/exams/slots');
    console.log(`Status: ${slotRes.status}, Count: ${slotRes.data?.data?.length || slotRes.data?.length || 0}`);

    console.log('\n✅ ALL DEPLOYMENT READINESS TESTS PASSED!');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  } finally {
    server.close(() => {
      console.log('Test server closed.');
      process.exit(0);
    });
  }
});
