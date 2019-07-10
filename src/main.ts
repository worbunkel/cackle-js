import gql from 'graphql-tag';
import { graphql, GraphQLSchema, GraphQLObjectType, GraphQLString } from 'graphql';
import { print } from 'graphql/language/printer';
import _ from 'lodash';

const otherThingType = new GraphQLObjectType({
  name: 'otherThing',
  fields: {
    moreTest: {
      type: GraphQLString,
    },
  },
});

const testType = new GraphQLObjectType({
  name: 'test',
  fields: {
    thing: {
      type: GraphQLString,
    },
    thing2: {
      type: GraphQLString,
    },
    otherThing: {
      type: otherThingType,
    },
  },
});

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'RootQueryType',
    fields: {
      hello: {
        type: GraphQLString,
        resolve() {
          return 'world';
        },
      },
      test: {
        name: 'test',
        type: testType,
        resolve() {
          return {
            thing: 'thing',
            thing2: 'thing2',
            otherThing: {
              moreTest: 'otherThing moreTest',
            },
          };
        },
      },
    },
  }),
});

const createDeepNames = (selections: any[]): any[] => {
  return _.flatMap(selections, selection => {
    const selectionSet = selection.selectionSet;
    if (!selectionSet) {
      return selection.name.value;
    }
    return _.map(createDeepNames(selectionSet.selections), name => selection.name.value + '.' + name);
  });
};

const createDeepAliases = (selections: any[]): any[] => {
  return _.flatMap(selections, selection => {
    const selectionSet = selection.selectionSet;
    const alias = _.get(selection, 'alias.value', selection.name.value);
    if (!selectionSet) {
      return alias;
    }
    return _.map(createDeepAliases(selectionSet.selections), childAlias => alias + '.' + childAlias);
  });
};

// TODO: Clean this up to be done in one loop
const createDeepNamesAndAliases = (selections: any[]): { deepNames: any[]; deepAliases: any[] } => ({
  deepNames: _.map(selections, createDeepNames),
  deepAliases: _.map(selections, createDeepAliases),
});

const printObjectQuery = (objectQuery: any): string => `{
  ${_.join(_.map(objectQuery, (value, key) => (value === '' ? key : `${key} ${printObjectQuery(value)}`)), '\n')}
}`;

let Requests: Array<{ AST: any; resolve: (val?: any) => void; reject: (val?: any) => void }> = [];

export const createQuery = async (query: any) =>
  new Promise((resolve, reject) => {
    Requests.push({
      AST: gql(query),
      resolve,
      reject,
    });
  });

const firstQuery = `
  query {
    hello
    hello2: hello
    test {
      thing
    }
  }
`;
const secondQuery = `
  {
    hello
    test2: test {
      thing
      thing2
      otherThing {
        moreTest
      }
    }
  }
`;

const createQueries = async () => {
  const firstPromise = createQuery(firstQuery);
  const secondPromise = createQuery(secondQuery);
  const finalResult = await Promise.all([firstPromise, secondPromise]);
  console.log(JSON.stringify(finalResult, null, 2));
};

const processQueries = async () => {
  const queryDefinitionGroups = _.map(Requests, ({ AST }) => {
    const definitions = _.get(AST, 'definitions');
    return _.filter(definitions, definition => _.get(definition, 'operation') === 'query');
  });
  console.log('queryDefinitionGroups');
  console.log(queryDefinitionGroups);
  const selections = _.map(queryDefinitionGroups, queryDefinitionGroup =>
    _.flatMap(queryDefinitionGroup, def => {
      return def.selectionSet.selections;
    }),
  );
  console.log(selections);
  const { deepNames, deepAliases } = createDeepNamesAndAliases(selections);
  console.log('DEEP NAMES:\n', deepNames);
  console.log('DEEP ALIASES:\n', deepAliases);
  const uniqueNames = _.uniq(_.flatten(deepNames));
  console.log('Unique Names:\n', uniqueNames);
  const newQueryObject = {};
  _.each(uniqueNames, uniqueName => _.set(newQueryObject, uniqueName, ''));
  console.log(newQueryObject);
  const newQuery = printObjectQuery(newQueryObject);
  const finalAST = gql(newQuery);
  const query = print(finalAST as any);

  console.log('\nQUERY:\n', query);

  const response = await graphql(schema, query);
  const result = response.data;
  console.log(JSON.stringify(result, null, 2));

  _.each(deepNames, (deepNameGroup, index) => {
    const deepAliasGroup = deepAliases[index];
    const returnObj = {};
    _.each(deepAliasGroup, (deepAlias, aliasIndex) => {
      const deepName = deepNameGroup[aliasIndex];
      _.set(returnObj, deepAlias, _.get(result, deepName));
    });
    Requests[index].resolve(returnObj);
  });

  Requests = [];
};

createQueries();
processQueries();
