exports.loginAdmin = (req, res) => {
  const { email, password } = req.body;

  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    req.session.admin = {
      email
    };

    return res.redirect('/admin/dashboard');
  }

  return res.status(401).render('login', {
    title: 'Connexion admin',
    error: 'Email ou mot de passe invalide'
  });
};

exports.logoutAdmin = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};