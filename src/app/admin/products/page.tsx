'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface Product {
  _id: string;
  name: string;
  price: number;
  description: string;
  stock: number;
}

export default function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newProduct, setNewProduct] = useState({ name: '', price: '', description: '', stock: '' });
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [editProductData, setEditProductData] = useState({ name: '', price: '', description: '', stock: '' });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/products');
      setProducts(res.data);
      setError('');
    } catch {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const addProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.price.trim() || !newProduct.description.trim() || !newProduct.stock.trim()) return;

    try {
      await axios.post('/api/products', {
        name: newProduct.name.trim(),
        price: parseFloat(newProduct.price),
        description: newProduct.description.trim(),
        stock: parseInt(newProduct.stock),
      });

      setNewProduct({ name: '', price: '', description: '', stock: '' });
      fetchProducts();
    } catch {
      setError('Failed to add product');
    }
  };

  const startEditing = (product: Product) => {
    setEditProductId(product._id);
    setEditProductData({
      name: product.name,
      price: product.price.toString(),
      description: product.description,
      stock: product.stock.toString(),
    });
  };

  const cancelEditing = () => {
    setEditProductId(null);
    setEditProductData({ name: '', price: '', description: '', stock: '' });
  };

  const saveEditing = async () => {
    if (!editProductData.name.trim() || !editProductData.price.trim() || !editProductData.description.trim() || !editProductData.stock.trim() || !editProductId) return;

    try {
      await axios.put('/api/products', {
        id: editProductId,
        name: editProductData.name.trim(),
        price: parseFloat(editProductData.price),
        description: editProductData.description.trim(),
        stock: parseInt(editProductData.stock),
      });

      setEditProductId(null);
      setEditProductData({ name: '', price: '', description: '', stock: '' });
      fetchProducts();
    } catch {
      setError('Failed to update product');
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await axios.delete(`/api/products?id=${id}`);
      fetchProducts();
    } catch {
      setError('Failed to delete product');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-semibold mb-6">Manage Products</h2>

      {error && <div className="mb-4 text-red-600 bg-red-100 p-3 rounded font-medium">{error}</div>}

      {/* Add New Product */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Product Name"
          value={newProduct.name}
          onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
          className="flex-grow border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
        />
        <input
          type="number"
          placeholder="Price"
          value={newProduct.price}
          onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
          className="w-24 border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
          min={0}
          step={1}
        />
        <input
          type="text"
          placeholder="Description"
          value={newProduct.description}
          onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
          className="flex-grow border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
        />
        <input
          type="number"
          placeholder="Stock"
          value={newProduct.stock}
          onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
          className="w-24 border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
          min={0}
        />
        <button
          onClick={addProduct}
          disabled={!newProduct.name.trim() || !newProduct.price.trim() || !newProduct.description.trim() || !newProduct.stock.trim()}
          className="bg-black text-white px-5 py-2 rounded hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>

      {/* Product Table */}
      {loading ? (
        <p className="text-center text-gray-500">Loading products...</p>
      ) : products.length === 0 ? (
        <p className="text-center text-gray-500">No products found.</p>
      ) : (
        <table className="w-full table-auto border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2">No</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Product Name</th>
              <th className="border border-gray-300 px-4 py-2">Price</th>
              <th className="border border-gray-300 px-4 py-2">Description</th>
              <th className="border border-gray-300 px-4 py-2">Stock</th>
              <th className="border border-gray-300 px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, idx) => (
              <tr key={product._id} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-center">{idx + 1}</td>
                <td className="border border-gray-300 px-4 py-2">
                  {editProductId === product._id ? (
                    <input
                      type="text"
                      value={editProductData.name}
                      onChange={(e) => setEditProductData({ ...editProductData, name: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  ) : (
                    product.name
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {editProductId === product._id ? (
                    <input
                      type="number"
                      value={editProductData.price}
                      onChange={(e) => setEditProductData({ ...editProductData, price: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  ) : (
                    product.price.toFixed(2)
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {editProductId === product._id ? (
                    <input
                      type="text"
                      value={editProductData.description}
                      onChange={(e) => setEditProductData({ ...editProductData, description: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  ) : (
                    product.description
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {editProductId === product._id ? (
                    <input
                      type="number"
                      value={editProductData.stock}
                      onChange={(e) => setEditProductData({ ...editProductData, stock: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  ) : (
                    product.stock
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center space-x-2">
                  {editProductId === product._id ? (
                    <>
                      <button
                        onClick={saveEditing}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEditing(product)}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => deleteProduct(product._id)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
