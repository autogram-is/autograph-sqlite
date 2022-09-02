import { where } from "@autogram/autograph";
import { Scion, Parent } from "./scion.js";
import { SqliteGraph } from "../../source/index.js";
import { JsonGraph } from "@autogram/autograph";

const dbFile = './tests/fixtures/hapsburgs.sqlite';

(async () => {
  const sql = new SqliteGraph({ filename: dbFile });

  const kidsOfEmperors = sql
    .nodes(where('title', { eq: 'Holy Roman Emperor' }))
    .outbound(where('predicate', { eq: 'is_parent_of' }))
    .targets();

  for (const kid of kidsOfEmperors) {
    if (kid instanceof Scion) {
      console.log(
        `${kid.name}, ${kid.title ?? ''} (${kid.birth ?? 0}-${kid.death ?? 0})`,
      );
    }
  }

})();
