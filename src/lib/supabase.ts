import { createClient } from "@supabase/supabase-js";

const supabaseUrl      = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey   = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 伺服器端使用 service_role key，可 bypass RLS 直接讀寫
export const supabase = createClient(supabaseUrl, serviceRoleKey);
