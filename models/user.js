// Load required packages
var mongoose = require('mongoose');

// Define our user schema
const UserSchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,      
    lowercase: true,  
    trim: true
  },
  dateCreated: { type: Date, default: Date.now },
  pendingTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }]
});

// Export the Mongoose model
module.exports = mongoose.model('User', UserSchema);
