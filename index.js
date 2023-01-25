const express = require('express');
const jwt = require("jsonwebtoken");
const app = express();
require('dotenv').config(); 
const { User, Kitten } = require('./db');
const bcrypt = require('bcrypt');

const SALT_COUNT =10

console.log("secret", process.env.SIGNING_SECRET)

const SIGNING_SECRET = process.env.SIGNING_SECRET;

const setUser = (req, res, next) => {
  try {
    const auth = req.header('Authorization')
    if(!auth){
      next()
      return
    }
    const [, token] = auth.split(" ")
    const user = jwt.verify(token, SIGNING_SECRET)
    req.user = user
    next()
    } catch (error) {
      console.log(error)
      next(error)
    }
}
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(setUser)

app.get('/', async (req, res, next) => {
  try {
    res.send(`
      <h1>Welcome to Cyber Kittens!</h1>
      <p>Cats are available at <a href="/kittens/1">/kittens/:id</a></p>
      <p>Create a new cat at <b><code>POST /kittens</code></b> and delete one at <b><code>DELETE /kittens/:id</code></b></p>
      <p>Log in via POST /login or register via POST /register</p>
    `);
  } catch (error) {
    console.error(error);
    next(error)
  }
});

app.post("/register", async(req,res, next) =>{
  try{
    const { username, password } = req.body;
    const hashedpass = await bcrypt.hash(req.body.password, 10)
    const {id} = await User.create({username, password: hashedpass});
    const token = jwt.sign({id, username}, SIGNING_SECRET);
    res.send({message: 'success', token})
  }catch(error){
    console.log(error)
    next(error)
  }
})

app.post("/login", async(req,res, next) =>{
  try{
    const userfound = await User.findOne({where: {username: req.body.username}})
    const isMatch = await bcrypt.compare(req.body.password, userfound.password)
    if(!isMatch)
    {
      res.sendStatus(401)
    }
    else{
      const token = jwt.sign(userfound.username, SIGNING_SECRET); 
      res.send({token: token,message: "success"});
    }
  }catch(error){
    console.log(error)
    next(error)
  }
})

app.get("/kittens/:id", async (req,res, next) => {
  try{
    const id = req.params.id
    const userData = req.user
    if(!userData)
    {
      res.sendStatus(401)
    }else if(id != userData.id)
    {
      res.sendStatus(401)
    }
    else{
      const {age, color, name} = await Kitten.findOne({ where: { ownerId: userData.id } })
      const clean = { age: age, color: color, name: name }
      res.send(clean)
    }
  } catch(error)
  {
    console.log(error)
    next(error)
  }
})




// POST /kittens
// TODO - takes req.body of {name, age, color} and creates a new cat with the given name, age, and color

// DELETE /kittens/:id
// TODO - takes an id and deletes the cat with that id

// error handling middleware, so failed tests receive them
app.use((error, req, res, next) => {
  console.error('SERVER ERROR: ', error);
  if(res.statusCode < 400) res.status(500);
  res.send({error: error.message, name: error.name, message: error.message});
});

// we export the app, not listening in here, so that we can run tests
module.exports = app;
