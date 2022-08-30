import is from '@sindresorhus/is';
import { Entity,  Match, Predicate, MatchMaker, Operator } from "@autogram/autograph";
import { predicateToSql } from './sql-predicate.js';


type sqlClause = { sql: string, args?: (number | string | boolean)[] };
export class SqlMatchMaker<T extends Entity = Entity> extends MatchMaker<T> {
  match(input: T): boolean {
    return this.functionFilter(input);
  }

  get isEmpty(): boolean {
    return (
      this.ids.length + this.functions.length + this.predicates.length === 0
    );
  }

  get isSingleId(): boolean {
    return (
      is.emptyArray(this.predicates) &&
      is.emptyArray(this.functions) &&
      this.ids.length === 0
    );
  }

  toSql(): sqlClause {
    let clauses: string[] = [];
    let allArgs: (number | string | boolean)[] = [];

    for (let predicate of this.predicates) {
      let { sql, args } = predicateToSql(predicate);
      clauses.push(sql);
      if (args !== undefined && is.array(args)) {
        allArgs = [...allArgs, ...args];
      }
    }

    return {
      sql: clauses.join(`
       AND `),
      args: allArgs,
    }
  }

  protected idFilter(input: T): boolean {
    return this.ids.length > 0 ? this.ids.includes(input.id) : true;
  }

  protected predicateFilter(input: T): boolean {
    let result = true;
    for (const p of this.predicates) result &&= p.match(input);
    return result;
  }

  protected functionFilter(input: T): boolean {
    let result = true;
    for (const f of this.functions) result &&= f(input);
    return result;
  }
}