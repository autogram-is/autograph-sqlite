import { where } from "@autogram/autograph";
import { SqlMatchMaker } from "../../source/sql-match.js";

const predicates = [
  where("id", { eq: "uuid" }),
  where("some.property.name", { gt: 1 }),
  where("some.property.name", { lt: 1 }),
  where("some.property.name", { bt: [0, 10] }),
  where("some.property.name", { has: 1 }),
  where("some.property.name", { in: [1, 2, 3, 4] }),
  where("some.property.name", { sw: "hello" }),
  where("some.property.name", { ew: "hello" }),
  where("some.property.name", { exists: true }),
  where("some.property.name", { empty: true }),
];

const mm = new SqlMatchMaker(predicates);
console.log(mm.toSql());
