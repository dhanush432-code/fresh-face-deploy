'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

type Service = {
  _id: string;
  name: string;
  price: number;
};

export default function ServiceManager() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newService, setNewService] = useState({ name: '', price: '' });
  const [editServiceId, setEditServiceId] = useState<string | null>(null);
  const [editServiceData, setEditServiceData] = useState({ name: '', price: '' });

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/styles');
      setServices(res.data);
      setError('');
    } catch {
      setError('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const addService = async () => {
    if (!newService.name.trim() || !newService.price.trim()) return;

    try {
      await axios.post('/api/styles', {
        name: newService.name.trim(),
        price: parseFloat(newService.price),
      });
      setNewService({ name: '', price: '' });
      fetchServices();
    } catch {
      setError('Failed to add service');
    }
  };

  const startEditing = (service: Service) => {
    setEditServiceId(service._id);
    setEditServiceData({ name: service.name, price: service.price.toString() });
  };

  const cancelEditing = () => {
    setEditServiceId(null);
    setEditServiceData({ name: '', price: '' });
  };

  const saveEditing = async () => {
    if (!editServiceData.name.trim() || !editServiceData.price.trim() || !editServiceId) return;
    try {
      await axios.put('/api/styles', {
        id: editServiceId,
        name: editServiceData.name.trim(),
        price: parseFloat(editServiceData.price),
      });
      setEditServiceId(null);
      setEditServiceData({ name: '', price: '' });
      fetchServices();
    } catch {
      setError('Failed to update service');
    }
  };

  const deleteService = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      await axios.delete(`/api/styles?id=${id}`);
      fetchServices();
    } catch {
      setError('Failed to delete service');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-semibold mb-6">Manage Services</h2>

      {error && (
        <div className="mb-4 text-red-600 bg-red-100 p-3 rounded font-medium">{error}</div>
      )}

      {/* Add New Service */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Service Name"
          value={newService.name}
          onChange={(e) => setNewService({ ...newService, name: e.target.value })}
          className="flex-grow border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
        />
        <input
          type="number"
          placeholder="Price"
          value={newService.price}
          onChange={(e) => setNewService({ ...newService, price: e.target.value })}
          className="w-24 border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
          min={0}
          step={1}
        />
        <button
          onClick={addService}
          disabled={!newService.name.trim() || !newService.price.trim()}
          className="bg-black text-white px-5 py-2 rounded hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>

      {/* Services Table */}
      {loading ? (
        <p className="text-center text-gray-500">Loading services...</p>
      ) : services.length === 0 ? (
        <p className="text-center text-gray-500">No services found.</p>
      ) : (
        <table className="w-full table-auto border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2">No</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Service Name</th>
              <th className="border border-gray-300 px-4 py-2">Price ($)</th>
              <th className="border border-gray-300 px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service, idx) => (
              <tr key={service._id} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-center">{idx + 1}</td>
                <td className="border border-gray-300 px-4 py-2">
                  {editServiceId === service._id ? (
                    <input
                      type="text"
                      value={editServiceData.name}
                      onChange={(e) =>
                        setEditServiceData({ ...editServiceData, name: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  ) : (
                    service.name
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">
                  {editServiceId === service._id ? (
                    <input
                      type="number"
                      value={editServiceData.price}
                      onChange={(e) =>
                        setEditServiceData({ ...editServiceData, price: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded px-2 py-1 text-center"
                      min={0}
                      step={1}
                    />
                  ) : (
                    service.price.toFixed(2)
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center space-x-2">
                  {editServiceId === service._id ? (
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
                        onClick={() => startEditing(service)}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => deleteService(service._id)}
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
