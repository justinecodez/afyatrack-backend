#!/usr/bin/env node

// Integration Test Script for AfyaTrack Frontend-Backend
// This script tests the connection between frontend and backend

const http = require('http');
const https = require('https');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testBackend(baseUrl, name) {
  console.log(`\n🧪 Testing ${name} (${baseUrl})`);
  console.log('='.repeat(50));
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await makeRequest(`${baseUrl}/health`);
    
    if (healthResponse.status === 200) {
      console.log('   ✅ Health check passed');
      console.log(`   📊 Response: ${JSON.stringify(healthResponse.data)}`);
    } else {
      console.log(`   ❌ Health check failed (${healthResponse.status})`);
      return false;
    }
    
    // Test API info endpoint
    console.log('2. Testing API info endpoint...');
    const apiResponse = await makeRequest(`${baseUrl}/api`);
    
    if (apiResponse.status === 200) {
      console.log('   ✅ API info endpoint working');
    } else {
      console.log(`   ⚠️  API info endpoint failed (${apiResponse.status})`);
    }
    
    // Test login endpoint
    console.log('3. Testing authentication...');
    const loginResponse = await makeRequest(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@afyatrack.com',
        password: 'AfyaTrack123!'
      })
    });
    
    if (loginResponse.status === 200 && loginResponse.data.success) {
      console.log('   ✅ Authentication successful');
      console.log(`   👤 User: ${loginResponse.data.data.user.name}`);
      console.log(`   🔑 Token: ${loginResponse.data.data.token.substring(0, 20)}...`);
      
      // Test logout
      console.log('4. Testing logout...');
      const logoutResponse = await makeRequest(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginResponse.data.data.token}`
        }
      });
      
      if (logoutResponse.status === 200) {
        console.log('   ✅ Logout successful');
      } else {
        console.log(`   ⚠️  Logout failed (${logoutResponse.status})`);
      }
      
    } else {
      console.log(`   ❌ Authentication failed (${loginResponse.status})`);
      console.log(`   📊 Response: ${JSON.stringify(loginResponse.data)}`);
      return false;
    }
    
    console.log(`   🎉 ${name} is working correctly!`);
    return true;
    
  } catch (error) {
    console.log(`   ❌ Connection failed: ${error.message}`);
    return false;
  }
}

async function testFrontend() {
  console.log(`\n🌐 Testing Frontend (http://localhost:5173)`);
  console.log('='.repeat(50));
  
  try {
    const response = await makeRequest('http://localhost:5173');
    if (response.status === 200) {
      console.log('   ✅ Frontend is accessible');
      return true;
    } else {
      console.log(`   ❌ Frontend returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Frontend connection failed: ${error.message}`);
    console.log('   💡 Make sure to run: cd frontend && npm run dev');
    return false;
  }
}

async function runTests() {
  console.log('🚀 AfyaTrack Integration Test Suite');
  console.log('=====================================');
  
  const results = {
    simpleBackend: false,
    fullBackend: false,
    frontend: false
  };
  
  // Test backends
  results.simpleBackend = await testBackend('http://localhost:5001', 'Simple Backend');
  results.fullBackend = await testBackend('http://localhost:5000', 'Full Backend');
  
  // Test frontend
  results.frontend = await testFrontend();
  
  // Summary
  console.log(`\n📋 Test Summary`);
  console.log('='.repeat(30));
  console.log(`Simple Backend (5001): ${results.simpleBackend ? '✅' : '❌'}`);
  console.log(`Full Backend (5000):   ${results.fullBackend ? '✅' : '❌'}`);
  console.log(`Frontend (5173):       ${results.frontend ? '✅' : '❌'}`);
  
  if (results.simpleBackend || results.fullBackend) {
    console.log(`\n🎯 Quick Start Commands:`);
    if (results.simpleBackend) {
      console.log(`Backend: cd backend && npm run simple:js`);
    }
    if (results.fullBackend) {
      console.log(`Backend: cd backend && npm run dev`);
    }
    if (results.frontend) {
      console.log(`Frontend: cd frontend && npm run dev`);
    } else {
      console.log(`Frontend: cd frontend && npm run dev (not running)`);
    }
  } else {
    console.log(`\n❌ No backends are running. Start one with:`);
    console.log(`   cd backend && npm run simple:js  (for simple backend)`);
    console.log(`   cd backend && npm run dev        (for full backend)`);
  }
  
  console.log(`\n🌐 Open in browser: http://localhost:5173`);
  console.log(`📚 Integration guide: See INTEGRATION_GUIDE.md`);
}

// Run tests
runTests().catch(console.error);
