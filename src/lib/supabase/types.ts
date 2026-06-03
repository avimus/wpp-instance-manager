// Run `supabase gen types typescript --linked > src/lib/supabase/types.ts` to regenerate.
// Placeholder types until supabase CLI generates the real schema.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type InstanceStatus = 'pending' | 'online' | 'offline' | 'reconnecting'
export type UserRole = 'admin' | 'client'
export type NotificationChannel = 'email' | 'whatsapp'
export type AlertTrigger = 'offline' | 'recovered'
export type DeliveryStatus = 'sent' | 'failed' | 'bounced'
export type DispatchStatus = 'success' | 'partial' | 'failed' | 'rejected'
export type Severity = 'info' | 'warning' | 'error'
export type TenantStatus = 'active' | 'suspended'

export interface Database {
  public: {
    Tables: {
      plans: {
        Row: { id: string; name: string; max_instances: number; description: string | null; created_at: string }
        Insert: Omit<Database['public']['Tables']['plans']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['plans']['Insert']>
      }
      tenants: {
        Row: { id: string; name: string; status: TenantStatus; plan_id: string; primary_contact_email: string; created_at: string; updated_at: string }
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>
      }
      profiles: {
        Row: { id: string; tenant_id: string | null; role: UserRole; full_name: string | null; created_at: string; updated_at: string }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      instances: {
        Row: { id: string; tenant_id: string; phone_number: string; display_name: string; status: InstanceStatus; session_data: string | null; last_seen_at: string | null; wpp_session_id: string | null; created_at: string; updated_at: string }
        Insert: Omit<Database['public']['Tables']['instances']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['instances']['Insert']>
      }
      instance_notification_configs: {
        Row: { id: string; instance_id: string; channel: NotificationChannel; recipient: string; is_global: boolean; created_at: string }
        Insert: Omit<Database['public']['Tables']['instance_notification_configs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['instance_notification_configs']['Insert']>
      }
      event_logs: {
        Row: { id: string; instance_id: string; tenant_id: string; event_type: string; severity: Severity; description: string; metadata: Json | null; created_at: string }
        Insert: Omit<Database['public']['Tables']['event_logs']['Row'], 'id' | 'created_at'>
        Update: never
      }
      dispatch_events: {
        Row: { id: string; instance_id: string; tenant_id: string; recipient_count: number; delivery_status: DispatchStatus; error_code: string | null; created_at: string }
        Insert: Omit<Database['public']['Tables']['dispatch_events']['Row'], 'id' | 'created_at'>
        Update: never
      }
      alert_windows: {
        Row: { id: string; instance_id: string; window_start: string; window_end: string; alert_sent: boolean; created_at: string }
        Insert: Omit<Database['public']['Tables']['alert_windows']['Row'], 'id' | 'created_at'>
        Update: Partial<Pick<Database['public']['Tables']['alert_windows']['Row'], 'alert_sent'>>
      }
      alert_deliveries: {
        Row: { id: string; window_id: string; instance_id: string; channel: NotificationChannel; recipient: string; status: DeliveryStatus; trigger_event: AlertTrigger; error: string | null; sent_at: string }
        Insert: Omit<Database['public']['Tables']['alert_deliveries']['Row'], 'id'>
        Update: never
      }
    }
  }
}
