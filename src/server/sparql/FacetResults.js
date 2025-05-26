import { has } from 'lodash'
import { runSelectQuery } from './SparqlApi'
import { runNetworkQuery } from './NetworkApi'
import { makeObjectList, mapCount } from './Mappers'
import { generateConstraintsBlock, generateInstanceValuesConstraint } from './Filters'
import { applyPostProcessing } from './Utils'
import { fillIDSets } from './TemplateFiller'
import {
  countQuery,
  facetResultSetQuery,
  instanceQuery
} from './SparqlQueriesGeneral'

export const getPaginatedResults = async ({
  backendSearchConfig,
  resultClass,
  page,
  pagesize,
  constraints,
  sortBy,
  sortDirection,
  resultFormat,
  dynamicLangTag,
}) => {
  const perspectiveConfig = backendSearchConfig[resultClass]
  const {
    endpoint:perspectiveEndpoint,
    facets,
    facetClass,
    enableDynamicLanguageChange,
    defaultConstraint = null,
    langTagSecondary = null
  } = perspectiveConfig

  const langTag = enableDynamicLanguageChange ? dynamicLangTag : perspectiveConfig.langTag || null
  const resultClassConfig = perspectiveConfig.resultClasses[resultClass]
  
  const {
    propertiesQueryBlock,
    filterTarget = 'id',
    resultMapper:finalResultMapper = makeObjectList,
    resultMapperConfig:finalResultMapperConfig = null,
    postprocess:finalPostProcess = null,
    sparqlQuery = []
  } = resultClassConfig.paginatedResultsConfig

  // Prepend as first the paginated result set query to execute it first to limit results.
  sparqlQuery.unshift({
    sparqlQuery: facetResultSetQuery, 
    endpoint: perspectiveEndpoint,
  });

  // Construct and execute sequentially queries:
  let finalResultSet = [];
  let finalQuery = "";
  for (let [idx, queryObj] of sparqlQuery.entries()){
    let { 
      sparqlQuery:q, 
      endpoint, 
      resultMapper = null, 
      resultMapperConfig = null, 
      postprocess = null,
      templateFiller = fillIDSets,
      templateFillerConfig = null
    } = queryObj;

    if (constraints == null && defaultConstraint == null) {
      q = q.replace('<FILTER>', '# no filters')
    } else {
      q = q.replace('<FILTER>', generateConstraintsBlock({
        backendSearchConfig,
        facetClass: resultClass, // use resultClass as facetClass
        constraints,
        defaultConstraint,
        filterTarget,
        facetID: null
      }))
    }
    if (sortBy == null) {
      q = q.replace('<ORDER_BY_TRIPLE>', '')
      q = q.replaceAll('<ORDER_BY>', '# no sorting')
    }
    if (sortBy !== null) {
      let sortByPredicate
      if (sortBy.endsWith('Timespan')) {
        sortByPredicate = sortDirection === 'asc'
          ? facets[sortBy].sortByAscPredicate
          : facets[sortBy].sortByDescPredicate
      } else {
        sortByPredicate = facets[sortBy].sortByPredicate
      }
      let sortByPattern
      if (has(facets[sortBy], 'sortByPattern')) {
        sortByPattern = facets[sortBy].sortByPattern
      } else {
        let sortByValueFilter = facets[sortBy].sortByValueFilter
        sortByPattern = `OPTIONAL { ?id ${sortByPredicate} ?orderBy . ${sortByValueFilter ?? ''} }`
      }
      q = q.replace('<ORDER_BY_TRIPLE>', sortByPattern)
      q = q = q.replaceAll('<ORDER_BY>', `ORDER BY (!BOUND(?orderBy)) ${sortDirection}(?orderBy)`)
    }
    q = q.replace(/<FACET_CLASS>/g, facetClass)
    if (has(backendSearchConfig[resultClass], 'facetClassPredicate')) {
      q = q.replace(/<FACET_CLASS_PREDICATE>/g, backendSearchConfig[resultClass].facetClassPredicate)
    } else {
      q = q.replace(/<FACET_CLASS_PREDICATE>/g, 'a')
    }
    q = q.replace('<PAGE>', `LIMIT ${pagesize} OFFSET ${page * pagesize}`)
    q = q.replace('<RESULT_SET_PROPERTIES>', propertiesQueryBlock)
    if (langTag) {
      q = q.replace(/<LANG>/g, langTag)
    }
    if (langTagSecondary) {
      q = q.replace(/<LANG_SECONDARY>/g, langTagSecondary)
    }

    // console.log(endpoint.prefixes + q)
    try{
      q = templateFiller(finalResultSet, q, templateFillerConfig);

      let results = await runSelectQuery({
        query: perspectiveEndpoint.prefixes + q,
        // Currently authentication is limited to only the main endpoint of perspective.
        useAuth: perspectiveEndpoint.useAuth,
        endpoint: endpoint.url,
        resultMapper,
        resultMapperConfig,
        postprocess,
        resultFormat
      });

      if (resultFormat !== "json"){
        return results;
      }else{
        let {data, sparqlQuery:query} = results;

        finalResultSet = finalResultSet.concat(data);
        finalQuery += `\n##___<${endpoint.url}>___\n` + query;
      }
    }
    catch(e) {
      // If first query had error, then display to client error and do not return any results.
      if (idx == 0)
        throw e;
      else
        console.log(e); // Log error for any sequential query failures but do not impact previous query results.
    }
  }
  
  // Apply final postprocessing.
  finalResultSet = applyPostProcessing({
    data: finalResultSet,
    resultMapper: finalResultMapper,
    resultMapperConfig: finalResultMapperConfig,
    postprocess: finalPostProcess
  });

  return {
    data:  finalResultSet, 
    sparqlQuery: finalQuery
  }
}

export const getAllResults = async ({
  backendSearchConfig,
  perspectiveID = null,
  resultClass,
  facetClass,
  uri,
  constraints,
  resultFormat,
  optimize,
  limit,
  fromID = null,
  toID = null,
  period = null,
  province = null,
  dynamicLangTag
}) => {
  const finalPerspectiveID = perspectiveID || facetClass
  const perspectiveConfig = backendSearchConfig[finalPerspectiveID]
  if (perspectiveConfig === undefined) {
    console.log(`Error: config not found for perspective "${finalPerspectiveID}"`)
    return Promise.resolve({
      data: null,
      sparqlQuery: ''
    })
  }

  // Endpoint izgūšana 
  const {
    endpoint:perspectiveEndpoint,
    defaultConstraint = null,
    langTagSecondary = null,
    enableDynamicLanguageChange
  } = perspectiveConfig
  const langTag = enableDynamicLanguageChange ? dynamicLangTag : perspectiveConfig.langTag || null
  const resultClassConfig = perspectiveConfig.resultClasses[resultClass]
  if (resultClassConfig === undefined) {
    console.log(`Error: result class "${resultClass}" not defined for perspective "${finalPerspectiveID}"`)
    return Promise.resolve({
      data: null,
      sparqlQuery: ''
    })
  }

  // Var izgūt pēc kārtas vairākus sparqlQuery.
  const {
    sparqlQuery,
    property = null,
    rdfType = null,
    filterTarget = 'id',
    resultMapper:finalResultMapper = makeObjectList,
    resultMapperConfig:finalResultMapperConfig = null,
    postprocess:finalPostProcess = null
  } = resultClassConfig

  let finalResultSet = [];
  let finalQuery = "";
  for (let [idx, queryObj] of sparqlQuery.entries()){
    let { 
      sparqlQuery:q,
      sparqlQueryNodes, 
      endpoint, 
      useNetworkAPI,
      resultMapper = null, 
      resultMapperConfig = null, 
      postprocess = null,
      templateFiller = fillIDSets,
      templateFillerConfig = null
    } = queryObj;

    if (constraints == null && defaultConstraint == null) {
      q = q.replace(/<FILTER>/g, '# no filters')
    } else {
      q = q.replace(/<FILTER>/g, generateConstraintsBlock({
        backendSearchConfig,
        facetClass,
        constraints,
        defaultConstraint,
        filterTarget,
        facetID: null
      }))
    }
    q = q.replace(/<FACET_CLASS>/g, perspectiveConfig.facetClass)
    if (has(backendSearchConfig[resultClass], 'facetClassPredicate')) {
      q = q.replace(/<FACET_CLASS_PREDICATE>/g, backendSearchConfig[resultClass].facetClassPredicate)
    } else {
      q = q.replace(/<FACET_CLASS_PREDICATE>/g, 'a')
    }
    if (langTag) {
      q = q.replace(/<LANG>/g, langTag)
    }
    if (langTagSecondary) {
      q = q.replace(/<LANG_SECONDARY>/g, langTagSecondary)
    }
    if (fromID) {
      q = q.replace(/<FROM_ID>/g, `<${fromID}>`)
    }
    if (toID) {
      q = q.replace(/<TO_ID>/g, `<${toID}>`)
    }
    if (period) {
      q = q.replace(/<PERIOD>/g, `<${period}>`)
    }
    if (province) {
      q = q.replace(/<PROVINCE>/g, `<${province}>`)
    }
    if (property) {
      q = q.replace(/<PROPERTY>/g, property)
    }
    if (rdfType) {
      q = q.replace(/<RDF_TYPE>/g, rdfType)
    }
    
    //console.log(endpoint.prefixes + q)
    try{
      q = templateFiller(finalResultSet, q, templateFillerConfig);

      if (useNetworkAPI) {
        let results = runNetworkQuery({
          endpoint: endpoint.url,
          prefixes: perspectiveEndpoint.prefixes,
          id: uri,
          links: q,
          nodes: sparqlQueryNodes,
          optimize,
          limit,
          queryType: resultClassConfig.queryType
        })

        finalResultSet = finalResultSet.concat(results);
      } else {
        if (uri != null && typeof uri != 'undefined') {
          q = q.replace(/<ID>/g, `<${uri}>`)
          q = q.replace(/<ID_VALUES_FILTER_TARGET_CLAUSE>/g, generateInstanceValuesConstraint(filterTarget, uri))
        }
        else
        {
          q = q.replace(/<ID>/g, ``)
          q = q.replace(/<ID_VALUES_FILTER_TARGET_CLAUSE>/g, ``)
        }
        let results = await runSelectQuery({
          query: perspectiveEndpoint.prefixes + q,
          // Currently authentication is limited to only the main endpoint of perspective.
          useAuth: perspectiveEndpoint.useAuth,
          endpoint: endpoint.url,
          resultMapper,
          resultMapperConfig,
          postprocess,
          resultFormat
        });
  
        if (resultFormat !== "json"){
          return results;
        }else{
          let {data, sparqlQuery:query} = results;
  
          finalResultSet = finalResultSet.concat(data);
          finalQuery += `\n##___<${endpoint.url}>___\n` + query;
        }
      }
    }
    catch(e) {
      // If first query had error, then display to client error and do not return any results.
      if (idx == 0)
        throw e;
      else
        console.log(e); // Log error for any sequential query failures but do not impact previous query results.
    }
  }

  // Apply final postprocessing.
  finalResultSet = applyPostProcessing({
    data: finalResultSet,
    resultMapper: finalResultMapper,
    resultMapperConfig: finalResultMapperConfig,
    postprocess: finalPostProcess
  });

  return {
    data:  finalResultSet, 
    sparqlQuery: finalQuery
  };
}

export const getResultCount = ({
  backendSearchConfig,
  resultClass,
  constraints,
  resultFormat
}) => {
  let q = countQuery
  const perspectiveConfig = backendSearchConfig[resultClass]
  const {
    endpoint,
    defaultConstraint = null
  } = perspectiveConfig
  if (constraints == null && defaultConstraint == null) {
    q = q.replace('<FILTER>', '# no filters')
  } else {
    q = q.replace('<FILTER>', generateConstraintsBlock({
      backendSearchConfig,
      facetClass: resultClass, // use resultClass as facetClass
      constraints,
      defaultConstraint,
      filterTarget: 'id',
      facetID: null,
      filterTripleFirst: true
    }))
  }
  q = q.replace(/<FACET_CLASS>/g, perspectiveConfig.facetClass)
  if (has(backendSearchConfig[resultClass], 'facetClassPredicate')) {
    q = q.replace(/<FACET_CLASS_PREDICATE>/g, backendSearchConfig[resultClass].facetClassPredicate)
  } else {
    q = q.replace(/<FACET_CLASS_PREDICATE>/g, 'a')
  }

  // console.log(endpoint.prefixes + q)
  return runSelectQuery({
    query: endpoint.prefixes + q,
    endpoint: endpoint.url,
    useAuth: endpoint.useAuth,
    resultMapper: mapCount,
    resultFormat
  })
}

export const getByURI = async ({
  backendSearchConfig,
  perspectiveID = null,
  resultClass,
  facetClass,
  constraints,
  uri,
  resultFormat,
  dynamicLangTag
}) => {
  let perspectiveConfig
  if (perspectiveID) {
    perspectiveConfig = backendSearchConfig[perspectiveID]
  } else {
    perspectiveConfig = backendSearchConfig[facetClass]
  }

  const {
    endpoint:perspectiveEndpoint,
    langTagSecondary = null,
    enableDynamicLanguageChange
  } = perspectiveConfig

  const langTag = enableDynamicLanguageChange ? dynamicLangTag : perspectiveConfig.langTag || null
  const resultClassConfig = perspectiveConfig.resultClasses[resultClass]
  
  const {
    propertiesQueryBlock,
    filterTarget = 'related__id',
    relatedInstances = '',
    noFilterForRelatedInstances = false,
    resultMapper:finalResultMapper = makeObjectList,
    resultMapperConfig:finalResultMapperConfig = null,
    postprocess:finalPostProcess = null,
    sparqlQuery = []
  } = resultClassConfig.instanceConfig

 

  // Prepend as first the paginated result set query to execute it first to limit results.
  sparqlQuery.unshift({
    sparqlQuery: instanceQuery, 
    endpoint: perspectiveEndpoint,
  });

  // Construct and execute sequentially queries:
  let finalResultSet = [];
  let finalQuery = "";
  for (let [idx, queryObj] of sparqlQuery.entries()){
    let { 
      sparqlQuery:q, 
      endpoint, 
      resultMapper = null, 
      resultMapperConfig = null, 
      postprocess = null,
      templateFiller = fillIDSets,
      templateFillerConfig = null
    } = queryObj;
      
    q = q.replace('<PROPERTIES>', propertiesQueryBlock)
    q = q.replace('<RELATED_INSTANCES>', relatedInstances)
    if (constraints == null || noFilterForRelatedInstances) {
      q = q.replace('<FILTER>', '# no filters')
    } else {
      q = q.replace('<FILTER>', generateConstraintsBlock({
        backendSearchConfig,
        resultClass: resultClass,
        facetClass: facetClass,
        constraints: constraints,
        filterTarget,
        facetID: null
      }))
    }
    q = q.replace(/<ID>/g, `<${uri}>`)
    q = q.replace(/<ID_VALUES_FILTER_TARGET_CLAUSE>/g, generateInstanceValuesConstraint(filterTarget, uri))

    if (langTag) {
      q = q.replace(/<LANG>/g, langTag)
    }
    if (langTagSecondary) {
      q = q.replace(/<LANG_SECONDARY>/g, langTagSecondary)
    }
     
    // console.log(endpoint.prefixes + q)
    try{
      q = templateFiller(finalResultSet, q, templateFillerConfig);

      let results = await runSelectQuery({
        query: perspectiveEndpoint.prefixes + q,
        // Currently authentication is limited to only the main endpoint of perspective.
        useAuth: perspectiveEndpoint.useAuth,
        endpoint: endpoint.url,
        resultMapper,
        resultMapperConfig,
        postprocess,
        resultFormat
      });

      if (resultFormat !== "json"){
        return results;
      }else{
        let {data, sparqlQuery:query} = results;

        finalResultSet = finalResultSet.concat(data);
        finalQuery += `\n##___<${endpoint.url}>___\n` + query;
      }
    }
    catch(e) {
      // If first query had error, then display to client error and do not return any results.
      if (idx == 0)
        throw e;
      else
        console.log(e); // Log error for any sequential query failures but do not impact previous query results.
    }
  }

  // Apply final postprocessing.
  finalResultSet = applyPostProcessing({
    data: finalResultSet,
    resultMapper: finalResultMapper,
    resultMapperConfig: finalResultMapperConfig,
    postprocess: finalPostProcess
  });

  return {
    data:  finalResultSet, 
    sparqlQuery: finalQuery
  }
}
