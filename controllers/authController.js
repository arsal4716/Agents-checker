const login = (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  if (username === adminUser && password === adminPass) {
    req.session.loggedIn = true;
    req.session.username = username;
    return res.json({ success: true, username });
  }

  return res.status(401).json({ error: "Invalid credentials." });
};

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Logout failed." });
    res.clearCookie("connect.sid");
    return res.json({ success: true });
  });
};

const me = (req, res) => {
  if (req.session && req.session.loggedIn) {
    return res.json({ loggedIn: true, username: req.session.username });
  }
  return res.json({ loggedIn: false });
};

module.exports = { login, logout, me };
