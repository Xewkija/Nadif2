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
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      access_policies: {
        Row: {
          applies_to_property_types:
            | Database["public"]["Enums"]["property_type"][]
            | null
          applies_to_service_types:
            | Database["public"]["Enums"]["service_type_code"][]
            | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          policy_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          applies_to_property_types?:
            | Database["public"]["Enums"]["property_type"][]
            | null
          applies_to_service_types?:
            | Database["public"]["Enums"]["service_type_code"][]
            | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          policy_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          applies_to_property_types?:
            | Database["public"]["Enums"]["property_type"][]
            | null
          applies_to_service_types?:
            | Database["public"]["Enums"]["service_type_code"][]
            | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          policy_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      add_ons: {
        Row: {
          archived_at: string | null
          created_at: string
          description: string | null
          display_order: number
          icon_name: string | null
          id: string
          is_active: boolean
          name: string
          price_cents: number
          price_type: string
          scope_mode: Database["public"]["Enums"]["addon_scope_mode"]
          scoped_service_ids: string[] | null
          scoped_service_types:
            | Database["public"]["Enums"]["service_type_code"][]
            | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_cents: number
          price_type?: string
          scope_mode?: Database["public"]["Enums"]["addon_scope_mode"]
          scoped_service_ids?: string[] | null
          scoped_service_types?:
            | Database["public"]["Enums"]["service_type_code"][]
            | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          price_type?: string
          scope_mode?: Database["public"]["Enums"]["addon_scope_mode"]
          scoped_service_ids?: string[] | null
          scoped_service_types?:
            | Database["public"]["Enums"]["service_type_code"][]
            | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "add_ons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_policies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          required_role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          trigger_threshold: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          required_role?: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          trigger_threshold?: Json | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          required_role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string
          trigger_threshold?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookability_policies: {
        Row: {
          applies_to_customer_types:
            | Database["public"]["Enums"]["customer_type"][]
            | null
          applies_to_service_ids: string[] | null
          applies_to_service_types:
            | Database["public"]["Enums"]["service_type_code"][]
            | null
          conditions: Json | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          policy_type: string
          priority: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          applies_to_customer_types?:
            | Database["public"]["Enums"]["customer_type"][]
            | null
          applies_to_service_ids?: string[] | null
          applies_to_service_types?:
            | Database["public"]["Enums"]["service_type_code"][]
            | null
          conditions?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          policy_type: string
          priority?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          applies_to_customer_types?:
            | Database["public"]["Enums"]["customer_type"][]
            | null
          applies_to_service_ids?: string[] | null
          applies_to_service_types?:
            | Database["public"]["Enums"]["service_type_code"][]
            | null
          conditions?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          policy_type?: string
          priority?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookability_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_add_ons: {
        Row: {
          add_on_id: string
          booking_id: string
          created_at: string
          id: string
          price_cents: number
          quantity: number
        }
        Insert: {
          add_on_id: string
          booking_id: string
          created_at?: string
          id?: string
          price_cents: number
          quantity?: number
        }
        Update: {
          add_on_id?: string
          booking_id?: string
          created_at?: string
          id?: string
          price_cents?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_add_ons_add_on_id_fkey"
            columns: ["add_on_id"]
            isOneToOne: false
            referencedRelation: "add_ons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_add_ons_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          actual_duration_minutes: number | null
          assigned_at: string | null
          assigned_provider_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by_id: string | null
          check_in_at: string | null
          check_out_at: string | null
          completion_notes: string | null
          completion_photos: string[] | null
          created_at: string
          customer_id: string
          customer_notes: string | null
          deposit_amount_cents: number | null
          deposit_paid: boolean | null
          estimated_duration_minutes: number | null
          frequency: Database["public"]["Enums"]["booking_frequency_code"]
          id: string
          internal_notes: string | null
          is_first_occurrence_override: boolean
          pricing_snapshot: Json | null
          property_id: string
          provider_notes: string | null
          quote_accepted_at: string | null
          quote_expires_at: string | null
          quote_sent_at: string | null
          quote_version: number | null
          recurring_series_id: string | null
          scheduled_date: string | null
          scheduled_time_end: string | null
          scheduled_time_start: string | null
          scheduled_time_window:
            | Database["public"]["Enums"]["time_window_code"]
            | null
          service_id: string
          status: Database["public"]["Enums"]["booking_status"]
          tenant_id: string
          total_price_cents: number | null
          updated_at: string
        }
        Insert: {
          actual_duration_minutes?: number | null
          assigned_at?: string | null
          assigned_provider_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_id?: string | null
          check_in_at?: string | null
          check_out_at?: string | null
          completion_notes?: string | null
          completion_photos?: string[] | null
          created_at?: string
          customer_id: string
          customer_notes?: string | null
          deposit_amount_cents?: number | null
          deposit_paid?: boolean | null
          estimated_duration_minutes?: number | null
          frequency?: Database["public"]["Enums"]["booking_frequency_code"]
          id?: string
          internal_notes?: string | null
          is_first_occurrence_override?: boolean
          pricing_snapshot?: Json | null
          property_id: string
          provider_notes?: string | null
          quote_accepted_at?: string | null
          quote_expires_at?: string | null
          quote_sent_at?: string | null
          quote_version?: number | null
          recurring_series_id?: string | null
          scheduled_date?: string | null
          scheduled_time_end?: string | null
          scheduled_time_start?: string | null
          scheduled_time_window?:
            | Database["public"]["Enums"]["time_window_code"]
            | null
          service_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          tenant_id: string
          total_price_cents?: number | null
          updated_at?: string
        }
        Update: {
          actual_duration_minutes?: number | null
          assigned_at?: string | null
          assigned_provider_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by_id?: string | null
          check_in_at?: string | null
          check_out_at?: string | null
          completion_notes?: string | null
          completion_photos?: string[] | null
          created_at?: string
          customer_id?: string
          customer_notes?: string | null
          deposit_amount_cents?: number | null
          deposit_paid?: boolean | null
          estimated_duration_minutes?: number | null
          frequency?: Database["public"]["Enums"]["booking_frequency_code"]
          id?: string
          internal_notes?: string | null
          is_first_occurrence_override?: boolean
          pricing_snapshot?: Json | null
          property_id?: string
          provider_notes?: string | null
          quote_accepted_at?: string | null
          quote_expires_at?: string | null
          quote_sent_at?: string | null
          quote_version?: number | null
          recurring_series_id?: string | null
          scheduled_date?: string | null
          scheduled_time_end?: string | null
          scheduled_time_start?: string | null
          scheduled_time_window?:
            | Database["public"]["Enums"]["time_window_code"]
            | null
          service_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          tenant_id?: string
          total_price_cents?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_assigned_provider_id_fkey"
            columns: ["assigned_provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_cancelled_by_id_fkey"
            columns: ["cancelled_by_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bookings_recurring_series"
            columns: ["recurring_series_id"]
            isOneToOne: false
            referencedRelation: "recurring_series"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_property_service_history: {
        Row: {
          booking_id: string | null
          completed_at: string
          created_at: string
          customer_id: string
          id: string
          property_id: string
          service_id: string
          service_type: Database["public"]["Enums"]["service_type_code"]
          tenant_id: string
          was_deep_clean: boolean
        }
        Insert: {
          booking_id?: string | null
          completed_at: string
          created_at?: string
          customer_id: string
          id?: string
          property_id: string
          service_id: string
          service_type: Database["public"]["Enums"]["service_type_code"]
          tenant_id: string
          was_deep_clean?: boolean
        }
        Update: {
          booking_id?: string | null
          completed_at?: string
          created_at?: string
          customer_id?: string
          id?: string
          property_id?: string
          service_id?: string
          service_type?: Database["public"]["Enums"]["service_type_code"]
          tenant_id?: string
          was_deep_clean?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "customer_property_service_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_property_service_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_property_service_history_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_property_service_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_service_history_booking"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          archived_at: string | null
          auth_user_id: string | null
          communication_preferences: Json | null
          created_at: string
          customer_type: Database["public"]["Enums"]["customer_type"]
          email: string | null
          first_name: string
          id: string
          internal_notes: string | null
          is_active: boolean
          last_name: string
          notes: string | null
          phone: string | null
          phone_secondary: string | null
          preferred_contact_method: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          auth_user_id?: string | null
          communication_preferences?: Json | null
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          email?: string | null
          first_name: string
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          last_name: string
          notes?: string | null
          phone?: string | null
          phone_secondary?: string | null
          preferred_contact_method?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          auth_user_id?: string | null
          communication_preferences?: Json | null
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          email?: string | null
          first_name?: string
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          last_name?: string
          notes?: string | null
          phone?: string | null
          phone_secondary?: string | null
          preferred_contact_method?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deep_clean_policies: {
        Row: {
          action: string
          applies_to_frequencies:
            | Database["public"]["Enums"]["booking_frequency_code"][]
            | null
          applies_to_service_types:
            | Database["public"]["Enums"]["service_type_code"][]
            | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          priority: number
          tenant_id: string
          trigger_threshold: number | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          action?: string
          applies_to_frequencies?:
            | Database["public"]["Enums"]["booking_frequency_code"][]
            | null
          applies_to_service_types?:
            | Database["public"]["Enums"]["service_type_code"][]
            | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          tenant_id: string
          trigger_threshold?: number | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          action?: string
          applies_to_frequencies?:
            | Database["public"]["Enums"]["booking_frequency_code"][]
            | null
          applies_to_service_types?:
            | Database["public"]["Enums"]["service_type_code"][]
            | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          tenant_id?: string
          trigger_threshold?: number | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deep_clean_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_feedback: {
        Row: {
          created_at: string
          feedback_category: string | null
          feedback_text: string | null
          id: string
          preferred_contact_method: string | null
          rating: number
          review_token_id: string
          tenant_id: string
          wants_follow_up: boolean | null
        }
        Insert: {
          created_at?: string
          feedback_category?: string | null
          feedback_text?: string | null
          id?: string
          preferred_contact_method?: string | null
          rating: number
          review_token_id: string
          tenant_id: string
          wants_follow_up?: boolean | null
        }
        Update: {
          created_at?: string
          feedback_category?: string | null
          feedback_text?: string | null
          id?: string
          preferred_contact_method?: string | null
          rating?: number
          review_token_id?: string
          tenant_id?: string
          wants_follow_up?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_feedback_review_token_id_fkey"
            columns: ["review_token_id"]
            isOneToOne: false
            referencedRelation: "review_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_feedback_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gate_policies: {
        Row: {
          applies_to_customer_types:
            | Database["public"]["Enums"]["customer_type"][]
            | null
          applies_to_service_types:
            | Database["public"]["Enums"]["service_type_code"][]
            | null
          created_at: string
          deposit_flat_cents: number | null
          deposit_percentage: number | null
          description: string | null
          gate_type: string
          id: string
          is_active: boolean
          min_booking_amount_cents: number | null
          name: string
          priority: number
          tenant_id: string
          trigger_conditions: Json | null
          updated_at: string
        }
        Insert: {
          applies_to_customer_types?:
            | Database["public"]["Enums"]["customer_type"][]
            | null
          applies_to_service_types?:
            | Database["public"]["Enums"]["service_type_code"][]
            | null
          created_at?: string
          deposit_flat_cents?: number | null
          deposit_percentage?: number | null
          description?: string | null
          gate_type: string
          id?: string
          is_active?: boolean
          min_booking_amount_cents?: number | null
          name: string
          priority?: number
          tenant_id: string
          trigger_conditions?: Json | null
          updated_at?: string
        }
        Update: {
          applies_to_customer_types?:
            | Database["public"]["Enums"]["customer_type"][]
            | null
          applies_to_service_types?:
            | Database["public"]["Enums"]["service_type_code"][]
            | null
          created_at?: string
          deposit_flat_cents?: number | null
          deposit_percentage?: number | null
          description?: string | null
          gate_type?: string
          id?: string
          is_active?: boolean
          min_booking_amount_cents?: number | null
          name?: string
          priority?: number
          tenant_id?: string
          trigger_conditions?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_gate_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          adjustment_type: string
          adjustment_value: number
          applies_to_service_ids: string[] | null
          applies_to_service_types:
            | Database["public"]["Enums"]["service_type_code"][]
            | null
          category: Database["public"]["Enums"]["pricing_rule_category"]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_stackable: boolean
          location_id: string | null
          name: string
          priority: number
          tenant_id: string
          trigger_conditions: Json
          trigger_type: Database["public"]["Enums"]["pricing_rule_trigger"]
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          adjustment_type: string
          adjustment_value: number
          applies_to_service_ids?: string[] | null
          applies_to_service_types?:
            | Database["public"]["Enums"]["service_type_code"][]
            | null
          category: Database["public"]["Enums"]["pricing_rule_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_stackable?: boolean
          location_id?: string | null
          name: string
          priority?: number
          tenant_id: string
          trigger_conditions?: Json
          trigger_type: Database["public"]["Enums"]["pricing_rule_trigger"]
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          adjustment_type?: string
          adjustment_value?: number
          applies_to_service_ids?: string[] | null
          applies_to_service_types?:
            | Database["public"]["Enums"]["service_type_code"][]
            | null
          category?: Database["public"]["Enums"]["pricing_rule_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_stackable?: boolean
          location_id?: string | null
          name?: string
          priority?: number
          tenant_id?: string
          trigger_conditions?: Json
          trigger_type?: Database["public"]["Enums"]["pricing_rule_trigger"]
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "tenant_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          access_notes: string | null
          address_line1: string
          address_line2: string | null
          assigned_location_id: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string
          country: string
          created_at: string
          customer_id: string
          floors: number | null
          gate_code: string | null
          geocode_confidence:
            | Database["public"]["Enums"]["geocode_confidence"]
            | null
          geocoded_at: string | null
          google_place_id: string | null
          has_pets: boolean | null
          id: string
          is_active: boolean
          is_primary: boolean
          key_location: string | null
          latitude: number | null
          longitude: number | null
          parking_instructions: string | null
          pet_details: string | null
          postal_code: string
          property_type: Database["public"]["Enums"]["property_type"] | null
          square_feet: number | null
          state: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          access_notes?: string | null
          address_line1: string
          address_line2?: string | null
          assigned_location_id?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city: string
          country?: string
          created_at?: string
          customer_id: string
          floors?: number | null
          gate_code?: string | null
          geocode_confidence?:
            | Database["public"]["Enums"]["geocode_confidence"]
            | null
          geocoded_at?: string | null
          google_place_id?: string | null
          has_pets?: boolean | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          key_location?: string | null
          latitude?: number | null
          longitude?: number | null
          parking_instructions?: string | null
          pet_details?: string | null
          postal_code: string
          property_type?: Database["public"]["Enums"]["property_type"] | null
          square_feet?: number | null
          state: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          access_notes?: string | null
          address_line1?: string
          address_line2?: string | null
          assigned_location_id?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          country?: string
          created_at?: string
          customer_id?: string
          floors?: number | null
          gate_code?: string | null
          geocode_confidence?:
            | Database["public"]["Enums"]["geocode_confidence"]
            | null
          geocoded_at?: string | null
          google_place_id?: string | null
          has_pets?: boolean | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          key_location?: string | null
          latitude?: number | null
          longitude?: number | null
          parking_instructions?: string | null
          pet_details?: string | null
          postal_code?: string
          property_type?: Database["public"]["Enums"]["property_type"] | null
          square_feet?: number | null
          state?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_assigned_location_id_fkey"
            columns: ["assigned_location_id"]
            isOneToOne: false
            referencedRelation: "tenant_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_tokens: {
        Row: {
          booking_id: string
          created_at: string | null
          expires_at: string
          id: string
          tenant_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          tenant_id: string
          token?: string
          used_at?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          tenant_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_tokens_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reclean_policies: {
        Row: {
          auto_approve: boolean | null
          auto_approve_threshold_hours: number | null
          created_at: string
          description: string | null
          excluded_add_ons: string[] | null
          id: string
          included_services:
            | Database["public"]["Enums"]["service_type_code"][]
            | null
          is_active: boolean
          is_default: boolean
          max_recleans_per_booking: number
          name: string
          request_window_hours: number
          requires_description: boolean | null
          requires_photos: boolean | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auto_approve?: boolean | null
          auto_approve_threshold_hours?: number | null
          created_at?: string
          description?: string | null
          excluded_add_ons?: string[] | null
          id?: string
          included_services?:
            | Database["public"]["Enums"]["service_type_code"][]
            | null
          is_active?: boolean
          is_default?: boolean
          max_recleans_per_booking?: number
          name: string
          request_window_hours?: number
          requires_description?: boolean | null
          requires_photos?: boolean | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auto_approve?: boolean | null
          auto_approve_threshold_hours?: number | null
          created_at?: string
          description?: string | null
          excluded_add_ons?: string[] | null
          id?: string
          included_services?:
            | Database["public"]["Enums"]["service_type_code"][]
            | null
          is_active?: boolean
          is_default?: boolean
          max_recleans_per_booking?: number
          name?: string
          request_window_hours?: number
          requires_description?: boolean | null
          requires_photos?: boolean | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reclean_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_series: {
        Row: {
          created_at: string
          custom_interval_days: number | null
          customer_id: string
          end_date: string | null
          first_occurrence_override_service_id: string | null
          frequency: Database["public"]["Enums"]["booking_frequency_code"]
          horizon_weeks: number
          id: string
          last_generated_date: string | null
          next_occurrence_date: string | null
          notes: string | null
          pause_reason: string | null
          paused_at: string | null
          preferred_day_of_week: number | null
          preferred_time_end: string | null
          preferred_time_start: string | null
          preferred_time_window:
            | Database["public"]["Enums"]["time_window_code"]
            | null
          pricing_version: number
          property_id: string
          recurring_pricing_snapshot: Json | null
          service_id: string
          start_date: string
          status: Database["public"]["Enums"]["recurring_series_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_interval_days?: number | null
          customer_id: string
          end_date?: string | null
          first_occurrence_override_service_id?: string | null
          frequency: Database["public"]["Enums"]["booking_frequency_code"]
          horizon_weeks?: number
          id?: string
          last_generated_date?: string | null
          next_occurrence_date?: string | null
          notes?: string | null
          pause_reason?: string | null
          paused_at?: string | null
          preferred_day_of_week?: number | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          preferred_time_window?:
            | Database["public"]["Enums"]["time_window_code"]
            | null
          pricing_version?: number
          property_id: string
          recurring_pricing_snapshot?: Json | null
          service_id: string
          start_date: string
          status?: Database["public"]["Enums"]["recurring_series_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_interval_days?: number | null
          customer_id?: string
          end_date?: string | null
          first_occurrence_override_service_id?: string | null
          frequency?: Database["public"]["Enums"]["booking_frequency_code"]
          horizon_weeks?: number
          id?: string
          last_generated_date?: string | null
          next_occurrence_date?: string | null
          notes?: string | null
          pause_reason?: string | null
          paused_at?: string | null
          preferred_day_of_week?: number | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          preferred_time_window?:
            | Database["public"]["Enums"]["time_window_code"]
            | null
          pricing_version?: number
          property_id?: string
          recurring_pricing_snapshot?: Json | null
          service_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["recurring_series_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_series_first_occurrence_override"
            columns: ["first_occurrence_override_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_series_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_series_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_series_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_series_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      review_configs: {
        Row: {
          created_at: string
          custom_review_url: string | null
          external_prompt_minimum: number
          facebook_page_id: string | null
          facebook_review_url: string | null
          google_place_id: string | null
          google_review_url: string | null
          id: string
          internal_threshold: number
          is_active: boolean
          location_id: string | null
          primary_platform: Database["public"]["Enums"]["review_route"] | null
          secondary_platform: Database["public"]["Enums"]["review_route"] | null
          tenant_id: string
          updated_at: string
          yelp_business_id: string | null
          yelp_review_url: string | null
        }
        Insert: {
          created_at?: string
          custom_review_url?: string | null
          external_prompt_minimum?: number
          facebook_page_id?: string | null
          facebook_review_url?: string | null
          google_place_id?: string | null
          google_review_url?: string | null
          id?: string
          internal_threshold?: number
          is_active?: boolean
          location_id?: string | null
          primary_platform?: Database["public"]["Enums"]["review_route"] | null
          secondary_platform?:
            | Database["public"]["Enums"]["review_route"]
            | null
          tenant_id: string
          updated_at?: string
          yelp_business_id?: string | null
          yelp_review_url?: string | null
        }
        Update: {
          created_at?: string
          custom_review_url?: string | null
          external_prompt_minimum?: number
          facebook_page_id?: string | null
          facebook_review_url?: string | null
          google_place_id?: string | null
          google_review_url?: string | null
          id?: string
          internal_threshold?: number
          is_active?: boolean
          location_id?: string | null
          primary_platform?: Database["public"]["Enums"]["review_route"] | null
          secondary_platform?:
            | Database["public"]["Enums"]["review_route"]
            | null
          tenant_id?: string
          updated_at?: string
          yelp_business_id?: string | null
          yelp_review_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_configs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "tenant_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      review_tokens: {
        Row: {
          booking_id: string
          created_at: string
          customer_id: string
          expires_at: string
          external_click_at: string | null
          id: string
          location_id: string | null
          rated_at: string | null
          rating: number | null
          route_taken: Database["public"]["Enums"]["review_route"] | null
          tenant_id: string
          token: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          customer_id: string
          expires_at: string
          external_click_at?: string | null
          id?: string
          location_id?: string | null
          rated_at?: string | null
          rating?: number | null
          route_taken?: Database["public"]["Enums"]["review_route"] | null
          tenant_id: string
          token: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          customer_id?: string
          expires_at?: string
          external_click_at?: string | null
          id?: string
          location_id?: string | null
          rated_at?: string | null
          rating?: number | null
          route_taken?: Database["public"]["Enums"]["review_route"] | null
          tenant_id?: string
          token?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_tokens_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_tokens_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_tokens_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "tenant_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_prerequisite_policies: {
        Row: {
          created_at: string
          description: string | null
          enforcement: string
          id: string
          is_active: boolean
          name: string
          override_fee_cents: number | null
          prerequisite_service_id: string | null
          prerequisite_type: string
          prerequisite_value: Json | null
          service_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enforcement?: string
          id?: string
          is_active?: boolean
          name: string
          override_fee_cents?: number | null
          prerequisite_service_id?: string | null
          prerequisite_type: string
          prerequisite_value?: Json | null
          service_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enforcement?: string
          id?: string
          is_active?: boolean
          name?: string
          override_fee_cents?: number | null
          prerequisite_service_id?: string | null
          prerequisite_type?: string
          prerequisite_value?: Json | null
          service_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_prerequisite_policies_prerequisite_service_id_fkey"
            columns: ["prerequisite_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_prerequisite_policies_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_prerequisite_policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          allowed_frequencies:
            | Database["public"]["Enums"]["booking_frequency_code"][]
            | null
          archived_at: string | null
          base_price_cents: number
          category_id: string | null
          color_hex: string | null
          created_at: string
          description: string | null
          display_order: number
          estimated_duration_minutes: number
          first_occurrence_override_service_id: string | null
          icon_name: string | null
          id: string
          is_active: boolean
          is_recurring_eligible: boolean
          max_price_cents: number | null
          min_price_cents: number | null
          name: string
          requires_quote: boolean
          service_type: Database["public"]["Enums"]["service_type_code"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allowed_frequencies?:
            | Database["public"]["Enums"]["booking_frequency_code"][]
            | null
          archived_at?: string | null
          base_price_cents: number
          category_id?: string | null
          color_hex?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          estimated_duration_minutes?: number
          first_occurrence_override_service_id?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          is_recurring_eligible?: boolean
          max_price_cents?: number | null
          min_price_cents?: number | null
          name: string
          requires_quote?: boolean
          service_type: Database["public"]["Enums"]["service_type_code"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allowed_frequencies?:
            | Database["public"]["Enums"]["booking_frequency_code"][]
            | null
          archived_at?: string | null
          base_price_cents?: number
          category_id?: string | null
          color_hex?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          estimated_duration_minutes?: number
          first_occurrence_override_service_id?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          is_recurring_eligible?: boolean
          max_price_cents?: number | null
          min_price_cents?: number | null
          name?: string
          requires_quote?: boolean
          service_type?: Database["public"]["Enums"]["service_type_code"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_services_first_occurrence_override"
            columns: ["first_occurrence_override_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_locations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          is_primary: boolean
          name: string
          phone: string | null
          postal_code: string | null
          state: string | null
          tenant_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          name: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tenant_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          name?: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tenant_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_memberships: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          auto_send_quote_reminders: boolean | null
          auto_send_review_request: boolean | null
          business_hours: Json | null
          created_at: string
          default_booking_duration_minutes: number | null
          default_deposit_percentage: number | null
          default_first_occurrence_override_service_id: string | null
          id: string
          max_advance_booking_days: number | null
          min_lead_time_hours: number | null
          notification_preferences: Json | null
          quote_expiry_days: number | null
          require_card_on_file: boolean | null
          require_deposit: boolean | null
          review_request_delay_hours: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auto_send_quote_reminders?: boolean | null
          auto_send_review_request?: boolean | null
          business_hours?: Json | null
          created_at?: string
          default_booking_duration_minutes?: number | null
          default_deposit_percentage?: number | null
          default_first_occurrence_override_service_id?: string | null
          id?: string
          max_advance_booking_days?: number | null
          min_lead_time_hours?: number | null
          notification_preferences?: Json | null
          quote_expiry_days?: number | null
          require_card_on_file?: boolean | null
          require_deposit?: boolean | null
          review_request_delay_hours?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auto_send_quote_reminders?: boolean | null
          auto_send_review_request?: boolean | null
          business_hours?: Json | null
          created_at?: string
          default_booking_duration_minutes?: number | null
          default_deposit_percentage?: number | null
          default_first_occurrence_override_service_id?: string | null
          id?: string
          max_advance_booking_days?: number | null
          min_lead_time_hours?: number | null
          notification_preferences?: Json | null
          quote_expiry_days?: number | null
          require_card_on_file?: boolean | null
          require_deposit?: boolean | null
          review_request_delay_hours?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tenant_settings_default_override"
            columns: ["default_first_occurrence_override_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_workspace_sessions: {
        Row: {
          active_tenant_id: string
          switched_at: string
          user_id: string
        }
        Insert: {
          active_tenant_id: string
          switched_at?: string
          user_id: string
        }
        Update: {
          active_tenant_id?: string
          switched_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_workspace_sessions_active_tenant_id_fkey"
            columns: ["active_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_quote_by_customer: { Args: { p_token: string }; Returns: Json }
      accept_quote_by_staff: { Args: { p_booking_id: string }; Returns: Json }
      add_booking_add_ons: {
        Args: { p_add_ons: Json; p_booking_id: string }
        Returns: Json
      }
      assign_provider: {
        Args: { p_booking_id: string; p_provider_id: string }
        Returns: Json
      }
      calculate_adjustment: {
        Args: {
          p_adjustment_type: string
          p_adjustment_value: number
          p_current_total: number
        }
        Returns: number
      }
      calculate_booking_price: { Args: { p_booking_id: string }; Returns: Json }
      calculate_next_occurrence_date: {
        Args: { p_from_date: string; p_series_id: string }
        Returns: string
      }
      calculate_price_preview: {
        Args: {
          p_add_on_ids?: string[]
          p_customer_id: string
          p_frequency?: Database["public"]["Enums"]["booking_frequency_code"]
          p_property_id: string
          p_scheduled_date?: string
          p_service_id: string
        }
        Returns: Json
      }
      cancel_booking: {
        Args: { p_booking_id: string; p_reason?: string }
        Returns: Json
      }
      cancel_series: {
        Args: {
          p_cancel_future_bookings?: boolean
          p_reason?: string
          p_series_id: string
        }
        Returns: Json
      }
      confirm_booking: { Args: { p_booking_id: string }; Returns: Json }
      create_add_on: {
        Args: {
          p_description?: string
          p_name: string
          p_price_cents: number
          p_price_type?: string
          p_scope_mode?: Database["public"]["Enums"]["addon_scope_mode"]
          p_scoped_service_ids?: string[]
          p_scoped_service_types?: Database["public"]["Enums"]["service_type_code"][]
        }
        Returns: Json
      }
      create_customer: {
        Args: {
          p_customer_type?: Database["public"]["Enums"]["customer_type"]
          p_email?: string
          p_first_name: string
          p_last_name: string
          p_notes?: string
          p_phone?: string
        }
        Returns: Json
      }
      create_draft_booking: {
        Args: {
          p_customer_id: string
          p_customer_notes?: string
          p_frequency?: Database["public"]["Enums"]["booking_frequency_code"]
          p_property_id: string
          p_scheduled_date?: string
          p_scheduled_time_window?: Database["public"]["Enums"]["time_window_code"]
          p_service_id: string
        }
        Returns: Json
      }
      create_property: {
        Args: {
          p_access_notes?: string
          p_address_line1: string
          p_address_line2?: string
          p_bathrooms?: number
          p_bedrooms?: number
          p_city: string
          p_country?: string
          p_customer_id: string
          p_geocode_confidence?: Database["public"]["Enums"]["geocode_confidence"]
          p_google_place_id?: string
          p_is_primary?: boolean
          p_latitude?: number
          p_longitude?: number
          p_postal_code: string
          p_property_type?: Database["public"]["Enums"]["property_type"]
          p_square_feet?: number
          p_state: string
        }
        Returns: Json
      }
      create_recurring_series: {
        Args: {
          p_customer_id: string
          p_end_date?: string
          p_frequency: Database["public"]["Enums"]["booking_frequency_code"]
          p_generate_first_occurrence?: boolean
          p_notes?: string
          p_preferred_day_of_week?: number
          p_preferred_time_window?: Database["public"]["Enums"]["time_window_code"]
          p_property_id: string
          p_service_id: string
          p_start_date: string
        }
        Returns: Json
      }
      create_review_request: { Args: { p_booking_id: string }; Returns: Json }
      create_service: {
        Args: {
          p_allowed_frequencies?: Database["public"]["Enums"]["booking_frequency_code"][]
          p_base_price_cents: number
          p_category_id?: string
          p_description?: string
          p_estimated_duration_minutes?: number
          p_first_occurrence_override_service_id?: string
          p_is_recurring_eligible?: boolean
          p_name: string
          p_requires_quote?: boolean
          p_service_type: Database["public"]["Enums"]["service_type_code"]
        }
        Returns: Json
      }
      create_tenant_with_owner: {
        Args: { p_name: string; p_slug: string }
        Returns: Json
      }
      decline_quote_by_customer: { Args: { p_token: string }; Returns: Json }
      evaluate_deep_clean_required: {
        Args: {
          p_customer_id: string
          p_property_id: string
          p_service_id?: string
        }
        Returns: Json
      }
      expire_quotes: { Args: never; Returns: Json }
      generate_future_occurrences: {
        Args: { p_series_id?: string }
        Returns: Json
      }
      generate_quote_token: { Args: never; Returns: string }
      get_active_tenant_id: { Args: never; Returns: string }
      get_active_workspace: { Args: never; Returns: Json }
      get_booking_detail: { Args: { p_booking_id: string }; Returns: Json }
      get_dashboard_counters: { Args: never; Returns: Json }
      get_quote_by_token: { Args: { p_token: string }; Returns: Json }
      lookup_review_token: { Args: { p_token: string }; Returns: Json }
      pause_series: {
        Args: { p_reason?: string; p_series_id: string }
        Returns: Json
      }
      provider_check_in: { Args: { p_booking_id: string }; Returns: Json }
      provider_check_out: {
        Args: {
          p_booking_id: string
          p_completion_notes?: string
          p_completion_photos?: string[]
        }
        Returns: Json
      }
      reopen_as_draft: { Args: { p_booking_id: string }; Returns: Json }
      resolve_first_occurrence_override: {
        Args: { p_service_id: string }
        Returns: Json
      }
      resume_series: {
        Args: { p_resume_date?: string; p_series_id: string }
        Returns: Json
      }
      send_quote:
        | { Args: { p_booking_id: string }; Returns: Json }
        | {
            Args: { p_booking_id: string; p_expires_in_days?: number }
            Returns: Json
          }
      skip_occurrence: {
        Args: { p_booking_id: string; p_reason?: string }
        Returns: Json
      }
      submit_review_rating: {
        Args: {
          p_feedback_category?: string
          p_feedback_text?: string
          p_preferred_contact_method?: string
          p_rating: number
          p_token: string
          p_wants_follow_up?: boolean
        }
        Returns: Json
      }
      switch_workspace: { Args: { p_tenant_id: string }; Returns: Json }
      unassign_provider: { Args: { p_booking_id: string }; Returns: Json }
      update_draft_booking: {
        Args: { p_booking_id: string; p_updates: Json }
        Returns: Json
      }
      user_has_manager_access: { Args: never; Returns: boolean }
      user_has_tenant_access: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      validate_booking_transition: {
        Args: {
          p_current_status: Database["public"]["Enums"]["booking_status"]
          p_new_status: Database["public"]["Enums"]["booking_status"]
        }
        Returns: boolean
      }
    }
    Enums: {
      addon_scope_mode: "all_services" | "specific_services" | "service_types"
      booking_frequency_code:
        | "onetime"
        | "weekly"
        | "biweekly"
        | "monthly"
        | "custom"
      booking_status:
        | "draft"
        | "quote_pending"
        | "quote_accepted"
        | "quote_expired"
        | "quote_declined"
        | "confirmed"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "skipped"
      customer_type:
        | "lead"
        | "customer"
        | "repeat"
        | "vip"
        | "inactive"
        | "do_not_service"
      geocode_confidence: "high" | "low" | "failed" | "manual"
      pricing_rule_category:
        | "property_modifier"
        | "service_modifier"
        | "location_modifier"
        | "schedule_modifier"
        | "lead_time_modifier"
        | "frequency_discount"
        | "customer_discount"
        | "promotional"
        | "referral"
        | "loyalty"
        | "manual_adjustment"
        | "fee"
        | "tax"
      pricing_rule_trigger:
        | "always"
        | "property_sqft"
        | "property_beds"
        | "property_baths"
        | "property_type"
        | "day_of_week"
        | "holiday"
        | "time_of_day"
        | "lead_time_days"
        | "frequency"
        | "customer_type"
        | "promo_code"
        | "manual"
      property_type:
        | "apartment"
        | "house"
        | "condo"
        | "townhouse"
        | "studio"
        | "office"
        | "commercial"
        | "other"
      recurring_series_status: "active" | "paused" | "cancelled"
      review_route: "internal" | "google" | "yelp" | "facebook" | "custom"
      service_type_code:
        | "standard"
        | "deep"
        | "move_in"
        | "move_out"
        | "post_construction"
        | "commercial"
        | "specialty"
      tenant_role: "owner" | "admin" | "member"
      time_window_code:
        | "morning"
        | "afternoon"
        | "anytime"
        | "specific"
        | "exact"
      user_role: "owner" | "admin" | "manager" | "scheduler" | "provider"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      addon_scope_mode: ["all_services", "specific_services", "service_types"],
      booking_frequency_code: [
        "onetime",
        "weekly",
        "biweekly",
        "monthly",
        "custom",
      ],
      booking_status: [
        "draft",
        "quote_pending",
        "quote_accepted",
        "quote_expired",
        "quote_declined",
        "confirmed",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
        "skipped",
      ],
      customer_type: [
        "lead",
        "customer",
        "repeat",
        "vip",
        "inactive",
        "do_not_service",
      ],
      geocode_confidence: ["high", "low", "failed", "manual"],
      pricing_rule_category: [
        "property_modifier",
        "service_modifier",
        "location_modifier",
        "schedule_modifier",
        "lead_time_modifier",
        "frequency_discount",
        "customer_discount",
        "promotional",
        "referral",
        "loyalty",
        "manual_adjustment",
        "fee",
        "tax",
      ],
      pricing_rule_trigger: [
        "always",
        "property_sqft",
        "property_beds",
        "property_baths",
        "property_type",
        "day_of_week",
        "holiday",
        "time_of_day",
        "lead_time_days",
        "frequency",
        "customer_type",
        "promo_code",
        "manual",
      ],
      property_type: [
        "apartment",
        "house",
        "condo",
        "townhouse",
        "studio",
        "office",
        "commercial",
        "other",
      ],
      recurring_series_status: ["active", "paused", "cancelled"],
      review_route: ["internal", "google", "yelp", "facebook", "custom"],
      service_type_code: [
        "standard",
        "deep",
        "move_in",
        "move_out",
        "post_construction",
        "commercial",
        "specialty",
      ],
      tenant_role: ["owner", "admin", "member"],
      time_window_code: [
        "morning",
        "afternoon",
        "anytime",
        "specific",
        "exact",
      ],
      user_role: ["owner", "admin", "manager", "scheduler", "provider"],
    },
  },
} as const

// ============================================================================
// Convenience type exports
// ============================================================================

// Table Row Types
export type Booking = Tables<'bookings'>
export type Customer = Tables<'customers'>
export type Property = Tables<'properties'>
export type Service = Tables<'services'>
export type AddOn = Tables<'add_ons'>
export type BookingAddOn = Tables<'booking_add_ons'>
export type PricingRule = Tables<'pricing_rules'>
export type Tenant = Tables<'tenants'>
export type TenantMembership = Tables<'tenant_memberships'>
export type Profile = Tables<'profiles'>
export type RecurringSeries = Tables<'recurring_series'>
export type QuoteToken = Tables<'quote_tokens'>
export type TenantLocation = Tables<'tenant_locations'>
export type UserWorkspaceSession = Tables<'user_workspace_sessions'>

// Extended Types
export type CustomerWithProperties = Customer & {
  properties?: Property[]
}

// Enum Types
export type BookingStatus = Enums<'booking_status'>
export type BookingFrequencyCode = Enums<'booking_frequency_code'>
export type ServiceTypeCode = Enums<'service_type_code'>
export type CustomerType = Enums<'customer_type'>
export type PropertyType = Enums<'property_type'>
export type AddOnScopeMode = Enums<'addon_scope_mode'>
export type PricingRuleCategory = Enums<'pricing_rule_category'>
export type PricingRuleTrigger = Enums<'pricing_rule_trigger'>
export type TimeWindowCode = Enums<'time_window_code'>
export type GeocodeConfidence = Enums<'geocode_confidence'>
export type RecurringSeriesStatus = Enums<'recurring_series_status'>
export type ReviewRoute = Enums<'review_route'>
export type TenantRole = Enums<'tenant_role'>
export type UserRole = Enums<'user_role'>

// RPC Result Types
export type BookingRpcResult = {
  success: boolean
  booking_id?: string
  error?: string
}

export type CreateTenantResult = {
  success: boolean
  tenant_id?: string
  message?: string
  error?: string
}

export type ActiveWorkspaceResult = {
  success: boolean
  tenant_id: string
  tenant_name: string
  tenant_slug: string
  role: TenantRole
  error?: string
}

export type SwitchWorkspaceResult = {
  success: boolean
  role?: TenantRole
  error?: string
}

// Full tenant context with membership details
export type UserTenantContext = {
  profile: Profile
  membership: TenantMembership & { tenant: Tenant }
  tenant: Tenant
}

// Simplified workspace context for client-side use
export type WorkspaceContext = {
  tenantId: string
  tenantName: string
  tenantSlug: string
  role: TenantRole
}

export type PricingBreakdown = {
  base_price_cents: number
  add_ons_total_cents: number
  adjustments: {
    rule_id: string
    name: string
    amount_cents: number
  }[]
  total_cents: number
}

// Legacy alias for backwards compatibility
export type Membership = TenantMembership
