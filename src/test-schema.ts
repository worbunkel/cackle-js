import { GraphQLSchema, GraphQLObjectType, GraphQLString } from 'graphql';

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

export const testSchema = new GraphQLSchema({
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
