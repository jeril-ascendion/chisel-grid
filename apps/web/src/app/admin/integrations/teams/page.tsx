/**
 * T-20.9 Teams Channel Mapping Admin UI
 *
 * Admin page at /admin/integrations/teams for configuring
 * which Teams channels receive article notifications per category.
 */

'use client';

import { useState, useEffect } from 'react';

interface ChannelMapping {
  id: string;
  tenantId: string;
  categoryId: string;
  categoryName: string;
  teamsChannelId: string;
  teamsChannelName: string;
  webhookUrl: string;
  enabled: boolean;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function TeamsIntegrationPage() {
  const [mappings, setMappings] = useState<ChannelMapping[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMapping, setNewMapping] = useState({
    categoryId: '',
    teamsChannelName: '',
    webhookUrl: '',
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/integrations/teams/channels').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
    ]).then(([channelData, categoryData]) => {
      setMappings(channelData.mappings ?? []);
      setCategories(categoryData.categories ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    const response = await fetch('/api/integrations/teams/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMapping),
    });

    if (response.ok) {
      const created = await response.json();
      setMappings([...mappings, created]);
      setShowAddForm(false);
      setNewMapping({ categoryId: '', teamsChannelName: '', webhookUrl: '' });
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await fetch(`/api/integrations/teams/channels/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    setMappings(mappings.map((m) => (m.id === id ? { ...m, enabled } : m)));
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/integrations/teams/channels/${id}`, { method: 'DELETE' });
    setMappings(mappings.filter((m) => m.id !== id));
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Teams Integration</h1>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Teams Channel Notifications</h1>
          <p className="text-gray-500 mt-1">
            Configure which Teams channels receive article notifications per category.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Add Channel
        </button>
      </div>

      {showAddForm && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6 border">
          <h2 className="text-lg font-semibold mb-4">Add Channel Mapping</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={newMapping.categoryId}
                onChange={(e) => setNewMapping({ ...newMapping, categoryId: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teams Channel Name</label>
              <input
                type="text"
                value={newMapping.teamsChannelName}
                onChange={(e) => setNewMapping({ ...newMapping, teamsChannelName: e.target.value })}
                placeholder="e.g., #engineering-articles"
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Incoming Webhook URL</label>
              <input
                type="url"
                value={newMapping.webhookUrl}
                onChange={(e) => setNewMapping({ ...newMapping, webhookUrl: e.target.value })}
                placeholder="https://outlook.office.com/webhook/..."
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                Save
              </button>
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-600">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4 text-sm font-medium text-gray-500">Channel</th>
              <th className="text-left p-4 text-sm font-medium text-gray-500">Category</th>
              <th className="text-left p-4 text-sm font-medium text-gray-500">Status</th>
              <th className="text-right p-4 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((m) => (
              <tr key={m.id} className="border-b last:border-0">
                <td className="p-4">
                  <div className="font-medium">{m.teamsChannelName}</div>
                  <div className="text-sm text-gray-500 truncate max-w-xs">{m.webhookUrl}</div>
                </td>
                <td className="p-4">{m.categoryName || 'All Categories'}</td>
                <td className="p-4">
                  <button
                    onClick={() => handleToggle(m.id, !m.enabled)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      m.enabled
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {m.enabled ? 'Active' : 'Paused'}
                  </button>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {!mappings.length && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  No channel mappings configured. Click &quot;Add Channel&quot; to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
