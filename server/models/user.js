const mongoose = require("mongoose");
const uuid = require('uuid'); // Import the uuid library

const userSchema = new mongoose.Schema({
    userId: { type: String, default: uuid.v4 }, // Generate a random user ID
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    favoriteMovies: [{ type: String }], // Update the type to String
});

const User = mongoose.model('User', userSchema);

module.exports = User;
