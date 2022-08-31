import test from "ava";
import { UuidFactory, where } from "@autogram/autograph";
import { SqlMatchMaker } from "../source/sql-match.js";
import { predicateToSql } from "../source/sql-predicate.js";

/*
Test("predicates render", (t) => {
  const predicates = [
    where("some.property.name", "equals", 1),
    where("some.property.name", "notequals", 1),
    where("some.property.name", "greaterthan", 1),
    where("some.property.name", "lessthan", 1),
    where("some.property.name", "notgreaterthan", 1),
    where("some.property.name", "notlessthan", 1),
    where("some.property.name", "between", [0, 10]),
    where("some.property.name", "within", [0, 10]),
    where("some.property.name", "outside", [0, 10]),
    where("some.property.name", "contains", 1),
    where("some.property.name", "excludes", 1),
    where("some.property.name", "in", [1, 2, 3, 4]),
    where("some.property.name", "notin", [1, 2, 3, 4]),
    where("some.property.name", "startswith", "hello"),
    where("some.property.name", "endswith", "hello"),
    where("some.property.name", "exists", 1),
    where("some.property.name", "missing", 1),
    where("some.property.name", "empty", 1),
  ];
});

*/

test("predicate rendering", (t) => {
  t.is(predicateToSql(where("id", "equals", UuidFactory.nil)).sql, "id = ?");
  t.is(predicateToSql(where("id", "notequals", 1)).sql, "id != ?");
  t.is(predicateToSql(
    where("some.deep.property", "equals", 1)).sql,
    "json_extract(data, '$.some.deep.property') = ?"
  );
});

test("broken edge cases", (t) => {
  t.is(predicateToSql(where("id", "notequals", [0, 1, 2, 3])).args!.length, 4);
});
