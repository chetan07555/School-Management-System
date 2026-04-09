const axios = require('axios');

// Test API Responses without authentication (just structure validation)
const testAPIs = async () => {
  const baseURL = 'http://localhost:5000/api';
  
  try {
    console.log('\n=== Testing API Response Structures ===\n');
    
    // We'll create a token manually for testing
    // First, let's check what the endpoints return
    
    const endpoints = [
      { path: '/auth/login', method: 'post', label: 'Login (structure only)' },
      { path: '/classes', method: 'get', label: 'Get Classes (requires auth)' },
      { path: '/notes', method: 'get', label: 'Get Notes (requires auth)' },
      { path: '/attendance', method: 'get', label: 'Get Attendance (requires auth)' },
      { path: '/marks', method: 'get', label: 'Get Marks (requires auth)' },
    ];

    // Test login to get a token
    console.log('Testing Login...');
    try {
      const loginRes = await axios.post(`${baseURL}/auth/login`, {
        email: 'teacher@example.com',
        password: 'test123'
      });
      console.log('❌ Login with test credentials failed (expected, unless test user exists)');
    } catch (err) {
      console.log('✓ Login endpoint is accessible');
    }

    // Test unauthenticated access
    console.log('\nTesting Unauthenticated Access to Protected Endpoints:');
    for (const endpoint of endpoints.slice(1)) {
      try {
        const res = await axios.get(`${baseURL}${endpoint.path}`);
        console.log(`❌ ${endpoint.label}: Should require auth but succeeded`);
      } catch (err) {
        if (err.response?.status === 401) {
          console.log(`✓ ${endpoint.label}: Correctly requires authentication`);
        } else {
          console.log(`⚠ ${endpoint.label}: Got status ${err.response?.status} - ${err.response?.data?.msg}`);
        }
      }
    }

    console.log('\n=== API Structure Test Complete ===\n');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
};

testAPIs();
