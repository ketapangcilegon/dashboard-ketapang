async function testApi() {
  try {
    const res = await fetch('http://localhost:3000/api/sagon-bulanan?month=7&year=2026');
    const json = await res.json();
    console.log('API Response for Jan 2026:');
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testApi();
