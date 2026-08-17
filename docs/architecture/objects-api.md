# The objects endpoints

What the editor asks of the API for catalogue objects, and what the API has to guarantee back.
The client side is [`sdk/modelsApiClient.js`](../../sdk/modelsApiClient.js); the board reads it
through `BlockObjectCatalogue`. See [`building-blocks.md`](building-blocks.md) §9 for what an object
is and how a model carries it.

An object is a building-block component definition — the same JSON as
[`scripts/blocks/definitions/*.json`](../../scripts/blocks/definitions) — plus the catalogue
metadata every other asset has. It behaves like videos and data sets: taxonomy by education level
and science, a thumbnail, a title and a description.

## The resource

```jsonc
{
    "id": "b6c1…",                    // catalogue id, used in the URLs
    "type": "pendulum-swing",         // the definition's own type; unique across the catalogue
    "title": "Pendulum",
    "description": "A pendulum whose angle comes from a model variable.",
    "thumbnail_url": "https://…/objects/b6c1…/thumbnail.png",
    "education_level_id": "…",
    "science_id": "…",
    "user_id": "…",
    "created_at": "2026-08-05T10:00:00Z",
    "updated_at": "2026-08-05T10:00:00Z"
}
```

`type` **must** be present in list rows. The palette lists one card per type and reads the
definition only when an object is placed, so a row without a type is dropped by the client.

The `definition` field — the full JSON document — is returned by `GET /objects/{id}/definition`
only, never inside a list row. A list of fifty objects should not carry fifty node trees.

## Endpoints

| Method | Path | Used by | Returns |
| --- | --- | --- | --- |
| `GET` | `/objects?limit&offset&q&education_level_id&science_id` | `fetchObjectsPage`, the board palette | `{ items: [resource], total }` |
| `GET` | `/objects?science_id&education_level_id` | `fetchObjects` | `[resource]` |
| `GET` | `/objects/facets` | `fetchObjectsFacets` | `{ education: [...], sciences: [...], total }` |
| `GET` | `/objects/{id}` | `fetchObjectById` | resource |
| `GET` | `/objects/{id}/definition` | `fetchObjectDefinition` | the definition document |
| `POST` | `/objects` | `createObject` | resource |
| `PUT` | `/objects/{id}` | `patchObject` | resource |
| `DELETE` | `/objects/{id}` | `deleteObject` | — |
| `POST` | `/objects/{id}/thumbnail` | `uploadObjectThumbnail` | `{ thumbnail_url }` |
| `DELETE` | `/objects/{id}/thumbnail` | `deleteObjectThumbnail` | — |

All of them take `Authorization: Bearer <token>`. The paged response is read by
`parsePagedResponse`, which accepts `items`, `data` or a bare array, and `total` or `total_count`.
The facets response is read by `parseTaxonomyFacets`, the same shape videos and data sets return.

`POST /objects` is `multipart/form-data`: `title`, `definition` (the document as a JSON string),
and optionally `description`, `science_id`, `education_level_id`, `asset` (the thumbnail image).
`PUT /objects/{id}` is JSON and carries whichever of those fields changed, `definition` included.

## What the server has to check

The definition is executed by every viewer's compiler, so the editor's own checks are not enough —
they only bind the person who happened to author the object.

1. **Schema and semantics.** Run the equivalent of `BlockDefinitionLoader.inspect()` and
   `BlockValidator`: a supported `schemaVersion`, `category: "component"`, a root node, every
   parameter and local declared, no formula reading an undeclared name, and only registered block
   types anywhere in the tree. Reject with `400` and a body carrying `error` — `createObject`
   surfaces that text.
2. **The type.** `^[a-z][a-z0-9-]{2,48}$` and unique across the catalogue.

   The types the editor ships with — `analogue-clock`, `circular-gauge`, `compass`, `orbit-system`,
   `rotating-vector`, `speedometer`, `steering-wheel`, `thermometer` — are **allowed**, because the seed publishes exactly those so
   the catalogue lists everything rather than everything-except-the-built-ins. Placing such a card
   always draws the bundled object: `BlockObjectLibrary.registerDocument()` refuses to register a
   document under a built-in type, so the definition stored against it is never what draws. That
   makes it harmless but also misleadable — a card under a built-in type could carry any screenshot
   and description — so treat one arriving from anybody other than an administrator as suspect if
   per-user publishing is ever opened up.
3. **No code.** The block layer evaluates nothing: any `create`, function-valued field or script
   string in the document is a rejection, not a field to ignore.
4. **Size.** Bound the document and the node count the way the compiler's own complexity limits do.

## Notes for whoever builds it

* **Publishing rights** are the open question. Everything else here has an admin-only create path
  in the catalogue; objects will want the same to begin with, and per-user objects later.
* **Renaming a type breaks nothing already saved.** Models carry their own copy of the definition,
  so an object edited or withdrawn from the catalogue leaves existing models untouched. That is
  deliberate: see the "model wins over the catalogue" rule in `building-blocks.md`.
* **Thumbnails are generated, not drawn.** The catalogue editor renders the object through
  `BlockRenderer` and uploads the result; the endpoint only has to store an image.
* **The first write will come from the seed.** `node tests/seed-objects.js --write` publishes the six
  bundled objects, keyed by type and safe to re-run. Its dry run works against the endpoints as they
  are today — it reports the listing as unreadable and plans against an empty catalogue — so it is
  also a quick way to check a freshly deployed `/objects` before anything real depends on it.
