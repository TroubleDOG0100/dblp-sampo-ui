const perspectiveID = 'publications'

export const workProperties = `
    ?id dblp:title ?prefLabel__id .
    BIND(?prefLabel__id AS ?prefLabel__prefLabel)
    BIND(CONCAT("/${perspectiveID}/page/", ENCODE_FOR_URI(STR(?id))) AS ?prefLabel__dataProviderUrl)
    BIND(?id AS ?uri__id)
    BIND(?id AS ?uri__dataProviderUrl)
    BIND(?id AS ?uri__prefLabel)
    ?id dblp:yearOfPublication ?publicationYear .
    ?id a ?publicationType__id .
    ?publicationType__id rdfs:label ?publicationType__prefLabel
    FILTER(?publicationType__id != dblp:Publication)

    # Data provider varētu kā instance page konkrētām publikācijas tipam.
    #BIND(?publicationType__id as )
  `;