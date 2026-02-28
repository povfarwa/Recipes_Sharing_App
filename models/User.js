const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    name: String,
    email: String,
    password: String, // String rakhein
    speciality: String,
    experience: String,
    phone: Number,
    profileImage: { type: String, default: "default.png" },
    recipes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'post' }] // Link to Post model
});

module.exports = mongoose.model('user', userSchema);