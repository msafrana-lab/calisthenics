import { supabase } from './supabase'
import type { Remote } from './sync'

export const supabaseRemote: Remote = {
  async upsert(table, rows, onConflict) {
    const { error } = await supabase.from(table).upsert(rows, { onConflict })
    if (error) throw new Error(`${table}: ${error.message}`)
  },
  async changedSince(table, since, limit) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .gt('server_updated_at', since ?? '1970-01-01T00:00:00Z')
      .order('server_updated_at', { ascending: true })
      .limit(limit)
    if (error) throw new Error(`${table}: ${error.message}`)
    return data ?? []
  },
}
