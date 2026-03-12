import { GET } from './src/app/api/tasks/route.js';

async function testAPI() {
  try {
    console.log('Testing tasks API route directly...');
    
    // Create a mock request
    const mockRequest = new Request('http://localhost:3000/api/tasks');
    
    // Call the API route directly
    const response = await GET(mockRequest);
    const data = await response.json();
    
    console.log('✅ API route response:', data);
    console.log('Status:', response.status);
    
  } catch (error) {
    console.error('❌ API route failed:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
  }
}

testAPI();