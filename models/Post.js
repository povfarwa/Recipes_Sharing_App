const mongoose = require('mongoose');

const postSchema = mongoose.Schema({
    title: String,
    ingredients: String,
    instructions: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user' }, // Author link
    date: { type: Date, default: Date.now }
});
module.exports = mongoose.model('post', postSchema);