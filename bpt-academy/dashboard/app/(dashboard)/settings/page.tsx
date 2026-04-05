'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Save, Trash2 } from 'lucide-react'

interface Setting {
  id: string
  key: string
  value: string
}

const COMMON_SETTINGS = [
  { key: 'academy_name', label: 'Academy Name', placeholder: 'BPT Academy' },
  { key: 'contact_email', label: 'Contact Email', placeholder: 'info@bptacademy.uk' },
  { key: 'default_division', label: 'Default Division', placeholder: 'Beginner' },
  { key: 'max_students_per_program', label: 'Max Students Per Program', placeholder: '20' },
  { key: 'academy_website', label: 'Academy Website', placeholder: 'https://bptacademy.uk' },
  { key: 'support_phone', label: 'Support Phone', placeholder: '+44 7700 900000' },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [addingNew, setAddingNew] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('academy_settings')
      .select('*')
      .order('key')
    setSettings(data || [])
    setLoading(false)
  }

  function getSettingValue(key: string): string {
    return settings.find((s) => s.key === key)?.value || ''
  }

  async function saveSetting(key: string, value: string) {
    setSaving((prev) => ({ ...prev, [key]: true }))
    const supabase = createClient()

    const existing = settings.find((s) => s.key === key)
    if (existing) {
      await supabase
        .from('academy_settings')
        .update({ value })
        .eq('id', existing.id)
    } else {
      await supabase.from('academy_settings').insert({ key, value })
    }

    setSaving((prev) => ({ ...prev, [key]: false }))
    setSaved((prev) => ({ ...prev, [key]: true }))
    setTimeout(
      () => setSaved((prev) => ({ ...prev, [key]: false })),
      2000
    )
    fetchSettings()
  }

  async function deleteSetting(id: string) {
    const supabase = createClient()
    await supabase.from('academy_settings').delete().eq('id', id)
    fetchSettings()
  }

  async function addNewSetting() {
    if (!newKey.trim()) return
    await saveSetting(newKey.trim(), newValue.trim())
    setNewKey('')
    setNewValue('')
    setAddingNew(false)
  }

  // Find custom settings (not in COMMON_SETTINGS list)
  const commonKeys = COMMON_SETTINGS.map((s) => s.key)
  const customSettings = settings.filter((s) => !commonKeys.includes(s.key))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">
          Configure academy settings and preferences
        </p>
      </div>

      {/* Common Settings */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Academy Settings</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Core configuration for your academy
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {COMMON_SETTINGS.map((setting) => {
            const currentValue = getSettingValue(setting.key)
            return (
              <SettingRow
                key={setting.key}
                label={setting.label}
                settingKey={setting.key}
                value={currentValue}
                placeholder={setting.placeholder}
                saving={saving[setting.key] || false}
                saved={saved[setting.key] || false}
                onSave={(value) => saveSetting(setting.key, value)}
              />
            )
          })}
        </div>
      </div>

      {/* Custom Settings */}
      {customSettings.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Custom Settings</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {customSettings.map((setting) => (
              <div
                key={setting.id}
                className="px-6 py-4 flex items-center gap-4"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 font-mono">
                    {setting.key}
                  </p>
                </div>
                <SettingRow
                  label=""
                  settingKey={setting.key}
                  value={setting.value}
                  placeholder=""
                  saving={saving[setting.key] || false}
                  saved={saved[setting.key] || false}
                  onSave={(value) => saveSetting(setting.key, value)}
                  inline
                />
                <button
                  onClick={() => deleteSetting(setting.id)}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Custom Setting */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Add Custom Setting</h2>
          {!addingNew && (
            <button
              onClick={() => setAddingNew(true)}
              className="flex items-center gap-2 text-sm text-green-600 hover:text-green-800 font-medium"
            >
              <Plus size={16} />
              Add Setting
            </button>
          )}
        </div>

        {addingNew && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Key
                </label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="setting_key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Value
                </label>
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="value"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setAddingNew(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addNewSetting}
                disabled={!newKey.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg text-sm font-medium"
              >
                <Save size={16} />
                Save
              </button>
            </div>
          </div>
        )}

        {!addingNew && !loading && settings.length === 0 && (
          <p className="text-sm text-gray-400">No settings configured yet.</p>
        )}
      </div>
    </div>
  )
}

interface SettingRowProps {
  label: string
  settingKey: string
  value: string
  placeholder: string
  saving: boolean
  saved: boolean
  onSave: (value: string) => void
  inline?: boolean
}

function SettingRow({
  label,
  value: initialValue,
  placeholder,
  saving,
  saved,
  onSave,
  inline = false,
}: SettingRowProps) {
  const [localValue, setLocalValue] = useState(initialValue)

  useEffect(() => {
    setLocalValue(initialValue)
  }, [initialValue])

  if (inline) {
    return (
      <div className="flex items-center gap-2 flex-1">
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          onClick={() => onSave(localValue)}
          disabled={saving}
          className="px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg text-xs font-medium"
        >
          {saving ? '...' : saved ? '✓' : 'Save'}
        </button>
      </div>
    )
  }

  return (
    <div className="px-6 py-4 flex items-center gap-4">
      <div className="w-48 shrink-0">
        <p className="text-sm font-medium text-gray-700">{label}</p>
      </div>
      <div className="flex-1 flex items-center gap-3">
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          onClick={() => onSave(localValue)}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            saved
              ? 'bg-green-100 text-green-700'
              : 'bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white'
          }`}
        >
          {saving ? '...' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
    </div>
  )
}
