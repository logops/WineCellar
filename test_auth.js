import fetch from 'node-fetch';

async function testAuth() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('======= Testing Authentication Endpoints =======');
  
  // Test Registration
  console.log('\n--- Testing Registration ---');
  const timestamp = Date.now();
  const testEmail = `test_${timestamp}@example.com`;
  const testUser = {
    email: testEmail,
    password: 'Test12345!'
  };
  
  try {
    console.log(`Registering user with email: ${testUser.email}`);
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
        username: testEmail, // Using email as username
        password: testUser.password
      })
    });
    
    const loginData = await loginRes.json();
    console.log(`Login Response Status: ${loginRes.status}`);
    console.log('Login Response:', loginData);
    
    if (loginRes.status === 200) {
      console.log('Login successful!');
      
      // Test getting user data after login
      console.log('\n--- Testing User Data ---');
      const userRes = await fetch(`${baseUrl}/api/user`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': loginRes.headers.get('set-cookie')
        }
      });
      
      if (userRes.status === 200) {
        const userData = await userRes.json();
        console.log('User Data:', userData);
        console.log('User endpoint test successful!');
      } else {
        console.log(`User Response Status: ${userRes.status}`);
        console.log('Failed to get user data');
      }
    } else {
      console.log('Login failed.');
    }
    
  } catch (error) {
    console.error('Error testing authentication:', error);
  }
}

testAuth().catch(console.error);