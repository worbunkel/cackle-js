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

const thingWithArgsType = new GraphQLObjectType({
  name: 'thingWithArgs',
  fields: {
    thingInside: {
      type: GraphQLString,
    },
    otherThingInside: {
      type: GraphQLString,
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
      thingWithArgs: {
        name: 'thingWithArgs',
        type: thingWithArgsType,
        args: {
          argument1: {
            type: GraphQLString,
          },
          argument2: {
            type: GraphQLString,
          },
        },
        resolve(source, args) {
          return {
            thingInside: 'thingInside',
            otherThingInside: 'otherThingInside',
          };
        },
      },
    },
  }),
});
