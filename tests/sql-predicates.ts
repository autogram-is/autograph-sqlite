import test from "ava";
import { UuidFactory, where } from "@autogram/autograph";
import { predicateToSql } from "../source/sql-predicate.js";

test("property pathing", (t) => {
  // These specific properties are known in the schema; address them directly.
  t.is(predicateToSql(where("id", { eq: 1 })).sql, "id = ?");
  t.is(predicateToSql(where("type", { eq: 1 })).sql, "type = ?");
  t.is(predicateToSql(where("predicate", { eq: 1 })).sql, "predicate = ?");
  t.is(predicateToSql(where("target", { eq: 1 })).sql, "target = ?");
  t.is(predicateToSql(where("source", { eq: 1 })).sql, "source = ?");

  // Other property names are assumed to live on the JSON blob.
  t.is(
    predicateToSql(where("random", { eq: 1 })).sql,
    "json_extract(data, '$.random') = ?",
  );
  t.is(
    predicateToSql(where("some.deep.property", { eq: 1 })).sql,
    "json_extract(data, '$.some.deep.property') = ?",
  );
});

test("equals", (t) => {
  t.is(predicateToSql(where("id", { eq: UuidFactory.nil })).sql, "id = ?");
});

test("greater than", (t) => {
  const predicate = predicateToSql(where("id", { gt: 0 }));
  t.is(predicate.sql, "id > ?");
  t.deepEqual(predicate.args, [0]);
});

test("less than", (t) => {
  const predicate = predicateToSql(where("id", { lt: 100 }));
  t.is(predicate.sql, "id < ?");
  t.deepEqual(predicate.args, [100]);
});

test("is between", (t) => {
  const predicate = predicateToSql(where("id", { bt: [0, 10] }));
  t.is(predicate.sql, "(id > ? AND id < ?)");
  t.deepEqual(predicate.args, [0, 10]);
});

test("has", (t) => {
  const predicate = predicateToSql(where("labels", { has: "text" }));
  t.is(
    predicate.sql,
    "json_array_contains(json_extract(data, '$.labels'), ?)) = 1",
  );
  t.deepEqual(predicate.args, ["text"]);
});

test("is in", (t) => {
  const predicate = predicateToSql(where("id", { in: ['some', 'values'] }));
  t.is(predicate.sql, "id IN (?,?)");
  t.deepEqual(predicate.args, ["some", "values"]);
});

test("starts with", (t) => {
  const predicate = predicateToSql(where("id", { sw: 'text' }));
  t.is(predicate.sql, "id LIKE ?");
  t.deepEqual(predicate.args, ["text%"]);
});

test("ends with", (t) => {
  const predicate = predicateToSql(where("id", { ew: 'text' }));
  t.is(predicate.sql, "id LIKE ?");
  t.deepEqual(predicate.args, ["%text"]);
});