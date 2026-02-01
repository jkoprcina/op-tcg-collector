// Test script to verify API endpoints
// Run in browser console: copy and paste each test function

const BASE_URL = 'https://www.optcgapi.com/api';

// Test 1: Get all sets
async function testAllSets() {
  console.log('Testing /api/allSets/');
  try {
    const resp = await fetch(`${BASE_URL}/allSets/`);
    const data = await resp.json();
    console.log('Response status:', resp.status);
    console.log('Data:', data);
    console.log('Is array?', Array.isArray(data));
    if (data?.length) console.log('First set:', data[0]);
  } catch (err) {
    console.error('Error:', err);
  }
}

// Test 2: Get cards in a set (OP01)
async function testSetCards() {
  console.log('Testing /api/sets/OP01/');
  try {
    const resp = await fetch(`${BASE_URL}/sets/OP01/`);
    const data = await resp.json();
    console.log('Response status:', resp.status);
    console.log('Data type:', typeof data);
    console.log('Is array?', Array.isArray(data));
    console.log('Data length:', Array.isArray(data) ? data.length : 'N/A');
    if (Array.isArray(data) && data.length > 0) {
      console.log('First card:', data[0]);
    } else {
      console.log('Full data:', data);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

// Test 3: Get specific card
async function testSpecificCard() {
  console.log('Testing /api/sets/card/OP01-001/');
  try {
    const resp = await fetch(`${BASE_URL}/sets/card/OP01-001/`);
    const data = await resp.json();
    console.log('Response status:', resp.status);
    console.log('Data:', data);
  } catch (err) {
    console.error('Error:', err);
  }
}

// Run all tests
async function runAllTests() {
  console.log('=== Starting API Tests ===');
  console.log('');
  
  await testAllSets();
  console.log('');
  
  await testSetCards();
  console.log('');
  
  await testSpecificCard();
  console.log('');
  console.log('=== Tests Complete ===');
}

// Instructions for user:
console.log('Copy one of these commands and paste in browser console:');
console.log('testAllSets()');
console.log('testSetCards()');
console.log('testSpecificCard()');
console.log('runAllTests()');
