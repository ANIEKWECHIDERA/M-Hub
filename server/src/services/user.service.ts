import { supabaseAdmin } from "../config/supabaseClient";
import { CreateUserFromAuthDTO } from "../types/user.types";
import { logger } from "../utils/logger";

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

  async findByEmail(email: string) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  async createFromAuth(dto: CreateUserFromAuthDTO) {
    logger.info("createFromAuth: Starting to insert user", dto);
    try {
      const { data, error } = await supabaseAdmin
        .from("users")
        .insert({
          firebase_uid: dto.firebase_uid,
          email: dto.email,
          display_name: dto.display_name ?? null,
          photo_url: dto.photo_url ?? null,
          terms_accepted: false,
          terms_accepted_at: null,
          last_login: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        logger.info(
          "createFromAuth: Error inserting user into Supabase",
          error,
        );
        throw error;
      }
      logger.info("createFromAuth: User inserted successfully", data);
      return data;
    } catch (error) {
      logger.error("createFromAuth: Unexpected error", { error });
      throw error;
    }
  },

  async create(userData: {
    firebase_uid: string;
    email: string;
    first_name?: string;
    last_name?: string;
    display_name?: string;
    photo_url?: string;
    company_id?: string;
    terms_accepted: boolean;
    terms_accepted_at: Date;
  }) {
    try {
      logger.info("create: Starting to insert user", userData);

      const { data, error } = await supabaseAdmin
        .from("users")
        .insert({
          firebase_uid: userData.firebase_uid,
          email: userData.email,
          display_name: userData.display_name ?? null,
          photo_url: userData.photo_url ?? null,
          first_name: userData.first_name ?? null,
          last_name: userData.last_name ?? null,
          company_id: userData.company_id ?? null,
          terms_accepted: userData.terms_accepted,
          terms_accepted_at: userData.terms_accepted_at,
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        logger.error("create: Error inserting user into Supabase", error);
        throw error;
      }

      logger.info(
        "create: User inserted successfully",
        data.id,
        data.display_name,
        data.email,
        data.firebase_uid,
      );
      return data;
    } catch (error) {
      logger.error("create: Unexpected error", { error });
      throw error;
    }
  },

  async updateByFirebaseUid(
    firebaseUid: string,
    updates: Partial<{
      first_name: string;
      last_name: string;
      display_name: string;
      photo_url: string;
      profile_complete?: boolean;
    }>,
  ) {
    if (!firebaseUid) {
      logger.warn("UserService.updateByFirebaseUid: Missing firebaseUid", {
        firebaseUid,
        updates,
      });
      throw new Error("Firebase UID is required for updating user");
    }

    const display_name = updates.display_name
      ? updates.display_name
      : `${updates.first_name ?? ""} ${updates.last_name ?? ""}`.trim();

    logger.info("UserService.updateByFirebaseUid: start", {
      firebaseUid,
      updates,
      display_name,
    });

    const { data, error } = await supabaseAdmin
      .from("users")
      .update({
        ...updates,
        display_name: display_name,
        updated_at: new Date().toISOString(),
      })
      .eq("firebase_uid", firebaseUid)
      .select()
      .maybeSingle();

    logger.info("UserService.updateByFirebaseUid: success", {
      firebaseUid,
      updates,
    });

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
