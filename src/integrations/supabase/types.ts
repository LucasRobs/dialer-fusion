export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      assistants: {
        Row: {
          assistant_id: string
          created_at: string | null
          first_message: string | null
          id: string
          model: string | null
          name: string
          published: boolean | null
          status: string | null
          system_prompt: string | null
          updated_at: string | null
          user_id: string | null
          voice: string | null
          voice_id: string | null
        }
        Insert: {
          assistant_id: string
          created_at?: string | null
          first_message?: string | null
          id?: string
          model?: string | null
          name: string
          published?: boolean | null
          status?: string | null
          system_prompt?: string | null
          updated_at?: string | null
          user_id?: string | null
          voice?: string | null
          voice_id?: string | null
        }
        Update: {
          assistant_id?: string
          created_at?: string | null
          first_message?: string | null
          id?: string
          model?: string | null
          name?: string
          published?: boolean | null
          status?: string | null
          system_prompt?: string | null
          updated_at?: string | null
          user_id?: string | null
          voice?: string | null
          voice_id?: string | null
        }
        Relationships: []
      }
      calls: {
        Row: {
          assistant_id: string | null
          call_end: string | null
          call_start: string | null
          call_summary: string | null
          campaign_id: number | null
          client_id: number | null
          created_at: string | null
          duration: number | null
          id: number
          recording_url: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assistant_id?: string | null
          call_end?: string | null
          call_start?: string | null
          call_summary?: string | null
          campaign_id?: number | null
          client_id?: number | null
          created_at?: string | null
          duration?: number | null
          id?: number
          recording_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assistant_id?: string | null
          call_end?: string | null
          call_start?: string | null
          call_summary?: string | null
          campaign_id?: number | null
          client_id?: number | null
          created_at?: string | null
          duration?: number | null
          id?: number
          recording_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_assistant_id_fkey"
            columns: ["assistant_id"]
            isOneToOne: false
            referencedRelation: "assistants"
            referencedColumns: ["assistant_id"]
          },
          {
            foreignKeyName: "calls_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_clients: {
        Row: {
          campaign_id: number
          client_id: number
          created_at: string | null
          id: number
          status: string | null
        }
        Insert: {
          campaign_id: number
          client_id: number
          created_at?: string | null
          id?: number
          status?: string | null
        }
        Update: {
          campaign_id?: number
          client_id?: number
          created_at?: string | null
          id?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_clients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          answered_calls: number | null
          assistant_id: string | null
          average_duration: number | null
          client_group_id: number | null
          created_at: string | null
          end_date: string | null
          id: number
          name: string
          start_date: string | null
          status: string | null
          total_calls: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          answered_calls?: number | null
          assistant_id?: string | null
          average_duration?: number | null
          client_group_id?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: number
          name: string
          start_date?: string | null
          status?: string | null
          total_calls?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          answered_calls?: number | null
          assistant_id?: string | null
          average_duration?: number | null
          client_group_id?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: number
          name?: string
          start_date?: string | null
          status?: string | null
          total_calls?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_client_group_id_fkey"
            columns: ["client_group_id"]
            isOneToOne: false
            referencedRelation: "client_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      client_group_members: {
        Row: {
          client_id: number | null
          created_at: string | null
          group_id: number | null
          id: number
        }
        Insert: {
          client_id?: number | null
          created_at?: string | null
          group_id?: number | null
          id?: number
        }
        Update: {
          client_id?: number | null
          created_at?: string | null
          group_id?: number | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_group_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "client_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      client_groups: {
        Row: {
          client_count: number | null
          created_at: string | null
          description: string | null
          id: number
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          client_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: number
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          client_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: number
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          account_id: string | null
          created_at: string | null
          email: string | null
          id: number
          name: string
          phone: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          name: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          name?: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      training_data: {
        Row: {
          created_at: string | null
          id: number
          model_id: number
          prompt: string
          response: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          model_id: number
          prompt: string
          response: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          model_id?: number
          prompt?: string
          response?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_data_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "training_models"
            referencedColumns: ["id"]
          },
        ]
      }
      training_models: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          last_trained: string | null
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          last_trained?: string | null
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          last_trained?: string | null
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          action: string
          created_at: string | null
          error_message: string | null
          id: number
          processing_time: number | null
          request_data: Json
          response_data: Json | null
          success: boolean | null
          updated_at: string | null
          webhook_url: string
        }
        Insert: {
          action: string
          created_at?: string | null
          error_message?: string | null
          id?: number
          processing_time?: number | null
          request_data: Json
          response_data?: Json | null
          success?: boolean | null
          updated_at?: string | null
          webhook_url: string
        }
        Update: {
          action?: string
          created_at?: string | null
          error_message?: string | null
          id?: number
          processing_time?: number | null
          request_data?: Json
          response_data?: Json | null
          success?: boolean | null
          updated_at?: string | null
          webhook_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
