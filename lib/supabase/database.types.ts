
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "admin_audit": {
                  Row: {
                    "action": string,"admin_id": string | null,"created_at": string,"details": NonNullable<Json>,"id": string,"target": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"admin_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"target"?: string | null
                  }
                  Update: {
                    "action"?: string,"admin_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: string,"target"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "admin_audit_admin_id_fkey"
      columns: ["admin_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"app_errors": {
                  Row: {
                    "created_at": string,"digest": string | null,"id": number,"message": string,"route": string | null,"source": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"digest"?: string | null,"id"?: never,"message": string,"route"?: string | null,"source": string
                  }
                  Update: {
                    "created_at"?: string,"digest"?: string | null,"id"?: never,"message"?: string,"route"?: string | null,"source"?: string
                  }
                  Relationships: [
                    
                  ]
                },"app_events": {
                  Row: {
                    "created_at": string,"device": string | null,"id": number,"name": string,"route": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"device"?: string | null,"id"?: never,"name": string,"route"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"device"?: string | null,"id"?: never,"name"?: string,"route"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"areas": {
                  Row: {
                    "centroid": unknown,"city": string,"geom": unknown,"id": string,"kind": string,"name": string,"parent_id": string | null,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "centroid"?: unknown,"city"?: string,"geom"?: unknown,"id"?: string,"kind": string,"name": string,"parent_id"?: string | null,"slug": string
                  }
                  Update: {
                    "centroid"?: unknown,"city"?: string,"geom"?: unknown,"id"?: string,"kind"?: string,"name"?: string,"parent_id"?: string | null,"slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "areas_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "areas"
      referencedColumns: ["id"]
    }
                  ]
                },"badges": {
                  Row: {
                    "category": string,"description": string,"icon": string,"id": string,"is_active": boolean,"is_secret": boolean,"name": string,"rule": NonNullable<Json>,"slug": string,"sort": number,"tier": number
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"description": string,"icon"?: string,"id"?: string,"is_active"?: boolean,"is_secret"?: boolean,"name": string,"rule": NonNullable<Json>,"slug": string,"sort"?: number,"tier"?: number
                  }
                  Update: {
                    "category"?: string,"description"?: string,"icon"?: string,"id"?: string,"is_active"?: boolean,"is_secret"?: boolean,"name"?: string,"rule"?: NonNullable<Json>,"slug"?: string,"sort"?: number,"tier"?: number
                  }
                  Relationships: [
                    
                  ]
                },"blocks": {
                  Row: {
                    "blocked_id": string,"blocker_id": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_id": string,"blocker_id": string,"created_at"?: string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"brands": {
                  Row: {
                    "id": string,"name": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"name": string,"slug": string
                  }
                  Update: {
                    "id"?: string,"name"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"follows": {
                  Row: {
                    "created_at": string,"follower_id": string,"following_id": string,"status": Database["public"]['Enums']["request_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"follower_id": string,"following_id": string,"status"?: Database["public"]['Enums']["request_status"]
                  }
                  Update: {
                    "created_at"?: string,"follower_id"?: string,"following_id"?: string,"status"?: Database["public"]['Enums']["request_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "follows_follower_id_fkey"
      columns: ["follower_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follows_following_id_fkey"
      columns: ["following_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"friendships": {
                  Row: {
                    "accepted_at": string | null,"created_at": string,"requested_by": string,"status": Database["public"]['Enums']["request_status"],"user_high": string,"user_low": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"created_at"?: string,"requested_by": string,"status"?: Database["public"]['Enums']["request_status"],"user_high": string,"user_low": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"created_at"?: string,"requested_by"?: string,"status"?: Database["public"]['Enums']["request_status"],"user_high"?: string,"user_low"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "friendships_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "friendships_user_high_fkey"
      columns: ["user_high"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "friendships_user_low_fkey"
      columns: ["user_low"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"group_members": {
                  Row: {
                    "group_id": string,"joined_at": string,"role": Database["public"]['Enums']["group_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "group_id": string,"joined_at"?: string,"role"?: Database["public"]['Enums']["group_role"],"user_id": string
                  }
                  Update: {
                    "group_id"?: string,"joined_at"?: string,"role"?: Database["public"]['Enums']["group_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"groups": {
                  Row: {
                    "created_at": string,"id": string,"is_private": boolean,"kind": string,"leaderboard_enabled": boolean,"name": string,"owner_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_private"?: boolean,"kind"?: string,"leaderboard_enabled"?: boolean,"name": string,"owner_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_private"?: boolean,"kind"?: string,"leaderboard_enabled"?: boolean,"name"?: string,"owner_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "groups_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"invite_redemptions": {
                  Row: {
                    "invite_id": string,"redeemed_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "invite_id": string,"redeemed_at"?: string,"user_id": string
                  }
                  Update: {
                    "invite_id"?: string,"redeemed_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invite_redemptions_invite_id_fkey"
      columns: ["invite_id"]
isOneToOne: false
      referencedRelation: "invites"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invite_redemptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"invites": {
                  Row: {
                    "code": string,"created_at": string,"created_by": string,"expires_at": string,"group_id": string | null,"id": string,"kind": Database["public"]['Enums']["invite_kind"],"max_uses": number,"revoked_at": string | null,"uses": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"created_by": string,"expires_at"?: string,"group_id"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["invite_kind"],"max_uses"?: number,"revoked_at"?: string | null,"uses"?: number
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"created_by"?: string,"expires_at"?: string,"group_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["invite_kind"],"max_uses"?: number,"revoked_at"?: string | null,"uses"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "invites_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invites_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                },"memories": {
                  Row: {
                    "created_at": string,"mood": string | null,"occasion": string | null,"private_note": string | null,"updated_at": string,"visibility": Database["public"]['Enums']["visibility"],"visit_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"mood"?: string | null,"occasion"?: string | null,"private_note"?: string | null,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"],"visit_id": string
                  }
                  Update: {
                    "created_at"?: string,"mood"?: string | null,"occasion"?: string | null,"private_note"?: string | null,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["visibility"],"visit_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "memories_visit_id_fkey"
      columns: ["visit_id"]
isOneToOne: true
      referencedRelation: "visits"
      referencedColumns: ["id"]
    }
                  ]
                },"mutes": {
                  Row: {
                    "created_at": string,"muted_id": string,"muter_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"muted_id": string,"muter_id": string
                  }
                  Update: {
                    "created_at"?: string,"muted_id"?: string,"muter_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "mutes_muted_id_fkey"
      columns: ["muted_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "mutes_muter_id_fkey"
      columns: ["muter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"place_info": {
                  Row: {
                    "place_id": string,"short_description": string | null,"updated_at": string,"wiki_extract": string | null,"wiki_title": string | null,"wiki_url": string | null,"wikidata": string
                  }
                  ComputedFields: never
                  Insert: {
                    "place_id": string,"short_description"?: string | null,"updated_at"?: string,"wiki_extract"?: string | null,"wiki_title"?: string | null,"wiki_url"?: string | null,"wikidata": string
                  }
                  Update: {
                    "place_id"?: string,"short_description"?: string | null,"updated_at"?: string,"wiki_extract"?: string | null,"wiki_title"?: string | null,"wiki_url"?: string | null,"wikidata"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "place_info_place_id_fkey"
      columns: ["place_id"]
isOneToOne: true
      referencedRelation: "places"
      referencedColumns: ["id"]
    }
                  ]
                },"place_media": {
                  Row: {
                    "author": string | null,"file_title": string,"height": number | null,"id": string,"licence": string | null,"licence_url": string | null,"page_url": string,"place_id": string,"position": number,"source": string,"thumb_url": string,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "author"?: string | null,"file_title": string,"height"?: number | null,"id"?: string,"licence"?: string | null,"licence_url"?: string | null,"page_url": string,"place_id": string,"position"?: number,"source"?: string,"thumb_url": string,"width"?: number | null
                  }
                  Update: {
                    "author"?: string | null,"file_title"?: string,"height"?: number | null,"id"?: string,"licence"?: string | null,"licence_url"?: string | null,"page_url"?: string,"place_id"?: string,"position"?: number,"source"?: string,"thumb_url"?: string,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "place_media_place_id_fkey"
      columns: ["place_id"]
isOneToOne: false
      referencedRelation: "places"
      referencedColumns: ["id"]
    }
                  ]
                },"place_suggestions": {
                  Row: {
                    "created_at": string,"field": string,"id": string,"place_id": string,"status": Database["public"]['Enums']["report_status"],"user_id": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"field": string,"id"?: string,"place_id": string,"status"?: Database["public"]['Enums']["report_status"],"user_id": string,"value": NonNullable<Json>
                  }
                  Update: {
                    "created_at"?: string,"field"?: string,"id"?: string,"place_id"?: string,"status"?: Database["public"]['Enums']["report_status"],"user_id"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "place_suggestions_place_id_fkey"
      columns: ["place_id"]
isOneToOne: false
      referencedRelation: "places"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "place_suggestions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"places": {
                  Row: {
                    "aliases": (string)[],"area_id": string | null,"brand_id": string | null,"category": string | null,"city": string | null,"created_at": string,"created_by": string | null,"cuisine_tags": (string)[],"diet_flags": (string)[],"geom": unknown,"google_place_id": string | null,"id": string,"merged_into": string | null,"name": string,"name_normalized": string,"osm_id": string | null,"overture_id": string | null,"search_text": string,"source": string,"status": Database["public"]['Enums']["place_status"],"type": Database["public"]['Enums']["place_type"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aliases"?: (string)[],"area_id"?: string | null,"brand_id"?: string | null,"category"?: string | null,"city"?: string | null,"created_at"?: string,"created_by"?: string | null,"cuisine_tags"?: (string)[],"diet_flags"?: (string)[],"geom": unknown,"google_place_id"?: string | null,"id"?: string,"merged_into"?: string | null,"name": string,"name_normalized"?: string,"osm_id"?: string | null,"overture_id"?: string | null,"search_text"?: string,"source": string,"status"?: Database["public"]['Enums']["place_status"],"type"?: Database["public"]['Enums']["place_type"],"updated_at"?: string
                  }
                  Update: {
                    "aliases"?: (string)[],"area_id"?: string | null,"brand_id"?: string | null,"category"?: string | null,"city"?: string | null,"created_at"?: string,"created_by"?: string | null,"cuisine_tags"?: (string)[],"diet_flags"?: (string)[],"geom"?: unknown,"google_place_id"?: string | null,"id"?: string,"merged_into"?: string | null,"name"?: string,"name_normalized"?: string,"osm_id"?: string | null,"overture_id"?: string | null,"search_text"?: string,"source"?: string,"status"?: Database["public"]['Enums']["place_status"],"type"?: Database["public"]['Enums']["place_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "places_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "places_brand_id_fkey"
      columns: ["brand_id"]
isOneToOne: false
      referencedRelation: "brands"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "places_created_by_fk"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "places_merged_into_fkey"
      columns: ["merged_into"]
isOneToOne: false
      referencedRelation: "places"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_badges": {
                  Row: {
                    "badge_id": string,"position": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "badge_id": string,"position": number,"user_id": string
                  }
                  Update: {
                    "badge_id"?: string,"position"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_badges_badge_id_fkey"
      columns: ["badge_id"]
isOneToOne: false
      referencedRelation: "badges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_badges_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"banned_at": string | null,"bio": string | null,"created_at": string,"default_visibility": Database["public"]['Enums']["visibility"],"diet_prefs": (string)[],"display_name": string,"home_area_id": string | null,"id": string,"is_admin": boolean,"is_private": boolean,"leaderboards_opt_in": boolean,"notify_friend_verdicts": boolean,"onboarded_at": string | null,"updated_at": string,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"banned_at"?: string | null,"bio"?: string | null,"created_at"?: string,"default_visibility"?: Database["public"]['Enums']["visibility"],"diet_prefs"?: (string)[],"display_name": string,"home_area_id"?: string | null,"id": string,"is_admin"?: boolean,"is_private"?: boolean,"leaderboards_opt_in"?: boolean,"notify_friend_verdicts"?: boolean,"onboarded_at"?: string | null,"updated_at"?: string,"username": string
                  }
                  Update: {
                    "avatar_url"?: string | null,"banned_at"?: string | null,"bio"?: string | null,"created_at"?: string,"default_visibility"?: Database["public"]['Enums']["visibility"],"diet_prefs"?: (string)[],"display_name"?: string,"home_area_id"?: string | null,"id"?: string,"is_admin"?: boolean,"is_private"?: boolean,"leaderboards_opt_in"?: boolean,"notify_friend_verdicts"?: boolean,"onboarded_at"?: string | null,"updated_at"?: string,"username"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_home_area_id_fkey"
      columns: ["home_area_id"]
isOneToOne: false
      referencedRelation: "areas"
      referencedColumns: ["id"]
    }
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"p256dh": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"p256dh": string,"user_id": string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"p256dh"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"id": string,"reason": string,"reporter_id": string,"reviewed_by": string | null,"status": Database["public"]['Enums']["report_status"],"target_id": string,"target_type": Database["public"]['Enums']["report_target"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"reason": string,"reporter_id": string,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"target_id": string,"target_type": Database["public"]['Enums']["report_target"]
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"reason"?: string,"reporter_id"?: string,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"target_id"?: string,"target_type"?: Database["public"]['Enums']["report_target"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"review_dishes": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"name_normalized": string,"verdict": Database["public"]['Enums']["verdict"],"visit_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"name_normalized": string,"verdict": Database["public"]['Enums']["verdict"],"visit_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"name_normalized"?: string,"verdict"?: Database["public"]['Enums']["verdict"],"visit_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "review_dishes_visit_id_fkey"
      columns: ["visit_id"]
isOneToOne: false
      referencedRelation: "visits"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "created_at": string,"note": string | null,"occasion_tags": (string)[],"price_per_head": number | null,"updated_at": string,"visit_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"note"?: string | null,"occasion_tags"?: (string)[],"price_per_head"?: number | null,"updated_at"?: string,"visit_id": string
                  }
                  Update: {
                    "created_at"?: string,"note"?: string | null,"occasion_tags"?: (string)[],"price_per_head"?: number | null,"updated_at"?: string,"visit_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_visit_id_fkey"
      columns: ["visit_id"]
isOneToOne: true
      referencedRelation: "visits"
      referencedColumns: ["id"]
    }
                  ]
                },"share_cards": {
                  Row: {
                    "created_at": string,"kind": string,"revoked_at": string | null,"snapshot": NonNullable<Json>,"token": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"kind": string,"revoked_at"?: string | null,"snapshot": NonNullable<Json>,"token": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"kind"?: string,"revoked_at"?: string | null,"snapshot"?: NonNullable<Json>,"token"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "share_cards_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"stations": {
                  Row: {
                    "geom": unknown,"id": string,"name": string,"osm_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "geom": unknown,"id"?: string,"name": string,"osm_id": string
                  }
                  Update: {
                    "geom"?: unknown,"id"?: string,"name"?: string,"osm_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"taste_matches": {
                  Row: {
                    "agreed": number,"rate": number,"shared_places": number,"updated_at": string,"user_a": string,"user_b": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agreed": number,"rate": number,"shared_places": number,"updated_at"?: string,"user_a": string,"user_b": string
                  }
                  Update: {
                    "agreed"?: number,"rate"?: number,"shared_places"?: number,"updated_at"?: string,"user_a"?: string,"user_b"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "taste_matches_user_a_fkey"
      columns: ["user_a"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "taste_matches_user_b_fkey"
      columns: ["user_b"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_badges": {
                  Row: {
                    "badge_id": string,"earned_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "badge_id": string,"earned_at"?: string,"user_id": string
                  }
                  Update: {
                    "badge_id"?: string,"earned_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_badges_badge_id_fkey"
      columns: ["badge_id"]
isOneToOne: false
      referencedRelation: "badges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_badges_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_scores": {
                  Row: {
                    "period": Database["public"]['Enums']["score_period"],"period_start": string,"unique_areas": number,"unique_cuisines": number,"unique_places": number,"unique_places_shared": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "period": Database["public"]['Enums']["score_period"],"period_start": string,"unique_areas"?: number,"unique_cuisines"?: number,"unique_places"?: number,"unique_places_shared"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "period"?: Database["public"]['Enums']["score_period"],"period_start"?: string,"unique_areas"?: number,"unique_cuisines"?: number,"unique_places"?: number,"unique_places_shared"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_scores_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_streaks": {
                  Row: {
                    "best_streak": number,"current_streak": number,"last_active_week": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "best_streak"?: number,"current_streak"?: number,"last_active_week"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "best_streak"?: number,"current_streak"?: number,"last_active_week"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_streaks_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"visit_audience_groups": {
                  Row: {
                    "group_id": string,"visit_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "group_id": string,"visit_id": string
                  }
                  Update: {
                    "group_id"?: string,"visit_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vag_group_fk"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visit_audience_groups_visit_id_fkey"
      columns: ["visit_id"]
isOneToOne: false
      referencedRelation: "visits"
      referencedColumns: ["id"]
    }
                  ]
                },"visit_companions": {
                  Row: {
                    "status": Database["public"]['Enums']["companion_status"],"user_id": string,"visit_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "status"?: Database["public"]['Enums']["companion_status"],"user_id": string,"visit_id": string
                  }
                  Update: {
                    "status"?: Database["public"]['Enums']["companion_status"],"user_id"?: string,"visit_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visit_companions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visit_companions_visit_id_fkey"
      columns: ["visit_id"]
isOneToOne: false
      referencedRelation: "visits"
      referencedColumns: ["id"]
    }
                  ]
                },"visit_photos": {
                  Row: {
                    "created_at": string,"height": number | null,"id": string,"kind": string,"position": number,"storage_path": string,"visit_id": string,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"height"?: number | null,"id"?: string,"kind": string,"position"?: number,"storage_path": string,"visit_id": string,"width"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"height"?: number | null,"id"?: string,"kind"?: string,"position"?: number,"storage_path"?: string,"visit_id"?: string,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "visit_photos_visit_id_fkey"
      columns: ["visit_id"]
isOneToOne: false
      referencedRelation: "visits"
      referencedColumns: ["id"]
    }
                  ]
                },"visits": {
                  Row: {
                    "counts_all_time": boolean,"counts_in_periods": boolean,"id": string,"is_backdated": boolean,"is_first_visit": boolean,"logged_at": string,"only_for_text": string | null,"place_id": string,"user_id": string,"verdict": Database["public"]['Enums']["verdict"],"verified": boolean,"visibility": Database["public"]['Enums']["visibility"],"visited_on": string
                  }
                  ComputedFields: never
                  Insert: {
                    "counts_all_time"?: boolean,"counts_in_periods"?: boolean,"id"?: string,"is_backdated"?: boolean,"is_first_visit"?: boolean,"logged_at"?: string,"only_for_text"?: string | null,"place_id": string,"user_id": string,"verdict": Database["public"]['Enums']["verdict"],"verified"?: boolean,"visibility": Database["public"]['Enums']["visibility"],"visited_on"?: string
                  }
                  Update: {
                    "counts_all_time"?: boolean,"counts_in_periods"?: boolean,"id"?: string,"is_backdated"?: boolean,"is_first_visit"?: boolean,"logged_at"?: string,"only_for_text"?: string | null,"place_id"?: string,"user_id"?: string,"verdict"?: Database["public"]['Enums']["verdict"],"verified"?: boolean,"visibility"?: Database["public"]['Enums']["visibility"],"visited_on"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visits_place_id_fkey"
      columns: ["place_id"]
isOneToOne: false
      referencedRelation: "places"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visits_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"want_to_go": {
                  Row: {
                    "created_at": string,"from_visit": string | null,"place_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"from_visit"?: string | null,"place_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"from_visit"?: string | null,"place_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "want_to_go_from_visit_fkey"
      columns: ["from_visit"]
isOneToOne: false
      referencedRelation: "visits"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "want_to_go_place_id_fkey"
      columns: ["place_id"]
isOneToOne: false
      referencedRelation: "places"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "want_to_go_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "add_group_member":
{ Args: { "p_group": string,"p_user": string }; Returns: undefined
                           },
"admin_import_areas":
{ Args: { "p_rows": Json }; Returns: number
                           },
"admin_import_overture":
{ Args: { "p_rows": Json }; Returns: {
              "inserted": number,"linked": number,"skipped": number
            }[]
                           },
"admin_import_wikimedia":
{ Args: { "p_rows": Json }; Returns: {
              "matched": number,"photos": number
            }[]
                           },
"admin_refresh_place_areas":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"admin_resolve_place_suggestion":
{ Args: { "p_apply": boolean,"p_id": string }; Returns: undefined
                           },
"admin_resolve_report":
{ Args: { "p_note"?: string,"p_report": string,"p_status": Database["public"]['Enums']["report_status"] }; Returns: undefined
                           },
"block_user":
{ Args: { "p_target": string }; Returns: undefined
                           },
"cancel_friend_request":
{ Args: { "p_other": string }; Returns: undefined
                           },
"complete_onboarding":
{ Args: { "p_default_visibility": Database["public"]['Enums']["visibility"],"p_diet_prefs": (string)[],"p_display_name": string,"p_home_area": string,"p_is_private": boolean,"p_username": string }; Returns: undefined
                           },
"create_group":
{ Args: { "p_kind"?: string,"p_name": string }; Returns: string
                           },
"create_invite":
{ Args: { "p_group"?: string,"p_kind"?: Database["public"]['Enums']["invite_kind"] }; Returns: {
              "code": string,"expires_at": string,"id": string,"max_uses": number
            }[]
                           },
"create_place":
{ Args: { "p_cuisine_tags"?: (string)[],"p_diet_flags"?: (string)[],"p_force"?: boolean,"p_lat": number,"p_lng": number,"p_name": string,"p_type"?: Database["public"]['Enums']["place_type"] }; Returns: {
              "candidates": Json,"place_id": string,"status": string
            }[]
                           },
"create_share_card":
{ Args: { "p_kind": string,"p_ref"?: string }; Returns: string
                           },
"delete_group":
{ Args: { "p_group": string }; Returns: undefined
                           },
"find_place_candidates":
{ Args: { "p_lat": number,"p_lng": number,"p_name": string,"p_radius_m"?: number }; Returns: {
              "area_name": string,"distance_m": number,"id": string,"name": string,"name_similarity": number,"status": Database["public"]['Enums']["place_status"]
            }[]
                           },
"follow_user":
{ Args: { "p_target": string }; Returns: string
                           },
"get_achievements":
{ Args: { "p_user": string }; Returns: {
              "category": string,"description": string,"earned_at": string,"icon": string,"is_secret": boolean,"name": string,"progress": number,"showcased": number,"slug": string,"threshold": number
            }[]
                           },
"get_discover_people":
{ Args: { "p_kind": string,"p_limit"?: number,"p_param"?: string }; Returns: {
              "avatar_url": string,"display_name": string,"follow_state": string,"home_area": string,"is_private": boolean,"match_rate": number,"score": number,"shared_places": number,"user_id": string,"username": string
            }[]
                           },
"get_group_members":
{ Args: { "p_group": string }; Returns: {
              "avatar_url": string,"display_name": string,"joined_at": string,"role": Database["public"]['Enums']["group_role"],"user_id": string,"username": string
            }[]
                           },
"get_home_feed":
{ Args: { "p_cursor_id"?: string,"p_cursor_ts"?: string,"p_limit"?: number,"p_tab": string }; Returns: {
              "area_name": string,"author_id": string,"avatar_url": string,"display_name": string,"group_name": string,"logged_at": string,"only_for_text": string,"place_id": string,"place_name": string,"tier": number,"username": string,"verdict": Database["public"]['Enums']["verdict"],"visit_id": string,"visited_on": string
            }[]
                           },
"get_invite_preview":
{ Args: { "p_code": string }; Returns: {
              "avatar_url": string,"display_name": string,"group_id": string,"group_name": string,"inviter_id": string,"kind": Database["public"]['Enums']["invite_kind"],"status": string,"username": string
            }[]
                           },
"get_my_companion_tags":
{ Args: Record<PropertyKey, never>; Returns: {
              "by_display_name": string,"by_username": string,"place_id": string,"place_name": string,"visit_id": string,"visited_on": string
            }[]
                           },
"get_my_groups":
{ Args: Record<PropertyKey, never>; Returns: {
              "created_at": string,"id": string,"kind": string,"member_count": number,"name": string,"role": Database["public"]['Enums']["group_role"]
            }[]
                           },
"get_my_logbook":
{ Args: Record<PropertyKey, never>; Returns: {
              "kind": string,"label": string,"places": number
            }[]
                           },
"get_my_map":
{ Args: Record<PropertyKey, never>; Returns: {
              "area_name": string,"cuisine_tags": (string)[],"diet_flags": (string)[],"kind": string,"last_visited": string,"lat": number,"lng": number,"name": string,"only_for_text": string,"place_id": string,"saved_at": string,"type": Database["public"]['Enums']["place_type"],"verdict": Database["public"]['Enums']["verdict"],"visits": number
            }[]
                           },
"get_my_progress":
{ Args: Record<PropertyKey, never>; Returns: {
              "all_time": number,"badges_earned": number,"badges_total": number,"best_streak": number,"current_streak": number,"in_grace": boolean,"level": number,"this_month": number
            }[]
                           },
"get_my_scores":
{ Args: Record<PropertyKey, never>; Returns: {
              "period": Database["public"]['Enums']["score_period"],"period_start": string,"unique_areas": number,"unique_cuisines": number,"unique_places": number,"unique_places_shared": number
            }[]
                           },
"get_on_this_day":
{ Args: Record<PropertyKey, never>; Returns: {
              "place_id": string,"place_name": string,"verdict": Database["public"]['Enums']["verdict"],"visit_id": string,"visited_on": string,"years_ago": number
            }[]
                           },
"get_place":
{ Args: { "p_place": string }; Returns: {
              "area_name": string,"area_slug": string,"brand_name": string,"cuisine_tags": (string)[],"diet_flags": (string)[],"id": string,"lat": number,"lng": number,"merged_into": string,"name": string,"status": Database["public"]['Enums']["place_status"],"type": Database["public"]['Enums']["place_type"]
            }[]
                           },
"get_place_summary":
{ Args: { "p_place": string }; Returns: {
              "go_count": number,"only_for_count": number,"skip_count": number,"tier": number,"went": number
            }[]
                           },
"get_place_top_dishes":
{ Args: { "p_place": string }; Returns: {
              "go_count": number,"name": string,"skip_count": number,"tier": number
            }[]
                           },
"get_place_verdicts":
{ Args: { "p_limit"?: number,"p_place": string,"p_tier_filter"?: string }; Returns: {
              "author_id": string,"avatar_url": string,"display_name": string,"group_name": string,"logged_at": string,"only_for_text": string,"tier": number,"username": string,"verdict": Database["public"]['Enums']["verdict"],"visit_id": string,"visited_on": string
            }[]
                           },
"get_places_in_view":
{ Args: { "p_limit"?: number,"p_max_lat": number,"p_max_lng": number,"p_min_lat": number,"p_min_lng": number,"p_pure_veg"?: boolean,"p_types"?: (Database["public"]['Enums']["place_type"])[] }; Returns: {
              "area_name": string,"cuisine_tags": (string)[],"diet_flags": (string)[],"lat": number,"lng": number,"name": string,"place_id": string,"status": Database["public"]['Enums']["place_status"],"type": Database["public"]['Enums']["place_type"]
            }[]
                           },
"get_profile_stats":
{ Args: { "p_user": string }; Returns: {
              "areas_visible": number,"followers": number,"following": number,"friends": number,"match_rate": number,"places_visible": number,"shared_places": number,"visits_visible": number
            }[]
                           },
"get_showcases":
{ Args: { "p_users": (string)[] }; Returns: {
              "icon": string,"name": string,"slot": number,"slug": string,"user_id": string
            }[]
                           },
"get_visit_details":
{ Args: { "p_visits": (string)[] }; Returns: {
              "dishes": Json,"note": string,"occasion_tags": (string)[],"photo_paths": (string)[],"price_per_head": number,"visit_id": string
            }[]
                           },
"get_visit_feedback":
{ Args: { "p_visit": string }; Returns: {
              "reason": string,"unlocked": Json
            }[]
                           },
"get_year_recap":
{ Args: { "p_year": number }; Returns: Json
                           },
"hinglish_fold":
{ Args: { "t": string }; Returns: string
                           },
"log_visit_for_groups":
{ Args: { "p_groups": (string)[],"p_only_for_text"?: string,"p_place": string,"p_verdict": Database["public"]['Enums']["verdict"],"p_visited_on"?: string }; Returns: string
                           },
"merge_places":
{ Args: { "p_source": string,"p_target": string }; Returns: {
              "affected_users": number,"moved_visits": number
            }[]
                           },
"normalize_name":
{ Args: { "n": string }; Returns: string
                           },
"push_targets_for_visit":
{ Args: { "p_visit": string }; Returns: {
              "user_id": string
            }[]
                           },
"redeem_invite":
{ Args: { "p_befriend"?: boolean,"p_code": string }; Returns: {
              "group_id": string,"inviter": string,"kind": Database["public"]['Enums']["invite_kind"]
            }[]
                           },
"refresh_all_taste_matches":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"refresh_my_taste_matches":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"remove_follower":
{ Args: { "p_follower": string }; Returns: undefined
                           },
"remove_friend":
{ Args: { "p_other": string }; Returns: undefined
                           },
"remove_group_member":
{ Args: { "p_group": string,"p_user": string }; Returns: undefined
                           },
"rename_group":
{ Args: { "p_group": string,"p_name": string }; Returns: undefined
                           },
"report_content":
{ Args: { "p_id": string,"p_reason": string,"p_type": Database["public"]['Enums']["report_target"] }; Returns: string
                           },
"request_friend":
{ Args: { "p_target": string }; Returns: string
                           },
"respond_companion_tag":
{ Args: { "p_add": boolean,"p_visit": string }; Returns: undefined
                           },
"respond_follow":
{ Args: { "p_accept": boolean,"p_follower": string }; Returns: undefined
                           },
"respond_friend":
{ Args: { "p_accept": boolean,"p_other": string }; Returns: undefined
                           },
"revoke_invite":
{ Args: { "p_invite": string }; Returns: undefined
                           },
"revoke_share_card":
{ Args: { "p_token": string }; Returns: undefined
                           },
"save_review":
{ Args: { "p_dishes"?: Json,"p_note"?: string,"p_occasions"?: (string)[],"p_price"?: number,"p_visit": string }; Returns: undefined
                           },
"search_places":
{ Args: { "p_lat"?: number,"p_limit"?: number,"p_lng"?: number,"p_query": string }; Returns: {
              "area_name": string,"diet_flags": (string)[],"distance_m": number,"id": string,"name": string,"rank": number,"type": Database["public"]['Enums']["place_type"]
            }[]
                           },
"set_showcase":
{ Args: { "p_slugs": (string)[] }; Returns: undefined
                           },
"set_visit_audience_groups":
{ Args: { "p_groups": (string)[],"p_visit": string }; Returns: undefined
                           },
"suggest_people_after_log":
{ Args: { "p_limit"?: number,"p_place": string }; Returns: {
              "avatar_url": string,"display_name": string,"is_private": boolean,"others_count": number,"user_id": string,"username": string,"verdict": Database["public"]['Enums']["verdict"]
            }[]
                           },
"suggest_place_fix":
{ Args: { "p_field": string,"p_place": string,"p_value": Json }; Returns: undefined
                           },
"unblock_user":
{ Args: { "p_target": string }; Returns: undefined
                           },
"unfollow_user":
{ Args: { "p_target": string }; Returns: undefined
                           },
"username_available":
{ Args: { "p_username": string }; Returns: boolean
                           }
          }
          Enums: {
            "companion_status": "tagged"|"added"|"dismissed","group_role": "owner"|"member","invite_kind": "friend"|"group","place_status": "unverified"|"confirmed"|"merged"|"closed","place_type": "restaurant"|"cafe"|"street_stall"|"bakery"|"sweet_shop"|"bar"|"other"|"attraction","report_status": "open"|"reviewed"|"actioned"|"dismissed","report_target": "user"|"visit"|"place","request_status": "pending"|"accepted","score_period": "week"|"month"|"all","verdict": "go"|"skip"|"only_for","visibility": "private"|"friends"|"followers"|"public"
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
  "public": {
          Enums: {
            "companion_status": ["tagged", "added", "dismissed"],"group_role": ["owner", "member"],"invite_kind": ["friend", "group"],"place_status": ["unverified", "confirmed", "merged", "closed"],"place_type": ["restaurant", "cafe", "street_stall", "bakery", "sweet_shop", "bar", "other", "attraction"],"report_status": ["open", "reviewed", "actioned", "dismissed"],"report_target": ["user", "visit", "place"],"request_status": ["pending", "accepted"],"score_period": ["week", "month", "all"],"verdict": ["go", "skip", "only_for"],"visibility": ["private", "friends", "followers", "public"]
          }
        }
} as const
