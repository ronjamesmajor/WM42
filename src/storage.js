import { supabase } from './supabase'

export async function loadShared(key, fallback) {
  try {
    const { data, error } = await supabase
      .from('wm42_store')
      .select('value')
      .eq('key', key)
      .single()
    if (error) return fallback
    return data?.value ?? fallback
  } catch {
    return fallback
  }
}

export async function saveShared(key, data) {
  try {
    const { error } = await supabase
      .from('wm42_store')
      .upsert({ key, value: data, updated_at: new Date().toISOString() })
    if (error) return false
    return true
  } catch {
    return false
  }
}

export function subscribeToKey(key, callback) {
  const channel = supabase
    .channel(`wm42_realtime_${key}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'wm42_store', filter: `key=eq.${key}` },
      (payload) => callback(payload.new?.value)
    )
    .subscribe()
  return channel
}
