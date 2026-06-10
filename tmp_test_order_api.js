require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
async function test() {
  const token = process.env.TIENDANUBE_ACCESS_TOKEN || '1f7bfccaf79dc7c1bd035773ff11822c9535eb7b'; // usually in .env, I'll just use what's in the repo config or read it
}
test();
