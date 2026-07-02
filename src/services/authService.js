const jwt = require ('jsonwebtoken');
const env = require('../config/utils');
const User = require('../models/User');
const { ValidationError, UnauthorizedError, ConflictError } = require('../shared/errors/error');

const generateToken = (userId) => {
    return jwt.sign({ id: userId}, env.JWT_SECRET,{
        expiresIn: env.JWT_SECRET || '24h'
    });
};

const registerUser = async (userName, password) =>{
    const existingUser = await User.findOne({ userName});
    if(existingUser){
        throw new ConflictError ("Username is already exists");
    }
    //creating new user
    const user = await User.create({ userName, password});
    const token = generateToken(user._id);

    return {
        user:{
            id: user._id,
            userName: user.userName
        },
        token
    };
};


const loginUser = async (userName, password) =>{
    
    const user = await User.findOne({ userName }).select('+password');
    if(!user){
        throw new UnauthorizedError("Invalid credentials");
    }

    //verify against the hashed password - candidate password
    const isMatch = await user.comparePassword(password);
    if(!isMatch){
        throw new UnauthorizedError("Invalid Credentials");
    }

    const token = generateToken(user._id);

    return{
        user: {
            id: user._id,
            userName: user.userName
        },
    };
};

module.exports = {
    registerUser,
    loginUser
};