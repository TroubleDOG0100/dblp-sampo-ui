const perspectiveID = 'publications'

export const workProperties = `
 {
    BIND(STRAFTER(STR(?id), "https://dblp.org/rec/books/acm/") as ?local_id)
    # To use the same query block for paged and instance page, then we must decode from instance page last URL path the encoded resource URI.
    OPTIONAL {?id a dblp:Publication .
              BIND(?id AS ?real_id)}

    BIND(COALESCE(?real_id, IRI(CONCAT("https://dblp.org/rec/books/acm/", REPLACE(?local_id, "___", "/")))) AS ?final_id)
    FILTER(?final_id)
    ?final_id rdfs:label ?prefLabel__id .
    BIND(?prefLabel__id AS ?prefLabel__prefLabel)
    BIND(CONCAT("/${perspectiveID}/page/", REPLACE(STRAFTER(STR(?id), "https://dblp.org/rec/books/acm/"), "/", "___")) AS ?prefLabel__dataProviderUrl)
    BIND(?final_id AS ?uri__id)
    BIND(?final_id AS ?uri__dataProviderUrl)
    BIND(?final_id AS ?uri__prefLabel)
  }`;

// Removes the subquery brackets { } from the workProperties string since otherwise the instance page seems to fail due to the inner subquery being executed before ?id gets bound.
export const workPropertiesInstance = workProperties.trim().slice(1, -1).trim();