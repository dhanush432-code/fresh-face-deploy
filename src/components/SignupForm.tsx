'use client';

import { useState } from 'react';

export default function SignupForm() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Submit logic here
    console.log(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input name="name" onChange={handleChange} placeholder="Name" className="w-full border p-2 rounded" />
      <input name="email" onChange={handleChange} placeholder="Email" className="w-full border p-2 rounded" />
      <input name="password" type="password" onChange={handleChange} placeholder="Password" className="w-full border p-2 rounded" />
      <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">Sign Up</button>
    </form>
  );
}
