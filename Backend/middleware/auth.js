const jwt = require('jsonwebtoken');

module.exports = function(req, res, next){
    const token = req.header('x-auth-token');
    if(!token){
        return res.status(401).json({message : "Token not found"});
    }
    const secret= process.env.JWT_SECRET;
    try{
        const decode = jwt.verify(token, secret);
        req.user = decode;
        next();
    }catch(err){
        return res.status(401).json({message : "Session expired. Please sign in again."});
    }
}