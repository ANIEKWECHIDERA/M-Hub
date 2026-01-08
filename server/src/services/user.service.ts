import { supabaseAdmin } from "../config/supabaseClient";
import { prisma } from "../lib/prisma";
import { CreateUserFromAuthDTO } from "../types/user.types";

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
    return prisma.users.create({
      data: {
        firebase_uid: dto.firebase_uid,
        email: dto.email,
        display_name: dto.display_name ?? null,
        photo_url: dto.photo_url ?? null,
        terms_accepted: false,
        terms_accepted_at: null,
      },
    });
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

    if (error) throw error;
    return data;
  },

  async updateByFirebaseUid(
    firebaseUid: string,
    updates: Partial<{
      first_name: string;
      last_name: string;
      display_name: string;
      photo_url: string;
    }>
  ) {
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
