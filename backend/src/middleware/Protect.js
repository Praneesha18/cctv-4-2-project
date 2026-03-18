const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const queryToken = typeof req.query.token === "string" ? req.query.token : null;

    if ((!authHeader || !authHeader.startsWith("Bearer ")) && !queryToken) {
      return res.status(401).json({ success: false, message: "Unauthorized: token missing" });
    }

    const token = queryToken || authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized: token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Unauthorized: invalid or expired token" });
  }
};

module.exports = protect;
