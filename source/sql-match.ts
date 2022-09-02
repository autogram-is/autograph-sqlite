import is from "@sindresorhus/is";
import { Entity, Match, Predicate, MatchMaker, where } from "@autogram/autograph";
import { predicateToSql } from "./sql-predicate.js";

type SqlClause = { sql: string; args: (number | string | boolean)[] };
export class SqlMatchMaker<T extends Entity = Entity> extends MatchMaker<T> {
  constructor(matches: Match<T>[]) {
    super(matches);
    if (is.nonEmptyArray(this.ids)) {
      this.predicates.push(
        where('id', { in: this.ids })
      );
    }
  }

  match(input: T): boolean {
    return this.functionFilter(input);
  }

  toSql(): SqlClause {
    const clauses: string[] = [];
    let allArgs: (number | string | boolean)[] = [];

    for (const predicate of this.predicates) {
      const { sql, args } = predicateToSql(predicate);
      clauses.push(sql);
      if (is.array(args)) {
        allArgs.push(...args);
      }
    }

    return {
      sql: clauses.join(`
       AND `),
      args: allArgs,
    };
  }
}
