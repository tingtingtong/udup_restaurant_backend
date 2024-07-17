const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/udupi-restaurant', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Failed to connect to MongoDB', err);
});

// Schemas
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model('User', UserSchema);

const InventorySchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  key: { type: Number, required: true, unique: true },
  stockTaken: { type: Number, required: true },
  stockRemaining: { type: Number, required: true },
  totalStock: { type: Number, required: true },
  dateTime: { type: Date, default: Date.now, required: true },
});
const Inventory = mongoose.model('Inventory', InventorySchema);

const ItemSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});
const Item = mongoose.model('Item', ItemSchema);

// Middleware for authentication
const authenticate = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).send('Access Denied');
  try {
    const verified = jwt.verify(token.split(' ')[1], 'secret');
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
  const { itemName, stockTaken, totalStock } = req.body;
  const stockRemaining = totalStock - stockTaken;
  const key = await Inventory.countDocuments() + 1;
  const inventory = new Inventory({ itemName, key, stockTaken, stockRemaining, totalStock });
  await inventory.save();
  res.send('Item added to inventory');
  console.log('Item added:', inventory);
});

app.get('/api/inventory/list/:timeFrame', authenticate, async (req, res) => {
  const { timeFrame } = req.params;
  const now = new Date();
  let startDate;

  switch (timeFrame) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'twoDays':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
      break;
    case 'week':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    default:
      startDate = new Date(0); // Return all records if no valid time frame is provided
      break;
  }

  const inventory = await Inventory.find({ dateTime: { $gte: startDate, $lt: now } });
  res.json(inventory);
  console.log(`Inventory list for ${timeFrame}:`, inventory);
});

app.get('/api/inventory/list', authenticate, async (req, res) => {
  const { startDate, endDate } = req.query;
  const inventory = await Inventory.find({
    dateTime: {
      $gte: new Date(startDate),
      $lt: new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1))
    }
  });
  res.json(inventory);
  console.log(`Inventory list from ${startDate} to ${endDate}:`, inventory);
});

app.put('/api/inventory/update/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { stockTaken, totalStock } = req.body;
  const stockRemaining = totalStock - stockTaken;
  await Inventory.findByIdAndUpdate(id, { stockTaken, stockRemaining, totalStock });
  res.send('Inventory updated');
  console.log('Inventory updated:', id, stockTaken, stockRemaining, totalStock);
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

// Routes for managing item names
app.post('/api/items/add', authenticate, async (req, res) => {
  const { name } = req.body;
  const existingItem = await Item.findOne({ name });
  if (existingItem) {
    return res.status(400).send('Item already exists');
  }
  const item = new Item({ name });
  await item.save();
  res.send('Item name added');
  console.log('Item name added:', item);
});

app.get('/api/items/list', authenticate, async (req, res) => {
  const items = await Item.find();
  res.json(items);
  console.log('Item names list:', items);
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));
