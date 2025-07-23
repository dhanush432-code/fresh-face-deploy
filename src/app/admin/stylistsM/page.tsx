'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

type Stylist = {
  _id: string;
  name: string;
  experience: string;
  specialization: string;
  contactNumber: string;
};

export default function StylistManager () {
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newStylist, setNewStylist] = useState({ name: '', experience: '', specialization: '', contactNumber: '' });
  const [editStylistId, setEditStylistId] = useState<string | null>(null);
  const [editStylistData, setEditStylistData] = useState({ name: '', experience: '', specialization: '', contactNumber: '' });

  // Fetch stylists
  const fetchStylists = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/stylists');
      setStylists(res.data);
      setError('');
    } catch {
      setError('Failed to load stylists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStylists();
  }, []);

  // Add a new stylist
  const addStylist = async () => {
    if (!newStylist.name.trim() || !newStylist.experience.trim() || !newStylist.specialization.trim() || !newStylist.contactNumber.trim()) return;

    try {
      await axios.post('/api/stylists', {
        name: newStylist.name.trim(),
        experience: newStylist.experience.trim(),
        specialization: newStylist.specialization.trim(),
        contactNumber: newStylist.contactNumber.trim(),
      });

      setNewStylist({ name: '', experience: '', specialization: '', contactNumber: '' });
      fetchStylists();
    } catch {
      setError('Failed to add stylist');
    }
  };

  // Start editing a stylist
  const startEditing = (stylist: Stylist) => {
    setEditStylistId(stylist._id);
    setEditStylistData({ name: stylist.name, experience: stylist.experience, specialization: stylist.specialization, contactNumber: stylist.contactNumber });
  };

  // Save the edited stylist
  const saveEditing = async () => {
    if (!editStylistData.name.trim() || !editStylistData.experience.trim() || !editStylistData.specialization.trim() || !editStylistData.contactNumber.trim() || !editStylistId) return;

    try {
      await axios.put('/api/stylists', {
        id: editStylistId,
        name: editStylistData.name.trim(),
        experience: editStylistData.experience.trim(),
        specialization: editStylistData.specialization.trim(),
        contactNumber: editStylistData.contactNumber.trim(),
      });

      setEditStylistId(null);
      setEditStylistData({ name: '', experience: '', specialization: '', contactNumber: '' });
      fetchStylists();
    } catch {
      setError('Failed to update stylist');
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditStylistId(null);
    setEditStylistData({ name: '', experience: '', specialization: '', contactNumber: '' });
  };

  // Delete a stylist
  const deleteStylist = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stylist?')) return;

    try {
      await axios.delete(`/api/stylists?id=${id}`);
      fetchStylists();
    } catch {
      setError('Failed to delete stylist');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-semibold mb-6">Manage Stylists</h2>

      {error && <div className="mb-4 text-red-600 bg-red-100 p-3 rounded font-medium">{error}</div>}

      {/* Add New Stylist */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Stylist Name"
          value={newStylist.name}
          onChange={(e) => setNewStylist({ ...newStylist, name: e.target.value })}
          className="flex-grow border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
        />
        <input
          type="text"
          placeholder="Experience"
          value={newStylist.experience}
          onChange={(e) => setNewStylist({ ...newStylist, experience: e.target.value })}
          className="flex-grow border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
        />
        <input
          type="text"
          placeholder="Specialization"
          value={newStylist.specialization}
          onChange={(e) => setNewStylist({ ...newStylist, specialization: e.target.value })}
          className="flex-grow border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
        />
        <input
          type="text"
          placeholder="Contact Number"
          value={newStylist.contactNumber}
          onChange={(e) => setNewStylist({ ...newStylist, contactNumber: e.target.value })}
          className="flex-grow border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
        />
        <button
          onClick={addStylist}
          disabled={!newStylist.name.trim() || !newStylist.experience.trim() || !newStylist.specialization.trim() || !newStylist.contactNumber.trim()}
          className="bg-black text-white px-5 py-2 rounded hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>

      {/* Stylist Table */}
      {loading ? (
        <p className="text-center text-gray-500">Loading stylists...</p>
      ) : stylists.length === 0 ? (
        <p className="text-center text-gray-500">No stylists found.</p>
      ) : (
        <table className="w-full table-auto border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2">No</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Stylist Name</th>
              <th className="border border-gray-300 px-4 py-2">Experience</th>
              <th className="border border-gray-300 px-4 py-2">Specialization</th>
              <th className="border border-gray-300 px-4 py-2">Contact Number</th>
              <th className="border border-gray-300 px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stylists.map((stylist, idx) => (
              <tr key={stylist._id} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-center">{idx + 1}</td>
                <td className="border border-gray-300 px-4 py-2">
                  {editStylistId === stylist._id ? (
                    <input
                      type="text"
                      value={editStylistData.name}
                      onChange={(e) => setEditStylistData({ ...editStylistData, name: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  ) : (
                    stylist.name
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {editStylistId === stylist._id ? (
                    <input
                      type="text"
                      value={editStylistData.experience}
                      onChange={(e) => setEditStylistData({ ...editStylistData, experience: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  ) : (
                    stylist.experience
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {editStylistId === stylist._id ? (
                    <input
                      type="text"
                      value={editStylistData.specialization}
                      onChange={(e) => setEditStylistData({ ...editStylistData, specialization: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  ) : (
                    stylist.specialization
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {editStylistId === stylist._id ? (
                    <input
                      type="text"
                      value={editStylistData.contactNumber}
                      onChange={(e) => setEditStylistData({ ...editStylistData, contactNumber: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1"
                    />
                  ) : (
                    stylist.contactNumber
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center space-x-2">
                  {editStylistId === stylist._id ? (
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
                        onClick={() => startEditing(stylist)}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        Update
                      </button>
                      <button
                        onClick={() => deleteStylist(stylist._id)}
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
