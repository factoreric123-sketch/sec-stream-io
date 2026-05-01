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
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_last4: string
          key_plaintext: string
          key_prefix: string
          label: string
          last_used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_last4: string
          key_plaintext: string
          key_prefix: string
          label?: string
          last_used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_last4?: string
          key_plaintext?: string
          key_prefix?: string
          label?: string
          last_used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          plan: string
          rate_limit_per_min: number
          renewal_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          plan?: string
          rate_limit_per_min?: number
          renewal_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          plan?: string
          rate_limit_per_min?: number
          renewal_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      sec_filings: {
        Row: {
          accession_no: string
          cash_and_equivalents: number | null
          cik: string | null
          cluster_count: number | null
          company_name: string | null
          current_ratio: number | null
          debt_to_equity: number | null
          delta_ownership: number | null
          exchange: string | null
          filed_at: string | null
          fiscal_year_end: string | null
          form_type: string | null
          insider_name: string | null
          insider_title: string | null
          is_derivative: boolean | null
          net_income: number | null
          operating_cash_flow: number | null
          period_of_report: string | null
          price_per_share: number | null
          revenue: number | null
          security_title: string | null
          shares_owned_after: number | null
          shares_owned_before: number | null
          sic: string | null
          sic_description: string | null
          ticker: string | null
          total_assets: number | null
          total_debt: number | null
          total_equity: number | null
          total_liabilities: number | null
          total_value: number | null
          transaction_code: string | null
          transaction_date: string | null
          transaction_shares: number | null
        }
        Insert: {
          accession_no: string
          cash_and_equivalents?: number | null
          cik?: string | null
          cluster_count?: number | null
          company_name?: string | null
          current_ratio?: number | null
          debt_to_equity?: number | null
          delta_ownership?: number | null
          exchange?: string | null
          filed_at?: string | null
          fiscal_year_end?: string | null
          form_type?: string | null
          insider_name?: string | null
          insider_title?: string | null
          is_derivative?: boolean | null
          net_income?: number | null
          operating_cash_flow?: number | null
          period_of_report?: string | null
          price_per_share?: number | null
          revenue?: number | null
          security_title?: string | null
          shares_owned_after?: number | null
          shares_owned_before?: number | null
          sic?: string | null
          sic_description?: string | null
          ticker?: string | null
          total_assets?: number | null
          total_debt?: number | null
          total_equity?: number | null
          total_liabilities?: number | null
          total_value?: number | null
          transaction_code?: string | null
          transaction_date?: string | null
          transaction_shares?: number | null
        }
        Update: {
          accession_no?: string
          cash_and_equivalents?: number | null
          cik?: string | null
          cluster_count?: number | null
          company_name?: string | null
          current_ratio?: number | null
          debt_to_equity?: number | null
          delta_ownership?: number | null
          exchange?: string | null
          filed_at?: string | null
          fiscal_year_end?: string | null
          form_type?: string | null
          insider_name?: string | null
          insider_title?: string | null
          is_derivative?: boolean | null
          net_income?: number | null
          operating_cash_flow?: number | null
          period_of_report?: string | null
          price_per_share?: number | null
          revenue?: number | null
          security_title?: string | null
          shares_owned_after?: number | null
          shares_owned_before?: number | null
          sic?: string | null
          sic_description?: string | null
          ticker?: string | null
          total_assets?: number | null
          total_debt?: number | null
          total_equity?: number | null
          total_liabilities?: number | null
          total_value?: number | null
          transaction_code?: string | null
          transaction_date?: string | null
          transaction_shares?: number | null
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          created_at: string
          endpoint: string
          id: number
          latency_ms: number
          status: number
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: number
          latency_ms?: number
          status?: number
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: number
          latency_ms?: number
          status?: number
          user_id?: string
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
