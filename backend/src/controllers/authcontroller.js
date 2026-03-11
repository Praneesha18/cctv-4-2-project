const userModel = require("../models/usermodel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken"); 

const authController = {
  register: async (req, res) => {
    try {
      const name = req.body.name?.trim();
      const email = req.body.email?.trim().toLowerCase();
      const phone = req.body.phone?.trim() || "";
      const password = req.body.password?.trim();

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Name, email and password are required",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters",
        });
      }

      const existingUser = await userModel.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ success: false, message: "Email already in use" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new userModel({ name, email, phone, password: hashedPassword });
      await newUser.save();
      res.status(201).json({
        success: true,
        message: "User registered successfully",
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
        },
      });
    }
    catch(err){
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }

},
login: async (req, res) => {
    try {
        const { email, password } = req.body;
        if(!email || !password){
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }else{
            const user = await userModel.findOne({email})
            if(!user){
                return res.status(400).json({ success: false, message: "Invalid email or password" });
            }else{
                const isMatch = await bcrypt.compare(password, user.password);  
                if(!isMatch){
                    return res.status(400).json({ success: false, message: "Invalid email or password" });
                }else{
                    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
                    res.status(200).json({
                      success: true,
                      message: "Login successful",
                      token,
                      user: {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                      },
                    });
                }
        }
    }
}
catch(err){
    res.status(500).json({ success: false, message: "Server error", error: err.message });  

}
}
}
module.exports = authController;
