// Crea los usuarios demo (uno por rol) y sus profiles vía API de administración.
// Uso: node --env-file=.env.local scripts/seed-users.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORG_ID = "00000000-0000-0000-0000-000000000001";
const PASSWORD = "password123";

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  ["owner@jsm.test", "Owner Demo", "super_admin"],
  ["ejecutivo@jsm.test", "Eje Cuenta Demo", "ejecutivo"],
  ["admin@jsm.test", "Admin Demo", "admin"],
  ["operaciones@jsm.test", "Hector Operaciones", "operaciones"],
  ["finanzas@jsm.test", "Compras Finanzas", "compras_finanzas"],
  ["conta@jsm.test", "Conta Demo", "contabilidad"],
];

async function findUserByEmail(email) {
  // Pagina hasta encontrarlo (suficiente para seed pequeño)
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email === email);
    if (u) return u;
    if (data.users.length < 200) break;
  }
  return null;
}

// Asegura la organización demo
await db.from("organizations").upsert({ id: ORG_ID, nombre: "JSM Agencia (Demo)" });

for (const [email, nombre, rol] of USERS) {
  let userId;
  const { data: created, error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) {
    const existing = await findUserByEmail(email);
    if (!existing) {
      console.error(`✗ ${email}: ${error.message}`);
      continue;
    }
    userId = existing.id;
    await db.auth.admin.updateUserById(userId, { password: PASSWORD });
  } else {
    userId = created.user.id;
  }

  const { error: pErr } = await db
    .from("profiles")
    .upsert({ id: userId, org_id: ORG_ID, nombre, rol });
  if (pErr) console.error(`✗ profile ${email}: ${pErr.message}`);
  else console.log(`✓ ${email} (${rol})`);
}

console.log("\nListo. Contraseña para todos: password123");
