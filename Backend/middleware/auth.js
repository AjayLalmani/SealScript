const jwt = require('jsonwebtoken');

module.exports = function(req, res, next){
    const token = req.header('x-auth-token');
    console.log("middleware token : ",token);
    if(!token){
        res.status(401).json({message : "Token not found"});
    }
    const secret= process.env.JWT_SECRET;
    console.log(secret);
    try{
        const decode = jwt.verify(token, secret);
        req.user = decode;
        next();
    }catch(err){
        console.log("Auth middleware error : ",err);
        res.status(500).json({message : "Server Error"});
    }
}