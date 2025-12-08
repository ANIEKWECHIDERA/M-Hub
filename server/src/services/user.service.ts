// services/user.service.ts
import { supabaseAdmin } from "../config/supabaseClient";

export const UserService = {
  async findByFirebaseUid(firebaseUid: string) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("firebase_uid", firebaseUid)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  async createOrUpdate(userData: any) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          firebase_uid: userData.firebase_uid,
          email: userData.email,
          display_name: userData.display_name ?? null,
          photo_url: userData.photo_url ?? null,
          first_name: userData.first_name ?? null,
          last_name: userData.last_name ?? null,
          company_id: userData.company_id ?? null,
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "firebase_uid" }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateByFirebaseUid(firebaseUid: string, updates: any) {
    delete updates.id;
    delete updates.firebase_uid;
    delete updates.created_at;

    const { data, error } = await supabaseAdmin
      .from("users")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("firebase_uid", firebaseUid)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteByFirebaseUid(firebaseUid: string) {
    const { error } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("firebase_uid", firebaseUid);
    if (error) throw error;
  },
};
