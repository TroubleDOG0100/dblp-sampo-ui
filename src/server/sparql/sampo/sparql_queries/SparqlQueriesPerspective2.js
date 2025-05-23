const perspectiveID = 'creators'

export const workProperties =
`
    ?id dblp:creatorName ?prefLabel__id .
    BIND(?prefLabel__id AS ?prefLabel__prefLabel)
    BIND(CONCAT("/${perspectiveID}/page/", ENCODE_FOR_URI(STR(?id))) AS ?prefLabel__dataProviderUrl)
    BIND(?id AS ?uri__id)
    BIND(?id AS ?uri__dataProviderUrl)
    BIND(?id AS ?uri__prefLabel)

  	?id a ?type .
    FILTER(?type != dblp:Creator)
    ?type rdfs:label ?creatorType .
    FILTER(LANG(?creatorType) = "en")

    OPTIONAL {
        ?id dblp:affiliation ?affiliation .
    }
    OPTIONAL {
        ?id dblp:creatorNote ?creatorNote .
    }
    OPTIONAL {
      ?id owl:sameAs ?otherIds__id .
      BIND(STR(?otherIds__id) as ?otherIds__prefLabel)
      BIND(?otherIds__id as ?otherIds__dataProviderUrl)
    }
    OPTIONAL {
        ?id dblp:orcid ?orcid__id .
        BIND(STR(?orcid__id) AS ?orcid__prefLabel)
        BIND(?orcid__id AS ?orcid__dataProviderUrl)
    }
`