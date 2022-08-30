# SQLite storage for graphlike JSON documents 
A SQLite backend for Autograph; think of it as a halfway point between serializing 200MB of JSON and getting a real database server.

# What it provides
First and forremost, there's a `SqlGraph` class that stores Autograph's nodes and edges in two big ol' tables full of JSON data. It exposes the same surface-level interface as `JsonGraph`, even using the same map structures under the hood, but all of its mutable methods write to the SQL database and all of its on-graph retrieval methods (including `nodes()` and `edges()` populate fresh collections from the database.

When `Match` arrays are passed into any of its filtering functions, `Predicate` matches are translated to SQL WHERE clauses; the results are loaded from the database and added to the in-memory node and edge collections. They're then run through any `EntityFilter` matches that were part of the `Match` set. As a result, all filters still work but Predicate filters will be more memory-efficient.

## Potential pitfalls
Because JsonGraph keeps _everything_ in memory, it's technically possible to manipulate references to nodes or edges, never bother calling `set()` on them, but still preserve the differences when `graph.save()` is called. No such luck with SqlGraph, unfortunately — if you modify any graph entities, remember to call `graph.set(myEntity)`. Doing it with a big batch of entities once you've finished up a large task is fine.
