
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admins": {
                  Row: {
                    "created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"buildings": {
                  Row: {
                    "code": string,"created_at": string,"lat": number,"lng": number,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"lat": number,"lng": number,"name": string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"lat"?: number,"lng"?: number,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"fountain_confirmations": {
                  Row: {
                    "created_at": string,"fountain_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"fountain_id": string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"fountain_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fountain_confirmations_fountain_id_fkey"
      columns: ["fountain_id"]
isOneToOne: false
      referencedRelation: "fountain_scores"
      referencedColumns: ["fountain_id"]
    },{
      foreignKeyName: "fountain_confirmations_fountain_id_fkey"
      columns: ["fountain_id"]
isOneToOne: false
      referencedRelation: "fountains"
      referencedColumns: ["id"]
    }
                  ]
                },"fountains": {
                  Row: {
                    "building_code": string,"created_at": string,"created_by": string | null,"floor": string,"has_bottle_filler": boolean,"id": string,"location_note": string,"short_code": string,"status": string,"verified": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "building_code": string,"created_at"?: string,"created_by"?: string | null,"floor": string,"has_bottle_filler"?: boolean,"id"?: string,"location_note": string,"short_code": string,"status"?: string,"verified"?: boolean
                  }
                  Update: {
                    "building_code"?: string,"created_at"?: string,"created_by"?: string | null,"floor"?: string,"has_bottle_filler"?: boolean,"id"?: string,"location_note"?: string,"short_code"?: string,"status"?: string,"verified"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "fountains_building_code_fkey"
      columns: ["building_code"]
isOneToOne: false
      referencedRelation: "buildings"
      referencedColumns: ["code"]
    }
                  ]
                },"ratings": {
                  Row: {
                    "bottle_filler": number | null,"created_at": string,"flow": number,"fountain_id": string,"id": string,"tags": (string)[],"taste": number,"temperature": number,"trajectory": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bottle_filler"?: number | null,"created_at"?: string,"flow": number,"fountain_id": string,"id"?: string,"tags"?: (string)[],"taste": number,"temperature": number,"trajectory": number,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "bottle_filler"?: number | null,"created_at"?: string,"flow"?: number,"fountain_id"?: string,"id"?: string,"tags"?: (string)[],"taste"?: number,"temperature"?: number,"trajectory"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ratings_fountain_id_fkey"
      columns: ["fountain_id"]
isOneToOne: false
      referencedRelation: "fountain_scores"
      referencedColumns: ["fountain_id"]
    },{
      foreignKeyName: "ratings_fountain_id_fkey"
      columns: ["fountain_id"]
isOneToOne: false
      referencedRelation: "fountains"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"fountain_id": string,"id": string,"note": string | null,"reason": string,"resolved": boolean,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"fountain_id": string,"id"?: string,"note"?: string | null,"reason": string,"resolved"?: boolean,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"fountain_id"?: string,"id"?: string,"note"?: string | null,"reason"?: string,"resolved"?: boolean,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_fountain_id_fkey"
      columns: ["fountain_id"]
isOneToOne: false
      referencedRelation: "fountain_scores"
      referencedColumns: ["fountain_id"]
    },{
      foreignKeyName: "reports_fountain_id_fkey"
      columns: ["fountain_id"]
isOneToOne: false
      referencedRelation: "fountains"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "fountain_scores": {
                  Row: {
                    "bayesian_score": number | null,"bottle_filler_count": number | null,"bottle_filler_mean": number | null,"building_code": string,"created_at": string,"floor": string,"flow_mean": number | null,"fountain_id": string,"has_bottle_filler": boolean,"is_broken": boolean | null,"last_rated_at": string | null,"location_note": string,"overall_mean": number | null,"rating_count": number | null,"short_code": string,"status": string,"taste_mean": number | null,"temperature_mean": number | null,"top_tags": Json | null,"trajectory_mean": number | null,"verified": boolean
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "fountains_building_code_fkey"
      columns: ["building_code"]
isOneToOne: false
      referencedRelation: "buildings"
      referencedColumns: ["code"]
    }
                  ]
                },"public_ratings": {
                  Row: {
                    "bottle_filler": number | null,"created_at": string,"flow": number,"fountain_id": string,"id": string,"tags": (string)[],"taste": number,"temperature": number,"trajectory": number,"updated_at": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "ratings_fountain_id_fkey"
      columns: ["fountain_id"]
isOneToOne: false
      referencedRelation: "fountain_scores"
      referencedColumns: ["fountain_id"]
    },{
      foreignKeyName: "ratings_fountain_id_fkey"
      columns: ["fountain_id"]
isOneToOne: false
      referencedRelation: "fountains"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "scoring_c":
{ Args: Record<PropertyKey, never>; Returns: number
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
