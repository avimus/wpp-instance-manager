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
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
    Tables: {
      plans: {
        Row: {
          id: string
          name: string
          max_instances: number
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          max_instances: number
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          max_instances?: number
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          id: string
          name: string
          status: TenantStatus
          plan_id: string
          primary_contact_email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          status?: TenantStatus
          plan_id: string
          primary_contact_email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          status?: TenantStatus
          plan_id?: string
          primary_contact_email?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'tenants_plan_id_fkey'; columns: ['plan_id']; isOneToOne: false; referencedRelation: 'plans'; referencedColumns: ['id'] }
        ]
      }
      profiles: {
        Row: {
          id: string
          tenant_id: string | null
          role: UserRole
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tenant_id?: string | null
          role: UserRole
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          role?: UserRole
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'profiles_tenant_id_fkey'; columns: ['tenant_id']; isOneToOne: false; referencedRelation: 'tenants'; referencedColumns: ['id'] }
        ]
      }
      instances: {
        Row: {
          id: string
          tenant_id: string
          phone_number: string
          display_name: string
          status: InstanceStatus
          session_data: string | null
          last_seen_at: string | null
          wpp_session_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          phone_number: string
          display_name: string
          status?: InstanceStatus
          session_data?: string | null
          last_seen_at?: string | null
          wpp_session_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          phone_number?: string
          display_name?: string
          status?: InstanceStatus
          session_data?: string | null
          last_seen_at?: string | null
          wpp_session_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'instances_tenant_id_fkey'; columns: ['tenant_id']; isOneToOne: false; referencedRelation: 'tenants'; referencedColumns: ['id'] }
        ]
      }
      instance_notification_configs: {
        Row: {
          id: string
          instance_id: string
          channel: NotificationChannel
          recipient: string
          is_global: boolean
          created_at: string
        }
        Insert: {
          id?: string
          instance_id: string
          channel: NotificationChannel
          recipient: string
          is_global?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          instance_id?: string
          channel?: NotificationChannel
          recipient?: string
          is_global?: boolean
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'instance_notification_configs_instance_id_fkey'; columns: ['instance_id']; isOneToOne: false; referencedRelation: 'instances'; referencedColumns: ['id'] }
        ]
      }
      event_logs: {
        Row: {
          id: string
          instance_id: string
          tenant_id: string
          event_type: string
          severity: Severity
          description: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          instance_id: string
          tenant_id: string
          event_type: string
          severity: Severity
          description: string
          metadata?: Json | null
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: [
          { foreignKeyName: 'event_logs_instance_id_fkey'; columns: ['instance_id']; isOneToOne: false; referencedRelation: 'instances'; referencedColumns: ['id'] }
        ]
      }
      dispatch_events: {
        Row: {
          id: string
          instance_id: string
          tenant_id: string
          recipient_count: number
          delivery_status: DispatchStatus
          error_code: string | null
          created_at: string
        }
        Insert: {
          id?: string
          instance_id: string
          tenant_id: string
          recipient_count: number
          delivery_status: DispatchStatus
          error_code?: string | null
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: [
          { foreignKeyName: 'dispatch_events_instance_id_fkey'; columns: ['instance_id']; isOneToOne: false; referencedRelation: 'instances'; referencedColumns: ['id'] }
        ]
      }
      alert_windows: {
        Row: {
          id: string
          instance_id: string
          window_start: string
          window_end: string
          alert_sent: boolean
          created_at: string
        }
        Insert: {
          id?: string
          instance_id: string
          window_start: string
          window_end: string
          alert_sent?: boolean
          created_at?: string
        }
        Update: {
          alert_sent?: boolean
        }
        Relationships: [
          { foreignKeyName: 'alert_windows_instance_id_fkey'; columns: ['instance_id']; isOneToOne: false; referencedRelation: 'instances'; referencedColumns: ['id'] }
        ]
      }
      alert_deliveries: {
        Row: {
          id: string
          window_id: string
          instance_id: string
          channel: NotificationChannel
          recipient: string
          status: DeliveryStatus
          trigger_event: AlertTrigger
          error: string | null
          sent_at: string
        }
        Insert: {
          id?: string
          window_id: string
          instance_id: string
          channel: NotificationChannel
          recipient: string
          status: DeliveryStatus
          trigger_event: AlertTrigger
          error?: string | null
          sent_at?: string
        }
        Update: Record<string, never>
        Relationships: [
          { foreignKeyName: 'alert_deliveries_instance_id_fkey'; columns: ['instance_id']; isOneToOne: false; referencedRelation: 'instances'; referencedColumns: ['id'] }
        ]
      }
    }
  }
}
