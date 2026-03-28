'use client'

import { useState, useEffect, useCallback } from 'react'

interface InventoryItem {
  id: string
  title: string
  description: string
  quantity: number
  location: string
  category: string
  tags: string
  createdAt: string
  updatedAt: string
}

const emptyForm = {
  title: '',
  description: '',
  quantity: 0,
  location: '',
  category: '',
  tags: '',
}

export default function HomePage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [apiError, setApiError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [editError, setEditError] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/items')
      if (!res.ok) throw new Error('Failed to fetch items')
      const data = await res.json()
      setItems(data)
    } catch {
      setApiError('Failed to load items. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setApiError('')

    if (!form.title.trim()) {
      setFormError('Title is required.')
      return
    }
    if (form.quantity < 0) {
      setFormError('Quantity must be 0 or greater.')
      return
    }

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, quantity: Number(form.quantity) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Failed to create item.')
        return
      }
      setItems((prev) => [data, ...prev])
      setForm(emptyForm)
    } catch {
      setApiError('Network error. Please try again.')
    }
  }

  const handleDelete = async (id: string) => {
    setApiError('')
    try {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setApiError(data.error || 'Failed to delete item.')
        return
      }
      setItems((prev) => prev.filter((item) => item.id !== id))
    } catch {
      setApiError('Network error. Please try again.')
    }
  }

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id)
    setEditForm({
      title: item.title,
      description: item.description,
      quantity: item.quantity,
      location: item.location,
      category: item.category,
      tags: item.tags,
    })
    setEditError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditError('')
  }

  const handleEditSubmit = async (id: string) => {
    setEditError('')
    if (!editForm.title.trim()) {
      setEditError('Title is required.')
      return
    }
    if (editForm.quantity < 0) {
      setEditError('Quantity must be 0 or greater.')
      return
    }

    try {
      const res = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, quantity: Number(editForm.quantity) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEditError(data.error || 'Failed to update item.')
        return
      }
      setItems((prev) => prev.map((item) => (item.id === id ? data : item)))
      setEditingId(null)
    } catch {
      setEditError('Network error. Please try again.')
    }
  }

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Inventory</h1>

      {/* Add Item Form */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Add New Item</h2>
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Item title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Electronics"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Shelf A"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Optional description"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. urgent, fragile"
              />
            </div>
          </div>
          {formError && <p className="text-red-600 text-sm">{formError}</p>}
          <button
            type="submit"
            className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Add Item
          </button>
        </form>
      </section>

      {/* Global API Error */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-3 mb-6 text-sm">
          {apiError}
        </div>
      )}

      {/* Items List */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Items {!loading && <span className="text-gray-400 font-normal text-base">({items.length})</span>}
        </h2>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading items...</p>
        ) : items.length === 0 ? (
          <p className="text-gray-500 text-sm">No items yet. Add one above.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) =>
              editingId === item.id ? (
                /* Inline Edit Form */
                <div key={item.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-700 mb-3">Editing: {item.title}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                      <input
                        type="number"
                        min={0}
                        value={editForm.quantity}
                        onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                      <input
                        type="text"
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Tags</label>
                      <input
                        type="text"
                        value={editForm.tags}
                        onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  {editError && <p className="text-red-600 text-xs mt-2">{editError}</p>}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleEditSubmit(item.id)}
                      className="bg-green-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded text-sm font-medium hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Item Row */
                <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800">{item.title}</span>
                      {item.category && (
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{item.category}</span>
                      )}
                      <span className="text-sm text-gray-500">Qty: {item.quantity}</span>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-1">{item.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                      {item.location && <span>📍 {item.location}</span>}
                      {item.tags && <span>🏷️ {item.tags}</span>}
                      <span>Added {new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => startEdit(item)}
                      className="bg-amber-500 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-amber-600 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="bg-red-500 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </main>
  )
}
