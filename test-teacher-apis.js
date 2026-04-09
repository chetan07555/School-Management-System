#!/usr/bin/env node
/**
 * Diagnostic script to test teacher dashboard API endpoints
 * Run this after logging in as a teacher to see what's failing
 */

const axios = require('axios');

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 15000
});

const testTeacherAPIs = async (token) => {
  if (!token) {
    console.log('❌ No token provided. Please provide a valid JWT token.');
    console.log('Usage: node test-teacher-apis.js <token>');
    process.exit(1);
  }

  API.interceptors.request.use((req) => {
    req.headers.Authorization = `Bearer ${token}`;
    return req;
  });

  const endpoints = [
    { path: '/classes', label: 'Get Classes' },
    { path: '/notes', label: 'Get Notes' },
    { path: '/attendance', label: 'Get Attendance' },
    { path: '/marks', label: 'Get Marks' }
  ];

  console.log('\n🔍 Testing Teacher Dashboard APIs...\n');

  for (const endpoint of endpoints) {
    try {
      const res = await API.get(endpoint.path);
      console.log(`✅ ${endpoint.label} (${endpoint.path})`);
      console.log(`   Status: ${res.status}`);
      
      if (Array.isArray(res.data)) {
        console.log(`   Data: Array with ${res.data.length} items`);
      } else if (res.data?.records) {
        console.log(`   Data: Object with records (${res.data.records.length} items)`);
      } else {
        console.log(`   Data:`, JSON.stringify(res.data).substring(0, 100) + '...');
      }
    } catch (error) {
      console.log(`❌ ${endpoint.label} (${endpoint.path})`);
      console.log(`   Status: ${error.response?.status || 'No response'}`);
      console.log(`   Error: ${error.response?.data?.msg || error.message}`);
    }
  }

  console.log('\n✅ Diagnostic complete. Check errors above.\n');
};

const token = process.argv[2];
testTeacherAPIs(token);
