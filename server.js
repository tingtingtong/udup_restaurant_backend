const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors'); // Import CORS

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Enable CORS

mongoose.connect('mongodb://localhost:27017/udupi-restaurant', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Failed to connect to MongoDB', err);
});

// Models
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model('User', UserSchema);

const InventorySchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
});
const Inventory = mongoose.model('Inventory', InventorySchema);

const OrderSchema = new mongoose.Schema({
  items: [
    {
      itemName: String,
      quantity: Number,
      price: Number,
    },
  ],
  totalAmount: Number,
  date: { type: Date, default: Date.now },
});
const Order = mongoose.model('Order', OrderSchema);

// Middleware for authentication
const authenticate = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).send('Access Denied');
  try {
    const verified = jwt.verify(token, 'secret');
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).send('Invalid Token');
  }
};

// Routes
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  const user = new User({ name, email, password: bcrypt.hashSync(password, 10) });
  await user.save();
  res.send('User registered');
  console.log('User registered:', user);
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ id: user._id }, 'secret', { expiresIn: '1h' });
    res.json({ token });
    console.log('User logged in:', user);
  } else {
    res.status(400).send('Invalid credentials');
    console.log('Login failed for email:', email);
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.send('User logged out');
});

app.post('/api/inventory/add', authenticate, async (req, res) => {
  const { itemName, quantity, unit } = req.body;
  const inventory = new Inventory({ itemName, quantity, unit });
  await inventory.save();
  res.send('Item added to inventory');
  console.log('Item added:', inventory);
});

app.get('/api/inventory/list', authenticate, async (req, res) => {
  const inventory = await Inventory.find();
  res.json(inventory);
  console.log('Inventory list:', inventory);
});

app.put('/api/inventory/update/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  await Inventory.findByIdAndUpdate(id, { quantity });
  res.send('Inventory updated');
  console.log('Inventory updated:', id, quantity);
});

app.delete('/api/inventory/delete/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  await Inventory.findByIdAndDelete(id);
  res.send('Item deleted from inventory');
  console.log('Item deleted:', id);
});

app.post('/api/orders/create', authenticate, async (req, res) => {
  const { items, totalAmount } = req.body;
  const order = new Order({ items, totalAmount });
  await order.save();
  res.send('Order created');
  console.log('Order created:', order);
});

app.get('/api/orders/list', authenticate, async (req, res) => {
  const orders = await Order.find();
  res.json(orders);
  console.log('Order list:', orders);
});

app.get('/api/dashboard/stats', authenticate, async (req, res) => {
  const inventoryCount = await Inventory.countDocuments();
  const orderCount = await Order.countDocuments();
  res.json({ inventoryCount, orderCount });
  console.log('Dashboard stats:', { inventoryCount, orderCount });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));
