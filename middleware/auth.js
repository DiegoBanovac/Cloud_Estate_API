const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token'); // Common header name for tokens

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'Nema tokena, autorizacija odbijena.' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = decoded; // Attach decoded user (sifraKorisnika, email) to the request object
    next(); // Move to the next middleware/route handler
  } catch (err) {
    res.status(401).json({ msg: 'Token nije validan.' });
  }
};