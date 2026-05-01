require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');

const pagesRoutes = require('./routes/pages');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/order');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhook');
const teamOrderRoutes = require('./routes/teamOrder');
const formuleRoutes = require('./routes/formule');
const messageRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 3000;

// moteur de vues
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// webhook Stripe AVANT express.json()
app.use('/webhook', express.raw({ type: 'application/json' }), webhookRoutes);

// middlewares globaux
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride('_method'));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret_temporaire',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

// fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// variables globales pour EJS
app.use((req, res, next) => {
  res.locals.admin = req.session.admin || null;
  res.locals.cart = req.session.cart || [];
  next();
});

// routes
app.use('/', pagesRoutes);
app.use('/cart', cartRoutes);
app.use('/order', orderRoutes);
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);
app.use('/team-order', teamOrderRoutes);
app.use('/formule', formuleRoutes);
app.use('/', messageRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page introuvable' });
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});