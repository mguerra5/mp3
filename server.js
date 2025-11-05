// Get the packages we need
var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  bodyParser = require('body-parser');

// Read .env file
require('dotenv').config();

// Create our Express application
var app = express();

// Use environment defined port or 3000
var port = process.env.PORT || 3000;

// Connect to a MongoDB --> Uncomment this once you have a connection string!!
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });

// Allow CORS so that backend and frontend could be put on different servers
var allowCrossDomain = function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS");
  next();
};
app.use(allowCrossDomain);

// Use the body-parser package in our application
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

// Use routes as a module (see index.js)
require('./routes')(app, router);

// --- START: NEW ERROR HANDLER ---
// Error-Handling Middleware (Must be defined AFTER your routes)
app.use((err, req, res, next) => {
  // Mongoose validation error (e.g., missing required field)
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message, data: null });
  }

  // Mongoose cast error (e.g., "users" instead of a valid ID)
  if (err.name === 'CastError') {
    // Note: Your assignment spec says 404 for bad IDs
    return res.status(404).json({ message: 'Resource not found. Invalid ID.', data: null });
  }
  
  // Handle 11000 duplicate key error
  if (err.code === 11000) {
    // This provides a cleaner message than the default.
    return res.status(400).json({ message: 'Email already exists.', data: null });
  }

  // Handle other errors (uncaught exceptions)
  console.error(err.stack); // Log the full error for yourself
  return res.status(500).json({ message: 'An internal server error occurred.', data: null });
});
// --- END: NEW ERROR HANDLER ---

// Start the server
app.listen(port);
console.log('Server running on port ' + port);
