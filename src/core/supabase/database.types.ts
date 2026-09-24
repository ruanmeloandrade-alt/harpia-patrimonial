export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      automation_action_runs: {
        Row: {
          action_id: string
          action_type: string
          attempt_count: number
          automation_id: string
          created_at: string
          event_id: string
          result: Json
          status: string
          updated_at: string
        }
        Insert: {
          action_id: string
          action_type: string
          attempt_count?: number
          automation_id: string
          created_at?: string
          event_id: string
          result?: Json
          status: string
          updated_at?: string
        }
        Update: {
          action_id?: string
          action_type?: string
          attempt_count?: number
          automation_id?: string
          created_at?: string
          event_id?: string
          result?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_action_runs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "automation_event_outbox"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_event_outbox: {
        Row: {
          attempts: number
          available_at: string
          conversation_id: string | null
          created_at: string
          event_type: string
          id: string
          last_error: string | null
          lead_id: string | null
          payload: Json
          processed_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          available_at?: string
          conversation_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          last_error?: string | null
          lead_id?: string | null
          payload?: Json
          processed_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          available_at?: string
          conversation_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          last_error?: string | null
          lead_id?: string | null
          payload?: Json
          processed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      catalog_items: {
        Row: {
          address: string | null
          city: string
          code: string
          condominium: string | null
          created_at: string
          deleted_at: string | null
          description: string
          developer: string | null
          features: string[]
          id: string
          is_launch: boolean
          kind: Database["public"]["Enums"]["catalog_item_kind"]
          lifestyle_tags: string[]
          media: Json
          name: string
          neighborhood: string
          parent_id: string | null
          price: number | null
          published_at: string | null
          purpose: Database["public"]["Enums"]["catalog_purpose"]
          sold_at: string | null
          status: Database["public"]["Enums"]["catalog_status"]
          typology: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city: string
          code: string
          condominium?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          developer?: string | null
          features?: string[]
          id?: string
          is_launch?: boolean
          kind: Database["public"]["Enums"]["catalog_item_kind"]
          lifestyle_tags?: string[]
          media?: Json
          name: string
          neighborhood?: string
          parent_id?: string | null
          price?: number | null
          published_at?: string | null
          purpose: Database["public"]["Enums"]["catalog_purpose"]
          sold_at?: string | null
          status?: Database["public"]["Enums"]["catalog_status"]
          typology?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string
          code?: string
          condominium?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          developer?: string | null
          features?: string[]
          id?: string
          is_launch?: boolean
          kind?: Database["public"]["Enums"]["catalog_item_kind"]
          lifestyle_tags?: string[]
          media?: Json
          name?: string
          neighborhood?: string
          parent_id?: string | null
          price?: number | null
          published_at?: string | null
          purpose?: Database["public"]["Enums"]["catalog_purpose"]
          sold_at?: string | null
          status?: Database["public"]["Enums"]["catalog_status"]
          typology?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      client_favorites: {
        Row: {
          client_id: string
          created_at: string
          item_id: string
          item_slug: string
        }
        Insert: {
          client_id: string
          created_at?: string
          item_id: string
          item_slug: string
        }
        Update: {
          client_id?: string
          created_at?: string
          item_id?: string
          item_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_favorites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_favorites_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      f05_shared_storage: {
        Row: {
          revision: number
          storage_key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          revision?: number
          storage_key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          revision?: number
          storage_key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "f05_shared_storage_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_permissions: {
        Row: {
          created_at: string
          effect: Database["public"]["Enums"]["permission_effect"]
          group_id: string
          permission_id: string
        }
        Insert: {
          created_at?: string
          effect?: Database["public"]["Enums"]["permission_effect"]
          group_id: string
          permission_id: string
        }
        Update: {
          created_at?: string
          effect?: Database["public"]["Enums"]["permission_effect"]
          group_id?: string
          permission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_permissions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "permission_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_channel_accounts: {
        Row: {
          channel: string
          connection_id: string | null
          connector_version: string | null
          created_at: string
          display_name: string | null
          external_account_id: string | null
          id: string
          last_error_at: string | null
          last_error_code: string | null
          last_event_at: string | null
          last_heartbeat_at: string | null
          metadata: Json
          phone_number: string | null
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          channel?: string
          connection_id?: string | null
          connector_version?: string | null
          created_at?: string
          display_name?: string | null
          external_account_id?: string | null
          id?: string
          last_error_at?: string | null
          last_error_code?: string | null
          last_event_at?: string | null
          last_heartbeat_at?: string | null
          metadata?: Json
          phone_number?: string | null
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          connection_id?: string | null
          connector_version?: string | null
          created_at?: string
          display_name?: string | null
          external_account_id?: string | null
          id?: string
          last_error_at?: string | null
          last_error_code?: string | null
          last_event_at?: string | null
          last_heartbeat_at?: string | null
          metadata?: Json
          phone_number?: string | null
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_channel_accounts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_conversations: {
        Row: {
          channel: string
          channel_account_id: string | null
          created_at: string
          external_thread_id: string | null
          id: string
          last_message_at: string | null
          lead_id: string
          provider: string
          transport_status: string
          updated_at: string
        }
        Insert: {
          channel?: string
          channel_account_id?: string | null
          created_at?: string
          external_thread_id?: string | null
          id: string
          last_message_at?: string | null
          lead_id: string
          provider?: string
          transport_status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          channel_account_id?: string | null
          created_at?: string
          external_thread_id?: string | null
          id?: string
          last_message_at?: string | null
          lead_id?: string
          provider?: string
          transport_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_conversations_channel_account_id_fkey"
            columns: ["channel_account_id"]
            isOneToOne: false
            referencedRelation: "inbox_channel_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_message_attachments: {
        Row: {
          created_at: string
          id: string
          message_id: string
          metadata: Json
          mime_type: string | null
          name: string | null
          provider_media_id: string | null
          size_bytes: number | null
          storage_bucket: string | null
          storage_path: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          metadata?: Json
          mime_type?: string | null
          name?: string | null
          provider_media_id?: string | null
          size_bytes?: number | null
          storage_bucket?: string | null
          storage_path?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          metadata?: Json
          mime_type?: string | null
          name?: string | null
          provider_media_id?: string | null
          size_bytes?: number | null
          storage_bucket?: string | null
          storage_path?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbox_message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "inbox_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_messages: {
        Row: {
          conversation_id: string
          created_at: string
          delivery_status: string
          direction: string
          error_code: string | null
          error_message: string | null
          external_message_id: string | null
          form_payload: Json | null
          id: string
          provider: string
          provider_timestamp: string | null
          text_content: string | null
          type: string
          updated_at: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          delivery_status: string
          direction: string
          error_code?: string | null
          error_message?: string | null
          external_message_id?: string | null
          form_payload?: Json | null
          id: string
          provider?: string
          provider_timestamp?: string | null
          text_content?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          delivery_status?: string
          direction?: string
          error_code?: string | null
          error_message?: string | null
          external_message_id?: string | null
          form_payload?: Json | null
          id?: string
          provider?: string
          provider_timestamp?: string | null
          text_content?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "inbox_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          account_label: string | null
          connected_at: string | null
          created_at: string
          external_account_id: string | null
          id: string
          last_error_at: string | null
          last_error_code: string | null
          last_event_at: string | null
          last_health_at: string | null
          metadata: Json
          provider: string
          revision: number
          status: string
          updated_at: string
        }
        Insert: {
          account_label?: string | null
          connected_at?: string | null
          created_at?: string
          external_account_id?: string | null
          id?: string
          last_error_at?: string | null
          last_error_code?: string | null
          last_event_at?: string | null
          last_health_at?: string | null
          metadata?: Json
          provider: string
          revision?: number
          status?: string
          updated_at?: string
        }
        Update: {
          account_label?: string | null
          connected_at?: string | null
          created_at?: string
          external_account_id?: string | null
          id?: string
          last_error_at?: string | null
          last_error_code?: string | null
          last_event_at?: string | null
          last_health_at?: string | null
          metadata?: Json
          provider?: string
          revision?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      integration_events: {
        Row: {
          attempt: number
          connection_id: string | null
          error_code: string | null
          error_message: string | null
          event_type: string
          external_id: string | null
          id: string
          latency_ms: number | null
          metadata: Json
          occurred_at: string
          provider: string
          success: boolean
        }
        Insert: {
          attempt?: number
          connection_id?: string | null
          error_code?: string | null
          error_message?: string | null
          event_type: string
          external_id?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json
          occurred_at?: string
          provider: string
          success: boolean
        }
        Update: {
          attempt?: number
          connection_id?: string | null
          error_code?: string | null
          error_message?: string | null
          event_type?: string
          external_id?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json
          occurred_at?: string
          provider?: string
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "integration_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_assignee_directory: {
        Row: {
          full_name: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          full_name: string
          id: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          full_name?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_assignee_directory_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          city: string | null
          company_name: string
          document: string | null
          email: string | null
          id: number
          legal_name: string | null
          phone: string | null
          preferences: Json
          state: string | null
          updated_at: string
          website: string
        }
        Insert: {
          city?: string | null
          company_name?: string
          document?: string | null
          email?: string | null
          id?: number
          legal_name?: string | null
          phone?: string | null
          preferences?: Json
          state?: string | null
          updated_at?: string
          website?: string
        }
        Update: {
          city?: string | null
          company_name?: string
          document?: string | null
          email?: string | null
          id?: number
          legal_name?: string | null
          phone?: string | null
          preferences?: Json
          state?: string | null
          updated_at?: string
          website?: string
        }
        Relationships: []
      }
      permission_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          label: string
          module: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          label: string
          module: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          label?: string
          module?: string
        }
        Relationships: []
      }
      platform_module_state: {
        Row: {
          module: string
          revision: number
          state: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          module: string
          revision?: number
          state: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          module?: string
          revision?: number
          state?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_module_state_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_group_memberships: {
        Row: {
          created_at: string
          group_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "permission_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_group_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permission_overrides: {
        Row: {
          created_at: string
          effect: Database["public"]["Enums"]["permission_effect"]
          permission_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          effect: Database["public"]["Enums"]["permission_effect"]
          permission_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          effect?: Database["public"]["Enums"]["permission_effect"]
          permission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_overrides_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permission_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          full_name?: string
          id: string
          is_active?: boolean
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      current_user_permissions: {
        Row: {
          permission_key: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_apply_crm_automation_action: {
        Args: { p_action_type: string; p_config?: Json; p_lead_id: string }
        Returns: Json
      }
      admin_claim_automation_events: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          available_at: string
          conversation_id: string | null
          created_at: string
          event_type: string
          id: string
          last_error: string | null
          lead_id: string | null
          payload: Json
          processed_at: string | null
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "automation_event_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_delete_ai_credential: {
        Args: { p_profile_id: string; p_secret_ref?: string }
        Returns: boolean
      }
      admin_delete_whatsapp_auth_state: {
        Args: { p_session_id: string; p_state_key?: string }
        Returns: number
      }
      admin_finish_automation_event: {
        Args: {
          p_error?: string
          p_id: string
          p_retry_after_seconds?: number
          p_success: boolean
        }
        Returns: undefined
      }
      admin_get_whatsapp_auth_state: {
        Args: { p_session_id: string; p_state_key: string }
        Returns: string
      }
      admin_ingest_public_lead: {
        Args: {
          p_action?: string
          p_email?: string
          p_interest?: Json
          p_metadata?: Json
          p_name: string
          p_occurred_at?: string
          p_origin?: string
          p_page?: string
          p_whatsapp?: string
        }
        Returns: string
      }
      admin_ingest_whatsapp_message: {
        Args: {
          p_attachment?: Json
          p_display_name: string
          p_external_message_id: string
          p_metadata?: Json
          p_phone: string
          p_received_at?: string
          p_text?: string
          p_thread_id: string
          p_type: string
        }
        Returns: Json
      }
      admin_mark_stale_whatsapp_connector: { Args: never; Returns: number }
      admin_prepare_whatsapp_conversation: {
        Args: { p_conversation_id: string }
        Returns: Json
      }
      admin_resolve_ai_credential: {
        Args: { p_profile_id: string; p_secret_ref: string }
        Returns: string
      }
      admin_resolve_or_create_whatsapp_lead: {
        Args: { p_display_name?: string; p_metadata?: Json; p_phone: string }
        Returns: string
      }
      admin_store_ai_credential: {
        Args: { p_api_key: string; p_profile_id: string }
        Returns: string
      }
      admin_upsert_whatsapp_auth_state: {
        Args: {
          p_encrypted_value: string
          p_session_id: string
          p_state_key: string
        }
        Returns: undefined
      }
      admin_validate_f05_scheduler_token: {
        Args: { p_token: string }
        Returns: boolean
      }
      f05_remove_ai_secret: { Args: { p_profile_id: string }; Returns: boolean }
      f05_resolve_ai_secret: {
        Args: { p_profile_id: string; p_secret_ref: string }
        Returns: string
      }
      f05_store_ai_secret: {
        Args: { p_actor?: string; p_profile_id: string; p_secret: string }
        Returns: string
      }
      list_internal_assignees: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      save_f05_shared_storage: {
        Args: {
          p_expected_revision: number
          p_storage_key: string
          p_value: Json
        }
        Returns: number
      }
      save_platform_module_state: {
        Args: { p_expected_revision: number; p_module: string; p_state: Json }
        Returns: number
      }
    }
    Enums: {
      account_type: "client" | "internal"
      catalog_item_kind: "development" | "unit" | "standalone"
      catalog_purpose: "sale" | "rent"
      catalog_status: "draft" | "published" | "paused" | "sold"
      permission_effect: "allow" | "deny"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["client", "internal"],
      catalog_item_kind: ["development", "unit", "standalone"],
      catalog_purpose: ["sale", "rent"],
      catalog_status: ["draft", "published", "paused", "sold"],
      permission_effect: ["allow", "deny"],
    },
  },
} as const
