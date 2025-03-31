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
      assistants: {
        Row: {
          assistant_id: string
          created_at: string
          first_message: string | null
          id: string
          name: string
          status: string | null
          system_prompt: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assistant_id: string
          created_at?: string
          first_message?: string | null
          id?: string
          name: string
          status?: string | null
          system_prompt?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assistant_id?: string
          created_at?: string
          first_message?: string | null
          id?: string
          name?: string
          status?: string | null
          system_prompt?: string | null
          updated_at?: string
          user_id?: string | null
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
          created_at: string
          duration: number | null
          id: string
          recording_url: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          assistant_id?: string | null
          call_end?: string | null
          call_start?: string | null
          call_summary?: string | null
          campaign_id?: number | null
          client_id?: number | null
          created_at?: string
          duration?: number | null
          id?: string
          recording_url?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          assistant_id?: string | null
          call_end?: string | null
          call_start?: string | null
          call_summary?: string | null
          campaign_id?: number | null
          client_id?: number | null
          created_at?: string
          duration?: number | null
          id?: string
          recording_url?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
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
          call_duration: number | null
          call_timestamp: string | null
          campaign_id: number | null
          client_id: number | null
          created_at: string
          id: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          call_duration?: number | null
          call_timestamp?: string | null
          campaign_id?: number | null
          client_id?: number | null
          created_at?: string
          id?: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          call_duration?: number | null
          call_timestamp?: string | null
          campaign_id?: number | null
          client_id?: number | null
          created_at?: string
          id?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          answered_calls: number | null
          average_duration: number | null
          created_at: string
          end_date: string | null
          id: number
          name: string | null
          start_date: string | null
          status: string | null
          total_calls: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          answered_calls?: number | null
          average_duration?: number | null
          created_at?: string
          end_date?: string | null
          id?: number
          name?: string | null
          start_date?: string | null
          status?: string | null
          total_calls?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          answered_calls?: number | null
          average_duration?: number | null
          created_at?: string
          end_date?: string | null
          id?: number
          name?: string | null
          start_date?: string | null
          status?: string | null
          total_calls?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      client_group_members: {
        Row: {
          client_id: number | null
          created_at: string
          group_id: string | null
          id: string
        }
        Insert: {
          client_id?: number | null
          created_at?: string
          group_id?: string | null
          id?: string
        }
        Update: {
          client_id?: number | null
          created_at?: string
          group_id?: string | null
          id?: string
        }
        Relationships: []
      }
      client_groups: {
        Row: {
          client_count: number | null
          created_at: string
          description: string | null
          group: string | null
          id: number
          name: string | null
          user_id: string | null
        }
        Insert: {
          client_count?: number | null
          created_at?: string
          description?: string | null
          group?: string | null
          id?: number
          name?: string | null
          user_id?: string | null
        }
        Update: {
          client_count?: number | null
          created_at?: string
          description?: string | null
          group?: string | null
          id?: number
          name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          id: number
          name: string | null
          phone: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: number
          name?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: number
          name?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
        }
        Relationships: []
      }
      training_data: {
        Row: {
          created_at: string
          id: number
          model_id: number
          prompt: string
          response: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          model_id?: number
          prompt?: string
          response?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
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
          created_at: string
          description: string | null
          id: number
          last_trained: string | null
          name: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: number
          last_trained?: string | null
          name?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: number
          last_trained?: string | null
          name?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          id: string
          processing_time: number | null
          request_data: Json
          response_data: Json | null
          success: boolean
          updated_at: string
          webhook_url: string
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          id?: string
          processing_time?: number | null
          request_data: Json
          response_data?: Json | null
          success?: boolean
          updated_at?: string
          webhook_url: string
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          id?: string
          processing_time?: number | null
          request_data?: Json
          response_data?: Json | null
          success?: boolean
          updated_at?: string
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
