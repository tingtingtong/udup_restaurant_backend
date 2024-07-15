import React, { useState } from 'react';
import axios from 'axios';

function AddInventory() {
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [unit, setUnit] = useState('');

  const handleAddItem = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await axios.post('http://localhost:5000/api/inventory/add', { itemName, quantity, unit }, {
        headers: { 'Authorization': token }
      });
      alert('Item added to inventory');
    } catch (error) {
      console.error('Adding inventory failed:', error);
      alert('Failed to add item. Please try again.');
    }
  };

  return (
    <div>
      <h2>Add Inventory Item</h2>
      <form onSubmit={handleAddItem}>
        <input type="text" placeholder="Item Name" value={itemName} onChange={(e) => setItemName(e.target.value)} />
        <input type="number" placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
        <input type="text" placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
        <button type="submit">Add Item</button>
      </form>
    </div>
  );
}

export default AddInventory;
