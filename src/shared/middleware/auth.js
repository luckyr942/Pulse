const jwt = require('jsonwebtoken');
const env = require('../../config/utils');
const { UnauthorizedError } = require('../errors/error');
const User = require('../../models/User');


const protect = async (req, res, next) => {
    try {
        let token = null;

        if(req.headers.authorization && req.headers.authorization.startsWith ('Bearer')){
            token = req.headers.authorization.split(' ')[1];
        }
        if(!token){
            return next(new UnauthorizedError('Authentication token required'));
        }
        // verify token
        const verifyToken = jwt.verify(token, env.JWT_SECRET);

        //now fetch user and check if still exists
        const user = await User.findById(verifyToken.id);
        if(!user){
            return next(new UnauthorizedError('The user belonging to this token no longer exists'));
        }

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};


const sendSuccess = (res, data = {}, message= 'Success', statusCode = 200) =>{
    res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};


module.exports = {
    protect,
    sendSuccess
}


