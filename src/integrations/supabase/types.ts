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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_secrets: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          admin_notes: string | null
          canceled_at: string | null
          cep: string | null
          city: string | null
          cod_method: string | null
          complement: string | null
          created_at: string
          customer_cpf: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          delivery_method: string
          discount_cents: number
          distance_km: number | null
          district: string | null
          freight_cents: number
          freight_mode: string | null
          id: string
          number: string | null
          order_number: string
          paid_at: string | null
          payment_method: string
          pix_copy_paste: string | null
          product_name: string
          product_slug: string
          public_token: string
          quantity: number
          src: string | null
          status: string
          stock_reserved: boolean
          street: string | null
          subtotal_cents: number
          total_cents: number
          uf: string | null
          unit_price_cents: number
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          vega_status: string | null
          vega_transaction_token: string | null
        }
        Insert: {
          admin_notes?: string | null
          canceled_at?: string | null
          cep?: string | null
          city?: string | null
          cod_method?: string | null
          complement?: string | null
          created_at?: string
          customer_cpf: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivered_at?: string | null
          delivery_method: string
          discount_cents?: number
          distance_km?: number | null
          district?: string | null
          freight_cents?: number
          freight_mode?: string | null
          id?: string
          number?: string | null
          order_number: string
          paid_at?: string | null
          payment_method: string
          pix_copy_paste?: string | null
          product_name: string
          product_slug: string
          public_token: string
          quantity: number
          src?: string | null
          status: string
          stock_reserved?: boolean
          street?: string | null
          subtotal_cents: number
          total_cents: number
          uf?: string | null
          unit_price_cents: number
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          vega_status?: string | null
          vega_transaction_token?: string | null
        }
        Update: {
          admin_notes?: string | null
          canceled_at?: string | null
          cep?: string | null
          city?: string | null
          cod_method?: string | null
          complement?: string | null
          created_at?: string
          customer_cpf?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          delivered_at?: string | null
          delivery_method?: string
          discount_cents?: number
          distance_km?: number | null
          district?: string | null
          freight_cents?: number
          freight_mode?: string | null
          id?: string
          number?: string | null
          order_number?: string
          paid_at?: string | null
          payment_method?: string
          pix_copy_paste?: string | null
          product_name?: string
          product_slug?: string
          public_token?: string
          quantity?: number
          src?: string | null
          status?: string
          stock_reserved?: boolean
          street?: string | null
          subtotal_cents?: number
          total_cents?: number
          uf?: string | null
          unit_price_cents?: number
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          vega_status?: string | null
          vega_transaction_token?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          price_cents: number
          slug: string
          stock: number
          updated_at: string
          vega_checkout_url: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          price_cents: number
          slug: string
          stock?: number
          updated_at?: string
          vega_checkout_url?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          price_cents?: number
          slug?: string
          stock?: number
          updated_at?: string
          vega_checkout_url?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          card_enabled: boolean
          cod_enabled: boolean
          cod_methods: string[]
          delivery_estimate_text: string
          extra_km_price_cents: number | null
          free_shipping_radius_km: number
          id: number
          pay_on_delivery_max_km: number
          pix_enabled: boolean
          road_factor: number
          site_url: string
          updated_at: string
          vega_base_url: string
          vega_domain: string
          whatsapp_number: string
        }
        Insert: {
          card_enabled?: boolean
          cod_enabled?: boolean
          cod_methods?: string[]
          delivery_estimate_text?: string
          extra_km_price_cents?: number | null
          free_shipping_radius_km?: number
          id?: number
          pay_on_delivery_max_km?: number
          pix_enabled?: boolean
          road_factor?: number
          site_url?: string
          updated_at?: string
          vega_base_url?: string
          vega_domain?: string
          whatsapp_number?: string
        }
        Update: {
          card_enabled?: boolean
          cod_enabled?: boolean
          cod_methods?: string[]
          delivery_estimate_text?: string
          extra_km_price_cents?: number | null
          free_shipping_radius_km?: number
          id?: number
          pay_on_delivery_max_km?: number
          pix_enabled?: boolean
          road_factor?: number
          site_url?: string
          updated_at?: string
          vega_base_url?: string
          vega_domain?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          id: string
          order_number: string | null
          payload: Json
          result: string
          source: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_number?: string | null
          payload: Json
          result: string
          source: string
        }
        Update: {
          created_at?: string
          id?: string
          order_number?: string | null
          payload?: Json
          result?: string
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_stock: {
        Args: { _delta: number; _slug: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hit_rate_limit: {
        Args: { _key: string; _max: number; _window_seconds: number }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
