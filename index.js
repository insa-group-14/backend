// server.js
require('dotenv').config(); // Load environment variables
const express = require('express');
const { clerkMiddleware } = require('@clerk/express');

const app = express();
const PORT = process.env.PORT || 3001;

// Add the Clerk middleware.
// This will attach user information to the request object.
app.use(clerkMiddleware());

app.use(express.json());

// Your routes will go here...

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
