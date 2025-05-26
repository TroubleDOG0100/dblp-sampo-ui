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

export const top10MostProductiveCreators = `
select (?id as ?category)
       (MIN(?creatorName) as ?prefLabel)
	     (?publicationCount as ?instanceCount)
{
  {
    select ?id 
           (count(?publ) as ?publicationCount)
    {
      <FILTER>
      VALUES ?facetClass { <FACET_CLASS> }
      ?id a ?facetClass ;
          ^dblp:createdBy ?publ .	
    }
    GROUP BY ?id
    HAVING(?publicationCount > 1)
  }
  ?id dblp:creatorName ?creatorName .
}
GROUP BY ?id ?publicationCount
ORDER BY desc(?publicationCount)
LIMIT 10 
`;


export const creatorsWithMostCitedPublications = `
select (?id as ?category)
       (MIN(?creatorName) as ?prefLabel)
	     (?maxCitations as ?instanceCount)
{
  {
    select ?id ?publ (max(?citationCount) as ?maxCitations)
    {
      <FILTER>
      VALUES ?facetClass { <FACET_CLASS> }
      ?id a ?facetClass ;
  		  ^dblp:createdBy ?publ .
      {
        select ?publ 
        		(count(?citation) as ?citationCount) {
          ?publ dblp:omid ?omid .
          ?citation rdf:type cito:Citation .
          ?citation cito:hasCitedEntity ?omid .
      	}
        GROUP BY ?publ
      }
    }
    GROUP BY ?id ?publ
    HAVING(?maxCitations > 0)
  }
  
  ?id dblp:creatorName ?creatorName .
}
GROUP BY ?id ?maxCitations
ORDER BY desc(?maxCitations)
LIMIT 15 
`;