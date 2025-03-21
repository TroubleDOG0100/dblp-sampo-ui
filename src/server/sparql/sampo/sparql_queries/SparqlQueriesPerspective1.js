const perspectiveID = 'perspective1'

export const workProperties = `
 {
    ?id rdfs:label ?prefLabel__id .
    BIND(?prefLabel__id AS ?prefLabel__prefLabel)
    BIND(CONCAT("/perspective1/page/", REPLACE(STR(?id), "^.*\\\\/(.+)", "$1")) AS ?prefLabel__dataProviderUrl)
    BIND(?id AS ?uri__id)
    BIND(?id AS ?uri__dataProviderUrl)
    BIND(?id AS ?uri__prefLabel)
  }`