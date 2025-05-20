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

    OPTIONAL {
      ?id dblp:doi ?doi__id .
      BIND(STRAFTER(STR(?doi__id), "https://doi.org/") as ?doi__prefLabel)
      BIND(?doi__id as ?doi__dataProviderUrl)
    }

    ## TODO: Could encode whether the role is author or editor.
    ?id dblp:createdBy ?creators__id .
    BIND(CONCAT("/creators/page/", ENCODE_FOR_URI(STR(?creators__id))) as ?creators__dataProviderUrl)
    ?creators__id dblp:creatorName ?creators__prefLabel .

    OPTIONAL {
      ?id dblp:publishedIn ?publicationVenueStr .
    }

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

    OPTIONAL {
      ?id owl:sameAs ?wd_id .
      FILTER(STRSTARTS(STR(?wd_id), "http://www.wikidata.org/entity/"))
  	}

    OPTIONAL {
        select ?id (count(?citation) as ?citationCountComp) {
          ?id dblp:omid ?omid .
          ?citation rdf:type cito:Citation .
          ?citation cito:hasCitedEntity ?omid .
        }
        GROUP BY ?id
    }
    BIND(COALESCE(?citationCountComp, 0) as ?citationCount)
    `;

export const laureateWikiDataQuery = [{
    sparqlQuery: `
      SELECT * {
        VALUES (?id ?wd_id) { <ID_RELATED_SET> }
        
        ?wd_id wdt:P921 ?publicationSubject__id .

        ?publicationSubject__id rdfs:label ?publicationSubject__prefLabel .
        FILTER(LANG(?publicationSubject__prefLabel) = "en")
        BIND(?publicationSubject__id as ?publicationSubject__dataProviderUrl)
      }
    `,
    dataSet: 'wikidata',
    templateFillerConfig: { relatedProperty: "wd_id" }
  }]    

export const publicationTypePerYear = 
`
select ?category 
       (?yearOfPublication as ?xValue) 
       (?publicationCount as ?yValue)
{
  {
    select ?yearOfPublication ?publicationType (count(?id) as ?publicationCount) 
    {
      <FILTER>
      VALUES ?facetClass { <FACET_CLASS> }
      ?id a ?facetClass ;
          dblp:yearOfPublication ?yearOfPublication ;
          a ?publicationType .
      FILTER(?publicationType != ?facetClass)
  	}
  	GROUP BY ?yearOfPublication ?publicationType
  }
  
  ?publicationType rdfs:label ?category .
  FILTER(LANG(?category) = "en")
}
`

export const publicationCountPerYear = `
select (?yearOfPublication as ?category) 
       (?publicationCount as ?count)
{
  select ?yearOfPublication (count(?id) as ?publicationCount) 
  {
    <FILTER>
    VALUES ?facetClass { <FACET_CLASS> }
    ?id a ?facetClass ;
        dblp:yearOfPublication ?yearOfPublication .
  }
  GROUP BY ?yearOfPublication
}
`