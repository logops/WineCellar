import fetch from 'node-fetch';

async function testAuth() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('======= Testing Authentication Endpoints =======');
  
  // Test Registration
  console.log('\n--- Testing Registration ---');
  const testUser = {
    username: `test_user_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'Test12345!'
  };
  
  try {
    console.log(`Registering user: ${testUser.username} / ${testUser.email}`);
    const registerRes = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    const registerData = await registerRes.json();
    console.log(`Registration Response Status: ${registerRes.status}`);
    console.log('Registration Response:', registerData);
    
    if (registerRes.status === 201) {
      console.log('Registration successful!');
    } else {
      console.log('Registration failed.');
    }
    
    // Test Login
    console.log('\n--- Testing Login ---');
    const loginRes = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: testUser.username,
        password: testUser.password
      })
    });
    
    const loginData = await loginRes.json();
    console.log(`Login Response Status: ${loginRes.status}`);
    console.log('Login Response:', loginData);
    
    if (loginRes.status === 200) {
      console.log('Login successful!');
    } else {
      console.log('Login failed.');
    }
    
  } catch (error) {
    console.error('Error testing authentication:', error);
  }
}

testAuth().catch(console.error);