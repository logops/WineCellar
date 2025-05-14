import fetch from 'node-fetch';

async function testWineLookup() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('======= Testing Wine Lookup API =======');
  
  // First we need to authenticate to get a session
  console.log('\n--- Getting Authentication ---');
  
  // Create a test user for this session
  const timestamp = Date.now();
  const testEmail = `test_${timestamp}@example.com`;
  const testUser = {
    email: testEmail,
    password: 'Test12345!'
  };
  
  try {
    // Register a new user
    console.log(`Registering user: ${testEmail}`);
    const registerRes = await fetch(`${baseUrl}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    if (registerRes.status !== 201) {
      console.log('Registration failed, cannot continue test');
      return;
    }
    
    // Get cookies from response to maintain session
    const cookies = registerRes.headers.get('set-cookie');
    console.log('Authentication successful, got session cookies');
    
    // Now test the wine lookup endpoint
    console.log('\n--- Testing Wine Lookup Endpoint ---');
    
    // Test looking up a well-known wine
    const wineLookupRes = await fetch(`${baseUrl}/api/wine-info-lookup`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({ wineName: 'Opus One 2018' })
    });
    
    console.log(`Wine Lookup Response Status: ${wineLookupRes.status}`);
    
    if (wineLookupRes.status === 200) {
      const wineData = await wineLookupRes.json();
      console.log('Wine Lookup Successful!');
      console.log('Wine Data Preview:', JSON.stringify(wineData, null, 2).substring(0, 500) + '...');
    } else {
      console.log('Wine lookup failed');
      try {
        const errorData = await wineLookupRes.text();
        console.log('Error Response:', errorData);
      } catch (e) {
        console.log('Could not parse error response');
      }
    }
    
  } catch (error) {
    console.error('Error testing wine lookup:', error);
  }
}

testWineLookup().catch(console.error);