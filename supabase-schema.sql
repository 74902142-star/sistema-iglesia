-- ============================================================
-- Sistema Iglesia Agua Viva — Migración Firestore → Supabase
-- Pegar TODO en: Supabase Dashboard → SQL Editor → Run
-- ============================================================

create table if not exists registros (
  "id" text primary key,
  "fecha" text,
  "sede" text,
  "semana" text,
  "mes" text,
  "totalGeneral" integer default 0,
  "totalVarones" integer default 0,
  "totalMujeres" integer default 0,
  "totalKV" integer default 0,
  "totalKM" integer default 0,
  "registradoPor" text,
  "origen" text,
  "creadoEn" text,
  "asistentes" jsonb,
  "ministerios" jsonb
);

create table if not exists inscripciones (
  "id" text primary key,
  "celular" text,
  "nombres" text,
  "metodoPago" text,
  "pagoCaptura" text,
  "dni" text,
  "timestamp" text,
  "docTipo" text,
  "cursoId" text,
  "correo" text,
  "creadoPor" text,
  "origen" text,
  "cursoNombre" text,
  "estadoPago" text,
  "fechaHorario" text,
  "sede" text,
  "lider" text,
  "monto" integer default 0,
  "ciclo" text
);

create table if not exists kids_maestros (
  "id" text primary key,
  "lider" text,
  "nombres" text,
  "sexo" text,
  "dni" text,
  "createdAt" text,
  "origen" text,
  "celular" text
);

create table if not exists kids_asistencia (
  "id" text primary key,
  "fecha" text,
  "timestamp" text,
  "hora" text,
  "maestroId" text,
  "origen" text
);

create table if not exists lideres_maestros (
  "id" text primary key,
  "lider" text,
  "nombres" text,
  "sexo" text,
  "dni" text,
  "createdAt" text,
  "origen" text,
  "celular" text
);

create table if not exists lideres_asistencia (
  "id" text primary key,
  "fecha" text,
  "timestamp" text,
  "hora" text,
  "maestroId" text,
  "origen" text
);

create table if not exists participantes (
  "id" text primary key,
  "nombre" text,
  "telefono" text,
  "sede" text,
  "rol" text,
  "fecha" text,
  "tipoServicio" text,
  "hora" text,
  "enviado" boolean default false,
  "recordatorioEnviado" boolean default false,
  "foto" text
);

create table if not exists creativos (
  "id" text primary key,
  "nombre" text,
  "telefono" text,
  "rol" text,
  "servicio" text,
  "fecha" text,
  "hora" text,
  "timestamp" text
);

create table if not exists personas (
  "id" text primary key,
  "nombre" text,
  "telefono" text,
  "nombres" text,
  "dni" text,
  "celular" text,
  "correo" text,
  "origen" text,
  "createdAt" text
);

-- ============================================================
-- RLS: acceso público (equivalente a Firestore "allow read, write: if true")
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'registros','inscripciones','kids_maestros','kids_asistencia',
    'lideres_maestros','lideres_asistencia','participantes','creativos','personas'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "public_access" on %I', t);
    execute format('create policy "public_access" on %I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
