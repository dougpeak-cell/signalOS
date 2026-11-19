import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { item, ratings } from "../../../tests/pullback/fixtures";

const user = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const db = new PGlite();
beforeAll(async () => {
  await db.exec(`
    create schema auth;
    create table auth.users(id uuid primary key);
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create function auth.uid() returns uuid language sql as
      'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    grant usage on schema auth, public to authenticated, service_role;
    insert into auth.users values ('${user}'), ('${other}');
  `);
  await db.exec(await readFile(resolve(process.cwd(), "supabase", "migrations", "20261119220000_add_pullback_watch.sql"), "utf8"));
  await db.query("insert into public.pullback_watches(user_id,symbol,notify) values ($1,'TEST',true),($2,'TEST',true)", [user, other]);
}, 30_000);
afterAll(async () => { await db.close(); });

describe("persistent in-app alert delivery", () => {
  it("emits on the second firm and exactly once per user, stock, pullback and stage across retries", async () => {
    const one = item();
    one.evaluation.firms = [ratings[0]];
    one.evaluation.analystAt = null;
    one.evaluation.priceVolume = null;
    await db.query("select record_pullback_evaluation($1,'TEST',$2)", [user, JSON.stringify(one)]);
    expect((await db.query("select id from pullback_events")).rows).toHaveLength(0);
    const supported = item();
    supported.evaluation.priceVolume = null;
    await db.query("select record_pullback_evaluation($1,'TEST',$2)", [user, JSON.stringify(supported)]);
    expect((await db.query("select stage from pullback_events")).rows).toEqual([{ stage: "analyst" }]);
    await Promise.all(Array.from({ length: 8 }, () => db.query(
      "select record_pullback_evaluation($1,'TEST',$2)", [user, JSON.stringify(item())],
    )));
    expect((await db.query("select stage from pullback_events order by stage")).rows).toEqual([{ stage: "analyst" }, { stage: "price-volume" }]);
    await db.query("select record_pullback_evaluation($1,'TEST',$2)", [other, JSON.stringify(item())]);
    expect((await db.query("select id from pullback_events")).rows).toHaveLength(4);
    const next = item();
    next.evaluation.episode!.id = "TEST:2026-11-19";
    await db.query("select record_pullback_evaluation($1,'TEST',$2)", [user, JSON.stringify(next)]);
    expect((await db.query("select id from pullback_events")).rows).toHaveLength(6);
  });

  it("keeps saved evidence immutable, rejects obsolete trust settings, and isolates users with RLS", async () => {
    const changed = item();
    changed.evaluation.priceVolume!.price = 999;
    await db.query("select record_pullback_evaluation($1,'TEST',$2)", [user, JSON.stringify(changed)]);
    const stored = await db.query<{ evidence: ReturnType<typeof item> }>("select evidence from pullback_events where user_id=$1 and stage='price-volume' order by created_at limit 1", [user]);
    expect(stored.rows[0].evidence.evaluation.priceVolume?.price).toBe(103);
    await db.query("update pullback_watches set trusted_firms=array['CFRA'] where user_id=$1", [user]);
    const outdated = item();
    outdated.evaluation.episode!.id = "TEST:outdated-trust";
    await db.query("select record_pullback_evaluation($1,'TEST',$2)", [user, JSON.stringify(outdated)]);
    expect((await db.query("select id from pullback_events where pullback_id='TEST:outdated-trust'")).rows).toHaveLength(0);
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${other}';`);
    expect((await db.query("select distinct user_id from pullback_events")).rows).toEqual([{ user_id: other }]);
    await expect(db.query("insert into pullback_events(user_id,symbol,pullback_id,stage,evidence) values ($1,'TEST','fake','analyst','{}')", [other])).rejects.toThrow();
    await expect(db.query("select record_pullback_evaluation($1,'TEST',$2)", [other, JSON.stringify(item())])).rejects.toThrow();
    await db.exec("reset role");
  });
});
