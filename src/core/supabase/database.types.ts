export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
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
      [_ in never]: never
    }
    Enums: {
      account_type: "client" | "internal"
      permission_effect: "allow" | "deny"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  TableName extends keyof (Database["public"]["Tables"] & Database["public"]["Views"]),
> = (Database["public"]["Tables"] & Database["public"]["Views"])[TableName] extends { Row: infer R }
  ? R
  : never

export type TablesInsert<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName] extends { Insert: infer I } ? I : never

export type TablesUpdate<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName] extends { Update: infer U } ? U : never

export type Enums<EnumName extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][EnumName]

export const Constants = {
  public: {
    Enums: {
      account_type: ["client", "internal"],
      permission_effect: ["allow", "deny"],
    },
  },
} as const
