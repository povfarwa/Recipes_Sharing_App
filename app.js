const express = require('express')
const app = express()
const mongoose = require('mongoose')
const user = require('./models/User')
const post = require('./models/Post')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const multer = require('multer')
const path = require('path')
const crypto = require('crypto'); // <--- YE MISSING THA!

const SECRET = "my-secret-key"


// 2. Storage setup karein
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images/uploads') // Check karein ke ye folders bane hue hain!
    },
    filename: function (req, file, cb) {
        crypto.randomBytes(12, (err, name) => {
            const fn = name.toString("hex") + path.extname(file.originalname);
            cb(null, fn);
        })
    }
})

// 3. Ye rahi wo 'upload' variable jiski wajah se error aa raha tha
const upload = multer({ storage: storage });


mongoose.connect('mongodb://localhost:27017/recipe-sharing-app' , {
}).then(()=>{
    console.log('Connected to MongoDB')
}).catch((err)=>{
    console.log('Error connecting to MongoDB' , err)
})

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())
app.set('view engine' , 'ejs')
app.use(express.static('public'))

app.get("/" , function ( req , res){
    res.render("register")
})

app.post("/register" , async function (req , res){
    const {name , email , password , speciality , experience , phone} = req.body
    const hash = await bcrypt.hash(password , 10)
    const newUser = user.create({
        name , email , password : hash , speciality , experience , phone
    })
    res.redirect("/login")
})

app.get("/login" , function(req , res){
    res.render("login")
})

app.post("/login" , async function(req , res){
    const foundUser = await user.findOne({email : req.body.email})
    if(!foundUser||!(bcrypt.compare(req.body.password , foundUser.password))){
        res.send("Invalid email or password")
    }
    const token = jwt.sign({id : foundUser._id}, SECRET)
    res.cookie("token" , token)
    res.redirect("/profile")
})  

function isLoggedIn(req , res , next){
    const token = req.cookies.token
    if(!token){
        return res.render("/login")
    }try{
        const data = jwt.verify(token , SECRET)
        req.user = data
        next()
    }catch{
        return res.render("/login")
    }
}

app.get("/profile" , isLoggedIn , async function(req , res){
    const foundUser = await user.findById(req.user.id).populate('recipes') 
    res.render("profile" , {user : foundUser})
})


// Pehle app.get("/posts") tha, ab app.post("/post") karein
app.post("/post", isLoggedIn, async function(req, res) {
    const newPost = await post.create({
        title: req.body.title,
        ingredients: req.body.ingredients,
        instructions: req.body.instructions,
        user: req.user.id // Ya req.userId jo bhi aapne middleware mein rakha ho
    });

    // User ki recipes array mein push karein
    await user.findByIdAndUpdate(req.user.id, { $push: { recipes: newPost._id } });
    
    res.redirect("/profile");
});

app.post('/upload', isLoggedIn, upload.single("image"), async (req, res) => {
    try {
        // 1. findById use karein (ye zyada clean hai)
        let foundUser = await user.findById(req.user.id);

        // 2. Safety Check: Agar user nahi mila toh error handle karein
        if (!foundUser) {
            return res.status(404).send("User not found");
        }

        // 3. Agar file upload hui hai, tabhi save karein
        if (req.file) {
            foundUser.profileImage = req.file.filename;
            await foundUser.save();
        }

        res.redirect("/profile");
    } catch (err) {
        console.error(err);
        res.status(500).send("Something went wrong during upload");
    }
});

app.get("/delete/:recipeId", isLoggedIn, async function(req, res) {
    // 1. 'recipe' ko badal kar 'post' karein
    const deletedRecipe = await post.findOneAndDelete({ 
        _id: req.params.recipeId, 
        user: req.user.id 
    });

    // 2. User ke account se bhi wo ID nikal do
    await user.findByIdAndUpdate(req.user.id, { 
        $pull: { recipes: req.params.recipeId } 
    });

    // 3. Wapas profile par bhej do
    res.redirect("/profile");
});

app.listen(3000 , function(){
    console.log("Server is running on port 3000")
})