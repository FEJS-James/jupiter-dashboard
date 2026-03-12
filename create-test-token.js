const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// Create a test token with a valid user session
const payload = {
  user: {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin'
  }
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
console.log('Bearer ' + token);