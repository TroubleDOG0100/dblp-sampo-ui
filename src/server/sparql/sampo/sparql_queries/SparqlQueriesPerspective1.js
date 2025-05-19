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
    ?publicationType__id rdfs:label ?publicationType__prefLabel .
    FILTER(?publicationType__id != dblp:Publication)

    ?id dblp:doi ?doi__id .
    BIND(STRAFTER(STR(?doi__id), "https://doi.org/") as ?doi__prefLabel)
    BIND(?doi__id as ?doi__dataProviderUrl)

    ?id dblp:publishedIn ?publicationVenueStr .


    ## TODO: Could encode whether the role is author or editor.
    ?id dblp:createdBy ?creators__id .
    BIND(CONCAT("/creators/page/", ENCODE_FOR_URI(STR(?creators__id))) as ?creators__dataProviderUrl)
    ?creators__id dblp:creatorName ?creators__prefLabel .

    OPTIONAL {
      ?id dblp:publishedInStream ?publicationVenue__id .
      ?publicationVenue__id dblp:streamTitle ?publicationVenueStr2 .
      BIND(?publicationVenue__id as ?publicationVenue__dataProviderUrl)
    }
    BIND(COALESCE(?publicationVenueStr2, ?publicationVenueStr) as ?publicationVenue__prefLabel)

    OPTIONAL {
      ?id dblp:pagination ?pagination .
    }

    OPTIONAL {
      ?id owl:sameAs ?otherIds__id .
      BIND(STR(?otherIds__id) as ?otherIds__prefLabel)
      BIND(?otherIds__id as ?otherIds__dataProviderUrl)
    }
    `;