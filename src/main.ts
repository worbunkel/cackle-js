import gql from 'graphql-tag';
import { graphql, GraphQLSchema, GraphQLObjectType, GraphQLString } from 'graphql';
import { print } from 'graphql/language/printer';
import _ from 'lodash';

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

const printObjectQuery = (objectQuery: any): string => `{
  ${_.join(_.map(objectQuery, (value, key) => (value === '' ? key : `${key} ${printObjectQuery(value)}`)), '\n')}
}`;

let Requests: Array<{ AST: any; resolve: (val?: any) => void; reject: (val?: any) => void }> = [];

export const createQuery = async (query: any) => {
  new Promise((resolve, reject) => {
    Requests.push({
      AST: gql(query),
      resolve,
      reject,
    });
  });
};

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

createQuery(firstQuery);
createQuery(secondQuery);

const processQueries = async () => {
  const queryDefinitionGroups = _.map(Requests, ({ AST }) => {
    const definitions = _.get(AST, 'definitions');
    // console.log(definitions);
    return _.filter(definitions, definition => _.get(definition, 'operation') === 'query');
  });
  // console.log(queryDefinitionGroups);
  const selections = _.map(queryDefinitionGroups, queryDefinitionGroup =>
    _.flatMap(queryDefinitionGroup, def => {
      return def.selectionSet.selections;
    }),
  );
  const deepNames = _.map(selections, createDeepNames);
  console.log('DEEP NAMES:\n', deepNames);
  const uniqueNames = _.uniq(...deepNames);
  const newQueryObject = {};
  _.each(uniqueNames, uniqueName => _.set(newQueryObject, uniqueName, ''));
  console.log(JSON.stringify(deepNames, null, 2));
  console.log(newQueryObject);
  const newQuery = printObjectQuery(newQueryObject);
  const finalAST = gql(newQuery);
  // const finalQueryDefinition = {
  //   kind: 'OperationDefinition',
  //   operation: 'query',
  //   variableDefinitions: [] as any[],
  //   directives: [] as any[],
  //   selectionSet: {
  //     kind: 'SelectionSet',
  //     selections: combinedSelections,
  //   },
  // };
  // const newAST = {
  //   kind: 'Document',
  //   definitions: [finalQueryDefinition],
  // };
  const query = print(finalAST as any);

  console.log('\nQUERY:\n', query);
  const result = await graphql(schema, query);
  console.log('RESULT:\n', JSON.stringify(result, null, 2));
  ASTs = [];
};

processQueries();
