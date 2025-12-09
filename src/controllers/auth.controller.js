const userModel =  require('../models/user.model.js');
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken");

async function registerUser(req , res) {

    const { fullName: { firstName, lastName } , email, password } = req.body;

    try{
        const userAlreadyExists = await userModel.findOne({ email });
        if(userAlreadyExists){
            return res.status(400).json({ message: "User already exists" });
        }

        const hashPassword = await bcrypt.hash(password , 10)

        const user = new userModel({
            fullName: { firstName, lastName },
            email,
            password: hashPassword 
        });

        await user.save();

        const users = await userModel.find();
        console.log("All users:", users);

        const token = jwt.sign({id: user._id} , process.env.JWT_SECRET) 

        res.cookie("token" , token)

        res.status(201).json({ message: "User registered successfully" ,
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                password: user.password
            }
         });

    }catch(error){
        res.status(500).json({ message: "Error registering user", error });
    }

}

async function loginUser(req , res) {
    
    const { email, password } = req.body;

    try{
        const user = await userModel.findOne({ email });
        if(!user){
            return res.status(400).json({ message: "User does not exist" });
        }

        const isPasswordValid = await bcrypt.compare(password , user.password);
        if(!isPasswordValid){
            return res.status(400).json({ message: "User exists but password is incorrect" });
        }

        const token = jwt.sign({id: user._id} , process.env.JWT_SECRET) 

        res.cookie("token" , token)

        res.status(200).json({ message: "User logged in successfully" ,
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email
            }
         });

    }catch(error){
        res.status(500).json({ message: "Error logging in user", error });
    }
}

module.exports = { registerUser, loginUser };